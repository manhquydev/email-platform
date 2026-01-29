# Phase 08: Admin Dashboard Enhancement

## Context Links
- [Plan Overview](plan.md)
- [Current Admin Routes](../../services/api/src/routes/admin/)
- [Frontend Components](../../services/web/src/pages/admin/)

## Overview
- **Priority**: P3 (Polish)
- **Status**: pending
- **Effort**: 3h

Enhance admin dashboard for enterprise management: RBAC, monitoring, migration tools.

## Key Insights
- Current admin panel is basic - needs enterprise depth
- MSPs need multi-tenant management view
- Migration tools lower adoption barrier
- Real-time monitoring builds trust

## Requirements

### Functional
- Granular RBAC: Super Admin, Org Admin, Helpdesk, Compliance
- Multi-tenant dashboard (MSP view)
- Real-time traffic and storage monitoring
- User migration tools (PST, MBOX, IMAP import)
- Quota management per user/domain
- System health and alerting

### Non-Functional
- Dashboard loads <2s with 100 tenants
- Migration handles 50GB mailbox
- Real-time stats update every 5s

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Role: Super Admin                                   │    │
│  │  - All organizations                                │    │
│  │  - System settings                                  │    │
│  │  - User impersonation                               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Role: Org Admin                                     │    │
│  │  - Own organization only                            │    │
│  │  - User management                                  │    │
│  │  - Domain configuration                             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Role: Helpdesk                                      │    │
│  │  - Read-only user view                              │    │
│  │  - Password reset                                   │    │
│  │  - Session management                               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Role: Compliance Officer                            │    │
│  │  - Audit logs                                       │    │
│  │  - Legal hold                                       │    │
│  │  - eDiscovery                                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/src/routes/admin/` - Add RBAC checks
- `services/web/src/pages/admin/` - Enhanced UI components
- `services/api/prisma/schema.prisma` - Role enum expansion

### Create
- `services/api/src/middleware/rbac.ts` - Role-based access control
- `services/api/src/routes/admin/migration.ts` - Import tools
- `services/api/src/services/migration/` - Import handlers
- `services/web/src/pages/admin/tenants.tsx` - MSP view
- `services/web/src/pages/admin/monitoring.tsx` - Real-time stats

## Implementation Steps

1. **RBAC Implementation**
   ```prisma
   enum AdminRole {
     SUPER_ADMIN
     ORG_ADMIN
     HELPDESK
     COMPLIANCE_OFFICER
   }

   model AdminPermission {
     id        String    @id @default(cuid())
     role      AdminRole
     resource  String    // users, domains, audit, etc.
     actions   String[]  // read, write, delete
     @@unique([role, resource])
   }
   ```

2. **RBAC Middleware**
   - Check `user.adminRole` against required permission
   - Scope queries to user's organization (unless Super Admin)
   - Decorator: `@requirePermission('users', 'write')`

3. **Multi-tenant Dashboard**
   - List all organizations with stats (Super Admin only)
   - Quick actions: suspend, quota change, impersonate
   - Filter/search by name, domain, status
   - Aggregate metrics across tenants

4. **Real-time Monitoring**
   - SSE endpoint: `/admin/stats/stream`
   - Metrics: active connections, messages/min, storage
   - Alert thresholds configurable
   - Visual charts with recharts library

5. **Migration Tools**
   - **PST Import**: Parse Outlook PST files
   - **MBOX Import**: Standard Unix mailbox format
   - **IMAP Sync**: Pull from existing provider
   - Queue-based processing for large imports
   - Progress tracking with estimated completion

6. **Quota Management**
   - Set storage quota per user/domain/org
   - Soft limit (warning) and hard limit (reject)
   - Usage dashboard with trends
   - Automated alerts at 80%, 90%, 100%

7. **System Health Dashboard**
   - Service status: API, SMTP, IMAP, DB, Redis
   - Queue depths and processing rates
   - Error rates and recent failures
   - Disk/memory/CPU usage

## Todo List

- [ ] Define AdminRole enum and permissions
- [ ] Implement RBAC middleware
- [ ] Update existing admin routes with RBAC
- [ ] Build multi-tenant management view
- [ ] Create real-time monitoring SSE endpoint
- [ ] Implement PST import parser
- [ ] Implement MBOX import parser
- [ ] Add IMAP migration sync
- [ ] Build quota management UI
- [ ] Create system health dashboard
- [ ] Add impersonation feature (Super Admin)

## Success Criteria

- [ ] Org Admin cannot access other orgs
- [ ] Helpdesk can reset passwords but not delete users
- [ ] PST import successfully migrates 10GB mailbox
- [ ] Real-time stats update without page refresh
- [ ] Quota warning emails sent at thresholds

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RBAC bypass | Critical | Integration tests for all routes |
| Large import OOM | Medium | Streaming parser, chunked processing |
| Impersonation abuse | High | Audit log, time-limited sessions |
| Dashboard data leak | Medium | Tenant scoping on all queries |

## Security Considerations

- Impersonation requires 2FA confirmation
- All admin actions logged to audit
- Session timeout shorter for admin roles
- IP allowlist for Super Admin access
- Encrypt imported files at rest
- Rate limit import requests
