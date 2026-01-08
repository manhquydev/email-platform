# Email-Platform Codebase Analysis Report

**Date:** 2026-01-08 | **Type:** Architecture Analysis

## Executive Summary

Analyzed email-platform codebase focusing on email handling architecture, outbound mail status, and Phase 07 readiness. Current architecture is well-structured with clear separation of concerns.

## Current Architecture

### Email Ingest Pipeline
```
SMTP Server (smtp.ts)
    ↓
BullMQ Queue (emailQueue.ts)
    ↓
Email Worker (worker.ts)
    ├── Parse email (mailparser)
    ├── Evaluate rules (rules.ts)
    ├── Rate limit check
    ├── Spam filter (Rspamd)
    ├── Virus scan (ClamAV)
    ├── Store message (Prisma)
    ├── Save attachments (storage.ts)
    ├── Process filters
    ├── Telegram notify (per-inbox + per-user)
    ├── Forward (if rules match)
    └── Trigger webhooks
```

### Key Files
| Component | Location |
|-----------|----------|
| SMTP Server | `services/api/src/smtp.ts` |
| Email Worker | `services/api/src/worker.ts` |
| Outbound Service | `services/api/src/services/outbound.ts` |
| Telegram Service | `services/api/src/services/inbox-telegram-service.ts` |
| Config | `services/api/src/config.ts` |

### Database Models (Prisma)
- **User**: Auth, subscriptions, Telegram linking
- **Domain**: Multi-domain support, DKIM (pending)
- **Inbox**: Per-domain mailboxes
- **Message**: Stored emails with spam scores
- **Attachment**: Storage-backed files
- **InboxTelegramLink**: Per-inbox notifications
- **Webhook**: User-defined webhooks
- **ForwardingRule**: Email forwarding

## Outbound Mail Status

### Current State
- Basic outbound via `OutboundService` (nodemailer)
- Supports SMTP and Gmail API fallback
- Credit-based billing per send
- Domain ownership verification

### Missing for Production
1. **DKIM signing** - No key storage/signing
2. **Bounce handling** - No ESP webhook receivers
3. **Delivery tracking** - No OutboundMessage model
4. **Suppression list** - No bounce suppression
5. **Retry logic** - No queue-based retries

## Telegram Integration

Fully implemented with Phase 06:
- Per-user notifications (legacy)
- Per-inbox linking via tokens
- `/link inbox_XXX` command support
- `/inboxes` management command
- Notification logging

## Rate Limiting

Configurable via env vars:
- Per-IP: `SMTP_RATE_LIMIT_PER_IP` (default 300/5min)
- Per-domain: `SMTP_RATE_LIMIT_PER_DOMAIN` (500/5min)
- Per-inbox: `SMTP_RATE_LIMIT_PER_INBOX` (200/5min)

## Phase 07 Readiness

### Prerequisites Met
- Outbound service exists
- Credit system functional
- Domain verification working
- Config structure extensible

### Implementation Gap
~1500 LOC estimated for full Phase 07:
- DKIM service: ~200 LOC
- Outbound worker: ~300 LOC
- ESP webhooks: ~400 LOC
- Bounce suppression: ~150 LOC
- API routes: ~200 LOC
- Tests: ~250 LOC

## Recommendations

1. **Priority 1:** Add `OutboundMessage` model for tracking
2. **Priority 2:** Implement DKIM key generation
3. **Priority 3:** ESP webhook receivers (start with one provider)
4. **Priority 4:** Bounce suppression list

## Next Steps

Phase 07 implementation plan created at:
`plans/260108-0046-phase07-outbound-mail/implementation-plan.md`
