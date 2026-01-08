# Phase 07: Outbound Mail Enhancement - Implementation Plan

## 1. Feature Overview

Phase 07 enhances outbound email capabilities with DKIM signing, bounce/complaint handling, and provider-agnostic delivery tracking. Currently, outbound mail exists (`services/outbound.ts`) but lacks:
- DKIM signing for improved deliverability
- Bounce/complaint webhook processing from ESPs
- Structured delivery status tracking
- Retry logic for transient failures

## 2. Technical Architecture

```
                              ┌─────────────────────────────────────┐
                              │         OUTBOUND EMAIL FLOW         │
                              └─────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │  API Request  │        │   Scheduled   │        │  Auto-Reply/  │
           │ POST /outbound│        │   (Future)    │        │   Forward     │
           └───────┬───────┘        └───────────────┘        └───────────────┘
                   │
                   ▼
           ┌───────────────┐
           │ OutboundQueue │ ──────► BullMQ job
           │   (bullmq)    │
           └───────┬───────┘
                   │
                   ▼
           ┌───────────────────────────────────────┐
           │          OUTBOUND WORKER              │
           │  1. Load domain DKIM keys             │
           │  2. Sign message with DKIM            │
           │  3. Send via SMTP/ESP                 │
           │  4. Record OutboundMessage            │
           └───────┬───────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌─────────┐
│  SES    │  │ Mailgun  │  │  SMTP   │
│(webhook)│  │(webhook) │  │(direct) │
└────┬────┘  └────┬─────┘  └─────────┘
     │            │
     └────────────┴────────────────────┐
                                       │
                               ┌───────▼───────┐
                               │  WEBHOOK      │
                               │ /webhooks/esp │
                               │  (bounces,    │
                               │   complaints) │
                               └───────┬───────┘
                                       │
                               ┌───────▼────────────────┐
                               │ OutboundMessage update │
                               │   status: BOUNCED      │
                               │   bounceType: hard/soft│
                               └────────────────────────┘
```

## 3. Database Schema Changes

### 3.1 New Models

```prisma
// Add to schema.prisma

model DomainDkim {
  id           String   @id @default(uuid())
  domainId     String   @unique
  selector     String   // e.g., "ephemera2026"
  privateKey   String   // Encrypted PEM
  publicKey    String   // For DNS TXT record generation
  algorithm    String   @default("rsa-sha256")
  keySize      Int      @default(2048)
  createdAt    DateTime @default(now())
  rotatedAt    DateTime?

  domain       Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@index([domainId])
}

model OutboundMessage {
  id              String           @id @default(uuid())
  userId          String
  domainId        String
  fromAddress     String
  toAddress       String
  subject         String?
  messageId       String           @unique  // RFC 5322 Message-ID
  status          OutboundStatus   @default(QUEUED)
  attempts        Int              @default(0)
  lastAttemptAt   DateTime?
  sentAt          DateTime?
  deliveredAt     DateTime?
  bouncedAt       DateTime?
  bounceType      BounceType?
  bounceSubType   String?          // ESP-specific (e.g., "Mailbox Full")
  bounceMessage   String?
  complaintType   String?          // "abuse", "fraud", etc.
  espMessageId    String?          // Provider's message ID
  espProvider     String?          // "ses", "mailgun", "smtp"
  metadata        Json?
  createdAt       DateTime         @default(now())

  user            User             @relation(fields: [userId], references: [id])
  domain          Domain           @relation(fields: [domainId], references: [id])

  @@index([userId])
  @@index([domainId])
  @@index([status])
  @@index([espMessageId])
  @@index([createdAt])
}

model BounceSuppressionList {
  id           String   @id @default(uuid())
  email        String   @unique
  reason       String   // "hard_bounce", "complaint", "manual"
  sourceId     String?  // OutboundMessage.id that caused suppression
  createdAt    DateTime @default(now())
  expiresAt    DateTime? // Soft bounces can expire

  @@index([email])
}

enum OutboundStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  BOUNCED
  COMPLAINED
  FAILED
}

enum BounceType {
  HARD      // Permanent - email doesn't exist
  SOFT      // Temporary - mailbox full, server down
  COMPLAINT // Spam complaint
}
```

### 3.2 Schema Extension for Domain

```prisma
// Add relation to Domain model
model Domain {
  // ... existing fields
  dkim          DomainDkim?
  outboundMsgs  OutboundMessage[]
}
```

## 4. API Endpoint Specifications

### 4.1 DKIM Management

```
POST /domains/:id/dkim/generate
Authorization: Bearer <token>
Response: {
  selector: "ephemera2026",
  dnsRecord: {
    name: "ephemera2026._domainkey",
    type: "TXT",
    value: "v=DKIM1; k=rsa; p=MIIBIjAN..."
  }
}

GET /domains/:id/dkim
Response: {
  enabled: true,
  selector: "ephemera2026",
  algorithm: "rsa-sha256",
  keySize: 2048,
  createdAt: "2026-01-08T...",
  dnsRecord: {...}
}

POST /domains/:id/dkim/rotate
Response: { newSelector: "ephemera202602", ... }
```

### 4.2 Outbound Messages

```
POST /messages/outbound
Authorization: Bearer <token>
Body: {
  from: "user@example.com",
  to: "recipient@external.com",
  subject: "Hello",
  text: "Plain text body",
  html: "<p>HTML body</p>",
  replyTo: "reply@example.com" (optional),
  attachments: [...] (optional)
}
Response: {
  ok: true,
  messageId: "<uuid@example.com>",
  outboundId: "uuid",
  remainingCredits: 99
}

GET /messages/outbound
Query: ?status=BOUNCED&from=2026-01-01&to=2026-01-08&page=1&limit=20
Response: {
  items: [...],
  total: 150,
  page: 1,
  pages: 8
}

GET /messages/outbound/:id
Response: { ...full outbound message details }
```

### 4.3 ESP Webhook Receivers

```
POST /webhooks/ses
Headers: x-amz-sns-message-type: Notification
Body: SNS notification (bounce/complaint/delivery)

POST /webhooks/mailgun
Headers: X-Mailgun-Signature-...
Body: { event-data: { event: "bounced", ... } }

POST /webhooks/sendgrid
Body: [{ event: "bounce", email: "...", ... }]
```

## 5. Implementation Steps

### Step 1: Database Migration
- Add `DomainDkim`, `OutboundMessage`, `BounceSuppressionList` models
- Add relations to existing models
- Run migration: `npx prisma migrate dev --name add-outbound-models`

### Step 2: DKIM Key Generation Service
- Create `services/dkim.service.ts`
- RSA key pair generation (2048-bit)
- Private key encryption with TOTP_ENCRYPTION_KEY
- DNS record formatting helper

### Step 3: Outbound Queue & Worker
- Create `queue/outboundQueue.ts` (BullMQ)
- Create `workers/outboundWorker.ts`
  - Load DKIM keys from DB
  - Sign message using `nodemailer-dkim` or manual implementation
  - Send via configured provider
  - Record status in OutboundMessage

### Step 4: ESP Webhook Routes
- Create `routes/esp-webhooks.ts`
- Signature verification for each ESP
- Parse bounce/complaint payloads
- Update OutboundMessage status
- Add to BounceSuppressionList for hard bounces/complaints

### Step 5: Bounce Suppression Integration
- Check suppression list before sending
- Return 400 if recipient is suppressed
- Add manual suppression management endpoints

### Step 6: Retry Logic
- Configure BullMQ retry: 3 attempts, exponential backoff
- Mark as FAILED after exhausting retries
- Exclude hard bounces from retry

## 6. Security Considerations

### DKIM Private Key Storage
- Encrypt with AES-256-GCM using TOTP_ENCRYPTION_KEY
- Never log or expose private keys
- Key rotation support (overlap period for DNS propagation)

### Webhook Verification
- SES: Verify SNS message signature
- Mailgun: Verify HMAC signature
- SendGrid: Verify webhook signature header

### Rate Limiting
- Per-user outbound limits (e.g., 100/hour free, 1000/hour pro)
- Global sending rate cap
- Credit-based throttling

## 7. Environment Variables

```bash
# DKIM
DKIM_KEY_SIZE=2048
DKIM_SELECTOR_PREFIX=ephemera

# ESP Config
ESP_PROVIDER=smtp|ses|mailgun|sendgrid
SES_REGION=us-east-1
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
SENDGRID_API_KEY=

# Webhook Secrets
SES_SNS_TOPIC_ARN=
MAILGUN_WEBHOOK_SIGNING_KEY=
SENDGRID_WEBHOOK_SECRET=

# Limits
OUTBOUND_RATE_PER_HOUR=100
OUTBOUND_RETRY_ATTEMPTS=3
```

## 8. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `services/dkim.service.ts` | DKIM key generation, signing |
| `queue/outboundQueue.ts` | BullMQ queue definition |
| `workers/outboundWorker.ts` | Outbound message processing |
| `routes/dkim.ts` | DKIM management endpoints |
| `routes/esp-webhooks.ts` | ESP webhook receivers |
| `services/bounce-suppression.ts` | Suppression list management |
| `utils/esp-parsers/*.ts` | SES/Mailgun/SendGrid payload parsers |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add new models |
| `services/outbound.ts` | Add DKIM signing, queue integration |
| `routes/outbound.ts` | Add history endpoints |
| `config.ts` | Add ESP/DKIM config vars |
| `index.ts` | Register new routes |

## 9. Testing Strategy

- Unit tests for DKIM signing
- Integration tests for webhook parsing
- E2E test with Mailpit for SMTP flow
- Mock ESP responses for bounce handling

## 10. Rollout Plan

1. Deploy DB migration
2. Enable DKIM generation (UI pending)
3. Switch to queue-based sending
4. Register ESP webhooks
5. Monitor bounce rates
6. Enable suppression list
