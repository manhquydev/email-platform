# Email Platform Architecture Context

## Service Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EPHEMERA PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Web UI    │    │   API       │    │   Worker    │         │
│  │  (React)    │───▶│  (Fastify)  │◀──▶│  (BullMQ)   │         │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘         │
│                            │                   │                │
│                     ┌──────┴───────┐          │                │
│                     │              │          │                │
│  ┌─────────────┐    │   ┌─────────────┐    ┌─────────────┐    │
│  │  PostgreSQL │◀───┼───│    Redis    │◀───│  SMTP       │    │
│  │  (Prisma)   │    │   │  (BullMQ)   │    │  Server     │    │
│  └─────────────┘    │   └─────────────┘    └─────────────┘    │
│                     │                                          │
│  ┌─────────────┐    │   ┌─────────────┐    ┌─────────────┐    │
│  │  Storage    │◀───┘   │  Telegram   │    │  Prometheus │    │
│  │  (Disk/S3)  │        │  Bot API    │    │  + Grafana  │    │
│  └─────────────┘        └─────────────┘    └─────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Core Entities

```
User (1) ──┬── (*) Domain ──── (*) Inbox ──── (*) Message
           │                        │              │
           │                        └── (*) Label  └── (*) Attachment
           │
           ├── (*) ForwardingRule
           ├── (*) Webhook
           ├── (*) ApiKey
           └── (*) TelegramLinkToken
```

### Telegram Linking (Phase 06)

```
Inbox ──────────── InboxTelegramLink ──── Telegram Chat
                         │
InboxTelegramAuthToken ──┘ (temporary, expires 24h)
                         │
TelegramNotificationLog ─┘ (audit trail)
```

## Request Flows

### 1. Email Ingestion
```
SMTP:2525 → smtp.ts → BullMQ → worker.ts
                                   │
                  ┌────────────────┼────────────────┐
                  ▼                ▼                ▼
            Store Message    Send Telegram    Trigger Webhook
                  │              │                 │
                  ▼              ▼                 ▼
              Prisma         Bot API          HTTP POST
```

### 2. API Request
```
HTTP → Caddy → Fastify → Route Handler
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Rate Limit      JWT Auth       Zod Validate
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                       Service Layer
                              │
                              ▼
                         Prisma ORM
```

### 3. Outbound Email
```
POST /messages/outbound → Credit Check → Domain Verify
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                        SMTP Direct                     Gmail API
                       (nodemailer)                    (fallback)
```

## Integration Points

### External Services
| Service | Purpose | Config |
|---------|---------|--------|
| Stripe | Payments | STRIPE_API_KEY |
| Telegram | Notifications | TELEGRAM_BOT_TOKEN |
| Rspamd | Spam filtering | RSPAMD_URL |
| ClamAV | Virus scanning | CLAMAV_HOST |
| Google OAuth | Gmail fallback | GOOGLE_* vars |

### Webhooks (Outgoing)
- `email.received` - New email arrived
- Custom events per user configuration

### Webhooks (Incoming)
- `/billing/webhook` - Stripe events
- Future: ESP bounce webhooks

## Authentication

### Methods
1. **JWT** - Primary for API access
2. **API Key** - X-API-KEY header for automation
3. **Magic Link** - Passwordless email login
4. **Passkey** - WebAuthn/FIDO2

### Token Structure
```typescript
interface JwtPayload {
  userId: string;
  role: "ADMIN" | "USER";
  tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  iat: number;
  exp: number;
}
```

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Per IP | 300 | 5 min |
| Per Domain | 500 | 5 min |
| Per Inbox | 200 | 5 min |
| HTTP API | 100 | 1 min |

## Quotas

| Resource | Limit |
|----------|-------|
| Messages per Inbox | 500 |
| Messages per Domain | 5000 |
| Attachment Size | 5 MB |
| Message TTL | 7 days |

## Configuration

Critical environment variables:
```bash
# Core
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ chars>
REDIS_URL=redis://...

# Features
ALLOW_AUTO_DOMAIN_CREATION=false
PUBLIC_INBOX_ENABLED=false
OUTBOUND_ENABLED=false

# External
TELEGRAM_BOT_TOKEN=...
STRIPE_API_KEY=...
```
