# Phase 3: Developer API + SDK

**Effort**: 12h | **Priority**: P1 | **Week**: 3-4

## Overview
"Stripe for Privacy" - World-class developer experience with official SDKs.

## Key Features
- REST API v1 with OpenAPI spec
- Official Node.js SDK
- Webhook system with HMAC signing
- Interactive developer portal

## Technical Tasks

### 1. API v1 Endpoints (4h)
**File**: `services/api/src/routes/v1/`

```
POST   /v1/inboxes              # Create inbox
GET    /v1/inboxes/:id          # Get inbox details
DELETE /v1/inboxes/:id          # Delete inbox
GET    /v1/inboxes/:id/messages # List messages
GET    /v1/messages/:id         # Get message detail
GET    /v1/messages/:id/otp     # Extract OTP
POST   /v1/webhooks             # Register webhook
DELETE /v1/webhooks/:id         # Remove webhook
GET    /v1/usage                # Get usage stats
```

### 2. API Key Management (2h)
**File**: `services/api/src/services/api-key.service.ts`
- Key format: `eph_live_xxxx` / `eph_test_xxxx`
- Scopes: `inboxes:read`, `inboxes:write`, `messages:read`
- Rate limiting per key based on tier
- Usage tracking per key

### 3. Node.js SDK (3h)
**Package**: `packages/sdk-node/`
```typescript
import { Ephemera } from '@ephemera/sdk';

const client = new Ephemera('eph_live_xxx');

// Create inbox
const inbox = await client.inboxes.create();

// Get messages
const messages = await client.inboxes.messages(inbox.id);

// Extract OTP
const otp = await client.messages.extractOtp(messageId);
```

### 4. Webhook System (2h)
**File**: `services/api/src/services/webhook.service.ts`
- Events: `message.received`, `inbox.created`, `inbox.deleted`
- HMAC-SHA256 signature verification
- Retry with exponential backoff (3 attempts)
- Webhook logs in dashboard

### 5. Developer Portal (1h)
**File**: `services/web/src/app/developer/`
- API key management UI
- Usage dashboard (requests, inboxes)
- Interactive API explorer (Swagger UI embed)
- Webhook configuration

## API Pricing
| Tier | Price | Requests/mo |
|------|-------|-------------|
| Free | $0 | 1,000 |
| Starter | $20/mo | 10,000 |
| Pro | $60/mo | 50,000 |

## Success Criteria
- [ ] Time to First API Call < 5 minutes
- [ ] SDK published to npm
- [ ] 99.9% API uptime
- [ ] Webhook delivery < 5s latency
