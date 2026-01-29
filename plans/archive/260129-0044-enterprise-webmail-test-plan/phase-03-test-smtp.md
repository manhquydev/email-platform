# Phase 03: SMTP Submission Tests

## Overview
- **Priority**: P1
- **Effort**: 1.5h
- **Dependencies**: Redis (queue), TLS certs

## Test Categories

### SMTP AUTH Tests

```typescript
// services/api/src/__tests__/unit/smtp-auth.test.ts
describe('SMTPAuth', () => {
  it('authenticates with AUTH PLAIN')
  it('authenticates with AUTH LOGIN')
  it('rejects invalid credentials')
  it('rate limits failed auth attempts (5 per minute)')
  it('supports app-specific passwords for MFA users')
})
```

### Sender Validation Tests

```typescript
// services/api/src/__tests__/integration/smtp-submission.test.ts
import * as nodemailer from 'nodemailer'

describe('SMTP Submission', () => {
  let transporter: nodemailer.Transporter

  beforeAll(() => {
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 587,
      secure: false,
      auth: { user: 'test@example.com', pass: 'password' }
    })
  })

  it('accepts mail from owned domain', async () => {
    const info = await transporter.sendMail({
      from: 'test@example.com',
      to: 'recipient@external.com',
      subject: 'Test',
      text: 'Hello'
    })
    expect(info.accepted).toContain('recipient@external.com')
  })

  it('rejects mail from unowned domain', async () => {
    await expect(transporter.sendMail({
      from: 'spoof@notmine.com',
      to: 'victim@example.com',
      subject: 'Spoof'
    })).rejects.toThrow(/not authorized/)
  })

  it('enforces size limit per tier', async () => {
    const largeAttachment = Buffer.alloc(11 * 1024 * 1024) // 11MB
    await expect(transporter.sendMail({
      from: 'test@example.com',
      to: 'recipient@external.com',
      attachments: [{ filename: 'large.bin', content: largeAttachment }]
    })).rejects.toThrow(/size limit/)
  })
})
```

### DKIM Signing Tests

```typescript
// services/api/src/__tests__/integration/dkim.test.ts
describe('DKIM Signing', () => {
  it('generates 2048-bit RSA keypair on domain setup', async () => {
    const domain = await createVerifiedDomain('newdomain.com')
    expect(domain.dkimKey.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/)
  })

  it('signs outbound messages with DKIM', async () => {
    const rawEmail = await sendAndCapture({
      from: 'test@example.com',
      to: 'recipient@external.com',
      subject: 'DKIM Test'
    })
    expect(rawEmail).toContain('DKIM-Signature:')
    expect(rawEmail).toContain('s=ephemera')
  })

  it('passes mail-tester.com validation', async () => {
    // Send to mail-tester unique address
    // Check results via API or manual
  })
})
```

### Delivery Queue Tests

```typescript
// services/api/src/__tests__/integration/delivery-queue.test.ts
describe('DeliveryQueue', () => {
  it('queues message for async delivery', async () => {
    await sendMessage('test@example.com', 'recipient@slow.com')
    const jobs = await getQueueJobs('outbound')
    expect(jobs.length).toBeGreaterThan(0)
  })

  it('retries with exponential backoff on failure', async () => {
    // Mock failing MX lookup
    await sendMessage('test@example.com', 'recipient@failing.com')

    // Check retry schedule
    const job = await getLatestJob('outbound')
    expect(job.opts.attempts).toBe(5)
    expect(job.opts.backoff.type).toBe('exponential')
  })

  it('marks as bounced after 5 failures', async () => {
    // Process 5 failed attempts
    const message = await getOutboundMessage(messageId)
    expect(message.status).toBe('bounced')
  })

  it('copies to Sent folder on success', async () => {
    await sendMessage('test@example.com', 'recipient@example.com')
    await waitForDelivery()

    const sentFolder = await getFolder('test@example.com', 'Sent')
    expect(sentFolder.messages).toContainMessage({ subject: 'Test' })
  })
})
```

### TLS Tests

```typescript
// services/api/src/__tests__/integration/smtp-tls.test.ts
describe('SMTP TLS', () => {
  it('supports STARTTLS on port 587', async () => {
    const client = await connectSMTP('localhost', 587)
    const caps = await client.ehlo()
    expect(caps).toContain('STARTTLS')
    await client.startTLS()
    expect(client.secure).toBe(true)
  })

  it('supports implicit TLS on port 465', async () => {
    const client = await connectSMTP('localhost', 465, { secure: true })
    expect(client.secure).toBe(true)
  })

  it('rejects plaintext auth on port 587 before STARTTLS', async () => {
    const client = await connectSMTP('localhost', 587)
    await expect(client.auth('PLAIN', 'user', 'pass'))
      .rejects.toThrow(/encryption required/)
  })
})
```

### Relay Integration Tests

```typescript
// services/api/src/__tests__/integration/smtp-relay.test.ts
describe('SMTP Relay (SES/Mailgun)', () => {
  it('routes through configured relay', async () => {
    process.env.SMTP_RELAY = 'ses'
    await sendMessage('test@example.com', 'recipient@external.com')

    // Verify SES API was called
    expect(mockSES.sendRawEmail).toHaveBeenCalled()
  })

  it('falls back to direct delivery if relay fails', async () => {
    mockSES.sendRawEmail.mockRejectedValue(new Error('SES down'))
    await sendMessage('test@example.com', 'recipient@external.com')

    // Verify direct MX delivery attempted
    expect(mockDNS.resolveMx).toHaveBeenCalled()
  })
})
```

## Docker Commands

```bash
# Run SMTP tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "SMTP|DKIM|Delivery"

# Test SMTP manually with swaks
docker run --rm --network host \
  jetmore/swaks --to recipient@example.com \
  --from test@example.com \
  --server localhost:587 \
  --auth-user test@example.com \
  --auth-password password \
  --tls

# Check DKIM with opendkim-testkey
docker run --rm \
  instrumentisto/opendkim \
  opendkim-testkey -d example.com -s ephemera -vvv
```

## Success Criteria

- [ ] Thunderbird sends mail via SMTP on port 587
- [ ] Messages pass DKIM/SPF/DMARC checks
- [ ] Failed deliveries retry with backoff
- [ ] Sent messages appear in IMAP Sent folder
- [ ] Bounce notifications reach user
- [ ] App-specific passwords work for MFA users
