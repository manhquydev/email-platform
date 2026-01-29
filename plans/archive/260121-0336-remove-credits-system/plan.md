# Plan: Loại bỏ Credits System

```yaml
status: pending
created: 2026-01-21
estimated_effort: 6 days
risk_level: MEDIUM
breaking_change: true
```

## Overview

Loại bỏ hoàn toàn hệ thống Credits để đơn giản hóa business logic. Chuyển sang tier-based limits đã được implement.

## Problem

- Credits xung đột với tier-based daily email limits
- FREE user có credits có thể bypass 10 emails/day limit
- 2 systems song song gây confusion
- USAGE_BASED packages không phù hợp business model

## Solution

Xóa hoàn toàn:
- `CreditService` + `CreditTransaction` model
- `User.credits` field
- `USAGE_BASED` package type
- Credit logic trong outbound, subscription, auth

Thêm mới:
- `BUSINESS` tier vào admin dropdowns

## Phases

| Phase | Name | Effort | Status |
|-------|------|--------|--------|
| 1 | [Pre-migration Check](./phase-01-pre-migration.md) | 1h | pending |
| 2 | [API Cleanup](./phase-02-api-cleanup.md) | 4h | pending |
| 3 | [Database Migration](./phase-03-database-migration.md) | 2h | pending |
| 4 | [Frontend Cleanup](./phase-04-frontend-cleanup.md) | 3h | pending |
| 5 | [Admin Enhancement](./phase-05-admin-enhancement.md) | 2h | pending |
| 6 | [Testing & Deploy](./phase-06-testing-deploy.md) | 2h | pending |

## Files Affected

### Critical (Must Change)
- `services/api/src/routes/outbound.ts` - Remove credit check/deduct
- `services/api/src/routes/subscription.ts` - Remove USAGE_BASED redemption
- `services/api/src/services/credit.service.ts` - DELETE
- `services/api/prisma/schema.prisma` - Remove CreditTransaction, credits

### Medium Priority
- `services/api/src/routes/auth.ts` - Remove credits from response
- `services/api/src/routes/admin/packages.ts` - Add BUSINESS tier
- `services/web/src/pages/admin/packages-modules/*.tsx` - Update forms
- `services/web/src/components/settings/SubscriptionSettings.tsx` - Remove credits UI

### Low Priority (Display Only)
- `services/mobile/src/` - Remove credits display
- `services/web/src/components/ComposeModal.tsx` - Remove credits warning

## Success Criteria

- [ ] Zero credit-related code in production
- [ ] All 5 tiers manageable in admin
- [ ] Tier limits correctly enforced
- [ ] No runtime errors
- [ ] All tests pass

## Rollback Plan

1. Restore backup tables (_backup_credit_transactions, _backup_user_credits)
2. Revert git commits
3. Run reverse migration
