/**
 * Admin Notification Logs Routes
 * View delivery history and resend failed notifications
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

// Query schema for log filtering
const logsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED']).optional(),
  channel: z.enum(['WEB', 'TELEGRAM', 'PUSH']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export async function notificationLogRoutes(app: FastifyInstance) {
  // List notification logs with filters
  app.get('/', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const query = logsQuerySchema.parse(request.query);
    const { page, limit, status, channel, dateFrom, dateTo, search } = query;

    const where: any = {};

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (dateFrom || dateTo) {
      where.sentAt = {};
      if (dateFrom) where.sentAt.gte = dateFrom;
      if (dateTo) where.sentAt.lte = dateTo;
    }

    // Search in notification title
    if (search) {
      where.notification = {
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              type: true,
              userId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // Get logs for specific notification
  app.get('/notification/:notificationId', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { notificationId } = request.params as { notificationId: string };

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        logs: { orderBy: { sentAt: 'desc' } },
        user: { select: { id: true, email: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    if (!notification) return reply.status(404).send({ error: 'Notification not found' });

    return { notification };
  });

  // Get delivery stats summary
  app.get('/stats', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { days = '7' } = request.query as { days?: string };
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const [byStatus, byChannel, total] = await Promise.all([
      prisma.notificationLog.groupBy({
        by: ['status'],
        where: { sentAt: { gte: since } },
        _count: true,
      }),
      prisma.notificationLog.groupBy({
        by: ['channel'],
        where: { sentAt: { gte: since } },
        _count: true,
      }),
      prisma.notificationLog.count({ where: { sentAt: { gte: since } } }),
    ]);

    return {
      period: `${days} days`,
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      byChannel: byChannel.reduce((acc, c) => ({ ...acc, [c.channel]: c._count }), {}),
    };
  });

  // Resend failed notification
  app.post('/:id/resend', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const log = await prisma.notificationLog.findUnique({
      where: { id },
      include: { notification: true },
    });

    if (!log) return reply.status(404).send({ error: 'Log not found' });
    if (log.status !== 'FAILED') {
      return reply.status(400).send({ error: 'Can only resend failed notifications' });
    }

    // Import notification sender and resend
    const { sendNotificationToUser } = await import('../../services/telegram');

    if (log.channel === 'TELEGRAM' && log.notification.userId) {
      try {
        await sendNotificationToUser(
          log.notification.userId,
          log.notification.title,
          log.notification.message,
          log.notification.type,
          log.notification.imageUrl || undefined
        );

        // Update log status
        await prisma.notificationLog.update({
          where: { id },
          data: { status: 'SENT', errorMessage: null },
        });

        return { success: true, message: 'Notification resent successfully' };
      } catch (error: any) {
        return reply.status(500).send({ error: 'Resend failed', details: error.message });
      }
    }

    return reply.status(400).send({ error: 'Channel not supported for resend' });
  });
}
