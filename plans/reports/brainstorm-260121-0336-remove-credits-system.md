# Brainstorm: Loại bỏ Credits System & Cải tiến Admin Codes

**Date:** 2026-01-21
**Status:** Approved
**Decision:** Approach A - Hard Delete Credits

## Problem Statement

Hệ thống credits hiện tại xung đột với tier-based limits:
- FREE user có credits có thể bypass daily email limit (10/day)
- 2 systems song song gây confusion
- USAGE_BASED packages không còn phù hợp với business model

## Evaluated Approaches

### Approach A: Hard Delete (✅ SELECTED)
- Xóa hoàn toàn credits system
- Đơn giản hóa ~500 LOC
- Risk: MEDIUM

### Approach B: Soft Deprecation
- Giữ data, ẩn UI
- Không giải quyết root cause
- Risk: LOW

### Approach C: Credits as Top-up
- Complex logic
- Violates KISS
- Risk: HIGH

## Final Solution

### Scope
- 46 files affected
- 6 phases over ~6 days
- Database migration required

### Key Changes
1. Remove CreditService, CreditTransaction
2. Remove credits field from User
3. Remove USAGE_BASED package type
4. Add BUSINESS tier to all dropdowns
5. Simplify outbound email to use tier limits only

### Migration Strategy
1. Backup affected tables
2. Query users with credits > 0
3. Compensation if needed
4. Run migration
5. Deploy cleanup

## Risks
| Risk | Mitigation |
|------|------------|
| Users lose credits | Backup + compensation plan |
| Breaking payments | Check sepay webhooks |
| Mobile crash | Graceful degradation |

## Success Metrics
- Zero credit-related code
- All 5 tiers manageable in admin
- Tier limits correctly enforced
- No user complaints

## Next Steps
→ Create detailed implementation plan in `plans/260121-0336-remove-credits-system/`
