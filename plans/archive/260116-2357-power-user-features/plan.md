# Power User Features Implementation Plan

```yaml
status: completed
created: 2026-01-16T23:57:00+07:00
completed: 2026-01-17T06:30:00+07:00
branch: main
issue: N/A
complexity: hard
estimated_effort: 4-6 weeks
actual_effort: 1 day (accelerated implementation)
```

## 1. Overview

Implementation plan cho 4 Power User Features giúp Ephemera trở thành All-in-One email platform:

1. **Enhanced Forwarding Rules Engine** - Mở rộng hệ thống forwarding hiện có
2. **OTP Auto-Extractor Enhancement** - Cải thiện detection và UI display
3. **Webhook Notifications (MailHook)** - Trigger webhook khi email đến
4. **Outbound Email Enhancement** - DKIM signing và reply support

## 2. Current State Analysis

### 2.1 Existing Infrastructure ✅

| Component | Status | Location |
|-----------|--------|----------|
| ForwardingRule model | ✅ Exists | `prisma/schema.prisma` |
| Forwarding routes | ✅ Exists | `routes/forwarding.ts` |
| EmailForwarder service | ✅ Exists | `services/emailForwarder.ts` |
| OTP Extractor | ✅ Exists | `utils/otpExtractor.ts` |
| Webhook model | ✅ Exists | `prisma/schema.prisma` |
| Webhook routes | ✅ Exists | `routes/webhooks.ts` |
| WebhookService | ✅ Exists | `services/webhookService.ts` |
| Outbound routes | ✅ Exists | `routes/outbound.ts` |
| DomainDkim model | ✅ Exists | `prisma/schema.prisma` |
| OutboundMessage model | ✅ Exists | `prisma/schema.prisma` |

### 2.2 Gaps to Address

| Feature | Current State | Target State |
|---------|--------------|--------------|
| Forwarding destinations | Email only | Email + Telegram + Discord + Webhook |
| Forwarding conditions | Basic (sender, OTP, subject) | Advanced (regex, body, headers, attachments) |
| OTP extraction | Backend only | Backend + Frontend prominent display |
| Webhook trigger | Manual trigger | Auto-trigger on email.received |
| DKIM signing | Model exists, not implemented | Full DKIM implementation |
| Reply support | N/A | Reply from inbox address |

## 3. Implementation Phases

### Phase 1: Enhanced Forwarding Rules Engine (Week 1-2)
File: `phase-01-forwarding-rules-engine.md`

### Phase 2: OTP Auto-Extractor Enhancement (Week 2)
File: `phase-02-otp-extractor-enhancement.md`

### Phase 3: Webhook Notifications - MailHook (Week 3)
File: `phase-03-webhook-mailhook.md`

### Phase 4: Outbound Email Enhancement (Week 4-5)
File: `phase-04-outbound-enhancement.md`

### Phase 5: Frontend Integration (Week 5-6)
File: `phase-05-frontend-integration.md`

## 4. Database Schema Changes

### 4.1 New/Modified Models

```prisma
// Enhanced ForwardingRule - add destination types
model ForwardingRule {
  id            String    @id @default(uuid())
  userId        String
  inboxId       String?
  name          String    @default("Unnamed Rule")

  // NEW: Destination type
  destinationType ForwardDestinationType @default(EMAIL)

  // Existing for EMAIL
  forwardTo     String?

  // NEW: For TELEGRAM
  telegramChatId String?

  // NEW: For DISCORD
  discordWebhookUrl String?

  // NEW: For WEBHOOK (custom endpoint)
  webhookUrl    String?
  webhookSecret String?

  // Enhanced conditions
  conditions    Json      @default("{}")
  matchType     FilterMatchType @default(ALL)

  isActive      Boolean   @default(true)
  priority      Int       @default(50)
  forwardCount  Int       @default(0)
  lastForwardAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  inbox         Inbox?    @relation(fields: [inboxId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs          ForwardingLog[]

  @@index([userId, isActive])
  @@index([inboxId])
}

enum ForwardDestinationType {
  EMAIL
  TELEGRAM
  DISCORD
  WEBHOOK
}

// NEW: Forwarding execution logs
model ForwardingLog {
  id          String   @id @default(uuid())
  ruleId      String
  messageId   String
  status      String   // SUCCESS, FAILED
  destination String   // Where it was forwarded
  duration    Int?     // ms
  error       String?
  createdAt   DateTime @default(now())

  rule ForwardingRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([ruleId])
  @@index([messageId])
  @@index([createdAt])
}

// Enhanced Message - add extracted OTP
model Message {
  // ... existing fields ...

  // NEW: Extracted OTP data
  extractedOtp      String?
  otpConfidence     String?  // high, medium, low
  otpExtractedAt    DateTime?

  // ... rest of model ...
}
```

### 4.2 Migration Strategy

```sql
-- Migration: add_power_user_features
-- Step 1: Add new columns to ForwardingRule
ALTER TABLE "ForwardingRule"
  ADD COLUMN "destinationType" TEXT DEFAULT 'EMAIL',
  ADD COLUMN "telegramChatId" TEXT,
  ADD COLUMN "discordWebhookUrl" TEXT,
  ADD COLUMN "webhookUrl" TEXT,
  ADD COLUMN "webhookSecret" TEXT,
  ADD COLUMN "matchType" TEXT DEFAULT 'ALL',
  ADD COLUMN "priority" INT DEFAULT 50;

-- Step 2: Create ForwardingLog table
CREATE TABLE "ForwardingLog" (
  "id" TEXT PRIMARY KEY,
  "ruleId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "duration" INT,
  "error" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("ruleId") REFERENCES "ForwardingRule"("id") ON DELETE CASCADE
);

-- Step 3: Add OTP fields to Message
ALTER TABLE "Message"
  ADD COLUMN "extractedOtp" TEXT,
  ADD COLUMN "otpConfidence" TEXT,
  ADD COLUMN "otpExtractedAt" TIMESTAMP;

-- Step 4: Indexes
CREATE INDEX "ForwardingLog_ruleId_idx" ON "ForwardingLog"("ruleId");
CREATE INDEX "ForwardingLog_messageId_idx" ON "ForwardingLog"("messageId");
CREATE INDEX "Message_extractedOtp_idx" ON "Message"("extractedOtp") WHERE "extractedOtp" IS NOT NULL;
```

## 5. API Endpoints Design

### 5.1 Enhanced Forwarding Rules API

```
GET    /forwarding/rules                    # List rules
POST   /forwarding/rules                    # Create rule
GET    /forwarding/rules/:id                # Get rule details
PATCH  /forwarding/rules/:id                # Update rule
DELETE /forwarding/rules/:id                # Delete rule
GET    /forwarding/rules/:id/logs           # Get execution logs
POST   /forwarding/rules/:id/test           # Test rule with sample data
```

**Create Rule Request:**
```json
{
  "name": "Forward OTPs to Telegram",
  "inboxId": "optional-inbox-id",
  "destinationType": "TELEGRAM",
  "telegramChatId": "123456789",
  "matchType": "ALL",
  "conditions": [
    { "field": "BODY", "operator": "CONTAINS_OTP", "value": null },
    { "field": "FROM", "operator": "ENDS_WITH", "value": "@bank.com" }
  ],
  "priority": 80,
  "isActive": true
}
```

### 5.2 Webhook Notifications API (Enhancement)

```
# Existing endpoints remain unchanged
# Add auto-trigger on email.received event
```

**Webhook Payload for email.received:**
```json
{
  "event": "email.received",
  "timestamp": "2026-01-16T23:59:00Z",
  "idempotencyKey": "uuid",
  "data": {
    "messageId": "uuid",
    "inboxId": "uuid",
    "inboxEmail": "test@domain.com",
    "from": "sender@example.com",
    "to": "test@domain.com",
    "subject": "Your verification code",
    "receivedAt": "2026-01-16T23:59:00Z",
    "hasAttachments": true,
    "attachmentCount": 2,
    "extractedOtp": {
      "code": "123456",
      "confidence": "high"
    },
    "preview": "First 200 chars of text body...",
    "spamScore": 0.1
  }
}
```

### 5.3 Message API Enhancement

```
GET /messages/:id        # Now includes extractedOtp field
GET /inboxes/:id/messages # Now includes extractedOtp in list
```

### 5.4 Outbound Enhancement API

```
POST /messages/outbound           # Enhanced with DKIM
POST /messages/:id/reply          # NEW: Reply to message
GET  /domains/:id/dkim            # Get DKIM public key for DNS
POST /domains/:id/dkim/generate   # Generate DKIM keypair
POST /domains/:id/dkim/verify     # Verify DKIM DNS record
```

## 6. Technical Architecture

### 6.1 Forwarding Flow (Enhanced)

```
Email Received
      │
      ▼
 emailQueue.process()
      │
      ├──► Parse email (mailparser)
      │
      ├──► Extract OTP → Store in Message
      │
      ├──► Save to DB
      │
      ├──► Get matching ForwardingRules
      │         │
      │         ▼
      │    Sort by priority (DESC)
      │         │
      │         ├── Rule 1 (EMAIL) → outboundService.sendEmail()
      │         │
      │         ├── Rule 2 (TELEGRAM) → telegramService.send()
      │         │
      │         ├── Rule 3 (DISCORD) → discordWebhook.send()
      │         │
      │         └── Rule 4 (WEBHOOK) → webhookQueue.add()
      │
      ├──► Trigger user webhooks (email.received)
      │
      └──► Send Telegram notification (if linked)
```

### 6.2 Condition Matching Engine

```typescript
interface ForwardCondition {
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'HAS_ATTACHMENT';
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' |
            'REGEX' | 'CONTAINS_OTP' | 'EXISTS' | 'NOT_EXISTS';
  value: string | null;
  caseSensitive?: boolean;
}

// matchType: ALL = all conditions must match (AND)
// matchType: ANY = at least one condition must match (OR)
```

### 6.3 DKIM Signing Flow

```
User sends email
      │
      ▼
 outboundRoutes.sendEmail()
      │
      ├──► Validate ownership
      │
      ├──► Get DomainDkim record
      │         │
      │         └── If not exists → Generate keypair
      │
      ├──► Sign email with DKIM
      │         │
      │         └── dkim-signer library
      │
      ├──► Send via SMTP/SES
      │
      └──► Track in OutboundMessage
```

## 7. File Structure

```
services/api/src/
├── services/
│   ├── forwarding/
│   │   ├── index.ts                    # Main forwarding service
│   │   ├── condition-matcher.ts        # Condition evaluation logic
│   │   ├── destinations/
│   │   │   ├── email-destination.ts    # Forward to email
│   │   │   ├── telegram-destination.ts # Forward to Telegram
│   │   │   ├── discord-destination.ts  # Forward to Discord
│   │   │   └── webhook-destination.ts  # Forward to webhook
│   │   └── types.ts                    # TypeScript interfaces
│   ├── outbound/
│   │   ├── index.ts                    # Outbound service
│   │   ├── dkim-signer.ts              # DKIM signing logic
│   │   └── providers/
│   │       ├── smtp-provider.ts        # Direct SMTP
│   │       └── ses-provider.ts         # AWS SES (future)
│   └── otp/
│       ├── extractor.ts                # Enhanced OTP extraction
│       └── patterns.ts                 # OTP regex patterns
├── routes/
│   ├── forwarding.ts                   # Enhanced forwarding routes
│   └── outbound.ts                     # Enhanced outbound routes
└── queue/
    └── emailQueue.ts                   # Enhanced with forwarding

services/web/src/
├── pages/
│   ├── Forwarding.tsx                  # Enhanced forwarding UI
│   └── Compose.tsx                     # NEW: Email compose/reply
├── components/
│   ├── forwarding/
│   │   ├── RuleBuilder.tsx             # Visual rule builder
│   │   ├── ConditionEditor.tsx         # Condition editing
│   │   ├── DestinationPicker.tsx       # Destination type selection
│   │   └── RulesList.tsx               # Rules management
│   ├── message/
│   │   ├── OtpBadge.tsx                # Prominent OTP display
│   │   ├── ReplyButton.tsx             # Reply action
│   │   └── MessageActions.tsx          # Enhanced actions
│   └── compose/
│       ├── ComposeModal.tsx            # Email compose modal
│       └── ReplyEditor.tsx             # Reply interface
└── hooks/
    ├── useForwardingRules.ts           # Rules management hook
    └── useCompose.ts                   # Email composition hook
```

## 8. Testing Strategy

### 8.1 Unit Tests

```
services/api/src/test/
├── forwarding/
│   ├── condition-matcher.test.ts       # Condition matching logic
│   ├── email-destination.test.ts       # Email forwarding
│   ├── telegram-destination.test.ts    # Telegram forwarding
│   └── discord-destination.test.ts     # Discord forwarding
├── otp/
│   └── extractor.test.ts               # OTP extraction patterns
├── outbound/
│   └── dkim-signer.test.ts             # DKIM signing
└── webhooks/
    └── email-received.test.ts          # Webhook trigger on email
```

### 8.2 Integration Tests

```
services/api/test/
├── forwarding-e2e.test.ts              # Full forwarding flow
├── webhook-email-received.test.ts      # Webhook on email arrival
└── outbound-dkim.test.ts               # DKIM end-to-end
```

### 8.3 Manual Testing Checklist

- [ ] Create forwarding rule → Email destination
- [ ] Create forwarding rule → Telegram destination
- [ ] Create forwarding rule → Discord destination
- [ ] Create forwarding rule → Webhook destination
- [ ] Condition matching: FROM contains
- [ ] Condition matching: SUBJECT regex
- [ ] Condition matching: CONTAINS_OTP
- [ ] OTP extraction in message detail
- [ ] OTP copy to clipboard
- [ ] Webhook triggered on email received
- [ ] Reply to email (outbound)
- [ ] DKIM signing verification
- [ ] Forwarding logs display

## 9. Security Considerations

### 9.1 SSRF Prevention (Webhooks)
- Already implemented in `webhooks.ts`
- Apply same logic to forwarding webhook destinations

### 9.2 Credential Encryption
- Webhook secrets: Store hashed or encrypted
- DKIM private keys: Already encrypted (AES-256-GCM)
- Discord webhook URLs: Validate format, no storage of user tokens

### 9.3 Rate Limiting
- Forwarding: Max 100 forwards/hour per user
- Webhook: Max 1000 calls/hour per user
- Outbound: Existing credit-based limiting

### 9.4 Input Validation
- Zod schemas for all API inputs
- Regex validation with timeout (prevent ReDoS)
- URL validation for webhook/Discord destinations

## 10. Dependencies

### 10.1 New NPM Packages

```json
{
  "nodemailer-dkim": "^1.0.0",  // Or use existing nodemailer with dkim option
  "dkim-signer": "^0.3.0"       // Alternative DKIM library
}
```

### 10.2 External Services
- Telegram Bot API (existing)
- Discord Webhook API (no auth needed)
- SMTP server (existing)

## 11. Environment Variables

```bash
# Existing
OUTBOUND_SMTP_HOST=
OUTBOUND_SMTP_PORT=
OUTBOUND_SMTP_USER=
OUTBOUND_SMTP_PASS=
TELEGRAM_BOT_TOKEN=

# NEW
DKIM_SELECTOR=ephemera2026        # DKIM selector name
DKIM_KEY_SIZE=2048                # RSA key size
FORWARDING_RATE_LIMIT=100         # Forwards per hour
WEBHOOK_RATE_LIMIT=1000           # Webhook calls per hour
```

## 12. Rollout Plan

### Week 1-2: Phase 1 - Forwarding Rules Engine
- Database migration
- Enhanced condition matcher
- Multiple destination types
- Forwarding logs

### Week 2: Phase 2 - OTP Enhancement
- Enhanced extraction patterns
- Store OTP in Message model
- Frontend OTP badge component

### Week 3: Phase 3 - MailHook
- Auto-trigger webhook on email.received
- Enhanced payload with OTP data
- Integrate with email processing queue

### Week 4-5: Phase 4 - Outbound Enhancement
- DKIM key generation
- DKIM signing integration
- Reply functionality
- DNS record display UI

### Week 5-6: Phase 5 - Frontend
- Rule builder UI
- OTP prominent display
- Compose/reply modal
- Forwarding logs viewer

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Forwarding rules created | 100+ rules in first month |
| OTP extraction accuracy | >95% for common formats |
| Webhook delivery success rate | >99% |
| DKIM pass rate | >98% |
| User satisfaction | >4.5/5 rating |

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DKIM DNS propagation delay | Medium | Clear UI guidance, verification endpoint |
| Webhook endpoint downtime | Low | Retry with exponential backoff, logs |
| Telegram rate limiting | Low | Queue-based sending with rate control |
| Regex ReDoS attacks | High | Timeout on regex evaluation |
| High forwarding volume | Medium | Per-user rate limits, tier-based quotas |

## 15. References

- Brainstorm Report: `plans/reports/brainstorm-260116-2357-feature-research-competitive-analysis.md`
- System Architecture: `docs/system-architecture.md`
- Code Standards: `docs/code-standards.md`
- Existing Schema: `services/api/prisma/schema.prisma`

---

**Next Steps:**
1. Review and approve this plan
2. Create feature branch: `feature/power-user-features`
3. Begin Phase 1 implementation
