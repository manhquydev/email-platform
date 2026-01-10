/**
 * API Usage Analytics Routes
 * Developer-facing analytics for API key usage tracking
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function apiUsageRoutes(app: FastifyInstance) {
  /**
   * GET /api-usage/overview
   * Get API usage overview for the authenticated user
   */
  app.get('/api-usage/overview', { preHandler: app.authenticate }, async (request, reply) => {
    const query = z.object({
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const user = request.user as { userId: string };
    const { timeRange } = query.data;

    const hoursMap: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
    const startDate = new Date(Date.now() - hoursMap[timeRange] * 60 * 60 * 1000);

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.userId },
      select: { id: true, prefix: true, name: true, lastUsedAt: true, createdAt: true },
    });

    const totalRequests = await prisma.auditLog.count({
      where: {
        userId: user.userId,
        action: { startsWith: 'API_' },
        createdAt: { gte: startDate },
      },
    });

    const webhookStats = await prisma.webhookLog.aggregate({
      where: {
        webhook: { userId: user.userId },
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _avg: { duration: true },
    });

    return {
      timeRange,
      totalRequests,
      apiKeys: apiKeys.map(k => ({
        id: k.id,
        prefix: k.prefix,
        name: k.name,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      webhooks: {
        totalDeliveries: webhookStats._count.id,
        avgLatencyMs: Math.round(webhookStats._avg.duration || 0),
      },
    };
  });

  /**
   * GET /api-usage/rate-limits
   * Get current rate limit status
   */
  app.get('/api-usage/rate-limits', { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as { userId: string; tier?: string };

    const tierLimits: Record<string, { requestsPerMinute: number; requestsPerDay: number }> = {
      FREE: { requestsPerMinute: 10, requestsPerDay: 1000 },
      STARTER: { requestsPerMinute: 30, requestsPerDay: 5000 },
      PROFESSIONAL: { requestsPerMinute: 100, requestsPerDay: 50000 },
      ENTERPRISE: { requestsPerMinute: 500, requestsPerDay: 500000 },
    };

    const limits = tierLimits[user.tier || 'FREE'];

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const requestsLastMinute = await prisma.auditLog.count({
      where: {
        userId: user.userId,
        action: { startsWith: 'API_' },
        createdAt: { gte: oneMinuteAgo },
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const requestsToday = await prisma.auditLog.count({
      where: {
        userId: user.userId,
        action: { startsWith: 'API_' },
        createdAt: { gte: startOfDay },
      },
    });

    return {
      tier: user.tier || 'FREE',
      limits,
      usage: { requestsLastMinute, requestsToday },
      remaining: {
        perMinute: Math.max(0, limits.requestsPerMinute - requestsLastMinute),
        perDay: Math.max(0, limits.requestsPerDay - requestsToday),
      },
      percentUsed: {
        perMinute: Math.round((requestsLastMinute / limits.requestsPerMinute) * 100),
        perDay: Math.round((requestsToday / limits.requestsPerDay) * 100),
      },
    };
  });

  /**
   * GET /api-usage/webhooks
   * Get webhook delivery analytics
   */
  app.get('/api-usage/webhooks', { preHandler: app.authenticate }, async (request, reply) => {
    const query = z.object({
      webhookId: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const user = request.user as { userId: string };
    const { webhookId, limit, offset } = query.data;

    if (webhookId) {
      const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, userId: user.userId },
      });
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }
    }

    const where: any = { webhook: { userId: user.userId } };
    if (webhookId) where.webhookId = webhookId;

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { webhook: { select: { name: true, url: true } } },
      }),
      prisma.webhookLog.count({ where }),
    ]);

    const successCount = logs.filter(l => l.statusCode && l.statusCode >= 200 && l.statusCode < 300).length;

    return {
      data: logs.map(log => ({
        id: log.id,
        webhookName: log.webhook.name,
        eventType: log.eventType,
        statusCode: log.statusCode,
        duration: log.duration,
        createdAt: log.createdAt,
      })),
      meta: { total, limit, offset },
      stats: {
        successCount,
        failureCount: logs.length - successCount,
        avgDuration: logs.length > 0
          ? Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length)
          : 0,
      },
    };
  });
}
