# Phase 08: Admin Dashboard Tests

## Overview
- **Priority**: P3
- **Effort**: 1h
- **Dependencies**: All previous phases

## Test Categories

### RBAC Tests

```typescript
// services/api/src/__tests__/integration/rbac.test.ts
describe('RBAC', () => {
  describe('Super Admin', () => {
    it('can access all organizations', async () => {
      const superAdmin = await loginAs('superadmin@system.com')
      const res = await api.get('/admin/organizations').set('Authorization', superAdmin)
      expect(res.body.organizations.length).toBeGreaterThan(1)
    })

    it('can impersonate users', async () => {
      const superAdmin = await loginAs('superadmin@system.com')
      const res = await api.post('/admin/impersonate/user1').set('Authorization', superAdmin)
      expect(res.status).toBe(200)
      expect(res.body.impersonatedUser).toBe('user1')
    })

    it('can modify system settings', async () => {
      const superAdmin = await loginAs('superadmin@system.com')
      const res = await api.patch('/admin/settings')
        .set('Authorization', superAdmin)
        .send({ maxAttachmentSize: 50 * 1024 * 1024 })
      expect(res.status).toBe(200)
    })
  })

  describe('Org Admin', () => {
    it('can only access own organization', async () => {
      const orgAdmin = await loginAs('admin@org1.com')

      // Own org - allowed
      const own = await api.get('/admin/organizations/org1').set('Authorization', orgAdmin)
      expect(own.status).toBe(200)

      // Other org - forbidden
      const other = await api.get('/admin/organizations/org2').set('Authorization', orgAdmin)
      expect(other.status).toBe(403)
    })

    it('can manage users in own org', async () => {
      const orgAdmin = await loginAs('admin@org1.com')
      const res = await api.post('/admin/users')
        .set('Authorization', orgAdmin)
        .send({ email: 'newuser@org1.com' })
      expect(res.status).toBe(201)
    })

    it('cannot access system settings', async () => {
      const orgAdmin = await loginAs('admin@org1.com')
      const res = await api.get('/admin/settings').set('Authorization', orgAdmin)
      expect(res.status).toBe(403)
    })
  })

  describe('Helpdesk', () => {
    it('can view users (read-only)', async () => {
      const helpdesk = await loginAs('helpdesk@org1.com')
      const res = await api.get('/admin/users').set('Authorization', helpdesk)
      expect(res.status).toBe(200)
    })

    it('can reset user passwords', async () => {
      const helpdesk = await loginAs('helpdesk@org1.com')
      const res = await api.post('/admin/users/user1/reset-password')
        .set('Authorization', helpdesk)
      expect(res.status).toBe(200)
    })

    it('cannot delete users', async () => {
      const helpdesk = await loginAs('helpdesk@org1.com')
      const res = await api.delete('/admin/users/user1').set('Authorization', helpdesk)
      expect(res.status).toBe(403)
    })

    it('can manage user sessions', async () => {
      const helpdesk = await loginAs('helpdesk@org1.com')
      const res = await api.delete('/admin/users/user1/sessions')
        .set('Authorization', helpdesk)
      expect(res.status).toBe(200)
    })
  })

  describe('Compliance Officer', () => {
    it('can access audit logs', async () => {
      const compliance = await loginAs('compliance@org1.com')
      const res = await api.get('/admin/audit').set('Authorization', compliance)
      expect(res.status).toBe(200)
    })

    it('can manage legal holds', async () => {
      const compliance = await loginAs('compliance@org1.com')
      const res = await api.get('/admin/compliance/holds').set('Authorization', compliance)
      expect(res.status).toBe(200)
    })

    it('cannot modify users', async () => {
      const compliance = await loginAs('compliance@org1.com')
      const res = await api.patch('/admin/users/user1')
        .set('Authorization', compliance)
        .send({ name: 'Changed' })
      expect(res.status).toBe(403)
    })
  })
})
```

### Multi-tenant Dashboard Tests

```typescript
// services/api/src/__tests__/integration/msp-dashboard.test.ts
describe('MSP Dashboard', () => {
  it('lists all tenants with stats', async () => {
    const superAdmin = await loginAs('superadmin@system.com')
    const res = await api.get('/admin/tenants').set('Authorization', superAdmin)

    expect(res.body.tenants[0]).toHaveProperty('userCount')
    expect(res.body.tenants[0]).toHaveProperty('storageUsed')
    expect(res.body.tenants[0]).toHaveProperty('messageCount')
  })

  it('filters tenants by name', async () => {
    const superAdmin = await loginAs('superadmin@system.com')
    const res = await api.get('/admin/tenants?search=Acme').set('Authorization', superAdmin)

    expect(res.body.tenants.every(t => t.name.includes('Acme'))).toBe(true)
  })

  it('suspends tenant', async () => {
    const superAdmin = await loginAs('superadmin@system.com')
    await api.post('/admin/tenants/org1/suspend').set('Authorization', superAdmin)

    // Tenant users should be locked out
    const userToken = await loginAs('user@org1.com')
    expect(userToken).toBeNull()
  })

  it('aggregates metrics across tenants', async () => {
    const superAdmin = await loginAs('superadmin@system.com')
    const res = await api.get('/admin/metrics/aggregate').set('Authorization', superAdmin)

    expect(res.body.totalUsers).toBeDefined()
    expect(res.body.totalStorage).toBeDefined()
    expect(res.body.messagesPerDay).toBeDefined()
  })
})
```

### Real-time Monitoring Tests

```typescript
// services/api/src/__tests__/integration/monitoring.test.ts
describe('Real-time Monitoring', () => {
  it('streams stats via SSE', async () => {
    const events: any[] = []
    const es = new EventSource('http://localhost:3001/admin/stats/stream', {
      headers: { Authorization: 'Bearer superadmin-token' }
    })

    es.onmessage = (e) => events.push(JSON.parse(e.data))

    await sleep(6000) // Wait for 2 updates (5s interval)
    es.close()

    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0]).toHaveProperty('activeConnections')
  })

  it('includes IMAP connection count', async () => {
    // Create some IMAP connections
    await Promise.all(Array(10).fill(0).map(() => createIMAPConnection()))

    const res = await api.get('/admin/stats')
    expect(res.body.imapConnections).toBe(10)
  })

  it('includes message throughput', async () => {
    const res = await api.get('/admin/stats')
    expect(res.body.messagesPerMinute).toBeDefined()
  })

  it('triggers alerts at thresholds', async () => {
    // Set low threshold
    await api.patch('/admin/alerts/storage')
      .send({ threshold: 0.1 }) // 10%

    // Check alert triggered
    const alerts = await api.get('/admin/alerts')
    expect(alerts.body.some(a => a.type === 'storage_warning')).toBe(true)
  })
})
```

### Migration Tools Tests

```typescript
// services/api/src/__tests__/integration/migration.test.ts
describe('Migration Tools', () => {
  describe('PST Import', () => {
    it('imports PST file', async () => {
      const pstFile = await readFile('fixtures/sample.pst')

      const res = await api.post('/admin/migration/import/pst')
        .attach('file', pstFile)
        .field('targetUser', 'user1')

      expect(res.status).toBe(202) // Accepted for processing
      expect(res.body.jobId).toBeDefined()
    })

    it('tracks import progress', async () => {
      const job = await startPSTImport('sample.pst')

      await waitFor(() => {
        const status = await api.get(`/admin/migration/jobs/${job.id}`)
        return status.body.progress > 0
      })

      const final = await api.get(`/admin/migration/jobs/${job.id}`)
      expect(final.body.status).toBe('completed')
    })

    it('handles large PST (10GB)', async () => {
      const job = await startPSTImport('large-10gb.pst')

      // Should complete within reasonable time
      await waitFor(() => {
        const status = await api.get(`/admin/migration/jobs/${job.id}`)
        return status.body.status === 'completed'
      }, { timeout: 600000 }) // 10 min
    })
  })

  describe('MBOX Import', () => {
    it('imports MBOX file', async () => {
      const mboxFile = await readFile('fixtures/sample.mbox')

      const res = await api.post('/admin/migration/import/mbox')
        .attach('file', mboxFile)
        .field('targetUser', 'user1')

      expect(res.status).toBe(202)
    })
  })

  describe('IMAP Sync', () => {
    it('syncs from external IMAP server', async () => {
      const res = await api.post('/admin/migration/import/imap')
        .send({
          targetUser: 'user1',
          sourceHost: 'imap.gmail.com',
          sourceUser: 'old@gmail.com',
          sourcePassword: 'app-password'
        })

      expect(res.status).toBe(202)
    })
  })
})
```

### Quota Management Tests

```typescript
// services/api/src/__tests__/integration/quota.test.ts
describe('Quota Management', () => {
  it('sets quota per user', async () => {
    await api.patch('/admin/users/user1/quota')
      .send({ storageLimit: 5 * 1024 * 1024 * 1024 }) // 5GB

    const user = await prisma.user.findUnique({ where: { id: 'user1' } })
    expect(user.storageLimit).toBe(5 * 1024 * 1024 * 1024)
  })

  it('enforces hard limit on message receive', async () => {
    await setUserQuota('user1', { storageLimit: 1024, used: 1000 }) // Nearly full

    const res = await deliverMessage('user1@example.com', {
      size: 100 // Would exceed
    })

    expect(res.rejected).toBe(true)
    expect(res.reason).toContain('quota exceeded')
  })

  it('sends warning at 80% threshold', async () => {
    await setUserQuota('user1', { storageLimit: 1000, used: 800 })
    await runQuotaCheck()

    const notification = await prisma.notification.findFirst({
      where: { userId: 'user1', type: 'quota_warning' }
    })
    expect(notification).toBeDefined()
  })

  it('shows usage dashboard', async () => {
    const res = await api.get('/admin/quota/dashboard')

    expect(res.body.users).toContainEqual({
      id: 'user1',
      used: expect.any(Number),
      limit: expect.any(Number),
      percentage: expect.any(Number)
    })
  })
})
```

### System Health Tests

```typescript
// services/api/src/__tests__/integration/health.test.ts
describe('System Health', () => {
  it('reports service status', async () => {
    const res = await api.get('/admin/health')

    expect(res.body.services).toEqual({
      api: 'healthy',
      database: 'healthy',
      redis: 'healthy',
      imap: 'healthy',
      smtp: 'healthy'
    })
  })

  it('reports unhealthy service', async () => {
    // Stop Redis
    await stopService('redis')

    const res = await api.get('/admin/health')
    expect(res.body.services.redis).toBe('unhealthy')
  })

  it('reports queue depths', async () => {
    const res = await api.get('/admin/health/queues')

    expect(res.body.queues).toContainEqual({
      name: 'outbound',
      waiting: expect.any(Number),
      active: expect.any(Number),
      completed: expect.any(Number),
      failed: expect.any(Number)
    })
  })
})
```

## Docker Commands

```bash
# Run admin tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "RBAC|MSP|Monitoring|Migration|Quota|Health"

# Test PST import with sample file
docker compose -f docker-compose.test.yml exec test-api \
  npm run migration:test-pst -- --file fixtures/sample.pst

# Load test dashboard with 100 tenants
docker compose -f docker-compose.test.yml exec test-api \
  npm run seed:tenants -- --count 100 && \
  npm test -- --grep "MSP Dashboard"
```

## Success Criteria

- [ ] Org Admin cannot access other orgs
- [ ] Helpdesk can reset passwords but not delete users
- [ ] Compliance Officer can access audit but not users
- [ ] PST import migrates 10GB mailbox
- [ ] Real-time stats update without page refresh
- [ ] Quota warning emails sent at 80%
- [ ] Impersonation logged to audit
