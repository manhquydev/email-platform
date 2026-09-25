import { GraphQLResolveInfo } from 'graphql';
import { PrismaClient } from '@prisma/client';
import { createDataLoaders, DataLoaders } from '../utils/dataloader';
import cacheService from '../../services/cache-service';
import { parseResolveInfo, simplifyParsedResolveInfoFragmentWithType } from 'graphql-parse-resolve-info';

/**
 * Optimized GraphQL resolvers with DataLoader and caching
 */

export function createOptimizedResolvers(prisma: PrismaClient) {
  const loaders = createDataLoaders(prisma);

  return {
    Query: {
      // User queries with caching
      user: async (_: any, { id }: { id: string }, context: any) => {
        // Check cache first
        const cacheKey = `user:${id}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const user = await loaders.userById.load(id);
        if (user) {
          await cacheService.set(cacheKey, user, { ttl: 300 });
        }
        return user;
      },

      me: async (_: any, __: any, context: any) => {
        if (!context.user) return null;
        return loaders.userById.load(context.user.id);
      },

      // Inbox queries with batch loading
      inbox: async (_: any, { id }: { id: string }, context: any) => {
        const cacheKey = `inbox:${id}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const inbox = await loaders.inboxById.load(id);

        // Security check
        if (inbox && inbox.user.id !== context.user?.id) {
          throw new Error('Unauthorized');
        }

        if (inbox) {
          await cacheService.set(cacheKey, inbox, { ttl: 60 });
        }
        return inbox;
      },

      // Messages with optimized fields selection
      messages: async (_: any, args: any, context: any, info: GraphQLResolveInfo) => {
        const { inboxId, first = 50, after, where = {} } = args;

        // Parse fields to select only what's needed
        const parsedInfo = parseResolveInfo(info);
        const simplified = simplifyParsedResolveInfoFragmentWithType(parsedInfo);

        // Build efficient query based on requested fields
        const selectFields: any = {
          id: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          read: true,
          pinned: true,
        };

        if (simplified.fields?.attachments) {
          selectFields.attachments = {
            select: {
              id: true,
              filename: true,
              contentType: true,
              size: true,
            },
          };
        }

        const whereClause: any = {
          inboxId,
          deletedAt: null,
          ...where,
        };

        // Check cache for list queries
        const cacheKey = `messages:${inboxId}:${JSON.stringify(args)}`;
        const cached = await cacheService.get(cacheKey, `user:${context.user?.id}`);
        if (cached) return cached;

        // Use DataLoader for batching if multiple messages
        const messages = await prisma.message.findMany({
          where: whereClause,
          select: selectFields,
          orderBy: [
            { pinned: 'desc' },
            { receivedAt: 'desc' },
          ],
          take: Math.min(first, 100), // Limit for performance
          skip: after ? parseInt(Buffer.from(after, 'base64').toString()) : 0,
        });

        const result = {
          edges: messages.map(message => ({
            node: message,
            cursor: Buffer.from(message.id).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: messages.length === first,
            endCursor: messages.length > 0
              ? Buffer.from(messages[messages.length - 1].id).toString('base64')
              : null,
          },
        };

        // Cache result
        await cacheService.set(cacheKey, result, {
          ttl: 30,
          namespace: `user:${context.user?.id}`,
        });

        return result;
      },

      // Full-text search with optimization
      searchMessages: async (_: any, { query, first = 20 }: any, context: any) => {
        const searchQuery = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        const cacheKey = `search:${Buffer.from(searchQuery).toString('base64')}`;

        const cached = await cacheService.get(cacheKey, `user:${context.user?.id}`);
        if (cached) return cached;

        // Use PostgreSQL full-text search
        const results = await prisma.$queryRaw`
          SELECT DISTINCT
            m.id,
            m.from_address as "fromAddress",
            m.subject,
            m.received_at as "receivedAt",
            m.read,
            m.pinned,
            ts_rank_cd(
              setweight(to_tsvector('english', m.subject), 'A') ||
              setweight(to_tsvector('english', m.from_address), 'B') ||
              setweight(to_tsvector('english', m.text_content), 'C'),
              plainto_tsquery('english', ${searchQuery})
            ) as rank
          FROM messages m
          INNER JOIN inboxes i ON m.inbox_id = i.id
          WHERE
            i.user_id = ${context.user?.id}
            AND m.deleted_at IS NULL
            AND (
              to_tsvector('english', m.subject) @@ plainto_tsquery('english', ${searchQuery}) OR
              to_tsvector('english', m.from_address) @@ plainto_tsquery('english', ${searchQuery}) OR
              to_tsvector('english', m.text_content) @@ plainto_tsquery('english', ${searchQuery})
            )
          ORDER BY rank DESC, m.received_at DESC
          LIMIT ${first}
        `;

        await cacheService.set(cacheKey, results, {
          ttl: 60,
          namespace: `user:${context.user?.id}`,
        });

        return results;
      },
    },

    Message: {
      // Batch load related data
      inbox: async (parent: any, _: any, __: any) => {
        return loaders.inboxById.load(parent.inboxId);
      },

      attachments: async (parent: any, _: any, __: any) => {
        return loaders.attachmentsByMessage.load(parent.id);
      },

      // Computed fields with caching
      preview: async (parent: any) => {
        if (parent.preview) return parent.preview;

        // Generate preview from content
        const preview = parent.subject ||
          (parent.textContent || '').substring(0, 100) + '...';

        return preview;
      },

      sizeFormatted: async (parent: any) => {
        const bytes = parent.size || 0;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      },
    },

    Inbox: {
      // Batch load user
      user: async (parent: any, _: any, __: any) => {
        return parent.user; // Already loaded
      },

      // Batch load domain
      domain: async (parent: any, _: any, __: any) => {
        return loaders.domainById.load(parent.domainId);
      },

      // Optimized message count
      messageCount: async (parent: any) => {
        const cacheKey = `inbox:${parent.id}:count`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await loaders.messageCountByInbox.load(parent.id);
        await cacheService.set(cacheKey, count, { ttl: 60 });
        return count;
      },

      // Unread count with caching
      unreadCount: async (parent: any) => {
        const cacheKey = `inbox:${parent.id}:unread`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await prisma.message.count({
          where: {
            inboxId: parent.id,
            read: false,
            deletedAt: null,
          },
        });

        await cacheService.set(cacheKey, count, { ttl: 30 });
        return count;
      },
    },

    User: {
      // Optimized domain count
      domainCount: async (parent: any) => {
        const cacheKey = `user:${parent.id}:domainCount`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await prisma.domain.count({
          where: { userId: parent.id },
        });

        await cacheService.set(cacheKey, count, { ttl: 300 });
        return count;
      },

      // Inbox count with caching
      inboxCount: async (parent: any) => {
        const cacheKey = `user:${parent.id}:inboxCount`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await prisma.inbox.count({
          where: { userId: parent.id },
        });

        await cacheService.set(cacheKey, count, { ttl: 300 });
        return count;
      },

      // Total message count (expensive, cache longer)
      messageCount: async (parent: any) => {
        const cacheKey = `user:${parent.id}:messageCount`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const count = await prisma.message.count({
          where: {
            inbox: { userId: parent.id },
            deletedAt: null,
          },
        });

        await cacheService.set(cacheKey, count, { ttl: 600 }); // 10 minutes
        return count;
      },
    },

    Mutation: {
      // Optimized mutations with cache invalidation
      markMessageRead: async (_: any, { messageId }: { messageId: string }, context: any) => {
        const message = await prisma.message.findFirst({
          where: {
            id: messageId,
            inbox: { userId: context.user?.id },
          },
          select: { id: true, inboxId: true, read: true },
        });

        if (!message) {
          throw new Error('Message not found');
        }

        if (message.read) return message;

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { read: true },
        });

        // Invalidate caches
        await cacheService.invalidateTag(`inbox:${message.inboxId}`);
        await cacheService.invalidateTag(`message:${messageId}`);

        return updated;
      },

      deleteMessage: async (_: any, { messageId }: { messageId: string }, context: any) => {
        const message = await prisma.message.findFirst({
          where: {
            id: messageId,
            inbox: { userId: context.user?.id },
          },
          select: { id: true, inboxId: true },
        });

        if (!message) {
          throw new Error('Message not found');
        }

        // Soft delete
        await prisma.message.update({
          where: { id: messageId },
          data: { deletedAt: new Date() },
        });

        // Invalidate caches
        await cacheService.invalidateTag(`inbox:${message.inboxId}`);
        await cacheService.invalidateTag(`message:${messageId}`);

        return { success: true };
      },
    },
  };
}