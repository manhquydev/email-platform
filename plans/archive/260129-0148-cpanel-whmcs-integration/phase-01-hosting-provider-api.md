---
phase: "01"
title: "Hosting Provider API Foundation"
status: completed
priority: P1
effort: 2 weeks
---

# Phase 01: Hosting Provider API Foundation

## Context Links
- [Plan Overview](plan.md)
- [Existing v1 Routes](../../services/api/src/routes/v1/index.ts)
- [Organization Model](../../services/api/prisma/schema.prisma)

## Overview

Xây dựng API layer dành riêng cho hosting providers với authentication, provisioning, usage metering và billing sync.

## Key Insights

1. **Hosting providers cần API key riêng** - Khác với user API keys, cần scoped permissions
2. **Provisioning phải synchronous** - WHMCS expect immediate response
3. **Usage metering critical** - Để billing chính xác
4. **Webhook events** - Notify WHMCS khi có thay đổi

## Requirements

### Functional Requirements
- FR-01: Provider registration và API key management
- FR-02: Tenant (customer) CRUD operations
- FR-03: Domain provisioning với auto DNS verification
- FR-04: Mailbox CRUD với quota management
- FR-05: Usage metrics API (storage, messages, bandwidth)
- FR-06: Billing sync endpoints
- FR-07: Webhook events cho status changes

### Non-Functional Requirements
- NFR-01: API response time < 500ms (P95)
- NFR-02: 99.9% uptime SLA
- NFR-03: Rate limit 1000 req/min per provider
- NFR-04: Full audit logging

## Database Schema

```prisma
// Thêm vào schema.prisma

model HostingProvider {
  id            String   @id @default(uuid())
  name          String
  contactEmail  String
  apiKeyHash    String   @unique
  apiKeyPrefix  String   // First 8 chars for identification
  tier          ProviderTier @default(STARTER)

  // Limits
  maxTenants    Int      @default(100)
  maxMailboxes  Int      @default(1000)
  maxStorageGb  Int      @default(100)

  // Billing
  billingEmail  String?
  webhookUrl    String?
  webhookSecret String?

  // Status
  status        ProviderStatus @default(ACTIVE)

  // Relations
  tenants       ProviderTenant[]
  usageLogs     ProviderUsageLog[]
  webhookEvents ProviderWebhookEvent[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([apiKeyPrefix])
}

enum ProviderTier {
  STARTER    // 100 tenants, $1/domain
  GROWTH     // 500 tenants, $0.80/domain
  ENTERPRISE // Unlimited, custom pricing
}

enum ProviderStatus {
  PENDING
  ACTIVE
  SUSPENDED
  TERMINATED
}

model ProviderTenant {
  id              String   @id @default(uuid())
  providerId      String
  provider        HostingProvider @relation(fields: [providerId], references: [id])

  // External reference (WHMCS service ID)
  externalId      String

  // Customer info
  customerEmail   String
  customerName    String?

  // Plan
  plan            TenantPlan @default(LITE)

  // Limits based on plan
  maxMailboxes    Int      @default(5)
  maxStorageGb    Int      @default(5)

  // Link to Organization
  organizationId  String?  @unique
  organization    Organization? @relation(fields: [organizationId], references: [id])

  // Status
  status          TenantStatus @default(PENDING)

  // Domains
  domains         ProviderTenantDomain[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  suspendedAt     DateTime?
  terminatedAt    DateTime?

  @@unique([providerId, externalId])
  @@index([providerId])
  @@index([customerEmail])
}

enum TenantPlan {
  LITE      // 5 mailboxes, 1GB each
  PRO       // Unlimited, 10GB each
  BUSINESS  // Unlimited, 50GB each, LDAP
}

enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
  TERMINATED
}

model ProviderTenantDomain {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      ProviderTenant @relation(fields: [tenantId], references: [id])

  domainName  String
  verified    Boolean  @default(false)

  // Link to Domain model
  domainId    String?  @unique
  domain      Domain?  @relation(fields: [domainId], references: [id])

  createdAt   DateTime @default(now())
  verifiedAt  DateTime?

  @@unique([tenantId, domainName])
  @@index([domainName])
}

model ProviderUsageLog {
  id          String   @id @default(uuid())
  providerId  String
  provider    HostingProvider @relation(fields: [providerId], references: [id])

  tenantId    String?

  // Metrics
  period      DateTime // Monthly period start
  mailboxes   Int      @default(0)
  storageBytes BigInt  @default(0)
  messagesSent Int     @default(0)
  messagesReceived Int @default(0)

  createdAt   DateTime @default(now())

  @@unique([providerId, tenantId, period])
  @@index([providerId, period])
}

model ProviderWebhookEvent {
  id          String   @id @default(uuid())
  providerId  String
  provider    HostingProvider @relation(fields: [providerId], references: [id])

  eventType   String   // tenant.created, mailbox.created, etc.
  payload     Json

  // Delivery status
  deliveredAt DateTime?
  attempts    Int      @default(0)
  lastError   String?

  createdAt   DateTime @default(now())

  @@index([providerId, createdAt])
  @@index([deliveredAt])
}
```

## API Endpoints

### Authentication
```
POST /v1/provider/register     # Register new provider
POST /v1/provider/api-key      # Regenerate API key
GET  /v1/provider/me           # Get provider info
```

### Tenant Management
```
POST   /v1/provider/tenants              # Create tenant
GET    /v1/provider/tenants              # List tenants
GET    /v1/provider/tenants/:id          # Get tenant
PATCH  /v1/provider/tenants/:id          # Update tenant
POST   /v1/provider/tenants/:id/suspend  # Suspend tenant
POST   /v1/provider/tenants/:id/unsuspend
DELETE /v1/provider/tenants/:id          # Terminate tenant
```

### Domain Management
```
POST   /v1/provider/tenants/:id/domains           # Add domain
GET    /v1/provider/tenants/:id/domains           # List domains
DELETE /v1/provider/tenants/:id/domains/:domain   # Remove domain
GET    /v1/provider/tenants/:id/domains/:domain/dns  # Get DNS records
POST   /v1/provider/tenants/:id/domains/:domain/verify
```

### Mailbox Management
```
POST   /v1/provider/tenants/:id/mailboxes         # Create mailbox
GET    /v1/provider/tenants/:id/mailboxes         # List mailboxes
PATCH  /v1/provider/tenants/:id/mailboxes/:email  # Update mailbox
DELETE /v1/provider/tenants/:id/mailboxes/:email  # Delete mailbox
POST   /v1/provider/tenants/:id/mailboxes/:email/password
```

### Usage & Billing
```
GET  /v1/provider/usage                    # Provider-level usage
GET  /v1/provider/tenants/:id/usage        # Tenant usage
GET  /v1/provider/billing/summary          # Billing summary
GET  /v1/provider/billing/invoice/:period  # Monthly invoice
```

### Webhooks
```
POST /v1/provider/webhooks/test            # Test webhook delivery
GET  /v1/provider/webhooks/events          # List recent events
```

## Implementation Steps

### Step 1: Database Migration (Day 1)
```bash
# Create migration file
pnpm exec prisma migrate dev --name hosting_provider_api
```

### Step 2: Provider Auth Middleware (Day 1-2)
```typescript
// services/api/src/middleware/provider-auth.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export interface ProviderAuthPayload {
  providerId: string;
  tier: string;
  limits: {
    maxTenants: number;
    maxMailboxes: number;
    maxStorageGb: number;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    provider?: ProviderAuthPayload;
  }
}

export async function providerAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-provider-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({ error: 'Provider API key required' });
  }

  // Hash the key for lookup
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const provider = await prisma.hostingProvider.findUnique({
    where: { apiKeyHash: keyHash },
    select: {
      id: true,
      tier: true,
      status: true,
      maxTenants: true,
      maxMailboxes: true,
      maxStorageGb: true,
    },
  });

  if (!provider) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }

  if (provider.status !== 'ACTIVE') {
    return reply.status(403).send({ error: `Provider account ${provider.status.toLowerCase()}` });
  }

  request.provider = {
    providerId: provider.id,
    tier: provider.tier,
    limits: {
      maxTenants: provider.maxTenants,
      maxMailboxes: provider.maxMailboxes,
      maxStorageGb: provider.maxStorageGb,
    },
  };
}
```

### Step 3: Provider Service (Day 2-4)
```typescript
// services/api/src/services/hosting-provider.service.ts

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { TenantPlan, TenantStatus } from '@prisma/client';

export class HostingProviderService {

  // Generate secure API key
  static generateApiKey(): { key: string; hash: string; prefix: string } {
    const key = `eph_provider_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 20);
    return { key, hash, prefix };
  }

  // Create tenant with organization
  static async createTenant(
    providerId: string,
    data: {
      externalId: string;
      customerEmail: string;
      customerName?: string;
      plan: TenantPlan;
    }
  ) {
    const planLimits = this.getPlanLimits(data.plan);

    // Create organization first
    const org = await prisma.organization.create({
      data: {
        name: data.customerName || data.customerEmail,
        slug: `provider-${providerId.slice(0, 8)}-${data.externalId}`,
        plan: data.plan === 'BUSINESS' ? 'ENTERPRISE' : 'PRO',
      },
    });

    // Create tenant linked to org
    const tenant = await prisma.providerTenant.create({
      data: {
        providerId,
        externalId: data.externalId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        plan: data.plan,
        maxMailboxes: planLimits.mailboxes,
        maxStorageGb: planLimits.storageGb,
        organizationId: org.id,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        domains: true,
      },
    });

    return tenant;
  }

  // Add domain to tenant
  static async addDomain(tenantId: string, domainName: string) {
    const tenant = await prisma.providerTenant.findUnique({
      where: { id: tenantId },
      include: { organization: true },
    });

    if (!tenant || !tenant.organizationId) {
      throw new Error('Tenant not found');
    }

    // Create domain in main system
    const domain = await prisma.domain.create({
      data: {
        name: domainName.toLowerCase(),
        organizationId: tenant.organizationId,
        status: 'PENDING',
        isPublic: false,
      },
    });

    // Link to tenant
    const tenantDomain = await prisma.providerTenantDomain.create({
      data: {
        tenantId,
        domainName: domainName.toLowerCase(),
        domainId: domain.id,
      },
    });

    // Generate DNS records for verification
    const dnsRecords = this.generateDnsRecords(domain.id, domainName);

    return { domain: tenantDomain, dnsRecords };
  }

  // Create mailbox
  static async createMailbox(
    tenantId: string,
    data: {
      localPart: string;
      domain: string;
      password: string;
      displayName?: string;
      quotaMb?: number;
    }
  ) {
    const tenant = await prisma.providerTenant.findUnique({
      where: { id: tenantId },
      include: {
        domains: { include: { domain: true } },
        organization: true,
      },
    });

    if (!tenant) throw new Error('Tenant not found');

    // Check domain belongs to tenant
    const tenantDomain = tenant.domains.find(
      d => d.domainName === data.domain.toLowerCase()
    );
    if (!tenantDomain || !tenantDomain.domainId) {
      throw new Error('Domain not found or not verified');
    }

    // Check mailbox limit
    const currentCount = await prisma.inbox.count({
      where: {
        domain: { organizationId: tenant.organizationId },
        deletedAt: null,
      },
    });

    if (currentCount >= tenant.maxMailboxes) {
      throw new Error(`Mailbox limit reached (${tenant.maxMailboxes})`);
    }

    // Create inbox (mailbox)
    const inbox = await prisma.inbox.create({
      data: {
        localPart: data.localPart.toLowerCase(),
        domainId: tenantDomain.domainId,
        password: await this.hashPassword(data.password),
        displayName: data.displayName,
        quotaMb: data.quotaMb || this.getPlanLimits(tenant.plan).storageGb * 1024,
      },
    });

    return inbox;
  }

  // Get usage metrics
  static async getUsage(providerId: string, tenantId?: string) {
    const where = tenantId
      ? { providerId, tenantId }
      : { providerId };

    const currentPeriod = new Date();
    currentPeriod.setDate(1);
    currentPeriod.setHours(0, 0, 0, 0);

    // Aggregate current usage
    const tenants = await prisma.providerTenant.findMany({
      where: { providerId, ...(tenantId ? { id: tenantId } : {}) },
      include: {
        organization: {
          include: {
            domains: {
              include: {
                inboxes: {
                  where: { deletedAt: null },
                  include: {
                    _count: { select: { messages: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalMailboxes = 0;
    let totalStorageBytes = 0n;
    let totalMessages = 0;

    for (const tenant of tenants) {
      if (!tenant.organization) continue;
      for (const domain of tenant.organization.domains) {
        for (const inbox of domain.inboxes) {
          totalMailboxes++;
          totalMessages += inbox._count.messages;
          // Storage would need actual calculation from attachments
        }
      }
    }

    return {
      period: currentPeriod.toISOString(),
      tenants: tenants.length,
      mailboxes: totalMailboxes,
      storageBytes: totalStorageBytes.toString(),
      messages: totalMessages,
    };
  }

  // Helper: Get plan limits
  private static getPlanLimits(plan: TenantPlan) {
    const limits = {
      LITE: { mailboxes: 5, storageGb: 1 },
      PRO: { mailboxes: 999, storageGb: 10 },
      BUSINESS: { mailboxes: 999, storageGb: 50 },
    };
    return limits[plan];
  }

  // Helper: Generate DNS records
  private static generateDnsRecords(domainId: string, domainName: string) {
    const verifyToken = crypto.randomBytes(16).toString('hex');
    return [
      {
        type: 'TXT',
        name: `_ephemera.${domainName}`,
        value: `ephemera-verify=${verifyToken}`,
        purpose: 'Domain verification',
      },
      {
        type: 'MX',
        name: domainName,
        value: `mail.ephemera.email`,
        priority: 10,
        purpose: 'Mail routing',
      },
      {
        type: 'TXT',
        name: domainName,
        value: `v=spf1 include:spf.ephemera.email ~all`,
        purpose: 'SPF record',
      },
      {
        type: 'CNAME',
        name: `mail._domainkey.${domainName}`,
        value: `dkim.ephemera.email`,
        purpose: 'DKIM signing',
      },
    ];
  }

  // Helper: Hash password
  private static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  }
}
```

### Step 4: Provider Routes (Day 4-6)
```typescript
// services/api/src/routes/provider.ts

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { providerAuthMiddleware } from '../middleware/provider-auth';
import { HostingProviderService } from '../services/hosting-provider.service';

export const providerRoutes = async (app: FastifyInstance) => {

  // All routes require provider auth
  app.addHook('preHandler', providerAuthMiddleware);

  // === Tenant Management ===

  // Create tenant
  app.post('/v1/provider/tenants', async (request, reply) => {
    const schema = z.object({
      externalId: z.string().min(1).max(100),
      customerEmail: z.string().email(),
      customerName: z.string().optional(),
      plan: z.enum(['LITE', 'PRO', 'BUSINESS']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
    }

    try {
      const tenant = await HostingProviderService.createTenant(
        request.provider!.providerId,
        body.data
      );

      return reply.status(201).send({ tenant });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // List tenants
  app.get('/v1/provider/tenants', async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
      status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
    }).safeParse(request.query);

    const tenants = await prisma.providerTenant.findMany({
      where: {
        providerId: request.provider!.providerId,
        ...(query.data?.status ? { status: query.data.status } : {}),
      },
      take: query.data?.limit,
      skip: query.data?.offset,
      include: {
        domains: true,
        _count: { select: { domains: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { tenants };
  });

  // Get tenant
  app.get('/v1/provider/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.providerTenant.findFirst({
      where: { id, providerId: request.provider!.providerId },
      include: {
        domains: { include: { domain: true } },
        organization: true,
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    return { tenant };
  });

  // Suspend tenant
  app.post('/v1/provider/tenants/:id/suspend', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.providerTenant.updateMany({
      where: { id, providerId: request.provider!.providerId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });

    if (tenant.count === 0) {
      return reply.status(404).send({ error: 'Tenant not found or already suspended' });
    }

    return { ok: true, status: 'SUSPENDED' };
  });

  // Unsuspend tenant
  app.post('/v1/provider/tenants/:id/unsuspend', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.providerTenant.updateMany({
      where: { id, providerId: request.provider!.providerId, status: 'SUSPENDED' },
      data: { status: 'ACTIVE', suspendedAt: null },
    });

    if (tenant.count === 0) {
      return reply.status(404).send({ error: 'Tenant not found or not suspended' });
    }

    return { ok: true, status: 'ACTIVE' };
  });

  // Terminate tenant
  app.delete('/v1/provider/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.providerTenant.updateMany({
      where: { id, providerId: request.provider!.providerId },
      data: { status: 'TERMINATED', terminatedAt: new Date() },
    });

    if (tenant.count === 0) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Note: Actual data deletion should be scheduled, not immediate
    return { ok: true, status: 'TERMINATED' };
  });

  // === Domain Management ===

  // Add domain
  app.post('/v1/provider/tenants/:id/domains', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      domain: z.string().min(3).max(255),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid domain' });
    }

    try {
      const result = await HostingProviderService.addDomain(id, body.data.domain);
      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Get DNS records
  app.get('/v1/provider/tenants/:id/domains/:domain/dns', async (request, reply) => {
    const { id, domain } = request.params as { id: string; domain: string };

    const tenantDomain = await prisma.providerTenantDomain.findFirst({
      where: {
        tenantId: id,
        domainName: domain.toLowerCase(),
        tenant: { providerId: request.provider!.providerId },
      },
      include: { domain: true },
    });

    if (!tenantDomain) {
      return reply.status(404).send({ error: 'Domain not found' });
    }

    // Return DNS records needed
    const dnsRecords = [
      { type: 'MX', name: domain, value: 'mail.ephemera.email', priority: 10 },
      { type: 'TXT', name: domain, value: 'v=spf1 include:spf.ephemera.email ~all' },
      { type: 'CNAME', name: `mail._domainkey.${domain}`, value: 'dkim.ephemera.email' },
    ];

    return { domain: tenantDomain, dnsRecords, verified: tenantDomain.verified };
  });

  // === Mailbox Management ===

  // Create mailbox
  app.post('/v1/provider/tenants/:id/mailboxes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      localPart: z.string().min(1).max(64).regex(/^[a-z0-9._-]+$/i),
      domain: z.string(),
      password: z.string().min(8),
      displayName: z.string().optional(),
      quotaMb: z.number().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
    }

    try {
      const mailbox = await HostingProviderService.createMailbox(id, body.data);
      return reply.status(201).send({
        mailbox: {
          email: `${mailbox.localPart}@${body.data.domain}`,
          displayName: mailbox.displayName,
          quotaMb: mailbox.quotaMb,
        }
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // === Usage & Billing ===

  // Get usage
  app.get('/v1/provider/usage', async (request, reply) => {
    const usage = await HostingProviderService.getUsage(request.provider!.providerId);
    return { usage };
  });

  // Get tenant usage
  app.get('/v1/provider/tenants/:id/usage', async (request, reply) => {
    const { id } = request.params as { id: string };
    const usage = await HostingProviderService.getUsage(request.provider!.providerId, id);
    return { usage };
  });
};
```

### Step 5: Webhook Service (Day 7-8)
```typescript
// services/api/src/services/provider-webhook.service.ts

import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class ProviderWebhookService {

  static async emit(
    providerId: string,
    eventType: string,
    payload: Record<string, any>
  ) {
    const provider = await prisma.hostingProvider.findUnique({
      where: { id: providerId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!provider?.webhookUrl) return;

    // Create event record
    const event = await prisma.providerWebhookEvent.create({
      data: {
        providerId,
        eventType,
        payload,
      },
    });

    // Deliver async
    this.deliver(event.id, provider.webhookUrl, provider.webhookSecret).catch(console.error);

    return event;
  }

  private static async deliver(
    eventId: string,
    url: string,
    secret: string | null
  ) {
    const event = await prisma.providerWebhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    const body = JSON.stringify({
      id: event.id,
      type: event.eventType,
      data: event.payload,
      timestamp: event.createdAt.toISOString(),
    });

    // Sign payload
    const signature = secret
      ? crypto.createHmac('sha256', secret).update(body).digest('hex')
      : null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature ? { 'X-Ephemera-Signature': `sha256=${signature}` } : {}),
        },
        body,
      });

      if (response.ok) {
        await prisma.providerWebhookEvent.update({
          where: { id: eventId },
          data: { deliveredAt: new Date(), attempts: { increment: 1 } },
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      await prisma.providerWebhookEvent.update({
        where: { id: eventId },
        data: {
          attempts: { increment: 1 },
          lastError: error.message,
        },
      });

      // Retry logic (exponential backoff) would go here
    }
  }
}
```

### Step 6: Register Routes (Day 8)
```typescript
// Add to services/api/src/server.ts

import { providerRoutes } from './routes/provider';

// In buildServer():
app.register(providerRoutes);
```

### Step 7: Rate Limiting (Day 9)
```typescript
// Add provider-specific rate limits
app.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Use provider ID if available, otherwise IP
    return request.provider?.providerId || request.ip;
  },
});
```

### Step 8: OpenAPI Documentation (Day 10)
```typescript
// Add to swagger plugin
{
  openapi: {
    info: {
      title: 'Ephemera Hosting Provider API',
      version: '1.0.0',
    },
    tags: [
      { name: 'Provider', description: 'Provider management' },
      { name: 'Tenant', description: 'Tenant CRUD operations' },
      { name: 'Domain', description: 'Domain management' },
      { name: 'Mailbox', description: 'Mailbox operations' },
      { name: 'Usage', description: 'Usage metrics and billing' },
    ],
    components: {
      securitySchemes: {
        providerApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Provider-Key',
        },
      },
    },
  },
}
```

## Todo List

- [x] Create Prisma migration with new models
- [x] Implement `providerAuthMiddleware`
- [x] Implement `HostingProviderService`
- [x] Create `/v1/provider/*` routes
- [x] Implement webhook delivery service
- [x] Add rate limiting per provider
- [x] Generate OpenAPI documentation
- [x] Write unit tests for service
- [x] Write integration tests for routes
- [x] Update server.ts to register routes

## Success Criteria

- [ ] All CRUD operations working
- [ ] API response time < 500ms (P95)
- [ ] Webhook delivery with retry
- [ ] 100% test coverage for service layer
- [ ] OpenAPI docs accessible at `/docs/provider`

## Security Considerations

1. **API Key Security**: SHA-256 hashed, never stored plain
2. **Rate Limiting**: 1000 req/min per provider
3. **Input Validation**: Zod schemas for all endpoints
4. **Audit Logging**: All mutations logged
5. **Tenant Isolation**: Providers can only access their own tenants

## Next Steps

After completing Phase 01:
→ [Phase 02: cPanel/WHM Plugin](phase-02-cpanel-whm-plugin.md)
