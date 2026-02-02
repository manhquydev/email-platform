# Research Report: Pricing Plans & Documentation Audit

## 1. Plan Definitions (Backend)
**Source of Truth:** `services/api/src/config/unified-tier-limits.ts` (appears to supersede `constants.ts`)

**Tiers Defined:**
- **FREE**: 1 Domain, 3 Inboxes, 100MB Storage, 50 Emails/day
- **STARTER**: 3 Domains, 20 Inboxes, 1GB Storage, 200 Emails/day
- **PROFESSIONAL**: 10 Domains, 100 Inboxes, 5GB Storage, 1000 Emails/day
- **BUSINESS**: (Mentioned in types, limits to be verified)
- **ENTERPRISE**: Unlimited (-1)

**Risk:** Data duplication found between `constants.ts`, `tier-limits.ts`, and `unified-tier-limits.ts`. This violates DRY and risks configuration drift.

## 2. Frontend Implementation
**Location:** `services/web/src/pages/Pricing.tsx`
- Uses `DynamicPricingCards` component.
- Claims to fetch from `/billing/tiers` API (Single Source of Truth).
- **Good Practice:** UI seems decoupled from hardcoded values, relying on API.

## 3. Documentation Status
- **Location:** `docs/provider-api/` (Directory exists).
- **Issue:** Specific pricing documentation file not found at root `docs/`.
- **Action:** Need to verify if `docs/provider-api/` contains endpoints for `/billing/tiers`.

## 4. Mismatches & Recommendations
- **Config Drift:** Backend has multiple config files defining limits.
    - *Recommendation:* Consolidate to `unified-tier-limits.ts` and remove others.
- **Business Tier:** Defined in types but visibility in constants/limits needs verification.
- **Doc Gap:** No explicit "Pricing Plans" documentation found in root `docs/` list.

## Unresolved Questions
1. Does `/billing/tiers` endpoint correctly map to `unified-tier-limits.ts`?
2. Is the "BUSINESS" tier fully implemented or just a placeholder?
3. Content of `docs/provider-api/` needs specific review for billing endpoints.
