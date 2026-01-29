# Phase 01: Admin UI for Provider Management

## Context Links
- [Plan Overview](./plan.md)
- [Codebase Analysis](./research/researcher-02-codebase-analysis.md)
- Backend: `services/api/src/services/hosting-provider.service.ts`
- Routes: `services/api/src/routes/provider.ts`
- Reference UI: `services/web/src/pages/admin/UsersPage.tsx`

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | Completed |
| Effort | 5 days |
| Owner | TBD |

Build Admin dashboard for Super Admins to register, view, and manage Hosting Providers. Follows existing admin page patterns (UsersPage, PackagesPage).

## Key Insights
- Backend `HostingProviderService` already has full CRUD: `registerProvider`, `getProvider`, `regenerateApiKey`
- Missing: Admin-facing API routes (current `/v1/provider/*` routes require Provider API key, not admin JWT)
- UI pattern: GlassCard + PremiumTable + modals (see `UsersPage.tsx`)

## Requirements

### Functional
- FR1: List all registered providers with pagination/search
- FR2: Create new provider (name, email, tier, webhook URL)
- FR3: View provider details (usage stats, tenant count, API key prefix)
- FR4: Regenerate API key (shows once, then hidden)
- FR5: Suspend/activate provider
- FR6: View provider's tenants summary

### Non-Functional
- NFR1: Admin JWT auth required (role: ADMIN)
- NFR2: API key displayed only once on creation
- NFR3: Responsive table design

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Admin UI (React)                      │
│  ProvidersPage.tsx → useProvidersData() hook            │
└─────────────────────┬───────────────────────────────────┘
                      │ JWT Auth
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Admin API Routes (Fastify)                  │
│  /v1/admin/providers/* (NEW)                            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│           HostingProviderService (existing)              │
│  registerProvider, getProvider, regenerateApiKey, etc.  │
└─────────────────────────────────────────────────────────┘
```

## Related Code Files

### Files to CREATE
| File | Purpose |
|------|---------|
| `services/api/src/routes/admin-providers.ts` | Admin API endpoints |
| `services/web/src/pages/admin/ProvidersPage.tsx` | Main page component |
| `services/web/src/pages/admin/providers-modules/providers-table.tsx` | Table component |
| `services/web/src/pages/admin/providers-modules/provider-form-modal.tsx` | Create/Edit modal |
| `services/web/src/pages/admin/providers-modules/provider-detail-drawer.tsx` | Detail view |
| `services/web/src/pages/admin/providers-modules/index.ts` | Module exports |

### Files to MODIFY
| File | Change |
|------|--------|
| `services/api/src/server.ts` | Register admin-providers routes |
| `services/web/src/components/admin/AdminSidebar.tsx` | Add "Providers" nav item |
| `services/web/src/App.tsx` | Add route for ProvidersPage |

## Implementation Steps

### Backend (Day 1-2)

1. **Create admin-providers.ts route file**
```typescript
// services/api/src/routes/admin-providers.ts
import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/auth';
import { HostingProviderService } from '../services/hosting-provider.service';

export const adminProvidersRoutes = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAdmin);

  // GET /v1/admin/providers - List all providers
  app.get('/v1/admin/providers', async (req, reply) => {
    const { limit = 50, offset = 0, search } = req.query;
    // Query providers with pagination
  });

  // POST /v1/admin/providers - Create provider
  app.post('/v1/admin/providers', async (req, reply) => {
    const result = await HostingProviderService.registerProvider(req.body);
    return reply.status(201).send(result);
  });

  // GET /v1/admin/providers/:id - Get provider details
  // POST /v1/admin/providers/:id/regenerate-key
  // PATCH /v1/admin/providers/:id/status
};
```

2. **Add list providers method to HostingProviderService**
```typescript
static async listProviders(options: { limit?: number; offset?: number; search?: string }) {
  // Implement with Prisma findMany + count
}
```

3. **Register routes in server.ts**
```typescript
import { adminProvidersRoutes } from './routes/admin-providers';
app.register(adminProvidersRoutes);
```

### Frontend (Day 3-5)

4. **Create ProvidersPage.tsx** following UsersPage pattern
- Use `useProvidersData()` custom hook for state
- GlassCard container with PremiumTable
- Search bar, pagination

5. **Create provider-form-modal.tsx**
- Fields: name, contactEmail, billingEmail, tier (dropdown), webhookUrl
- Tier options: STARTER, GROWTH, ENTERPRISE
- On success: show API key in copyable format (once)

6. **Create providers-table.tsx**
- Columns: Name, Email, Tier, Status, Tenants, Created
- Actions: View, Regenerate Key, Suspend/Activate

7. **Create provider-detail-drawer.tsx**
- Show usage stats from `/v1/admin/providers/:id/usage`
- List recent tenants
- API key prefix display

8. **Add to AdminSidebar**
```tsx
{ icon: ServerIcon, label: 'Providers', path: '/admin/providers' }
```

## Todo List
- [ ] Create `admin-providers.ts` route file
- [ ] Add `listProviders` method to HostingProviderService
- [ ] Register admin routes in server.ts
- [ ] Create ProvidersPage.tsx
- [ ] Create providers-modules/providers-table.tsx
- [ ] Create providers-modules/provider-form-modal.tsx
- [ ] Create providers-modules/provider-detail-drawer.tsx
- [ ] Add "Providers" to AdminSidebar
- [ ] Add route in App.tsx
- [ ] Write unit tests for admin-providers routes
- [ ] Manual QA: create provider, view details, regenerate key

## Success Criteria
- [ ] Admin can list all providers with search/pagination
- [ ] Admin can create new provider and receives API key
- [ ] Admin can view provider usage statistics
- [ ] Admin can regenerate provider API key
- [ ] Admin can suspend/activate providers
- [ ] UI matches existing admin page styling

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| API key exposure in logs | High | Mask in response, log only prefix |
| Unauthorized access | High | requireAdmin middleware on all routes |
| UI inconsistency | Low | Copy patterns from UsersPage |

## Security Considerations
- All routes require ADMIN role JWT
- API keys hashed with SHA-256, never stored plain
- API key shown only once on creation/regeneration
- Audit log for key regeneration events

## Next Steps
After completion:
1. Proceed to Phase 02: SSO Endpoint
2. Test end-to-end: create provider → use API key → verify access

## Completion
**Completed:** 2026-01-29
