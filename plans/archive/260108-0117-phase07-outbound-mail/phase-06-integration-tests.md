# Phase 06: Integration Tests and Documentation

**Status:** planned
**Effort:** 3h
**Dependencies:** Phases 01-05
**Owner:** Backend/QA

## Objective

Create comprehensive integration tests for outbound mail features and update API documentation.

## Test Strategy

### Test Categories

1. **Unit Tests** - DKIM signing, ESP parsers
2. **Integration Tests** - Full outbound flow with mocked ESP
3. **E2E Tests** - Queue processing with test SMTP (Mailpit)

## Test Files

### 1. DKIM Service Tests (`test/dkim.test.ts`)

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { DkimService } from '../services/dkim.service';

describe('DKIM Service', () => {
  const dkimService = new DkimService();

  describe('Key Generation', () => {
    it('should generate 2048-bit RSA keypair', async () => {
      const result = await dkimService.generateKeyPair();

      expect(result.privateKey).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(result.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('should create valid DNS TXT record format', async () => {
      const { publicKey } = await dkimService.generateKeyPair();
      const dnsRecord = dkimService.formatDnsRecord(publicKey, 'example2026');

      expect(dnsRecord.name).toBe('example2026._domainkey');
      expect(dnsRecord.value).toMatch(/^v=DKIM1; k=rsa; p=[A-Za-z0-9+/=]+$/);
    });
  });

  describe('Message Signing', () => {
    it('should sign email headers with DKIM', async () => {
      const { privateKey } = await dkimService.generateKeyPair();
      const message = `From: sender@example.com\r\nTo: recipient@test.com\r\n\r\nBody`;

      const signature = await dkimService.signMessage(privateKey, message, {
        domain: 'example.com',
        selector: 'test',
      });

      expect(signature).toContain('DKIM-Signature:');
      expect(signature).toContain('b=');
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt private key', async () => {
      const original = '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----';
      const encrypted = dkimService.encryptPrivateKey(original);
      const decrypted = dkimService.decryptPrivateKey(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });
  });
});
```

### 2. Outbound Queue Tests (`test/outbound-queue.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { outboundQueue } from '../queue/outboundQueue';
import { prisma } from '../lib/prisma';

describe('Outbound Queue', () => {
  beforeEach(async () => {
    await prisma.outboundMessage.deleteMany();
    await outboundQueue.drain();
  });

  describe('Job Creation', () => {
    it('should create OutboundMessage and queue job', async () => {
      const outboundMessage = await prisma.outboundMessage.create({
        data: {
          userId: 'test-user',
          domainId: 'test-domain',
          fromAddress: 'sender@test.com',
          toAddress: 'recipient@test.com',
          subject: 'Test',
          messageId: '<test@test.com>',
          status: 'QUEUED',
        },
      });

      const job = await outboundQueue.add('send', {
        outboundMessageId: outboundMessage.id,
        from: 'sender@test.com',
        to: 'recipient@test.com',
        subject: 'Test',
        domainId: 'test-domain',
        userId: 'test-user',
      });

      expect(job.id).toBeDefined();
      expect(job.data.outboundMessageId).toBe(outboundMessage.id);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failure', async () => {
      // Mock transporter to fail twice then succeed
      const sendMock = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({ messageId: 'success' });

      // ... test retry behavior
    });
  });
});
```

### 3. ESP Webhook Tests (`test/esp-webhooks.test.ts`)

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server';
import { prisma } from '../lib/prisma';

describe('ESP Webhooks', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('SES Webhook', () => {
    it('should handle bounce notification', async () => {
      // Create test outbound message
      const outbound = await prisma.outboundMessage.create({
        data: {
          userId: 'test-user',
          domainId: 'test-domain',
          fromAddress: 'sender@test.com',
          toAddress: 'bounced@example.com',
          messageId: '<test-ses-123@test.com>',
          espMessageId: 'ses-msg-123',
          status: 'SENT',
        },
      });

      // Simulate SES bounce webhook
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/ses',
        headers: { 'content-type': 'application/json' },
        payload: {
          Type: 'Notification',
          Message: JSON.stringify({
            eventType: 'Bounce',
            mail: { messageId: 'ses-msg-123' },
            bounce: {
              bounceType: 'Permanent',
              bounceSubType: 'General',
              bouncedRecipients: [{ emailAddress: 'bounced@example.com' }],
              timestamp: new Date().toISOString(),
            },
          }),
          // ... signature fields (mocked for test)
        },
      });

      // Verify OutboundMessage updated
      const updated = await prisma.outboundMessage.findUnique({
        where: { id: outbound.id },
      });

      expect(updated?.status).toBe('BOUNCED');
      expect(updated?.bounceType).toBe('HARD');

      // Verify added to suppression list
      const suppressed = await prisma.bounceSuppressionList.findUnique({
        where: { email: 'bounced@example.com' },
      });

      expect(suppressed).toBeDefined();
      expect(suppressed?.reason).toBe('hard_bounce');
    });
  });

  describe('Mailgun Webhook', () => {
    it('should verify signature and process bounce', async () => {
      // ... similar test with Mailgun payload
    });
  });

  describe('SendGrid Webhook', () => {
    it('should verify signature and process spamreport', async () => {
      // ... similar test with SendGrid payload
    });
  });
});
```

### 4. Suppression Tests (`test/bounce-suppression.test.ts`)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { bounceSuppressionService } from '../services/bounce-suppression';
import { prisma } from '../lib/prisma';

describe('Bounce Suppression Service', () => {
  beforeEach(async () => {
    await prisma.bounceSuppressionList.deleteMany();
  });

  describe('isEmailSuppressed', () => {
    it('should return false for non-suppressed email', async () => {
      const result = await bounceSuppressionService.isEmailSuppressed('clean@example.com');
      expect(result.suppressed).toBe(false);
    });

    it('should return true for suppressed email', async () => {
      await prisma.bounceSuppressionList.create({
        data: { email: 'bad@example.com', reason: 'hard_bounce' },
      });

      const result = await bounceSuppressionService.isEmailSuppressed('bad@example.com');
      expect(result.suppressed).toBe(true);
      expect(result.reason).toBe('hard_bounce');
    });

    it('should handle case insensitivity', async () => {
      await prisma.bounceSuppressionList.create({
        data: { email: 'bad@example.com', reason: 'hard_bounce' },
      });

      const result = await bounceSuppressionService.isEmailSuppressed('BAD@Example.COM');
      expect(result.suppressed).toBe(true);
    });

    it('should auto-remove expired entries', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.bounceSuppressionList.create({
        data: { email: 'soft@example.com', reason: 'soft_bounce', expiresAt: yesterday },
      });

      const result = await bounceSuppressionService.isEmailSuppressed('soft@example.com');
      expect(result.suppressed).toBe(false);
    });
  });

  describe('Outbound Integration', () => {
    it('should block sending to suppressed recipient', async () => {
      // Create suppression entry
      await prisma.bounceSuppressionList.create({
        data: { email: 'blocked@example.com', reason: 'complaint' },
      });

      // Attempt to send
      const response = await app.inject({
        method: 'POST',
        url: '/messages/outbound',
        headers: { authorization: `Bearer ${testToken}` },
        payload: {
          from: 'sender@mydomain.com',
          to: 'blocked@example.com',
          subject: 'Test',
          text: 'Body',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Recipient is suppressed');
    });
  });
});
```

### 5. E2E Test with Mailpit (`test/outbound-e2e.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';

describe('Outbound E2E (requires Mailpit)', () => {
  it('should send email and verify in Mailpit', async () => {
    // 1. Send via API
    const response = await app.inject({
      method: 'POST',
      url: '/messages/outbound',
      headers: { authorization: `Bearer ${testToken}` },
      payload: {
        from: 'sender@testdomain.com',
        to: 'recipient@mailpit.local',
        subject: 'E2E Test',
        text: 'This is an E2E test email',
      },
    });

    expect(response.statusCode).toBe(200);
    const { outboundId } = response.json();

    // 2. Wait for worker to process
    await new Promise(r => setTimeout(r, 2000));

    // 3. Check Mailpit API for received email
    const mailpit = await fetch('http://localhost:8025/api/v1/messages');
    const messages = await mailpit.json();

    expect(messages.messages.some(m => m.Subject === 'E2E Test')).toBe(true);

    // 4. Verify OutboundMessage status
    const status = await prisma.outboundMessage.findUnique({
      where: { id: outboundId },
    });

    expect(status?.status).toBe('SENT');
  });
});
```

## API Documentation Updates

### OpenAPI/Swagger Updates

Add to existing swagger setup:

```typescript
// In routes registration
app.register(require('./routes/dkim'), { prefix: '/api' });
app.register(require('./routes/suppression'), { prefix: '/api' });
app.register(require('./routes/esp-webhooks'), { prefix: '/api' });
```

### Markdown Documentation (`docs/api/outbound.md`)

```markdown
# Outbound Email API

## Send Email

POST /messages/outbound

Sends an email from a verified domain owned by the user.
Requires 1 credit per email.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| from | string | Yes | Sender email (must own domain) |
| to | string | Yes | Recipient email |
| subject | string | Yes | Email subject |
| text | string | No | Plain text body |
| html | string | No | HTML body |

### Response

| Field | Type | Description |
|-------|------|-------------|
| ok | boolean | Success status |
| outboundId | string | Outbound message ID |
| messageId | string | RFC 5322 Message-ID |
| status | string | Initial status (QUEUED) |
| remainingCredits | number | Credits after deduction |

### Errors

| Code | Error | Description |
|------|-------|-------------|
| 400 | Invalid payload | Missing required fields |
| 400 | Recipient is suppressed | Email on suppression list |
| 402 | Insufficient credits | User has no credits |
| 403 | Domain not verified | Domain not verified |
| 403 | Not domain owner | User doesn't own domain |

## DKIM Management

### Generate DKIM Keys

POST /domains/:id/dkim/generate

...
```

## Files to Create

| File | Purpose |
|------|---------|
| `test/dkim.test.ts` | DKIM unit tests |
| `test/outbound-queue.test.ts` | Queue integration tests |
| `test/esp-webhooks.test.ts` | Webhook processing tests |
| `test/bounce-suppression.test.ts` | Suppression logic tests |
| `test/outbound-e2e.test.ts` | End-to-end tests |
| `docs/api/outbound.md` | API documentation |

## Acceptance Criteria

- [ ] All unit tests passing
- [ ] Integration tests cover happy path and error cases
- [ ] E2E test with Mailpit validates full flow
- [ ] Webhook signature verification tested
- [ ] Suppression blocking tested
- [ ] API documentation complete
- [ ] Test coverage > 80% for new code

## Test Environment Setup

```bash
# Docker Compose for test dependencies
services:
  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI & API
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## CI Integration

Add to GitHub Actions:

```yaml
- name: Run outbound tests
  run: npm run test -- --grep "outbound|dkim|suppression|webhook"
  env:
    OUTBOUND_SMTP_HOST: localhost
    OUTBOUND_SMTP_PORT: 1025
    ESP_PROVIDER: smtp
```
