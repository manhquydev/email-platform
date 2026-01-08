# Code Review: admin.ts

**File**: `services/api/src/routes/admin.ts`
**Lines**: 1095 (Exceeds 200-line limit by 5.5x)

---

## Critical Issues

None identified - no security vulnerabilities or data loss risks.

---

## High Priority

1. **File Size Violation**: 1095 lines vs 200-line standard
2. **Type Safety**: `any` type used 15+ times for `where` clauses and `request.user`
3. **Missing UUID Validation**: Lines 865, 976, 1003 use `z.string()` instead of `z.string().uuid()` for IDs

---

## Medium Priority

1. **Code Duplication**:
   - Pagination pattern repeated 8x (lines 172-220, 529-555, 589-627, 796-861, 907-935)
   - Cascade delete logic duplicated (lines 344-358, 407-419, 466-477)
   - CSV escaping inline instead of utility (lines 669-676)

2. **Inconsistent Validation Handling**:
   - Line 285 uses `.parse()` (throws), others use `.safeParse()`
   - Some routes return 400, others silently handle

3. **Missing Error Handling**: Lines 980-985, 993-999 expose raw error messages

---

## Low Priority

1. **Magic Numbers**: 7 days (line 102), 30 days (lines 300, 734), 1000 records (line 662)
2. **Hardcoded Tier Prices**: Lines 958-963 should be in config/DB
3. **Vietnamese String**: Lines 1054, 1061 - inconsistent i18n

---

## Security Observations

- All routes properly use `app.requireAdmin` preHandler
- Self-modification prevention implemented (lines 244-246, 339-341, 385)
- Audit logging consistent throughout
- Raw SQL uses parameterized queries (lines 109-116)

---

## Refactoring Recommendations

**Split into modules** (~100-150 lines each):
```
routes/admin/
  index.ts          # Route registration
  stats.ts          # Dashboard stats, trends, timeseries
  users.ts          # User CRUD, bulk ops, tier management
  domains.ts        # Domain CRUD, bulk ops, review
  emails.ts         # Email browser
  audit.ts          # Audit logs, export
  payments.ts       # Orders, refunds, subscriptions
  packages.ts       # Service package management
  system.ts         # System info, settings, cleanup
```

**Extract utilities**:
- `buildPaginatedQuery()` helper
- `cascadeDeleteUser()` / `cascadeDeleteDomain()` functions
- `exportToCSV()` utility
- Type-safe `AdminRequest` interface replacing `any` casts

**Quick wins**:
1. Create `types/admin.ts` with proper request/user types
2. Extract constants to `config/admin.ts`
3. Add `.uuid()` validation to all ID params

---

## Positive Observations

- Consistent use of Zod validation
- Good audit trail coverage
- Proper admin authorization on all routes
- Efficient use of Promise.all for parallel queries
- Soft delete protection for packages with history

---

## Summary

File needs refactoring into 8-9 smaller modules. No security issues but type safety and code duplication need attention. Authorization properly implemented.

**Priority Actions**:
1. Split file into domain-specific modules
2. Create shared pagination/cascade-delete utilities
3. Replace `any` types with proper interfaces
