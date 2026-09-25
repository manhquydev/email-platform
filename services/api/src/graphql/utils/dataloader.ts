import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';

/**
 * DataLoader utilities for batching GraphQL queries
 * Prevents N+1 problems by batching database queries
 */

export interface DataLoaders {
  // User loaders
  userById: DataLoader<string, any>;
  usersByEmail: DataLoader<string, any>;

  // Domain loaders
  domainById: DataLoader<string, any>;
  domainsByName: DataLoader<string, any>;

  // Inbox loaders
  inboxById: DataLoader<string, any>;
  inboxByDomain: DataLoader<string, any>;

  // Message loaders
  messageById: DataLoader<string, any>;
  messagesByInbox: DataLoader<string, any[]>;
  messageCountByInbox: DataLoader<string, number>;

  // Attachment loaders
  attachmentById: DataLoader<string, any>;
  attachmentsByMessage: DataLoader<string, any[]>;
}

/**
 * Create configured DataLoaders for batching
 */
export function createDataLoaders(prisma: PrismaClient): DataLoaders {
  return {
    // User loaders
    userById: new DataLoader(async (ids: readonly string[]) => {
      const users = await prisma.user.findMany({
        where: { id: { in: ids as string[] } },
        select: {
          id: true,
          email: true,
          tier: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      return ids.map(id => users.find(u => u.id === id) || null);
    }, {
      cache: true,
      maxBatchSize: 100,
    }),

    usersByEmail: new DataLoader(async (emails: readonly string[]) => {
      const users = await prisma.user.findMany({
        where: { email: { in: emails as string[] } },
        select: {
          id: true,
          email: true,
          tier: true,
        },
      });

      return emails.map(email => users.find(u => u.email === email) || null);
    }, {
      cache: true,
      maxBatchSize: 100,
    }),

    // Domain loaders
    domainById: new DataLoader(async (ids: readonly string[]) => {
      const domains = await prisma.domain.findMany({
        where: { id: { in: ids as string[] } },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      });

      return ids.map(id => domains.find(d => d.id === id) || null);
    }, {
      cache: true,
      maxBatchSize: 50,
    }),

    domainsByName: new DataLoader(async (names: readonly string[]) => {
      const domains = await prisma.domain.findMany({
        where: { name: { in: names as string[] } },
      });

      return names.map(name => domains.find(d => d.name === name) || null);
    }, {
      cache: true,
      maxBatchSize: 50,
    }),

    // Inbox loaders
    inboxById: new DataLoader(async (ids: readonly string[]) => {
      const inboxes = await prisma.inbox.findMany({
        where: { id: { in: ids as string[] } },
        include: {
          domain: true,
          user: {
            select: { id: true, email: true, tier: true },
          },
          _count: {
            select: {
              messages: {
                where: { deletedAt: null },
              },
            },
          },
        },
      });

      return ids.map(id => inboxes.find(i => i.id === id) || null);
    }, {
      cache: true,
      maxBatchSize: 50,
    }),

    inboxByDomain: new DataLoader(async (domainIds: readonly string[]) => {
      const inboxes = await prisma.inbox.findMany({
        where: { domainId: { in: domainIds as string[] } },
        select: {
          id: true,
          name: true,
          domainId: true,
        },
      });

      return domainIds.map(domainId =>
        inboxes.filter(i => i.domainId === domainId)
      );
    }, {
      cache: true,
      maxBatchSize: 50,
    }),

    // Message loaders
    messageById: new DataLoader(async (ids: readonly string[]) => {
      const messages = await prisma.message.findMany({
        where: { id: { in: ids as string[] } },
        include: {
          inbox: {
            select: { id: true, name: true },
          },
          domain: {
            select: { id: true, name: true },
          },
          attachments: {
            where: { deletedAt: null },
            select: {
              id: true,
              filename: true,
              contentType: true,
              size: true,
            },
          },
        },
      });

      return ids.map(id => messages.find(m => m.id === id) || null);
    }, {
      cache: false, // Messages change frequently
      maxBatchSize: 25,
    }),

    messagesByInbox: new DataLoader(async (inboxIds: readonly string[]) => {
      const messages = await prisma.message.findMany({
        where: {
          inboxId: { in: inboxIds as string[] },
          deletedAt: null,
        },
        select: {
          id: true,
          inboxId: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          read: true,
          pinned: true,
          size: true,
        },
        orderBy: [
          { pinned: 'desc' },
          { receivedAt: 'desc' },
        ],
      });

      return inboxIds.map(inboxId =>
        messages.filter(m => m.inboxId === inboxId)
      );
    }, {
      cache: false,
      maxBatchSize: 25,
    }),

    messageCountByInbox: new DataLoader(async (inboxIds: readonly string[]) => {
      const counts = await prisma.message.groupBy({
        by: ['inboxId'],
        where: {
          inboxId: { in: inboxIds as string[] },
          deletedAt: null,
        },
        _count: true,
      });

      return inboxIds.map(inboxId => {
        const found = counts.find(c => c.inboxId === inboxId);
        return found ? found._count : 0;
      });
    }, {
      cache: false,
      maxBatchSize: 50,
    }),

    // Attachment loaders
    attachmentById: new DataLoader(async (ids: readonly string[]) => {
      const attachments = await prisma.attachment.findMany({
        where: { id: { in: ids as string[] } },
        select: {
          id: true,
          messageId: true,
          filename: true,
          contentType: true,
          size: true,
        },
      });

      return ids.map(id => attachments.find(a => a.id === id) || null);
    }, {
      cache: true,
      maxBatchSize: 100,
    }),

    attachmentsByMessage: new DataLoader(async (messageIds: readonly string[]) => {
      const attachments = await prisma.attachment.findMany({
        where: {
          messageId: { in: messageIds as string[] },
          deletedAt: null,
        },
        select: {
          id: true,
          messageId: true,
          filename: true,
          contentType: true,
          size: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return messageIds.map(messageId =>
        attachments.filter(a => a.messageId === messageId)
      );
    }, {
      cache: true,
      maxBatchSize: 50,
    }),
  };
}

/**
 * Clear all DataLoader caches
 */
export function clearDataLoaderCache(loaders: DataLoaders): void {
  Object.values(loaders).forEach(loader => {
    loader.clearAll();
  });
}

/**
 * Prime DataLoaders with common data
 */
export async function primeDataLoaders(loaders: DataLoaders): Promise<void> {
  // Prime recent messages
  const recentMessageIds = await prisma.message.findMany({
    select: { id: true },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  });

  if (recentMessageIds.length > 0) {
    await loaders.messageById.loadMany(recentMessageIds.map(m => m.id));
  }
}

// Export for testing
export { DataLoaders };