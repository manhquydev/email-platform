import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WebhookStatus } from '@prisma/client';
import { orgWebhookService } from '../services/orgWebhookService';
import { checkQuota } from '../middleware/quota';

export async function orgWebhookRoutes(app: FastifyInstance) {
  // Create new webhook
  app.post('/webhooks', {
    preHandler: [app.authenticate, checkQuota('webhook')]
  }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      events: z.array(z.string()).min(1),
      organizationId: z.string().uuid().optional(),
      secret: z.string().min(1).optional(),
      timeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
      retryAttempts: z.number().min(0).max(10).optional(),
      retryDelay: z.number().min(10).max(3600).optional(), // 10s to 1hr
      description: z.string().max(500).optional(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const result = await orgWebhookService.createWebhook(userId, body.data);
      return {
        success: true,
        webhook: result.webhook,
        secret: result.secret, // Show secret only on creation
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to create webhook');
      return reply.status(500).send({ error: 'Failed to create webhook' });
    }
  });

  // Get webhooks (personal or organization)
  app.get('/webhooks', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const webhooks = await orgWebhookService.getWebhooks(
        userId,
        query.data.organizationId,
        query.data.status as WebhookStatus
      );

      return {
        data: webhooks.slice(query.data.offset, query.data.offset + query.data.limit),
        meta: {
          total: webhooks.length,
          limit: query.data.limit,
          offset: query.data.offset,
        },
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch webhooks');
      return reply.status(500).send({ error: 'Failed to fetch webhooks' });
    }
  });

  // Get specific webhook
  app.get('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid webhook ID' });
    }

    const userId = (request.user as any).userId;

    try {
      const webhook = await orgWebhookService.getWebhookById(userId, params.data.id);
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }
      return { data: webhook };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch webhook');
      return reply.status(500).send({ error: 'Failed to fetch webhook' });
    }
  });

  // Update webhook
  app.patch('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      name: z.string().min(1).max(255).optional(),
      url: z.string().url().optional(),
      events: z.array(z.string()).min(1).optional(),
      secret: z.string().min(1).optional(),
      timeout: z.number().min(1000).max(300000).optional(),
      retryAttempts: z.number().min(0).max(10).optional(),
      retryDelay: z.number().min(10).max(3600).optional(),
      description: z.string().max(500).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED']).optional(),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid webhook ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const webhook = await orgWebhookService.updateWebhook(userId, params.data.id, body.data);
      return { success: true, data: webhook };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'Webhook not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to update webhook');
      return reply.status(500).send({ error: 'Failed to update webhook' });
    }
  });

  // Delete webhook
  app.delete('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid webhook ID' });
    }

    const userId = (request.user as any).userId;

    try {
      await orgWebhookService.deleteWebhook(userId, params.data.id);
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'Webhook not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to delete webhook');
      return reply.status(500).send({ error: 'Failed to delete webhook' });
    }
  });

  // Get webhook delivery history
  app.get('/webhooks/:id/deliveries', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid webhook ID' });
    }

    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const deliveries = await orgWebhookService.getWebhookDeliveries(
        userId,
        params.data.id,
        query.data.limit,
        query.data.offset
      );

      return {
        data: deliveries,
        meta: {
          limit: query.data.limit,
          offset: query.data.offset,
        },
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'Webhook not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch webhook deliveries');
      return reply.status(500).send({ error: 'Failed to fetch webhook deliveries' });
    }
  });

  // Replay webhook delivery
  app.post('/webhooks/deliveries/:id/replay', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid delivery ID' });
    }

    const userId = (request.user as any).userId;

    try {
      await orgWebhookService.replayDelivery(userId, params.data.id);
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'Delivery not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to replay webhook delivery');
      return reply.status(500).send({ error: 'Failed to replay webhook delivery' });
    }
  });

  // Test webhook (send a test event)
  app.post('/webhooks/:id/test', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      eventType: z.string().min(1),
      testPayload: z.any().optional(),
    });

    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid webhook ID' });
    }

    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      // Get webhook to verify permissions
      const webhook = await orgWebhookService.getWebhookById(userId, params.data.id);
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Create test event
      const testEvent = {
        id: 'test_' + Date.now(),
        type: body.data.eventType,
        data: body.data.testPayload || { message: 'This is a test webhook event' },
        timestamp: new Date(),
        organizationId: webhook.organizationId,
        userId: userId,
      };

      // Trigger the event
      await orgWebhookService.triggerEvent(testEvent);

      return { success: true, message: 'Test webhook event sent' };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to test webhook');
      return reply.status(500).send({ error: 'Failed to test webhook' });
    }
  });

  // Get available event types
  app.get('/webhooks/events', { preHandler: app.authenticate }, async (request, reply) => {
    const eventTypes = [
      {
        category: 'Email',
        events: [
          { type: 'email.received', description: 'New email received' },
          { type: 'email.sent', description: 'Email sent via outbound' },
          { type: 'email.opened', description: 'Email was opened (tracked)' },
          { type: 'email.clicked', description: 'Link in email was clicked' },
          { type: 'email.bounced', description: 'Email bounced back' },
          { type: 'email.complained', description: 'Marked as spam' },
        ],
      },
      {
        category: 'Inbox',
        events: [
          { type: 'inbox.created', description: 'New inbox created' },
          { type: 'inbox.deleted', description: 'Inbox deleted' },
          { type: 'inbox.domain_verified', description: 'Domain ownership verified' },
        ],
      },
      {
        category: 'User',
        events: [
          { type: 'user.created', description: 'New user registered' },
          { type: 'user.login', description: 'User logged in' },
          { type: 'user.sso_login', description: 'User logged in via SSO' },
        ],
      },
      {
        category: 'Organization',
        events: [
          { type: 'organization.created', description: 'Organization created' },
          { type: 'organization.member_added', description: 'Member added to organization' },
          { type: 'organization.member_removed', description: 'Member removed from organization' },
          { type: 'organization.subscription.updated', description: 'Subscription changed' },
        ],
      },
      {
        category: 'System',
        events: [
          { type: 'system.maintenance', description: 'Scheduled maintenance' },
          { type: 'system.outage', description: 'Service outage detected' },
          { type: 'system.upgrade', description: 'New features deployed' },
        ],
      },
    ];

    return { data: eventTypes };
  });

  // Verify webhook signature (helper endpoint)
  app.post('/webhooks/verify', { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      payload: z.string(),
      signature: z.string(),
      secret: z.string(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const isValid = orgWebhookService.constructor.verifySignature(
      body.data.payload,
      body.data.signature,
      body.data.secret
    );

    return { valid: isValid };
  });
}