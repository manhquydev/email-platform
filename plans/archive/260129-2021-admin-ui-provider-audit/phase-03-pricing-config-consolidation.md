# Phase 3: Pricing Config Consolidation

## Context Links
- [Pricing Docs Audit Report](./research/researcher-02-pricing-docs-audit.md)
- Source of truth: `services/api/src/config/unified-tier-limits.ts`
- Duplicates: `constants.ts`, `tier-limits.ts`
- Frontend: `services/web/src/pages/Pricing.tsx`

## Overview
- **Priority**: Medium
- **Status**: Pending
- **Effort**: 2h
- **Description**: Consolidate pricing/tier configuration to single source (DRY violation fix)

## Key Insights
- **DRY Violation**: 3 files define tier limits
- Tiers: FREE, STARTER, PROFESSIONAL, BUSINESS, ENTERPRISE
- Frontend fetches from `/billing/tiers` API (good practice)
- BUSINESS tier may be incomplete

## Requirements

### Functional
- Single source of truth for tier limits
- All code references unified config
- `/billing/tiers` returns correct data
- Frontend displays accurate limits

### Non-Functional
- No breaking changes to API response
- Backwards compatible

## Related Code Files

### Files to Review
- `services/api/src/config/unified-tier-limits.ts` - intended source of truth
- `services/api/src/config/constants.ts` - check for tier duplicates
- `services/api/src/config/tier-limits.ts` - legacy, likely remove
- `services/api/src/routes/billing.ts` - verify uses unified config

### Files to Modify
- Remove duplicate tier definitions from `constants.ts`
- Delete `tier-limits.ts` if fully redundant
- Update imports to use `unified-tier-limits.ts`

## Architecture

```
unified-tier-limits.ts (Source of Truth)
         ↓
    /billing/tiers API
         ↓
    Pricing.tsx (Frontend)
```

## Implementation Steps

1. **Audit unified-tier-limits.ts**
   - Verify all 5 tiers fully defined
   - Check BUSINESS tier has complete limits
   - Confirm ENTERPRISE uses -1 for unlimited

2. **Find All Tier References**
   ```bash
   grep -r "FREE\|STARTER\|PROFESSIONAL\|BUSINESS\|ENTERPRISE" services/api/src/
   ```
   - List all files referencing tiers
   - Identify which import from wrong source

3. **Consolidate constants.ts**
   - Remove tier limit duplicates
   - Keep other constants (non-tier)
   - Update imports across codebase

4. **Remove tier-limits.ts**
   - Verify no active imports
   - Delete file
   - Update any stale imports

5. **Verify /billing/tiers Endpoint**
   - Confirm imports unified-tier-limits
   - Test endpoint returns correct data
   - Match response to frontend expectations

6. **Test Frontend Pricing Page**
   - Verify `Pricing.tsx` displays correct tiers
   - Check `DynamicPricingCards` renders all 5 tiers

## Todo List
- [ ] Audit unified-tier-limits.ts completeness
- [ ] Search for duplicate tier definitions
- [ ] Update constants.ts (remove tier duplicates)
- [ ] Delete tier-limits.ts if redundant
- [ ] Update all imports to unified source
- [ ] Verify /billing/tiers endpoint
- [ ] Test Pricing.tsx displays correctly
- [ ] Run API tests to confirm no regression

## Success Criteria
- Single file defines all tier limits
- No duplicate tier configurations
- API returns correct tier data
- Frontend displays accurate pricing
- All tests pass

## Risk Assessment
- **Medium Risk**: Breaking API response format
- **Mitigation**: Check all consumers before changes
- **Mitigation**: Run existing tests

## Next Steps
- Create pricing documentation (Phase 4)
- Update changelog with consolidation
