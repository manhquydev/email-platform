/**
 * Admin Providers Routes
 * API endpoints for Super Admins to manage Hosting Providers
 * Requires ADMIN role JWT authentication
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { HostingProviderService } from '../services/hosting-provider.service';
import { UsageSnapshotJob } from '../jobs/usage-snapshot.job';
import { prisma } from '../lib/prisma';
import { ProviderTier, ProviderStatus } from '@prisma/client';

// Validation schemas
const createProviderSchema = z.object({
  name: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  billingEmail: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  tier: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).optional(),
});

const listProvidersSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const adminProvidersRoutes = async (app: FastifyInstance) => {
  // All routes require admin authentication
  app.addHook('preHandler', app.requireAdmin);

  /**
   * GET /v1/admin/providers - List all providers with pagination/search
   */
  app.get('/v1/admin/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listProvidersSchema.parse(request.query);
    const { limit, offset, search, status } = query;

    const where = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { contactEmail: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(status ? { status } : {}),
    };

    const [providers, total] = await Promise.all([
      prisma.hostingProvider.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          billingEmail: true,
          tier: true,
          status: true,
          apiKeyPrefix: true,
          maxTenants: true,
          maxMailboxes: true,
          maxStorageGb: true,
          createdAt: true,
          _count: { select: { tenants: true } },
        },
      }),
      prisma.hostingProvider.count({ where }),
    ]);

    return {
      data: providers.map(p => ({
        ...p,
        tenantCount: p._count.tenants,
        _count: undefined,
      })),
      meta: { total, limit, offset },
    };
  });

  /**
   * POST /v1/admin/providers - Create new provider
   */
  app.post('/v1/admin/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createProviderSchema.parse(request.body);

    const result = await HostingProviderService.registerProvider({
      name: body.name,
      contactEmail: body.contactEmail,
      billingEmail: body.billingEmail,
      webhookUrl: body.webhookUrl,
      tier: body.tier as ProviderTier,
    });

    // Log API key creation event (security audit)
    request.log.info({
      event: 'provider_created',
      providerId: result.provider.id,
      tier: result.provider.tier,
      adminId: (request.user as any)?.userId,
    }, 'New hosting provider created');

    return reply.status(201).send({
      provider: result.provider,
      apiKey: result.apiKey, // Only shown once
      message: 'Provider created. Save the API key - it will not be shown again.',
    });
  });

  /**
   * GET /v1/admin/providers/:id - Get provider details
   */
  app.get('/v1/admin/providers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const provider = await HostingProviderService.getProvider(id);
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    return { provider };
  });

  /**
   * GET /v1/admin/providers/:id/usage - Get provider usage stats
   */
  app.get('/v1/admin/providers/:id/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.hostingProvider.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const usage = await HostingProviderService.getUsage(id);
    return { usage };
  });

  /**
   * GET /v1/admin/providers/:id/usage/history - Get usage history
   */
  app.get('/v1/admin/providers/:id/usage/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const query = z.object({
      days: z.coerce.number().min(7).max(365).default(30)
    }).parse(request.query);

    const provider = await prisma.hostingProvider.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const history = await UsageSnapshotJob.getHistory(id, { days: query.days });
    return { data: history };
  });

  /**
   * POST /v1/admin/jobs/usage-snapshot - Trigger usage snapshot manually
   */
  app.post('/v1/admin/jobs/usage-snapshot', async (request: FastifyRequest, reply: FastifyReply) => {
    // Run asynchronously
    UsageSnapshotJob.run().catch(err => {
      request.log.error(err, 'Manual usage snapshot failed');
    });

    return { message: 'Usage snapshot job started' };
  });

  /**
   * POST /v1/admin/providers/:id/regenerate-key - Regenerate API key
   */
  app.post('/v1/admin/providers/:id/regenerate-key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.hostingProvider.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const result = await HostingProviderService.regenerateApiKey(id);

    // Log key regeneration event (security audit)
    request.log.warn({
      event: 'provider_key_regenerated',
      providerId: id,
      providerName: provider.name,
      adminId: (request.user as any)?.userId,
    }, 'Provider API key regenerated');

    return {
      apiKey: result.apiKey, // Only shown once
      message: 'API key regenerated. Save the new key - it will not be shown again.',
    };
  });

  /**
   * PATCH /v1/admin/providers/:id/status - Suspend/activate provider
   */
  app.patch('/v1/admin/providers/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateStatusSchema.parse(request.body);

    const provider = await prisma.hostingProvider.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const updated = await prisma.hostingProvider.update({
      where: { id },
      data: {
        status: body.status as ProviderStatus,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    // Log status change (security audit)
    request.log.info({
      event: 'provider_status_changed',
      providerId: id,
      providerName: provider.name,
      oldStatus: provider.status,
      newStatus: body.status,
      adminId: (request.user as any)?.userId,
    }, 'Provider status changed');

    return { provider: updated };
  });

  /**
   * GET /v1/admin/providers/:id/tenants - List provider's tenants
   */
  app.get('/v1/admin/providers/:id/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }).parse(request.query);

    const provider = await prisma.hostingProvider.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const result = await HostingProviderService.listTenants(id, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: result.tenants,
      meta: { total: result.total, limit: result.limit, offset: result.offset },
    };
  });
};
