import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';

const prisma = new PrismaClient();

export interface SearchQuery {
  q: string;
  type?: 'messages' | 'inboxes' | 'all';
  inboxId?: string;
  domainId?: string;
  organizationId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  filters?: {
    hasAttachments?: boolean;
    isRead?: boolean;
    fromAddress?: string;
    subject?: string;
  };
  sort?: {
    field: 'receivedAt' | 'createdAt' | 'updatedAt' | 'subject' | 'fromAddress';
    order: 'asc' | 'desc';
  };
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  took: number;
  facets?: {
    domains: Array<{ name: string; count: number }>;
    senders: Array<{ email: string; count: number }>;
    dateRanges: Array<{ range: string; count: number }>;
  };
}

/**
 * Search Service for messages and inboxes
 */
export class SearchService {
  /**
   * Full-text search across messages and inboxes
   */
  async search(
    userId: string,
    query: SearchQuery
  ): Promise<SearchResult<any>> {
    const startTime = Date.now();

    // Build search conditions
    const searchConditions = this.buildSearchConditions(userId, query);

    // Determine what to search
    const searchTypes = query.type === 'all' ? ['messages', 'inboxes'] : [query.type || 'messages'];

    const results: any[] = [];
    let total = 0;

    for (const searchType of searchTypes) {
      if (searchType === 'messages') {
        const messageResults = await this.searchMessages(userId, searchConditions, query);
        results.push(...messageResults.items.map(item => ({ ...item, _type: 'message' })));
        total += messageResults.total;
      } else if (searchType === 'inboxes') {
        const inboxResults = await this.searchInboxes(userId, searchConditions, query);
        results.push(...inboxResults.items.map(item => ({ ...item, _type: 'inbox' })));
        total += inboxResults.total;
      }
    }

    // Sort combined results
    if (query.sort) {
      results.sort((a, b) => {
        const aVal = a[query.sort!.field];
        const bVal = b[query.sort!.field];

        if (query.sort!.order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const offset = query.pagination?.offset || 0;
    const limit = query.pagination?.limit || 50;
    const paginatedResults = results.slice(offset, offset + limit);

    // Get facets
    const facets = await this.getSearchFacets(userId, searchConditions);

    return {
      items: paginatedResults,
      total,
      took: Date.now() - startTime,
      facets
    };
  }

  /**
   * Advanced message search
   */
  async searchMessages(
    userId: string,
    conditions: any,
    query: SearchQuery
  ): Promise<SearchResult<any>> {
    // Build where clause for messages
    const where: any = {
      inbox: {
        organizationId: conditions.organizationId || undefined,
        domainId: conditions.domainId || undefined,
      },
      AND: []
    };

    // Add text search
    if (conditions.searchText) {
      where.AND.push(
        {
          OR: [
            { subject: { contains: conditions.searchText, mode: 'insensitive' } },
            { fromAddress: { contains: conditions.searchText, mode: 'insensitive' } },
            { toAddress: { contains: conditions.searchText, mode: 'insensitive' } },
            { textContent: { contains: conditions.searchText, mode: 'insensitive' } },
          ]
        }
      );
    }

    // Add date range
    if (query.dateRange) {
      where.AND.push({
        receivedAt: {
          gte: query.dateRange.from,
          lte: query.dateRange.to
        }
      });
    }

    // Add filters
    if (query.filters) {
      if (query.filters.hasAttachments !== undefined) {
        where.AND.push({
          attachments: query.filters.hasAttachments ? { gt: 0 } : 0
        });
      }
      if (query.filters.isRead !== undefined) {
        where.AND.push({
          read: query.filters.isRead
        });
      }
      if (query.filters.fromAddress) {
        where.AND.push({
          fromAddress: { contains: query.filters.fromAddress, mode: 'insensitive' }
        });
      }
      if (query.filters.subject) {
        where.AND.push({
          subject: { contains: query.filters.subject, mode: 'insensitive' }
        });
      }
    }

    // Specific inbox filter
    if (query.inboxId) {
      where.inboxId = query.inboxId;
    }

    // Remove empty AND clause
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Count total results
    const total = await prisma.message.count({ where });

    // Fetch results
    const messages = await prisma.message.findMany({
      where,
      include: {
        inbox: {
          select: {
            id: true,
            address: true,
            domain: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: query.sort ? {
        [query.sort.field]: query.sort.order
      } : {
        receivedAt: 'desc'
      },
      take: query.pagination?.limit || 50,
      skip: query.pagination?.offset || 0
    });

    return {
      items: messages,
      total,
      took: 0 // Will be calculated in parent method
    };
  }

  /**
   * Search inboxes
   */
  async searchInboxes(
    userId: string,
    conditions: any,
    query: SearchQuery
  ): Promise<SearchResult<any>> {
    // Build where clause for inboxes
    const where: any = {
      organizationId: conditions.organizationId || undefined,
      domainId: conditions.domainId || undefined,
      AND: []
    };

    // Add text search
    if (conditions.searchText) {
      where.AND.push(
        {
          OR: [
            { address: { contains: conditions.searchText, mode: 'insensitive' } },
            { description: { contains: conditions.searchText, mode: 'insensitive' } },
          ]
        }
      );
    }

    // Add date range for created inboxes
    if (query.dateRange) {
      where.AND.push({
        createdAt: {
          gte: query.dateRange.from,
          lte: query.dateRange.to
        }
      });
    }

    // Remove empty AND clause
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Count total results
    const total = await prisma.inbox.count({ where });

    // Fetch results
    const inboxes = await prisma.inbox.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: query.sort ? {
        [query.sort.field]: query.sort.order
      } : {
        createdAt: 'desc'
      },
      take: query.pagination?.limit || 50,
      skip: query.pagination?.offset || 0
    });

    return {
      items: inboxes,
      total,
      took: 0 // Will be calculated in parent method
    };
  }

  /**
   * Get search facets (aggregations)
   */
  async getSearchFacets(
    userId: string,
    conditions: any
  ): Promise<SearchResult<any>['facets']> {
    // Get domain distribution
    const domains = await prisma.message.groupBy({
      by: ['inbox'],
      where: {
        inbox: {
          domain: {
            name: { not: null }
          },
          organizationId: conditions.organizationId
        }
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    const domainFacets = await Promise.all(
      domains.map(async (d) => {
        const inbox = await prisma.inbox.findUnique({
          where: { id: d.inbox },
          include: {
            domain: true
          }
        });
        return {
          name: inbox?.domain?.name || 'Unknown',
          count: d._count
        };
      })
    );

    // Get top senders
    const senders = await prisma.message.groupBy({
      by: ['fromAddress'],
      where: {
        inbox: {
          organizationId: conditions.organizationId
        },
        fromAddress: {
          not: null
        }
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    const senderFacets = senders.map(s => ({
      email: s.fromAddress || '',
      count: s._count
    }));

    // Get date ranges
    const dateRanges = [
      { range: 'Today', count: await this.countMessagesInDateRange(userId, new Date(), new Date()) },
      { range: 'This Week', count: await this.countMessagesInDateRange(userId, this.getWeekStart(), new Date()) },
      { range: 'This Month', count: await this.countMessagesInDateRange(userId, this.getMonthStart(), new Date()) },
      { range: 'Last Month', count: await this.countMessagesInDateRange(userId, this.getLastMonthStart(), this.getMonthStart()) },
      { range: 'Older', count: await this.countMessagesOlderThan(userId, this.getLastMonthStart()) }
    ];

    return {
      domains: domainFacets,
      senders: senderFacets,
      dateRanges
    };
  }

  /**
   * Search suggestions (autocomplete)
   */
  async getSearchSuggestions(
    userId: string,
    query: string,
    type: 'fromAddress' | 'subject' | 'domain' = 'fromAddress'
  ): Promise<string[]> {
    const limit = 10;

    switch (type) {
      case 'fromAddress':
        const fromAddresses = await prisma.message.findMany({
          where: {
            inbox: {
              organizationId: undefined // TODO: Check user's orgs
            },
            fromAddress: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: {
            fromAddress: true
          },
          distinct: ['fromAddress'],
          take: limit
        });
        return fromAddresses.map(m => m.fromAddress || '').filter(Boolean);

      case 'subject':
        const subjects = await prisma.message.findMany({
          where: {
            inbox: {
              organizationId: undefined // TODO: Check user's orgs
            },
            subject: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: {
            subject: true
          },
          distinct: ['subject'],
          take: limit
        });
        return subjects.map(m => m.subject || '').filter(Boolean);

      case 'domain':
        const domains = await prisma.domain.findMany({
          where: {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: {
            name: true
          },
          take: limit
        });
        return domains.map(d => d.name);

      default:
        return [];
    }
  }

  /**
   * Build search conditions from query
   */
  private buildSearchConditions(userId: string, query: SearchQuery): any {
    return {
      searchText: query.q,
      organizationId: query.organizationId,
      domainId: query.domainId
    };
  }

  /**
   * Count messages in date range
   */
  private async countMessagesInDateRange(
    userId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    return await prisma.message.count({
      where: {
        inbox: {
          organizationId: undefined // TODO: Check user's orgs
        },
        receivedAt: {
          gte: from,
          lte: to
        }
      }
    });
  }

  /**
   * Count messages older than date
   */
  private async countMessagesOlderThan(userId: string, date: Date): Promise<number> {
    return await prisma.message.count({
      where: {
        inbox: {
          organizationId: undefined // TODO: Check user's orgs
        },
        receivedAt: {
          lt: date
        }
      }
    });
  }

  /**
   * Get start of current week
   */
  private getWeekStart(): Date {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return startOfWeek;
  }

  /**
   * Get start of current month
   */
  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get start of last month
   */
  private getLastMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
}

export const searchService = new SearchService();