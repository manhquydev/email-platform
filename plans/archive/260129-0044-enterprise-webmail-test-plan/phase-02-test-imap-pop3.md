# Phase 02: IMAP/POP3 Protocol Tests

## Overview
- **Priority**: P1
- **Effort**: 2h
- **Dependencies**: TLS certs, Redis for IDLE

## Test Categories

### IMAP Unit Tests

```typescript
// services/api/src/__tests__/unit/imap-handlers.test.ts
describe('IMAPHandlers', () => {
  describe('AUTH', () => {
    it('authenticates with PLAIN mechanism')
    it('authenticates with LOGIN mechanism')
    it('rejects invalid credentials')
    it('rate limits failed attempts')
  })

  describe('SELECT', () => {
    it('returns folder stats (EXISTS, RECENT, UIDNEXT)')
    it('returns FLAGS and PERMANENTFLAGS')
    it('sets READ-WRITE mode')
  })

  describe('FETCH', () => {
    it('fetches message envelope')
    it('fetches BODY[]')
    it('fetches BODYSTRUCTURE')
    it('handles partial fetch BODY[]<0.1024>')
  })

  describe('STORE', () => {
    it('adds \\Seen flag')
    it('removes \\Flagged flag')
    it('silently stores with .SILENT suffix')
  })

  describe('IDLE', () => {
    it('pushes new message notification')
    it('pushes flag change notification')
    it('times out after 29 minutes')
  })
})
```

### IMAP Protocol Integration Tests

```typescript
// services/api/src/__tests__/integration/imap-protocol.test.ts
import { ImapFlow } from 'imapflow'

describe('IMAP Protocol', () => {
  let client: ImapFlow

  beforeAll(async () => {
    client = new ImapFlow({
      host: 'localhost',
      port: 993,
      secure: true,
      auth: { user: 'test@example.com', pass: 'password' }
    })
    await client.connect()
  })

  it('lists all folders with LSUB', async () => {
    const folders = await client.list()
    expect(folders.map(f => f.specialUse)).toContain('\\Inbox')
    expect(folders.map(f => f.specialUse)).toContain('\\Sent')
  })

  it('selects INBOX and gets message count', async () => {
    const mailbox = await client.mailboxOpen('INBOX')
    expect(mailbox.exists).toBeGreaterThanOrEqual(0)
  })

  it('fetches message with ENVELOPE', async () => {
    const msg = await client.fetchOne('1', { envelope: true })
    expect(msg.envelope.subject).toBeDefined()
  })

  it('searches messages by date', async () => {
    const uids = await client.search({ since: new Date('2026-01-01') })
    expect(Array.isArray(uids)).toBe(true)
  })

  it('copies message to another folder', async () => {
    await client.messageCopy('1', 'Archive')
    // Verify message exists in Archive
  })

  afterAll(() => client.logout())
})
```

### POP3 Protocol Tests

```typescript
// services/api/src/__tests__/integration/pop3-protocol.test.ts
import * as net from 'net'

describe('POP3 Protocol', () => {
  let socket: net.Socket

  beforeAll(async () => {
    socket = await connectPOP3('localhost', 995, true)
  })

  it('authenticates with USER/PASS', async () => {
    await send('USER test@example.com')
    expect(await receive()).toMatch(/\+OK/)
    await send('PASS password')
    expect(await receive()).toMatch(/\+OK/)
  })

  it('lists messages with LIST', async () => {
    await send('LIST')
    const response = await receive()
    expect(response).toMatch(/\+OK \d+ messages/)
  })

  it('retrieves message with RETR', async () => {
    await send('RETR 1')
    const msg = await receiveMultiline()
    expect(msg).toContain('Subject:')
  })

  it('marks for deletion with DELE', async () => {
    await send('DELE 1')
    expect(await receive()).toMatch(/\+OK/)
  })

  it('commits deletions on QUIT', async () => {
    await send('QUIT')
    expect(await receive()).toMatch(/\+OK/)
  })
})
```

### Client Compatibility Tests

```typescript
// services/api/src/__tests__/e2e/client-compat.test.ts
describe('ClientCompatibility', () => {
  describe('Thunderbird', () => {
    it('configures account via autoconfiguration XML')
    it('syncs all folders on initial connect')
    it('receives IDLE push for new messages')
    it('handles large attachments (25MB)')
  })

  describe('Outlook', () => {
    it('authenticates via IMAP LOGIN')
    it('syncs sent items to Sent folder')
    it('handles folder hierarchy correctly')
  })

  describe('Apple Mail', () => {
    it('connects via IMAPS on port 993')
    it('receives push notifications via IDLE')
    it('syncs flags bidirectionally')
  })

  describe('K-9 Mail (Android)', () => {
    it('syncs with CONDSTORE extension')
    it('handles intermittent connectivity')
  })
})
```

### Performance Tests

```typescript
// services/api/src/__tests__/perf/imap-load.test.ts
describe('IMAP Performance', () => {
  it('handles 1000 concurrent connections', async () => {
    const connections = await Promise.all(
      Array(1000).fill(0).map(() => createIMAPConnection())
    )
    expect(connections.filter(c => c.connected).length).toBe(1000)
  })

  it('IDLE push latency <500ms', async () => {
    const start = Date.now()
    // Trigger new message delivery
    await deliverMessage('test@example.com', 'Test')
    // Wait for IDLE notification
    await waitForIDLENotification()
    expect(Date.now() - start).toBeLessThan(500)
  })

  it('fetches 100 messages in <2s', async () => {
    const start = Date.now()
    await client.fetch('1:100', { envelope: true, bodyStructure: true })
    expect(Date.now() - start).toBeLessThan(2000)
  })
})
```

## Docker Commands

```bash
# Run IMAP tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "IMAP|POP3"

# Test with real Thunderbird (manual)
docker run -d --name thunderbird \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  jlesage/thunderbird

# Load test with imaptest
docker run --rm --network host \
  dovecot/imaptest host=localhost port=993 \
  user=test pass=password clients=100 secs=60
```

## Success Criteria

- [ ] Thunderbird connects and syncs folders
- [ ] Outlook authenticates and fetches mail
- [ ] Apple Mail receives IDLE push
- [ ] POP3 download works for legacy clients
- [ ] 1000 concurrent IMAP connections stable
- [ ] IDLE latency <500ms
