# Phase 01: Multi-tenancy & Custom Domains

## Context Links
- [Plan Overview](plan.md)
- [Market Analysis](research/researcher-01-market-analysis.md)
- [Current Schema](../../services/api/prisma/schema.prisma)

## Overview
- **Priority**: P1 (Foundation)
- **Status**: pending
- **Effort**: 4h

Foundation layer for enterprise: tenant isolation, org-level config, custom domain DNS verification.

## Key Insights
- Current system has basic domain support but lacks tenant isolation
- Competitors charge premium for white-label/multi-tenant features
- DNS verification (SPF/DKIM/DMARC) already partially implemented

## Requirements

### Functional
- Create/manage organizations (tenants)
- Assign users to organizations with roles (Owner, Admin, Member)
- Custom domain assignment per tenant with DNS verification
- Org-level settings override (retention, quotas, branding)

### Non-Functional
- Strict data isolation between tenants
- Sub-100ms tenant resolution on every request
- Support 1000+ tenants per instance

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Request                        │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│         Tenant Resolution Middleware             │
│   (from JWT claim or domain lookup)              │
└─────────────────────┬───────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────┐
│              Scoped Prisma Client                │
│   (all queries auto-filtered by tenantId)        │
└─────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add Organization model, tenantId FKs
- `services/api/src/lib/prisma.ts` - Add tenant-scoped client factory
- `services/api/src/routes/domains.ts` - Add org ownership validation

### Create
- `services/api/src/routes/organizations.ts` - Org CRUD endpoints
- `services/api/src/middleware/tenant-context.ts` - Tenant resolution
- `services/api/src/services/dns-verification.ts` - Enhanced DNS checks

## Implementation Steps

1. **Schema Migration**
   - Add `Organization` model with settings JSON field
   - Add `OrganizationMember` junction table (userId, orgId, role)
   - Add `organizationId` FK to Domain, Inbox, User models
   - Create migration: `npx prisma migrate dev --name add_multitenancy`

2. **Tenant Middleware**
   - Extract tenantId from JWT claims
   - Fallback: resolve from request domain header
   - Attach to `request.tenant` for route handlers
   - Cache tenant config in Redis (5min TTL)

3. **Scoped Database Access**
   - Create `prismaWithTenant(tenantId)` factory
   - Auto-inject `WHERE organizationId = ?` on queries
   - Use Prisma middleware or extension API

4. **Organization CRUD Routes**
   ```
   POST   /organizations          - Create org (super admin)
   GET    /organizations          - List user's orgs
   GET    /organizations/:id      - Get org details
   PATCH  /organizations/:id      - Update settings
   POST   /organizations/:id/members - Add member
   DELETE /organizations/:id/members/:userId - Remove member
   ```

5. **Enhanced Domain Verification**
   - Check SPF record includes tenant MX
   - Verify DKIM selector exists
   - Validate DMARC policy
   - Store verification status per record type

## Todo List

- [ ] Design Organization schema with settings JSONB
- [ ] Create OrganizationMember with role enum
- [ ] Add organizationId to Domain, Inbox, User
- [ ] Implement tenant resolution middleware
- [ ] Create scoped Prisma client factory
- [ ] Build organization CRUD routes
- [ ] Enhance DNS verification service
- [ ] Add Redis caching for tenant config
- [ ] Write integration tests for tenant isolation
- [ ] Update API docs with new endpoints

## Success Criteria

- [ ] Users can create/join organizations
- [ ] Domains strictly scoped to owning org
- [ ] Cross-tenant data access returns 403
- [ ] DNS verification checks SPF/DKIM/DMARC
- [ ] Tenant config cached with <5ms resolution

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration breaks existing data | High | Assign default org to existing users/domains |
| Tenant leakage in queries | Critical | Prisma middleware + integration tests |
| Performance hit from tenant checks | Medium | Redis cache + indexed FKs |

## Security Considerations

- Tenant ID must be validated server-side, never trust client
- Super admin bypasses tenant scope with explicit flag
- Audit log all cross-tenant admin actions
- Rate limit org creation to prevent abuse
