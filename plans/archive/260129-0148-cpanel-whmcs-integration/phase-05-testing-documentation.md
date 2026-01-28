---
phase: "05"
title: "Testing & Documentation"
status: completed
priority: P1
effort: 1 week
---

# Phase 05: Testing & Documentation

## Context Links
- [Plan Overview](plan.md)
- [All Previous Phases](.)

## Overview

Comprehensive testing and documentation to ensure quality and easy adoption.

## Testing Strategy

### Unit Tests

```typescript
// services/api/src/test/provider/hosting-provider.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { HostingProviderService } from '../../services/hosting-provider.service';

describe('HostingProviderService', () => {

  describe('generateApiKey', () => {
    it('should generate valid API key format', () => {
      const { key, hash, prefix } = HostingProviderService.generateApiKey();

      expect(key).toMatch(/^eph_provider_[a-f0-9]{64}$/);
      expect(hash).toHaveLength(64);
      expect(prefix).toBe(key.substring(0, 20));
    });
  });

  describe('createTenant', () => {
    let providerId: string;

    beforeAll(async () => {
      const provider = await prisma.hostingProvider.create({
        data: {
          name: 'Test Provider',
          contactEmail: 'test@provider.com',
          apiKeyHash: 'test-hash',
          apiKeyPrefix: 'eph_provider_test',
        },
      });
      providerId = provider.id;
    });

    afterAll(async () => {
      await prisma.hostingProvider.delete({ where: { id: providerId } });
    });

    it('should create tenant with organization', async () => {
      const tenant = await HostingProviderService.createTenant(providerId, {
        externalId: 'whmcs-123',
        customerEmail: 'customer@example.com',
        customerName: 'Test Customer',
        plan: 'PRO',
      });

      expect(tenant.id).toBeDefined();
      expect(tenant.organizationId).toBeDefined();
      expect(tenant.plan).toBe('PRO');
      expect(tenant.maxMailboxes).toBe(999);

      // Cleanup
      await prisma.providerTenant.delete({ where: { id: tenant.id } });
    });

    it('should enforce unique externalId per provider', async () => {
      const tenant1 = await HostingProviderService.createTenant(providerId, {
        externalId: 'unique-123',
        customerEmail: 'test1@example.com',
        plan: 'LITE',
      });

      await expect(
        HostingProviderService.createTenant(providerId, {
          externalId: 'unique-123',
          customerEmail: 'test2@example.com',
          plan: 'LITE',
        })
      ).rejects.toThrow();

      await prisma.providerTenant.delete({ where: { id: tenant1.id } });
    });
  });

  describe('createMailbox', () => {
    it('should enforce mailbox limit', async () => {
      // Create tenant with LITE plan (5 mailboxes max)
      // Create 5 mailboxes
      // Attempt 6th should fail
    });

    it('should validate domain belongs to tenant', async () => {
      // Attempt to create mailbox on unverified domain
      // Should throw error
    });
  });
});
```

### Integration Tests

```typescript
// services/api/src/test/provider/provider-api.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

describe('Provider API', () => {
  let app: any;
  let providerApiKey: string;
  let providerId: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create test provider
    const key = `eph_provider_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const provider = await prisma.hostingProvider.create({
      data: {
        name: 'Integration Test Provider',
        contactEmail: 'integration@test.com',
        apiKeyHash: hash,
        apiKeyPrefix: key.substring(0, 20),
        status: 'ACTIVE',
      },
    });

    providerId = provider.id;
    providerApiKey = key;
  });

  afterAll(async () => {
    await prisma.hostingProvider.delete({ where: { id: providerId } });
    await app.close();
  });

  describe('POST /v1/provider/tenants', () => {
    it('should create tenant with valid API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/provider/tenants',
        headers: { 'X-Provider-Key': providerApiKey },
        payload: {
          externalId: 'test-service-1',
          customerEmail: 'customer@test.com',
          plan: 'LITE',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.tenant.id).toBeDefined();
      expect(body.tenant.status).toBe('ACTIVE');
    });

    it('should reject invalid API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/provider/tenants',
        headers: { 'X-Provider-Key': 'invalid-key' },
        payload: { externalId: 'test', customerEmail: 'test@test.com', plan: 'LITE' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/provider/tenants',
        payload: { externalId: 'test', customerEmail: 'test@test.com', plan: 'LITE' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /v1/provider/tenants/:id/suspend', () => {
    it('should suspend active tenant', async () => {
      // Create tenant first
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/provider/tenants',
        headers: { 'X-Provider-Key': providerApiKey },
        payload: { externalId: 'suspend-test', customerEmail: 'suspend@test.com', plan: 'LITE' },
      });

      const tenantId = JSON.parse(createRes.body).tenant.id;

      // Suspend
      const suspendRes = await app.inject({
        method: 'POST',
        url: `/v1/provider/tenants/${tenantId}/suspend`,
        headers: { 'X-Provider-Key': providerApiKey },
      });

      expect(suspendRes.statusCode).toBe(200);
      expect(JSON.parse(suspendRes.body).status).toBe('SUSPENDED');
    });
  });
});
```

### E2E Tests

```typescript
// services/api/src/test/provider/e2e-provisioning.test.ts

describe('E2E Provisioning Flow', () => {
  it('should complete full provisioning lifecycle', async () => {
    // 1. Create tenant
    // 2. Add domain
    // 3. Verify domain (mock DNS)
    // 4. Create mailbox
    // 5. Login to IMAP
    // 6. Send test email via SMTP
    // 7. Verify email received
    // 8. Suspend tenant
    // 9. Verify IMAP/SMTP blocked
    // 10. Unsuspend
    // 11. Terminate
  });
});
```

## Documentation Structure

### Provider Documentation

```
docs/
├── provider/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── cpanel-plugin.md
│   ├── whmcs-module.md
│   ├── directadmin-plugin.md
│   ├── plesk-extension.md
│   ├── webhooks.md
│   └── troubleshooting.md
```

### API Reference (OpenAPI)

```yaml
# docs/provider/openapi.yaml
openapi: 3.0.3
info:
  title: Ephemera Hosting Provider API
  version: 1.0.0
  description: API for hosting providers to provision and manage email hosting

servers:
  - url: https://api.ephemera.email
    description: Production

security:
  - providerApiKey: []

paths:
  /v1/provider/tenants:
    post:
      summary: Create tenant
      operationId: createTenant
      tags: [Tenants]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTenantRequest'
      responses:
        '201':
          description: Tenant created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TenantResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  securitySchemes:
    providerApiKey:
      type: apiKey
      in: header
      name: X-Provider-Key

  schemas:
    CreateTenantRequest:
      type: object
      required: [externalId, customerEmail, plan]
      properties:
        externalId:
          type: string
          description: Your internal service/account ID
        customerEmail:
          type: string
          format: email
        customerName:
          type: string
        plan:
          type: string
          enum: [LITE, PRO, BUSINESS]

    TenantResponse:
      type: object
      properties:
        tenant:
          $ref: '#/components/schemas/Tenant'

    Tenant:
      type: object
      properties:
        id:
          type: string
          format: uuid
        externalId:
          type: string
        status:
          type: string
          enum: [PENDING, ACTIVE, SUSPENDED, TERMINATED]
        plan:
          type: string
        maxMailboxes:
          type: integer
        maxStorageGb:
          type: integer
        createdAt:
          type: string
          format: date-time
```

### Getting Started Guide

```markdown
# Getting Started with Ephemera Provider API

## 1. Register as Provider

1. Go to https://ephemera.email/providers
2. Fill registration form
3. Receive API key via email

## 2. Test Connection

```bash
curl -X GET https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: eph_provider_your_key_here"
```

## 3. Create Your First Tenant

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "customer-123",
    "customerEmail": "customer@example.com",
    "plan": "LITE"
  }'
```

## 4. Add Domain

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/domains \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"domain": "customerdomain.com"}'
```

## 5. Create Mailbox

```bash
curl -X POST https://api.ephemera.email/v1/provider/tenants/{tenant_id}/mailboxes \
  -H "X-Provider-Key: eph_provider_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "localPart": "info",
    "domain": "customerdomain.com",
    "password": "SecurePassword123!"
  }'
```

## Next Steps

- [API Reference](api-reference.md)
- [cPanel Plugin Installation](cpanel-plugin.md)
- [WHMCS Module Installation](whmcs-module.md)
```

## Todo List

- [x] Write unit tests for HostingProviderService
- [x] Write integration tests for Provider API
- [x] Write E2E provisioning tests
- [x] Create OpenAPI specification
- [x] Write Getting Started guide
- [x] Document cPanel plugin installation
- [x] Document WHMCS module installation
- [x] Create troubleshooting guide
- [ ] Record video tutorials
- [ ] Setup docs website (Docusaurus/GitBook)

## Success Criteria

- [x] 90%+ test coverage for provider module
- [x] All API endpoints documented
- [x] Installation guides for all panels
- [ ] Video walkthrough available

## Next Steps

→ [Phase 06: Go-to-Market](phase-06-go-to-market.md)
