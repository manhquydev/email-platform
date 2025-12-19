import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { billingAutomationService } from '../services/billingAutomationService';
import { PermissionService } from '../services/permissionService';

export async function billingAutomationRoutes(app: FastifyInstance) {
  // Get usage report for organization
  app.get('/billing/usage/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ organizationId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const querySchema = z.object({
      period: z.enum(['current', 'last_month', 'custom']).default('current'),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });

    const query = querySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: 'Invalid request parameters' });
    }

    const userId = (request.user as any).userId;

    // Check permissions
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );
    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view billing for this organization' });
    }

    try {
      let period: { from: Date; to: Date };

      switch (query.data.period) {
        case 'current':
          const now = new Date();
          period = {
            from: new Date(now.getFullYear(), now.getMonth(), 1),
            to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          };
          break;

        case 'last_month':
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          period = {
            from: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            to: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
          };
          break;

        case 'custom':
          if (!query.data.from || !query.data.to) {
            return reply.status(400).send({ error: 'Custom period requires from and to dates' });
          }
          period = {
            from: new Date(query.data.from),
            to: new Date(query.data.to)
          };
          break;
      }

      const report = await billingAutomationService.calculateUsageCosts(
        params.data.organizationId,
        period
      );

      return { data: report };
    } catch (error: any) {
      app.log.error(error, 'Failed to get usage report');
      return reply.status(500).send({ error: error.message || 'Failed to get usage report' });
    }
  });

  // Process monthly billing (admin only)
  app.post('/billing/process-monthly', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    try {
      const result = await billingAutomationService.processMonthlyBilling();
      return { data: result };
    } catch (error: any) {
      app.log.error(error, 'Failed to process monthly billing');
      return reply.status(500).send({ error: 'Failed to process monthly billing' });
    }
  });

  // Handle Stripe webhook
  app.post('/billing/webhook', async (request, reply) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    let event: any;

    try {
      const sig = request.headers['stripe-signature'] as string;
      if (!sig) {
        return reply.status(400).send({ error: 'Stripe signature missing' });
      }

      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      app.log.error(err, 'Webhook signature verification failed');
      return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    try {
      await billingAutomationService.handleWebhook(event);
      reply.send({ received: true });
    } catch (error: any) {
      app.log.error(error, 'Failed to handle webhook');
      return reply.status(500).send({ error: 'Failed to handle webhook' });
    }
  });

  // Get billing metrics (admin only)
  app.get('/billing/metrics', { preHandler: [app.authenticate, app.requireAdmin] }, async (request, reply) => {
    try {
      const metrics = await billingAutomationService.getBillingMetrics();
      return { data: metrics };
    } catch (error: any) {
      app.log.error(error, 'Failed to get billing metrics');
      return reply.status(500).send({ error: 'Failed to get billing metrics' });
    }
  });

  // Get overage pricing info
  app.get('/billing/overage-pricing', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const pricing = {
        domains: {
          unit: '$10',
          per: 'additional domain per month'
        },
        inboxes: {
          unit: '$0.50',
          per: 'additional inbox per month'
        },
        members: {
          unit: '$5',
          per: 'additional member per month'
        },
        apiCalls: {
          unit: '$0.10',
          per: '1000 additional API calls'
        },
        emails: {
          unit: '$0.001',
          per: 'additional email'
        },
        storage: {
          unit: '$0.10',
          per: 'additional GB per month'
        }
      };

      return { data: pricing };
    } catch (error: any) {
      app.log.error(error, 'Failed to get overage pricing');
      return reply.status(500).send({ error: 'Failed to get overage pricing' });
    }
  });

  // Get billing history for organization
  app.get('/billing/history/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ organizationId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });

    const query = querySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: 'Invalid request parameters' });
    }

    const userId = (request.user as any).userId;

    // Check permissions
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );
    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view billing history for this organization' });
    }

    try {
      // TODO: Implement billing history retrieval from Stripe
      // For now, return mock data
      const history = {
        invoices: [],
        payments: [],
        total: 0
      };

      return { data: history };
    } catch (error: any) {
      app.log.error(error, 'Failed to get billing history');
      return reply.status(500).send({ error: 'Failed to get billing history' });
    }
  });

  // Update billing email settings
  app.patch('/billing/settings/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ organizationId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      billingEmail: z.string().email().optional(),
      sendUsageReports: z.boolean().optional(),
      sendOverageAlerts: z.boolean().optional(),
      overageThreshold: z.number().min(0).max(100).optional(),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    // Check permissions
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );
    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to update billing settings for this organization' });
    }

    try {
      // TODO: Update billing settings in database
      return { success: true };
    } catch (error: any) {
      app.log.error(error, 'Failed to update billing settings');
      return reply.status(500).send({ error: 'Failed to update billing settings' });
    }
  });

  // Preview upcoming costs
  app.post('/billing/preview/:organizationId', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ organizationId: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      period: z.enum(['current_month', 'next_month']),
      projectedUsage: z.object({
        domains: z.number().optional(),
        inboxes: z.number().optional(),
        members: z.number().optional(),
        apiCalls: z.number().optional(),
        emails: z.number().optional(),
        storageGB: z.number().optional(),
      }).optional(),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    // Check permissions
    const canView = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'view'
    );
    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to preview costs for this organization' });
    }

    try {
      // TODO: Implement cost preview calculation
      const preview = {
        baseCost: 0,
        projectedOverages: {
          domains: 0,
          inboxes: 0,
          members: 0,
          apiCalls: 0,
          emails: 0,
          storage: 0
        },
        totalProjected: 0,
        warning: null
      };

      return { data: preview };
    } catch (error: any) {
      app.log.error(error, 'Failed to preview costs');
      return reply.status(500).send({ error: 'Failed to preview costs' });
    }
  });
}