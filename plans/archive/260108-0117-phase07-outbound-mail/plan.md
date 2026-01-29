---
title: "Phase 07: Outbound Mail Support with DKIM and Bounce Handling"
description: "Enable outbound email with DKIM signing, ESP webhook receivers, and bounce suppression"
status: planned
priority: P1
effort: 18h
branch: main
tags: [feature, outbound, dkim, webhooks, bullmq, email]
created: 2026-01-08
---

# Phase 07: Outbound Mail Support

## Overview

Enhance outbound email capabilities with:
- DKIM signing for improved deliverability
- BullMQ queue for reliable delivery with retries
- ESP webhook receivers (SES/Mailgun/SendGrid) for bounce/complaint handling
- Bounce suppression list to prevent sending to invalid addresses
- OutboundMessage tracking for delivery status

## Current State

- `outbound.ts` service exists with basic nodemailer/Gmail API sending
- `outboundRoutes.ts` has `/messages/outbound` endpoint with credit deduction
- BullMQ already in use for webhook delivery queue
- Redis config exists at `config/redis.ts`
- No DKIM, no bounce handling, no delivery tracking

## Phase Summary

| Phase | Description | Status | Effort | Dependencies | Parallel |
|-------|-------------|--------|--------|--------------|----------|
| [01](./phase-01-database-schema.md) | Database Schema | planned | 2h | - | - |
| [02](./phase-02-dkim-service.md) | DKIM Service | planned | 3h | 01 | - |
| [03](./phase-03-outbound-queue.md) | BullMQ Outbound Queue | planned | 3h | 01 | 02 |
| [04](./phase-04-esp-webhooks.md) | ESP Webhook Receivers | planned | 4h | 01 | 02,03 |
| [05](./phase-05-bounce-suppression.md) | Bounce Suppression | planned | 3h | 01, 04 | - |
| [06](./phase-06-integration-tests.md) | Integration Tests + Docs | planned | 3h | 01-05 | - |

## Dependency Graph

```
Phase 01 (Database Schema)
    |
    +---------------+---------------+
    |               |               |
    v               v               v
Phase 02        Phase 03        Phase 04
(DKIM)          (Queue)         (Webhooks)
    |               |               |
    +-------+-------+               |
            |                       |
            v                       |
      +-----+-----------------------+
      |
      v
Phase 05 (Bounce Suppression)
      |
      v
Phase 06 (Tests + Docs)
```

## File Ownership Matrix

| File | Owner Phase | Type |
|------|-------------|------|
| `prisma/schema.prisma` | 01 | Modify |
| `prisma/migrations/*_outbound_models` | 01 | Create |
| `services/dkim.service.ts` | 02 | Create |
| `routes/dkim.ts` | 02 | Create |
| `utils/crypto.ts` | 02 | Modify |
| `queue/outboundQueue.ts` | 03 | Create |
| `workers/outboundWorker.ts` | 03 | Create |
| `services/outbound.ts` | 03 | Modify |
| `routes/outbound.ts` | 03 | Modify |
| `routes/esp-webhooks.ts` | 04 | Create |
| `utils/esp-parsers/ses.ts` | 04 | Create |
| `utils/esp-parsers/mailgun.ts` | 04 | Create |
| `utils/esp-parsers/sendgrid.ts` | 04 | Create |
| `services/bounce-suppression.ts` | 05 | Create |
| `config.ts` | 02,03,04 | Modify |
| `index.ts` | 02,03,04 | Modify |
| `test/outbound-*.test.ts` | 06 | Create |

## Environment Variables (New)

```bash
# DKIM Configuration
DKIM_KEY_SIZE=2048
DKIM_SELECTOR_PREFIX=ephemera

# ESP Provider Selection
ESP_PROVIDER=smtp|ses|mailgun|sendgrid

# SES Config (if ESP_PROVIDER=ses)
SES_REGION=us-east-1
SES_SNS_TOPIC_ARN=

# Mailgun Config (if ESP_PROVIDER=mailgun)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_WEBHOOK_SIGNING_KEY=

# SendGrid Config (if ESP_PROVIDER=sendgrid)
SENDGRID_API_KEY=
SENDGRID_WEBHOOK_SECRET=

# Outbound Limits
OUTBOUND_RATE_PER_HOUR=100
OUTBOUND_RETRY_ATTEMPTS=3
OUTBOUND_RETRY_DELAY_MS=1000
```

## Security Considerations

1. **DKIM Private Key Storage**
   - Encrypt with AES-256-GCM using `TOTP_ENCRYPTION_KEY`
   - Never log or expose private keys in responses
   - Support key rotation with DNS propagation overlap

2. **Webhook Signature Verification**
   - SES: Verify SNS message signature using AWS SDK
   - Mailgun: HMAC-SHA256 verification
   - SendGrid: Signature header validation

3. **Bounce Suppression Privacy**
   - Hash email addresses in suppression list (optional)
   - Retention policy for soft bounce expiry
   - Audit logging for suppression changes

4. **Rate Limiting**
   - Per-user outbound rate (OUTBOUND_RATE_PER_HOUR)
   - Global queue concurrency limits
   - Credit-based throttling (already exists)

## API Endpoints Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/domains/:id/dkim/generate` | Generate DKIM keypair | JWT |
| GET | `/domains/:id/dkim` | Get DKIM config + DNS record | JWT |
| POST | `/domains/:id/dkim/rotate` | Rotate DKIM keys | JWT |
| POST | `/messages/outbound` | Send email (existing, enhanced) | JWT |
| GET | `/messages/outbound` | List sent messages | JWT |
| GET | `/messages/outbound/:id` | Get delivery status | JWT |
| POST | `/webhooks/ses` | SES bounce/complaint webhook | SNS Sig |
| POST | `/webhooks/mailgun` | Mailgun event webhook | HMAC |
| POST | `/webhooks/sendgrid` | SendGrid event webhook | Sig |
| GET | `/suppression` | List suppressed emails | JWT/Admin |
| DELETE | `/suppression/:email` | Remove from suppression | JWT/Admin |

## Success Criteria

- [ ] DKIM keys generated and DNS records displayed in UI
- [ ] Outbound emails queued and processed asynchronously
- [ ] Failed sends retry with exponential backoff
- [ ] Bounces/complaints update OutboundMessage status
- [ ] Hard bounces auto-add to suppression list
- [ ] Suppression list checked before sending
- [ ] All ESP webhooks verified with signatures
- [ ] Integration tests passing
