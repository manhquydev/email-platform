import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import DatabaseConnectionManager from '../services/database-connection';
import cacheService from '../services/cache-service';

const db = DatabaseConnectionManager.getInstance().getPrisma();

export default async function optimizedMessageRoutes(app: FastifyInstance) {
  // Get messages with caching
  app.get('/api/v2/messages', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { inboxId, page = 1, limit = 50, search } = request.query as any;

    // Build cache key for inbox messages
    const cacheKey = `inbox:${inboxId}:page:${page}:limit:${limit}:${search || ''}`;

    // Check cache first
    const cached = await cacheService.get(cacheKey, `user:${user.id}`);
    if (cached) {
      return reply.send(cached);
    }

    // Build query with optimizations
    const where: any = {
      inboxId,
      deletedAt: null,
    };

    // Add search if provided
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { fromAddress: { contains: search, mode: 'insensitive' } },
        { textContent: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Use optimized query with proper indexes
    const [messages, total] = await Promise.all([
      db.message.findMany({
        where,
        select: {
          id: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          read: true,
          pinned: true,
          hasAttachments: true,
          size: true,
        },
        orderBy: [
          { pinned: 'desc' },
          { receivedAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: Math.min(limit, 100), // Max limit
      }),
      db.message.count({ where }),
    ]);

    const result = {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache result
    await cacheService.set(cacheKey, result, {
      ttl: 60,
      tags: [`inbox:${inboxId}`],
      namespace: `user:${user.id}`,
    });

    reply.send(result);
  });

  // Get single message with heavy caching
  app.get('/api/v2/messages/:id', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    const cacheKey = `message:${id}`;

    // Check cache first
    const cached = await cacheService.get(cacheKey, `user:${user.id}`);
    if (cached) {
      return reply.send(cached);
    }

    const message = await db.message.findFirst({
      where: {
        id,
        inbox: { userId: user.id },
        deletedAt: null,
      },
      include: {
        attachments: {
          select: {
            id: true,
            filename: true,
            size: true,
            contentType: true,
          },
        },
      },
    });

    if (!message) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    // Cache for longer time since messages don't change
    await cacheService.set(cacheKey, message, {
      ttl: 300,
      tags: [`message:${id}`, `inbox:${message.inboxId}`],
      namespace: `user:${user.id}`,
    });

    reply.send(message);
  });

  // Mark messages as read with cache invalidation
  app.post('/api/v2/messages/read', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { messageIds } = request.body as { messageIds: string[] };

    await db.message.updateMany({
      where: {
        id: { in: messageIds },
        inbox: { userId: user.id },
      },
      data: { read: true },
    });

    // Invalidate cache for affected messages
    for (const id of messageIds) {
      await cacheService.delete(`message:${id}`, `user:${user.id}`);
    }

    // Invalidate inbox cache
    const inboxes = await db.message.findMany({
      where: { id: { in: messageIds } },
      select: { inboxId: true },
      distinct: ['inboxId'],
    });

    for (const inbox of inboxes) {
      await cacheService.invalidateTags([`inbox:${inbox.inboxId}`], `user:${user.id}`);
    }

    reply.send({ success: true, count: messageIds.length });
  });

  // Delete messages with cache cleanup
  app.delete('/api/v2/messages', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { messageIds } = request.body as { messageIds: string[] };

    // Get inbox IDs before deletion for cache invalidation
    const messages = await db.message.findMany({
      where: {
        id: { in: messageIds },
        inbox: { userId: user.id },
      },
      select: { inboxId: true },
      distinct: ['inboxId'],
    });

    // Soft delete
    await db.message.updateMany({
      where: {
        id: { in: messageIds },
        inbox: { userId: user.id },
      },
      data: { deletedAt: new Date() },
    });

    // Invalidate all relevant caches
    for (const id of messageIds) {
      await cacheService.delete(`message:${id}`, `user:${user.id}`);
    }

    for (const inbox of messages) {
      await cacheService.invalidateTags([`inbox:${inbox.inboxId}`], `user:${user.id}`);
    }

    reply.send({ success: true, count: messageIds.length });
  });
}