/**
 * Provider Routes
 * API endpoints for hosting providers (cPanel/WHMCS integration)
 * All routes require X-Provider-Key authentication
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { providerAuthMiddleware } from '../middleware/provider-auth';
import { HostingProviderService } from '../services/hosting-provider.service';
import { ProviderWebhookService } from '../services/provider-webhook.service';
import { ProviderSsoService } from '../services/provider-sso.service';
import { TenantPlan, TenantStatus } from '@prisma/client';

// Zod schemas for validation
const createTenantSchema = z.object({
  externalId: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  plan: z.enum(['LITE', 'PRO', 'BUSINESS']),
});

const updateTenantSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  plan: z.enum(['LITE', 'PRO', 'BUSINESS']).optional(),
});

const addDomainSchema = z.object({
  domain: z.string().min(3).max(255).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i),
});

const createMailboxSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-z0-9._-]+$/i),
  domain: z.string(),
  password: z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
  quotaMb: z.number().min(100).max(102400).optional(),
});

const ssoSchema = z.object({
  clientIp: z.string().min(7).max(45), // IPv4 or IPv6 address
});

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
});

export const providerRoutes = async (app: FastifyInstance) => {
  // Apply provider auth middleware to all routes
  app.addHook('preHandler', providerAuthMiddleware);

  // === Provider Info ===

  // Get current provider info
  app.get('/v1/provider/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await HostingProviderService.getProvider(request.provider!.providerId);
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }
    return { provider };
  });

  // Regenerate API key
  app.post('/v1/provider/api-key', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await HostingProviderService.regenerateApiKey(request.provider!.providerId);
    return {
      message: 'API key regenerated. Store this key securely - it will not be shown again.',
      ...result,
    };
  });

  // === Tenant Management ===

  // Create tenant
  app.post('/v1/provider/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    try {
      const tenant = await HostingProviderService.createTenant(
        request.provider!.providerId,
        parsed.data
      );

      // Emit webhook event
      await ProviderWebhookService.emit(request.provider!.providerId, 'tenant.created', {
        tenantId: tenant.id,
        externalId: tenant.externalId,
        plan: tenant.plan,
      });

      return reply.status(201).send({ tenant });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      request.log.error(error);
      return reply.status(400).send({ error: message });
    }
  });

  // List tenants
  app.get('/v1/provider/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listQuerySchema.safeParse(request.query);
    const result = await HostingProviderService.listTenants(
      request.provider!.providerId,
      query.success ? query.data : {}
    );
    return result;
  });

  // Get tenant
  app.get('/v1/provider/tenants/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenant = await HostingProviderService.getTenant(request.provider!.providerId, id);

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }
    return { tenant };
  });

  // Update tenant
  app.patch('/v1/provider/tenants/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    try {
      const tenant = await HostingProviderService.updateTenant(
        request.provider!.providerId,
        id,
        parsed.data
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'tenant.updated', {
        tenantId: tenant.id,
        externalId: tenant.externalId,
        changes: Object.keys(parsed.data),
      });

      return { tenant };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // Suspend tenant
  app.post('/v1/provider/tenants/:id/suspend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await HostingProviderService.suspendTenant(request.provider!.providerId, id);

      await ProviderWebhookService.emit(request.provider!.providerId, 'tenant.suspended', {
        tenantId: id,
      });

      return { ok: true, ...result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Unsuspend tenant
  app.post('/v1/provider/tenants/:id/unsuspend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await HostingProviderService.unsuspendTenant(request.provider!.providerId, id);

      await ProviderWebhookService.emit(request.provider!.providerId, 'tenant.unsuspended', {
        tenantId: id,
      });

      return { ok: true, ...result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Terminate tenant
  app.delete('/v1/provider/tenants/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await HostingProviderService.terminateTenant(request.provider!.providerId, id);

      await ProviderWebhookService.emit(request.provider!.providerId, 'tenant.terminated', {
        tenantId: id,
      });

      return { ok: true, ...result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // === Domain Management ===

  // Add domain to tenant
  app.post('/v1/provider/tenants/:id/domains', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = addDomainSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid domain format' });
    }

    try {
      const result = await HostingProviderService.addDomain(
        request.provider!.providerId,
        id,
        parsed.data.domain
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'domain.added', {
        tenantId: id,
        domain: parsed.data.domain,
      });

      return reply.status(201).send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // List domains for tenant
  app.get('/v1/provider/tenants/:id/domains', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const domains = await HostingProviderService.listDomains(request.provider!.providerId, id);
      return { domains };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Get DNS records for domain
  app.get('/v1/provider/tenants/:id/domains/:domain/dns', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, domain } = request.params as { id: string; domain: string };

    try {
      const result = await HostingProviderService.getDomainDns(
        request.provider!.providerId,
        id,
        domain
      );
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Verify domain
  app.post('/v1/provider/tenants/:id/domains/:domain/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, domain } = request.params as { id: string; domain: string };

    try {
      const result = await HostingProviderService.verifyDomain(
        request.provider!.providerId,
        id,
        domain
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'domain.verified', {
        tenantId: id,
        domain,
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // Remove domain
  app.delete('/v1/provider/tenants/:id/domains/:domain', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, domain } = request.params as { id: string; domain: string };

    try {
      const result = await HostingProviderService.removeDomain(
        request.provider!.providerId,
        id,
        domain
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'domain.removed', {
        tenantId: id,
        domain,
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // === Mailbox Management ===

  // Create mailbox
  app.post('/v1/provider/tenants/:id/mailboxes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = createMailboxSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    try {
      const mailbox = await HostingProviderService.createMailbox(
        request.provider!.providerId,
        id,
        parsed.data
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'mailbox.created', {
        tenantId: id,
        email: mailbox.email,
      });

      return reply.status(201).send({ mailbox });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // List mailboxes
  app.get('/v1/provider/tenants/:id/mailboxes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const mailboxes = await HostingProviderService.listMailboxes(request.provider!.providerId, id);
      return { mailboxes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Delete mailbox
  app.delete('/v1/provider/tenants/:id/mailboxes/:email', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, email } = request.params as { id: string; email: string };

    try {
      const result = await HostingProviderService.deleteMailbox(
        request.provider!.providerId,
        id,
        decodeURIComponent(email)
      );

      await ProviderWebhookService.emit(request.provider!.providerId, 'mailbox.deleted', {
        tenantId: id,
        email: decodeURIComponent(email),
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  // Generate SSO token
  app.post('/v1/provider/tenants/:id/mailboxes/:email/sso', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, email } = request.params as { id: string; email: string };
    const parsed = ssoSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    try {
      const tenant = await HostingProviderService.getTenant(request.provider!.providerId, id);
      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }

      const ssoUrl = await ProviderSsoService.generateToken(
        request.provider!.providerId,
        id,
        decodeURIComponent(email),
        parsed.data.clientIp
      );

      return { ssoUrl };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // === Usage & Billing ===

  // Get provider usage
  app.get('/v1/provider/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const usage = await HostingProviderService.getUsage(request.provider!.providerId);
    return { usage };
  });

  // Get tenant usage
  app.get('/v1/provider/tenants/:id/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const usage = await HostingProviderService.getUsage(request.provider!.providerId, id);
    return { usage };
  });

  // === Webhooks ===

  // Test webhook delivery
  app.post('/v1/provider/webhooks/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await ProviderWebhookService.testWebhook(request.provider!.providerId);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // List webhook events
  app.get('/v1/provider/webhooks/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listQuerySchema.safeParse(request.query);
    const result = await ProviderWebhookService.listEvents(
      request.provider!.providerId,
      query.success ? { limit: query.data.limit, offset: query.data.offset } : {}
    );
    return result;
  });
};
