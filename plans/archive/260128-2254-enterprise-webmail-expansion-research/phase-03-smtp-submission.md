# Phase 03: SMTP Submission (MSA)

## Context Links
- [Plan Overview](plan.md)
- [Current SMTP Server](../../services/api/src/smtp.ts)
- [Technical Requirements](research/researcher-02-technical-requirements.md)

## Overview
- **Priority**: P1 (Required for enterprise)
- **Status**: pending
- **Effort**: 4h

Enable authenticated SMTP submission (port 587/465) for user-initiated outbound mail.

## Key Insights
- Current SMTP is inbound-only (MTA mode)
- Enterprise users need to send from Outlook/Thunderbird
- Must integrate DKIM signing, SPF alignment
- Outbound infrastructure partially exists (SES/Mailgun relay)

## Requirements

### Functional
- SMTP AUTH (PLAIN, LOGIN) on port 587 (STARTTLS) and 465 (implicit TLS)
- Sender address validation (user owns domain)
- DKIM signing with per-domain keys
- Queue management for delivery retries
- Sent folder copy via IMAP APPEND

### Non-Functional
- <2s message acceptance latency
- 99.9% delivery success rate
- Support 100 messages/min per user

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Email Client                            │
│              (Outlook, Thunderbird, etc.)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     Port 587/465
                     (STARTTLS/TLS)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   SMTP Submission Server                     │
│                   (MSA - smtp-server)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AUTH Handler│  │Sender Check │  │ DKIM Signer         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────────┐
    │ BullMQ    │  │ Sent Copy │  │ Direct SMTP   │
    │ Queue     │  │ (IMAP)    │  │ or Relay      │
    └─────┬─────┘  └───────────┘  │ (SES/Mailgun) │
          │                       └───────────────┘
          ▼
    ┌───────────────────────────────────────────┐
    │            Delivery Worker                 │
    │  - DNS MX lookup                          │
    │  - TLS negotiation                        │
    │  - Retry with backoff                     │
    │  - Bounce handling                        │
    └───────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/src/smtp.ts` - Add submission mode alongside inbound
- `services/api/prisma/schema.prisma` - Add OutboundMessage, DkimKey models
- `services/api/src/queue/emailQueue.ts` - Add outbound queue

### Create
- `services/api/src/smtp/submission-server.ts` - MSA server
- `services/api/src/smtp/auth-handler.ts` - SMTP AUTH implementation
- `services/api/src/smtp/dkim-signer.ts` - DKIM signing service
- `services/api/src/services/outbound-delivery.ts` - Delivery worker

## Implementation Steps

1. **Schema Additions**
   ```prisma
   model DkimKey {
     id          String   @id @default(cuid())
     domainId    String   @unique
     domain      Domain   @relation(fields: [domainId])
     selector    String   @default("ephemera")
     privateKey  String   // Encrypted PEM
     publicKey   String   // For DNS TXT record
     createdAt   DateTime @default(now())
   }

   model OutboundMessage {
     id          String   @id @default(cuid())
     userId      String
     user        User     @relation(fields: [userId])
     messageId   String   // RFC 5322 Message-ID
     fromAddress String
     toAddresses String[] // Array of recipients
     subject     String
     status      String   // queued, sending, sent, failed, bounced
     attempts    Int      @default(0)
     lastError   String?
     queuedAt    DateTime @default(now())
     sentAt      DateTime?
   }
   ```

2. **SMTP Submission Server**
   - Listen on 587 (STARTTLS) and 465 (implicit TLS)
   - Require authentication before MAIL FROM
   - Validate sender domain ownership
   - Size limit per tier (10MB free, 25MB pro)

3. **AUTH Handler**
   - Support AUTH PLAIN and AUTH LOGIN
   - Validate against user credentials or app passwords
   - Issue session token for connection duration
   - Rate limit failed attempts

4. **DKIM Signing**
   - Generate 2048-bit RSA keypair per domain
   - Store encrypted private key in DB
   - Expose public key for DNS setup
   - Sign all outbound messages with `dkim-signature` header

5. **Delivery Queue**
   - Use BullMQ with Redis backend
   - Jobs: { messageId, recipient, attempt }
   - Retry with exponential backoff (5m, 15m, 1h, 4h)
   - Max 5 attempts, then mark as bounced

6. **Sent Folder Integration**
   - After successful send, APPEND to Sent folder
   - Set \Seen flag automatically
   - Link to OutboundMessage record

## Todo List

- [ ] Create DkimKey and OutboundMessage models
- [ ] Generate DKIM keypair on domain verification
- [ ] Implement SMTP submission server on 587/465
- [ ] Add SMTP AUTH handlers
- [ ] Build sender address validation
- [ ] Implement DKIM signing middleware
- [ ] Create outbound delivery worker
- [ ] Add Sent folder copy logic
- [ ] Configure relay mode (SES/direct)
- [ ] Add bounce/complaint webhook handlers
- [ ] Write tests for submission flow

## Success Criteria

- [ ] Thunderbird sends mail via SMTP on port 587
- [ ] Messages pass DKIM/SPF/DMARC checks (mail-tester.com 10/10)
- [ ] Failed deliveries retry with backoff
- [ ] Sent messages appear in IMAP Sent folder
- [ ] Bounce notifications reach user

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| IP reputation (new sender) | High | Use relay (SES/Mailgun) initially |
| DKIM key exposure | Critical | Encrypt at rest, HSM for prod |
| Bounce storm from spam | Medium | Rate limits, reputation monitoring |
| Relay provider costs | Low | Per-message tracking, tier limits |

## Security Considerations

- Encrypt DKIM private keys with AES-256-GCM
- Require TLS for submission (no plaintext)
- Validate From header matches authenticated user's domains
- Implement SPF alignment checks
- Log all outbound for compliance
- Support app-specific passwords for MFA bypass
