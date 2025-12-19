import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { searchService } from '../services/searchService';

export async function searchRoutes(app: FastifyInstance) {
  // General search endpoint
  app.get('/search', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      q: z.string().min(1),
      type: z.enum(['messages', 'inboxes', 'all']).default('all'),
      inboxId: z.string().uuid().optional(),
      domainId: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      hasAttachments: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
      isRead: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
      fromAddress: z.string().optional(),
      subject: z.string().optional(),
      sortBy: z.enum(['receivedAt', 'createdAt', 'updatedAt', 'subject', 'fromAddress']).default('receivedAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid search query', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const searchQuery = {
        q: query.data.q,
        type: query.data.type,
        inboxId: query.data.inboxId,
        domainId: query.data.domainId,
        organizationId: query.data.organizationId,
        dateRange: query.data.dateFrom && query.data.dateTo ? {
          from: new Date(query.data.dateFrom),
          to: new Date(query.data.dateTo)
        } : undefined,
        filters: {
          hasAttachments: query.data.hasAttachments,
          isRead: query.data.isRead,
          fromAddress: query.data.fromAddress,
          subject: query.data.subject,
        },
        sort: {
          field: query.data.sortBy,
          order: query.data.sortOrder
        },
        pagination: {
          limit: query.data.limit,
          offset: query.data.offset
        }
      };

      const result = await searchService.search(userId, searchQuery);
      return result;
    } catch (error: any) {
      app.log.error(error, 'Search failed');
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  // Search suggestions (autocomplete)
  app.get('/search/suggestions', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      q: z.string().min(1),
      type: z.enum(['fromAddress', 'subject', 'domain']).default('fromAddress'),
      limit: z.coerce.number().min(1).max(20).default(10),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const suggestions = await searchService.getSearchSuggestions(
        userId,
        query.data.q,
        query.data.type
      );
      return { suggestions: suggestions.slice(0, query.data.limit) };
    } catch (error: any) {
      app.log.error(error, 'Failed to get search suggestions');
      return reply.status(500).send({ error: 'Failed to get search suggestions' });
    }
  });

  // Advanced search with complex filters
  app.post('/search/advanced', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      query: z.string().min(1),
      filters: z.object({
        inboxIds: z.array(z.string().uuid()).optional(),
        domainIds: z.array(z.string().uuid()).optional(),
        organizationId: z.string().uuid().optional(),
        dateRange: z.object({
          from: z.string().datetime(),
          to: z.string().datetime(),
        }).optional(),
        hasAttachments: z.boolean().optional(),
        isRead: z.boolean().optional(),
        sizeRange: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }).optional(),
        senderFilters: z.array(z.object({
          type: z.enum(['includes', 'excludes', 'regex']),
          value: z.string(),
        })).optional(),
        subjectFilters: z.array(z.object({
          type: z.enum(['includes', 'excludes', 'regex']),
          value: z.string(),
        })).optional(),
      }),
      sort: z.object({
        field: z.enum(['receivedAt', 'createdAt', 'updatedAt', 'subject', 'fromAddress', 'size']),
        order: z.enum(['asc', 'desc']),
      }).default({
        field: 'receivedAt',
        order: 'desc'
      }),
      pagination: z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
      includeFacets: z.boolean().default(true),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // Transform advanced filters to search query
      const searchQuery = {
        q: body.data.query,
        type: 'messages' as const,
        organizationId: body.data.filters.organizationId,
        dateRange: body.data.filters.dateRange,
        filters: {
          hasAttachments: body.data.filters.hasAttachments,
          isRead: body.data.filters.isRead,
        },
        sort: body.data.sort,
        pagination: body.data.pagination
      };

      const result = await searchService.search(userId, searchQuery);

      // If facets are not requested, remove them
      if (!body.data.includeFacets) {
        delete result.facets;
      }

      return result;
    } catch (error: any) {
      app.log.error(error, 'Advanced search failed');
      return reply.status(500).send({ error: 'Advanced search failed' });
    }
  });

  // Get saved searches
  app.get('/search/saved', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;

    try {
      // TODO: Implement saved searches functionality
      // For now, return empty array
      return { data: [] };
    } catch (error: any) {
      app.log.error(error, 'Failed to get saved searches');
      return reply.status(500).send({ error: 'Failed to get saved searches' });
    }
  });

  // Save a search
  app.post('/search/saved', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(100),
      query: z.string().min(1),
      filters: z.any().optional(),
      isPublic: z.boolean().default(false),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // TODO: Implement saving searches
      // For now, return success
      return { success: true, id: 'saved-search-id' };
    } catch (error: any) {
      app.log.error(error, 'Failed to save search');
      return reply.status(500).send({ error: 'Failed to save search' });
    }
  });

  // Search analytics
  app.get('/search/analytics', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      period: z.enum(['day', 'week', 'month']).default('week'),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // TODO: Implement search analytics
      // For now, return mock data
      const analytics = {
        totalSearches: 1250,
        uniqueQueries: 342,
        averageResults: 15.7,
        topQueries: [
          { query: 'password reset', count: 45 },
          { query: 'invoice', count: 38 },
          { query: 'newsletter', count: 32 },
          { query: 'verification', count: 28 },
          { query: 'support', count: 24 },
        ],
        noResultQueries: [
          { query: 'foobar', count: 12 },
          { query: 'xyz123', count: 8 },
        ],
        trends: [
          { date: '2024-01-01', searches: 142 },
          { date: '2024-01-02', searches: 158 },
          { date: '2024-01-03', searches: 175 },
          { date: '2024-01-04', searches: 162 },
          { date: '2024-01-05', searches: 189 },
        ]
      };

      return analytics;
    } catch (error: any) {
      app.log.error(error, 'Failed to get search analytics');
      return reply.status(500).send({ error: 'Failed to get search analytics' });
    }
  });
}