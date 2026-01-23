# Phase 1: Foundation

```yaml
status: pending
priority: CRITICAL
duration: 4-6 weeks
dependencies: none
```

## Overview

Xây dựng nền tảng cho API SDK ecosystem: OpenAPI spec, API versioning, rate limit headers, webhook signatures.

## Context Links

- [Main Plan](./plan.md)
- [Brainstorm Report](../reports/brainstorm-260123-1204-api-sdk-ecosystem-development.md)
- [API Routes](../../services/api/src/routes/)

---

## 1. OpenAPI Specification

### 1.1 Generate OpenAPI Spec from Existing Routes

**Files to Create:**
```
services/api/
├── openapi/
│   ├── openapi.yaml          # Main spec file
│   ├── components/
│   │   ├── schemas.yaml      # Data models
│   │   ├── responses.yaml    # Common responses
│   │   ├── parameters.yaml   # Common params
│   │   └── security.yaml     # Auth schemes
│   └── paths/
│       ├── auth.yaml
│       ├── domains.yaml
│       ├── inboxes.yaml
│       ├── messages.yaml
│       └── webhooks.yaml
```

**Implementation Steps:**

- [ ] Install `@asteasolutions/zod-to-openapi` package
- [ ] Create OpenAPI generator script `scripts/generate-openapi.ts`
- [ ] Extract Zod schemas from all 46 routes
- [ ] Generate OpenAPI 3.1 spec
- [ ] Add examples for each endpoint
- [ ] Validate spec with `swagger-cli validate`

**Route Coverage (46 routes):**

| Category | Routes | Priority |
|----------|--------|----------|
| Auth | `/auth/*` | HIGH |
| Domains | `/domains/*` | HIGH |
| Inboxes | `/inboxes/*` | HIGH |
| Messages | `/messages/*` | HIGH |
| API Keys | `/api-keys/*` | HIGH |
| Webhooks | `/webhooks/*` | MEDIUM |
| Admin | `/admin/*` | LOW |

### 1.2 OpenAPI Spec Structure

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Ephemera API
  version: 1.0.0
  description: Temporary email platform API

servers:
  - url: https://api.manhquy.click/v1
    description: Production
  - url: http://localhost:3001/v1
    description: Development

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  /inboxes:
    $ref: './paths/inboxes.yaml#/inboxes'
  /messages:
    $ref: './paths/messages.yaml#/messages'
```

---

## 2. API Versioning

### 2.1 Add `/v1/` Prefix

**Files to Modify:**
- `services/api/src/server.ts` - Add version prefix
- `services/api/src/routes/*.ts` - Update all routes

**Implementation:**

```typescript
// server.ts
app.register(async (versionedApp) => {
  // Register all routes under /v1
  await versionedApp.register(authRoutes);
  await versionedApp.register(domainRoutes);
  // ... etc
}, { prefix: '/v1' });

// Backward compatibility redirect
app.get('/*', async (req, reply) => {
  if (!req.url.startsWith('/v1/') && !req.url.startsWith('/health')) {
    return reply.redirect(301, `/v1${req.url}`);
  }
});
```

**Tasks:**
- [ ] Create versioning plugin `plugins/api-versioning.ts`
- [ ] Update server.ts to use versioned routes
- [ ] Add deprecation headers for unversioned routes
- [ ] Update all SDK base URLs
- [ ] Update API documentation

### 2.2 Versioning Strategy

| Version | Status | Sunset Date |
|---------|--------|-------------|
| v1 | Current | - |
| unversioned | Deprecated | 2026-07-01 |

---

## 3. Rate Limit Headers

### 3.1 Standardize Headers

**Current State:** Rate limiting exists but headers inconsistent.

**Target Headers (RFC 6585 + draft-ietf-httpapi-ratelimit-headers):**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
Retry-After: 60
```

**Files to Modify:**
- `services/api/src/plugins/rate-limit.ts`

**Implementation:**

```typescript
// rate-limit.ts
app.addHook('onSend', async (request, reply) => {
  const rateLimitInfo = request.rateLimit;
  if (rateLimitInfo) {
    reply.header('X-RateLimit-Limit', rateLimitInfo.max);
    reply.header('X-RateLimit-Remaining', rateLimitInfo.remaining);
    reply.header('X-RateLimit-Reset', rateLimitInfo.resetTime);
  }
});
```

**Tasks:**
- [ ] Create `utils/rate-limit-headers.ts`
- [ ] Update rate limit plugin to add headers
- [ ] Add `Retry-After` header for 429 responses
- [ ] Document rate limits in OpenAPI spec
- [ ] Add rate limit info to error responses

---

## 4. Webhook HMAC Signatures

### 4.1 Implement Webhook Signing

**Security Requirement:** All outbound webhooks must be signed.

**Signature Format:**
```
X-Ephemera-Signature: sha256=<hmac_hex>
X-Ephemera-Timestamp: <unix_timestamp>
```

**Files to Create:**
- `services/api/src/utils/webhook-signature.ts`
- `services/api/src/services/webhook-delivery.ts`

**Implementation:**

```typescript
// webhook-signature.ts
import crypto from 'crypto';

export function signWebhook(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

export function verifyWebhook(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300
): boolean {
  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = signWebhook(payload, secret, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

**Database Changes:**

```prisma
model Webhook {
  id        String   @id @default(cuid())
  userId    String
  url       String
  secret    String   // HMAC secret
  events    String[] // ["message.received", "inbox.created"]
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

**Tasks:**
- [ ] Create webhook signature utility
- [ ] Add `secret` field to Webhook model
- [ ] Update webhook delivery to sign payloads
- [ ] Add signature verification docs for SDKs
- [ ] Create webhook test endpoint

---

## 5. SDK Monorepo Setup

### 5.1 Repository Structure

```
packages/
├── sdk-core/              # Shared utilities
│   ├── src/
│   │   ├── http-client.ts
│   │   ├── retry.ts
│   │   ├── rate-limit-handler.ts
│   │   └── webhook-verifier.ts
│   └── package.json
├── sdk-js/                # JavaScript/TypeScript
├── sdk-python/            # Python
├── sdk-go/                # Go (new)
├── sdk-php/               # PHP (new)
├── sdk-java/              # Java (new)
├── sdk-dotnet/            # .NET (new)
├── cli/                   # CLI tool
└── openapi/               # OpenAPI spec
    └── ephemera-api.yaml
```

### 5.2 Shared SDK Core

**Files to Create:**
- `packages/sdk-core/src/http-client.ts`
- `packages/sdk-core/src/retry.ts`
- `packages/sdk-core/src/rate-limit-handler.ts`

**Tasks:**
- [ ] Create `sdk-core` package
- [ ] Extract common HTTP logic from JS SDK
- [ ] Implement retry with exponential backoff
- [ ] Implement rate limit header parsing
- [ ] Add webhook signature verification

---

## 6. CI/CD Pipeline

### 6.1 OpenAPI Validation

```yaml
# .github/workflows/openapi.yml
name: OpenAPI Validation

on:
  push:
    paths:
      - 'services/api/openapi/**'
      - 'packages/openapi/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate OpenAPI
        run: npx @openapitools/openapi-generator-cli validate -i openapi.yaml

      - name: Generate SDKs (dry-run)
        run: npm run sdk:generate -- --dry-run
```

**Tasks:**
- [ ] Create OpenAPI validation workflow
- [ ] Add contract testing workflow
- [ ] Setup SDK generation CI

---

## Todo Checklist

### Week 1-2: OpenAPI Spec
- [ ] Install zod-to-openapi
- [ ] Create generator script
- [ ] Generate spec for auth routes
- [ ] Generate spec for domain routes
- [ ] Generate spec for inbox routes
- [ ] Generate spec for message routes
- [ ] Add request/response examples
- [ ] Validate complete spec

### Week 2-3: API Versioning
- [ ] Create versioning plugin
- [ ] Add /v1/ prefix to all routes
- [ ] Setup backward compatibility redirects
- [ ] Update integration tests
- [ ] Update SDK base URLs

### Week 3-4: Rate Limiting & Webhooks
- [ ] Standardize rate limit headers
- [ ] Implement webhook signing
- [ ] Add webhook secret to model
- [ ] Create verification utility
- [ ] Document in OpenAPI

### Week 4-6: SDK Infrastructure
- [ ] Create sdk-core package
- [ ] Setup monorepo tooling
- [ ] Create CI/CD pipelines
- [ ] Setup contract testing

---

## Success Criteria

- [ ] OpenAPI spec passes validation
- [ ] All routes prefixed with /v1/
- [ ] Rate limit headers on all responses
- [ ] Webhook signatures implemented
- [ ] SDK monorepo structure ready
- [ ] CI/CD pipelines operational

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing clients | Redirect unversioned → /v1/ |
| OpenAPI spec drift | Contract testing in CI |
| Webhook replay attacks | Timestamp validation |

## Next Phase

→ [Phase 2: Core SDKs](./phase-02-core-sdks.md)
