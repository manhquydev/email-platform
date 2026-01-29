# Phase 07: Compliance Tools Tests

## Overview
- **Priority**: P2
- **Effort**: 1.5h
- **Dependencies**: Elasticsearch (optional for search)

## Test Categories

### Audit Log Tests

```typescript
// services/api/src/__tests__/integration/audit-log.test.ts
describe('Audit Logging', () => {
  it('logs user login events', async () => {
    await api.post('/auth/login').send({ email: 'test@example.com', password: 'pass' })

    const logs = await prisma.auditLog.findMany({
      where: { action: 'login', actorEmail: 'test@example.com' }
    })
    expect(logs.length).toBeGreaterThan(0)
  })

  it('logs message read events', async () => {
    await api.get('/messages/msg1')

    const log = await prisma.auditLog.findFirst({
      where: { action: 'read', resourceId: 'msg1' }
    })
    expect(log).toBeDefined()
  })

  it('logs message delete events', async () => {
    await api.delete('/messages/msg1')

    const log = await prisma.auditLog.findFirst({
      where: { action: 'delete', resourceId: 'msg1' }
    })
    expect(log).toBeDefined()
  })

  it('includes IP address and user agent', async () => {
    await api.get('/messages/msg1')
      .set('X-Forwarded-For', '192.168.1.1')
      .set('User-Agent', 'TestClient/1.0')

    const log = await prisma.auditLog.findFirst({ orderBy: { timestamp: 'desc' } })
    expect(log.ipAddress).toBe('192.168.1.1')
    expect(log.userAgent).toContain('TestClient')
  })
})
```

### Hash Chain Integrity Tests

```typescript
// services/api/src/__tests__/integration/audit-chain.test.ts
describe('Audit Log Hash Chain', () => {
  it('chains logs with SHA-256 hash', async () => {
    // Create 3 log entries
    await auditLogger.log({ action: 'test1' })
    await auditLogger.log({ action: 'test2' })
    await auditLogger.log({ action: 'test3' })

    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'asc' },
      take: 3
    })

    // Verify chain
    expect(logs[1].prevHash).toBe(logs[0].hash)
    expect(logs[2].prevHash).toBe(logs[1].hash)
  })

  it('detects tampered log entry', async () => {
    // Tamper with log
    await prisma.auditLog.update({
      where: { id: 'log2' },
      data: { action: 'tampered' }
    })

    const result = await auditService.verifyChainIntegrity()
    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe('log2')
  })

  it('verifies chain on query', async () => {
    const res = await api.get('/admin/audit?verify=true')
    expect(res.body.chainValid).toBe(true)
  })
})
```

### Legal Hold Tests

```typescript
// services/api/src/__tests__/integration/legal-hold.test.ts
describe('Legal Hold', () => {
  describe('Hold Creation', () => {
    it('creates hold with custodians', async () => {
      const res = await api.post('/admin/compliance/holds')
        .send({
          name: 'Case 2026-001',
          custodians: ['user1', 'user2'],
          keywords: ['confidential', 'project-x']
        })
      expect(res.status).toBe(201)
    })
  })

  describe('Delete Prevention', () => {
    it('blocks message deletion for held user', async () => {
      await createLegalHold({ custodians: ['user1'] })

      const message = await createMessage({ userId: 'user1' })
      const res = await api.delete(`/messages/${message.id}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('legal hold')
    })

    it('blocks folder deletion with held messages', async () => {
      await createLegalHold({ custodians: ['user1'] })
      const folder = await createFolderWithMessages('HeldFolder', { userId: 'user1' })

      const res = await api.delete(`/folders/${folder.id}`)
      expect(res.status).toBe(403)
    })

    it('blocks attachment deletion for held messages', async () => {
      await createLegalHold({ custodians: ['user1'] })
      const message = await createMessageWithAttachment({ userId: 'user1' })

      const res = await api.delete(`/attachments/${message.attachments[0].id}`)
      expect(res.status).toBe(403)
    })
  })

  describe('Hold Release', () => {
    it('allows deletion after hold release', async () => {
      const hold = await createLegalHold({ custodians: ['user1'] })
      const message = await createMessage({ userId: 'user1' })

      // Release hold
      await api.post(`/admin/compliance/holds/${hold.id}/release`)

      // Now delete should work
      const res = await api.delete(`/messages/${message.id}`)
      expect(res.status).toBe(204)
    })
  })
})
```

### eDiscovery Search Tests

```typescript
// services/api/src/__tests__/integration/ediscovery.test.ts
describe('eDiscovery', () => {
  beforeAll(async () => {
    // Seed messages across multiple mailboxes
    await seedMessages([
      { inbox: 'user1', subject: 'Project Alpha details', body: 'confidential info' },
      { inbox: 'user2', subject: 'Re: Project Alpha', body: 'more details' },
      { inbox: 'user3', subject: 'Unrelated', body: 'nothing relevant' }
    ])
  })

  it('searches across all org mailboxes', async () => {
    const res = await api.post('/admin/compliance/ediscovery/search')
      .send({ query: 'Project Alpha' })

    expect(res.body.results.length).toBe(2)
    expect(res.body.results.map(r => r.inbox)).toContain('user1')
    expect(res.body.results.map(r => r.inbox)).toContain('user2')
  })

  it('filters by date range', async () => {
    const res = await api.post('/admin/compliance/ediscovery/search')
      .send({
        query: 'confidential',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31'
      })
    expect(res.body.results.length).toBeGreaterThan(0)
  })

  it('filters by sender/recipient', async () => {
    const res = await api.post('/admin/compliance/ediscovery/search')
      .send({
        from: 'sender@example.com'
      })
    expect(res.body.results.every(r => r.from === 'sender@example.com')).toBe(true)
  })

  it('exports results as MBOX', async () => {
    const search = await api.post('/admin/compliance/ediscovery/search')
      .send({ query: 'Project Alpha' })

    const res = await api.post(`/admin/compliance/ediscovery/${search.body.id}/export`)
      .send({ format: 'mbox' })

    expect(res.headers['content-type']).toContain('application/mbox')
  })

  it('requires Compliance Officer role', async () => {
    const regularUser = await loginAs('regular@example.com')
    const res = await api.post('/admin/compliance/ediscovery/search')
      .set('Authorization', regularUser)
      .send({ query: 'test' })

    expect(res.status).toBe(403)
  })
})
```

### DLP Scanner Tests

```typescript
// services/api/src/__tests__/integration/dlp.test.ts
describe('DLP Scanner', () => {
  describe('Pattern Detection', () => {
    it('detects SSN pattern', async () => {
      const result = await dlpScanner.scan('My SSN is 123-45-6789')
      expect(result.matches).toContainEqual({
        type: 'SSN',
        value: '123-45-6789'
      })
    })

    it('detects credit card number', async () => {
      const result = await dlpScanner.scan('Card: 4111111111111111')
      expect(result.matches).toContainEqual({
        type: 'CREDIT_CARD',
        value: '4111111111111111'
      })
    })

    it('detects API keys', async () => {
      const result = await dlpScanner.scan('API_KEY=sk_live_abc123xyz')
      expect(result.matches.some(m => m.type === 'API_KEY')).toBe(true)
    })
  })

  describe('Outbound Blocking', () => {
    it('blocks email with credit card number', async () => {
      const res = await sendEmail({
        to: 'external@example.com',
        body: 'Please use card 4111111111111111'
      })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('DLP violation')
    })

    it('warns but allows with admin override', async () => {
      // Configure policy to warn instead of block
      await configureDLPPolicy({ action: 'warn' })

      const res = await sendEmail({
        to: 'external@example.com',
        body: 'SSN: 123-45-6789',
        headers: { 'X-DLP-Override': 'acknowledged' }
      })

      expect(res.status).toBe(200)
    })

    it('quarantines suspicious email', async () => {
      await configureDLPPolicy({ action: 'quarantine' })

      await sendEmail({
        to: 'external@example.com',
        body: 'Sensitive: 123-45-6789'
      })

      const quarantined = await prisma.outboundMessage.findFirst({
        where: { status: 'quarantined' }
      })
      expect(quarantined).toBeDefined()
    })
  })
})
```

### GDPR Export Tests

```typescript
// services/api/src/__tests__/integration/gdpr-export.test.ts
describe('GDPR Data Export', () => {
  it('exports all user data as ZIP', async () => {
    const res = await api.post('/admin/compliance/export/user1')

    expect(res.headers['content-type']).toBe('application/zip')

    const zip = await unzip(res.body)
    expect(zip.files).toContain('messages.json')
    expect(zip.files).toContain('contacts.json')
    expect(zip.files).toContain('calendar.json')
    expect(zip.files).toContain('audit-log.json')
  })

  it('logs export action to audit', async () => {
    await api.post('/admin/compliance/export/user1')

    const log = await prisma.auditLog.findFirst({
      where: { action: 'gdpr_export', resourceId: 'user1' }
    })
    expect(log).toBeDefined()
  })

  it('rate limits export requests', async () => {
    await api.post('/admin/compliance/export/user1')
    const res = await api.post('/admin/compliance/export/user1')

    expect(res.status).toBe(429)
  })
})
```

## Docker Commands

```bash
# Run compliance tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "Audit|LegalHold|eDiscovery|DLP|GDPR"

# Test hash chain verification
docker compose -f docker-compose.test.yml exec test-api \
  npm run audit:verify

# Performance test eDiscovery on 1M messages
docker compose -f docker-compose.test.yml exec test-api \
  npm run seed:messages -- --count 1000000 && \
  npm test -- --grep "eDiscovery Performance"
```

## Success Criteria

- [ ] All user actions logged with hash chain
- [ ] Hash chain tampering detected
- [ ] Legal hold blocks message deletion
- [ ] eDiscovery finds messages across org
- [ ] DLP blocks email with credit card
- [ ] GDPR export produces complete user data
- [ ] Compliance Officer role required for access
