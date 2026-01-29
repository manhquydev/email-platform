# Phase 04: Identity Integration (LDAP/SSO)

## Context Links
- [Plan Overview](plan.md)
- [Technical Requirements](research/researcher-02-technical-requirements.md)
- [Current Auth Routes](../../services/api/src/routes/auth.ts)

## Overview
- **Priority**: P2 (Enterprise requirement)
- **Status**: pending
- **Effort**: 6h

Enable enterprise identity providers: LDAP/Active Directory sync, SAML 2.0, OIDC SSO.

## Key Insights
- Current auth is local JWT only - blocks enterprise sales
- LDAP/AD sync most requested for on-prem enterprises
- SAML 2.0 required for Okta, Azure AD, OneLogin
- SCIM 2.0 enables auto-provisioning from IDPs

## Requirements

### Functional
- LDAP/Active Directory bind and user sync
- SAML 2.0 SP (Service Provider) for SSO
- OIDC authentication flow support
- SCIM 2.0 provisioning endpoints
- JIT (Just-In-Time) user provisioning
- Group-to-role mapping

### Non-Functional
- SSO login <3s end-to-end
- LDAP sync <5min for 10,000 users
- Support multiple IDPs per tenant

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Identity Providers                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐    │
│  │ Okta    │  │Azure AD │  │ LDAP/AD │  │ Google OIDC │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘    │
└───────┼────────────┼────────────┼──────────────┼───────────┘
        │            │            │              │
        ▼            ▼            ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Identity Adapter Layer                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │SAML 2.0 SP│  │OIDC Client│  │LDAP Sync  │  │SCIM 2.0  │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬─────┘ │
└────────┼──────────────┼──────────────┼─────────────┼───────┘
         └──────────────┴──────────────┴─────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Management                            │
│  - Create/update users from external identity               │
│  - Map groups to org roles                                  │
│  - Issue local JWT after SSO                                │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add IdentityProvider, ExternalIdentity models
- `services/api/src/routes/auth.ts` - Add SSO redirect endpoints
- `services/api/src/utils/session.ts` - Support IDP sessions

### Create
- `services/api/src/identity/ldap-sync.ts` - LDAP bind and sync
- `services/api/src/identity/saml-sp.ts` - SAML 2.0 SP
- `services/api/src/identity/oidc-client.ts` - OIDC flows
- `services/api/src/routes/scim.ts` - SCIM 2.0 endpoints
- `services/api/src/routes/sso.ts` - SSO login flows

## Implementation Steps

1. **Schema Extensions**
   ```prisma
   model IdentityProvider {
     id             String   @id @default(cuid())
     organizationId String
     organization   Organization @relation(fields: [organizationId])
     type           String   // ldap, saml, oidc
     name           String
     config         Json     // Provider-specific config
     enabled        Boolean  @default(true)
     syncEnabled    Boolean  @default(false)
     lastSyncAt     DateTime?
   }

   model ExternalIdentity {
     id             String   @id @default(cuid())
     userId         String
     user           User     @relation(fields: [userId])
     providerId     String
     provider       IdentityProvider @relation(fields: [providerId])
     externalId     String   // IDP's user ID
     email          String
     attributes     Json?    // Additional SAML/OIDC claims
     @@unique([providerId, externalId])
   }
   ```

2. **LDAP Integration**
   - Use `ldapjs` for bind and search
   - Config: server URL, bind DN, base DN, filter
   - Sync scheduler: pull users every N minutes
   - Map AD groups to org roles

3. **SAML 2.0 SP**
   - Use `@node-saml/passport-saml`
   - Endpoints:
     - `GET /sso/saml/:providerId/login` - Initiate SSO
     - `POST /sso/saml/:providerId/acs` - Assertion Consumer
     - `GET /sso/saml/:providerId/metadata` - SP metadata XML
   - Store IdP certificate, entity ID in config

4. **OIDC Client**
   - Use `openid-client` library
   - Support authorization code flow
   - Endpoints:
     - `GET /sso/oidc/:providerId/login` - Redirect to IdP
     - `GET /sso/oidc/:providerId/callback` - Token exchange
   - Validate ID token, extract claims

5. **SCIM 2.0 Provisioning**
   - Endpoints (per RFC 7643/7644):
     - `GET/POST /scim/v2/Users`
     - `GET/PUT/PATCH/DELETE /scim/v2/Users/:id`
     - `GET/POST /scim/v2/Groups`
   - Bearer token auth from IdP

6. **JIT Provisioning**
   - On first SSO login, create user automatically
   - Assign to org based on IdP config
   - Map groups/roles from SAML assertions

## Todo List

- [ ] Add IdentityProvider and ExternalIdentity models
- [ ] Implement LDAP bind and user search
- [ ] Build LDAP sync scheduler
- [ ] Implement SAML 2.0 SP with passport-saml
- [ ] Add OIDC client flows
- [ ] Create SCIM 2.0 User endpoints
- [ ] Create SCIM 2.0 Group endpoints
- [ ] Implement JIT user provisioning
- [ ] Add group-to-role mapping
- [ ] Build IDP management UI (admin)
- [ ] Test with Okta, Azure AD, Google Workspace

## Success Criteria

- [ ] Users can login via SAML SSO from Okta
- [ ] LDAP sync pulls users from Active Directory
- [ ] SCIM provisioning creates/disables users from Azure AD
- [ ] Group membership maps to org roles
- [ ] SSO login issues valid JWT for API access

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SAML signature bypass | Critical | Strict signature validation, audit |
| LDAP injection | Critical | Parameterized filters, input validation |
| Sync conflicts | Medium | Last-write-wins with audit log |
| IDP downtime | Medium | Cache valid sessions, graceful fallback |

## Security Considerations

- Validate SAML assertions cryptographically
- Use HTTPS for all IdP communication
- Encrypt sensitive config (LDAP bind password)
- Implement session timeout matching IdP
- Audit log all SSO events
- Support forced re-authentication for sensitive ops
