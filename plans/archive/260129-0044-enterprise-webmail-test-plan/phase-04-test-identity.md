# Phase 04: Identity Integration Tests

## Overview
- **Priority**: P2
- **Effort**: 2h
- **Dependencies**: OpenLDAP container, SAML IdP mock

## Test Categories

### LDAP Integration Tests

```typescript
// services/api/src/__tests__/integration/ldap-sync.test.ts
import ldapjs from 'ldapjs'

describe('LDAP Sync', () => {
  beforeAll(async () => {
    // Start OpenLDAP test container with seed data
    await startLDAPContainer()
  })

  it('binds to LDAP server with credentials', async () => {
    const result = await ldapService.testConnection({
      url: 'ldap://test-ldap:389',
      bindDN: 'cn=admin,dc=test,dc=local',
      bindPassword: 'admin'
    })
    expect(result.success).toBe(true)
  })

  it('syncs users from LDAP directory', async () => {
    await ldapService.syncUsers('org1')
    const users = await prisma.user.findMany({
      where: { organizationId: 'org1', source: 'ldap' }
    })
    expect(users.length).toBeGreaterThan(0)
  })

  it('maps AD groups to org roles', async () => {
    await ldapService.syncUsers('org1')
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@test.local' },
      include: { organizationMemberships: true }
    })
    expect(adminUser.organizationMemberships[0].role).toBe('ADMIN')
  })

  it('disables users removed from LDAP', async () => {
    // Remove user from LDAP
    await removeLDAPUser('john@test.local')
    await ldapService.syncUsers('org1')

    const user = await prisma.user.findFirst({
      where: { email: 'john@test.local' }
    })
    expect(user.status).toBe('DISABLED')
  })

  it('prevents LDAP injection attacks', async () => {
    await expect(ldapService.searchUsers({
      filter: 'john*)(|(uid=*'
    })).rejects.toThrow(/invalid filter/)
  })
})
```

### SAML 2.0 SP Tests

```typescript
// services/api/src/__tests__/integration/saml-sso.test.ts
describe('SAML SSO', () => {
  it('generates SP metadata XML', async () => {
    const res = await api.get('/sso/saml/provider1/metadata')
    expect(res.headers['content-type']).toContain('application/xml')
    expect(res.text).toContain('EntityDescriptor')
    expect(res.text).toContain('AssertionConsumerService')
  })

  it('redirects to IdP for login', async () => {
    const res = await api.get('/sso/saml/provider1/login')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('idp.example.com')
  })

  it('processes valid SAML assertion', async () => {
    const assertion = generateValidSAMLAssertion({
      email: 'user@example.com',
      nameId: 'user123'
    })

    const res = await api.post('/sso/saml/provider1/acs')
      .type('form')
      .send({ SAMLResponse: assertion })

    expect(res.status).toBe(302)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejects tampered SAML assertion', async () => {
    const tamperedAssertion = generateValidSAMLAssertion({
      email: 'admin@example.com'
    }).replace('user@', 'admin@')

    const res = await api.post('/sso/saml/provider1/acs')
      .type('form')
      .send({ SAMLResponse: tamperedAssertion })

    expect(res.status).toBe(401)
  })

  it('creates user on first SSO login (JIT)', async () => {
    const assertion = generateValidSAMLAssertion({
      email: 'newuser@example.com',
      nameId: 'new123'
    })

    await api.post('/sso/saml/provider1/acs')
      .type('form')
      .send({ SAMLResponse: assertion })

    const user = await prisma.user.findFirst({
      where: { email: 'newuser@example.com' }
    })
    expect(user).toBeDefined()
    expect(user.source).toBe('saml')
  })
})
```

### OIDC Client Tests

```typescript
// services/api/src/__tests__/integration/oidc-sso.test.ts
describe('OIDC SSO', () => {
  it('redirects to IdP authorization endpoint', async () => {
    const res = await api.get('/sso/oidc/google/login')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('accounts.google.com')
    expect(res.headers.location).toContain('response_type=code')
  })

  it('exchanges code for tokens', async () => {
    mockOIDCTokenEndpoint({ id_token: generateJWT({ email: 'user@gmail.com' }) })

    const res = await api.get('/sso/oidc/google/callback?code=authcode123')
    expect(res.status).toBe(302)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('validates ID token signature', async () => {
    const invalidToken = generateJWT({ email: 'user@gmail.com' }, 'wrong-key')
    mockOIDCTokenEndpoint({ id_token: invalidToken })

    const res = await api.get('/sso/oidc/google/callback?code=authcode123')
    expect(res.status).toBe(401)
  })

  it('extracts claims from ID token', async () => {
    const idToken = generateJWT({
      email: 'user@gmail.com',
      name: 'John Doe',
      picture: 'https://example.com/photo.jpg'
    })
    mockOIDCTokenEndpoint({ id_token: idToken })

    await api.get('/sso/oidc/google/callback?code=authcode123')

    const user = await prisma.user.findFirst({ where: { email: 'user@gmail.com' } })
    expect(user.name).toBe('John Doe')
  })
})
```

### SCIM 2.0 Tests

```typescript
// services/api/src/__tests__/integration/scim.test.ts
describe('SCIM Provisioning', () => {
  const scimAuth = { Authorization: 'Bearer scim-token-123' }

  describe('GET /scim/v2/Users', () => {
    it('lists users with pagination', async () => {
      const res = await api.get('/scim/v2/Users?count=10')
        .set(scimAuth)
      expect(res.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse')
      expect(res.body.Resources.length).toBeLessThanOrEqual(10)
    })

    it('filters users by email', async () => {
      const res = await api.get('/scim/v2/Users?filter=userName eq "john@example.com"')
        .set(scimAuth)
      expect(res.body.totalResults).toBe(1)
    })
  })

  describe('POST /scim/v2/Users', () => {
    it('creates user from SCIM payload', async () => {
      const res = await api.post('/scim/v2/Users')
        .set(scimAuth)
        .send({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'newuser@example.com',
          name: { givenName: 'New', familyName: 'User' },
          emails: [{ value: 'newuser@example.com', primary: true }],
          active: true
        })
      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
    })
  })

  describe('PATCH /scim/v2/Users/:id', () => {
    it('updates user attributes', async () => {
      const res = await api.patch('/scim/v2/Users/user123')
        .set(scimAuth)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            { op: 'replace', path: 'name.givenName', value: 'Updated' }
          ]
        })
      expect(res.status).toBe(200)
    })

    it('deactivates user', async () => {
      await api.patch('/scim/v2/Users/user123')
        .set(scimAuth)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'active', value: false }]
        })

      const user = await prisma.user.findUnique({ where: { id: 'user123' } })
      expect(user.status).toBe('DISABLED')
    })
  })
})
```

## Docker Commands

```bash
# Start LDAP test container
docker run -d --name test-ldap \
  -e LDAP_ORGANISATION="Test Org" \
  -e LDAP_DOMAIN="test.local" \
  -e LDAP_ADMIN_PASSWORD="admin" \
  -p 389:389 \
  osixia/openldap:1.5.0

# Seed LDAP with test users
docker exec test-ldap ldapadd -x -D "cn=admin,dc=test,dc=local" \
  -w admin -f /tmp/seed-users.ldif

# Run identity tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "LDAP|SAML|OIDC|SCIM"

# Test SAML with SimpleSAMLphp
docker run -d --name test-saml-idp \
  -e SIMPLESAMLPHP_SP_ENTITY_ID=ephemera \
  -p 8443:8443 \
  kristophjunge/test-saml-idp
```

## Success Criteria

- [ ] LDAP sync pulls users from Active Directory
- [ ] SAML SSO from Okta works end-to-end
- [ ] OIDC login with Google creates user
- [ ] SCIM provisioning creates/disables users
- [ ] Group membership maps to org roles
- [ ] SSO login issues valid JWT
