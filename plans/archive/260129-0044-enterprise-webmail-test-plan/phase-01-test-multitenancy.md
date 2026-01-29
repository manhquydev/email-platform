# Phase 01: Multi-tenancy & Custom Domains Tests

## Overview
- **Priority**: P1
- **Effort**: 1.5h
- **Dependencies**: PostgreSQL, Redis

## Test Categories

### Unit Tests

```typescript
// services/api/src/__tests__/unit/tenant-context.test.ts
describe('TenantContext', () => {
  it('extracts tenantId from JWT claims')
  it('resolves tenant from domain header fallback')
  it('caches tenant config in Redis with 5min TTL')
  it('throws 401 for invalid tenant')
})

describe('PrismaWithTenant', () => {
  it('auto-injects organizationId filter on queries')
  it('prevents cross-tenant data access')
  it('allows super admin to bypass tenant scope')
})
```

### Integration Tests

```typescript
// services/api/src/__tests__/integration/organizations.test.ts
describe('POST /organizations', () => {
  it('creates org with owner membership', async () => {
    const res = await api.post('/organizations').send({ name: 'Acme Corp' })
    expect(res.status).toBe(201)
    expect(res.body.members[0].role).toBe('OWNER')
  })
  it('rejects duplicate org name')
  it('requires super admin for creation')
})

describe('GET /organizations/:id', () => {
  it('returns org details for members')
  it('returns 403 for non-members')
  it('returns 404 for non-existent org')
})

describe('POST /organizations/:id/members', () => {
  it('adds member with specified role')
  it('requires OWNER or ADMIN role')
  it('prevents duplicate membership')
})
```

### Tenant Isolation Tests

```typescript
// services/api/src/__tests__/integration/tenant-isolation.test.ts
describe('TenantIsolation', () => {
  it('user A cannot see user B domains in different org', async () => {
    // Setup: Create 2 orgs, 2 users, domain in org1
    const userAToken = await loginAs('userA@org1.com')
    const userBToken = await loginAs('userB@org2.com')

    // User A creates domain
    await api.post('/domains').set('Authorization', userAToken)
      .send({ domain: 'secret.com' })

    // User B cannot list it
    const res = await api.get('/domains').set('Authorization', userBToken)
    expect(res.body.domains.map(d => d.domain)).not.toContain('secret.com')
  })

  it('cross-tenant inbox access returns 403')
  it('cross-tenant message read returns 403')
  it('API key scoped to single tenant')
})
```

### DNS Verification Tests

```typescript
// services/api/src/__tests__/integration/dns-verification.test.ts
describe('DNSVerification', () => {
  it('validates SPF record includes MX')
  it('verifies DKIM selector exists')
  it('checks DMARC policy presence')
  it('stores per-record verification status')
  it('caches DNS results for 5 minutes')
})
```

## Docker Commands

```bash
# Run multitenancy tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "Phase01|Organization|Tenant"

# Test tenant isolation specifically
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- src/__tests__/integration/tenant-isolation.test.ts
```

## Success Criteria

- [ ] Org CRUD endpoints pass all tests
- [ ] Cross-tenant access returns 403
- [ ] Tenant config cached with <5ms resolution
- [ ] DNS verification checks SPF/DKIM/DMARC
- [ ] Redis cache TTL verified

## Test Data Setup

```sql
-- Seed test organizations
INSERT INTO organizations (id, name) VALUES
  ('org1', 'Acme Corp'),
  ('org2', 'Beta Inc');

INSERT INTO organization_members (org_id, user_id, role) VALUES
  ('org1', 'user1', 'OWNER'),
  ('org2', 'user2', 'OWNER');
```
