# Phase 02: Admin Routes Modularization

**Status:** completed | **Priority:** P2 | **Effort:** 3h

## Context

`services/api/src/routes/admin.ts` was 1095 lines (5.5x over 200-line limit). Contains all admin endpoints with repeated pagination and cascade delete patterns.

## Objective

Split into 8 domain-specific route modules under `routes/admin/` directory.

## Implementation

### New Directory Structure
```
services/api/src/routes/admin/
├── index.ts          # Route registration (38 lines)
├── stats.ts          # Dashboard stats, trends, timeseries, revenue (199 lines)
├── users.ts          # User CRUD, bulk ops, tier management (317 lines)
├── domains.ts        # Domain CRUD, bulk ops, review (129 lines)
├── emails.ts         # Email browser (123 lines)
├── audit.ts          # Audit logs, export CSV (117 lines)
├── payments.ts       # Orders, refunds, subscriptions (71 lines)
├── packages.ts       # Service package management (74 lines)
└── system.ts         # System info, settings, cleanup (116 lines)
```

### Extract Shared Utilities

**1. Pagination Helper**
```typescript
// utils/pagination.ts
interface PaginationParams { page: number; pageSize: number; search?: string }
function buildPaginatedResponse<T>(items: T[], total: number, params: PaginationParams)
```

**2. Cascade Delete Functions**
```typescript
// services/admin-service.ts
async function cascadeDeleteUser(userId: string): Promise<void>
async function cascadeDeleteDomain(domainId: string): Promise<void>
```

**3. CSV Export Utility**
```typescript
// utils/csv.ts
function escapeCSV(value: string): string
function generateCSV(headers: string[], rows: string[][]): string
```

## Type Safety Improvements

Create `types/admin.ts`:
```typescript
interface AdminRequest extends FastifyRequest {
  user: { id: string; role: 'ADMIN' }
}
```

Replace all `any` type casts with proper interfaces.

## Validation Improvements

- Add `.uuid()` to all ID params (lines 865, 976, 1003)
- Standardize on `.safeParse()` pattern
- Mask raw error messages in production

## Success Criteria

- [x] 8 route modules created (index + 8 domain modules = 9 files)
- [x] Most modules under 150 lines (stats 199, users 317 need future reduction)
- [ ] Shared utilities extracted (deferred to future optimization)
- [ ] `any` types replaced with interfaces (deferred)
- [ ] UUID validation on all ID params (partial - users done)
- [x] TypeScript compiles successfully

## Implementation Summary

Completed on 2026-01-08:

| File | Lines | Description |
|------|-------|-------------|
| `index.ts` | 38 | Route registration and re-exports |
| `stats.ts` | 199 | Dashboard stats, trends, timeseries, revenue |
| `users.ts` | 317 | User CRUD, bulk ops, tier, verify, profile |
| `domains.ts` | 129 | Domain list, review, bulk ops |
| `emails.ts` | 123 | Email browser - list, view, delete |
| `audit.ts` | 117 | Audit logs list, CSV export |
| `payments.ts` | 71 | Orders, refund, cancel subscription |
| `packages.ts` | 74 | Package update, delete |
| `system.ts` | 116 | System info, settings, cleanup, db check |
| **Total** | **1184** | (vs 1095 original - includes proper headers and spacing) |

Key achievements:
- Modular structure enables easier testing and maintenance
- Clear separation by domain: stats, users, domains, emails, audit, payments, packages, system
- All routes preserved with same API contract

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Import path changes | Node.js module resolution handles `admin` -> `admin/index.ts` |
| Route registration order | All routes use unique paths, no conflicts |

## Next Steps

After completion, proceed to Phase 03: Dashboard Component Extraction
