# Phase 2: Navigation & Permissions Verification

## Context Links
- Nav config: `services/web/src/components/admin-panel-modules/admin-nav-items.ts`
- Router: `services/web/src/pages/Admin.tsx`
- [Admin UI Audit Report](./research/researcher-01-admin-ui-audit.md)

## Overview
- **Priority**: High
- **Status**: Pending
- **Effort**: 1h
- **Description**: Verify navigation links to provider management and RBAC permissions

## Key Insights
- Navigation defined in `admin-nav-items.ts`
- Need to verify "Providers" link exists and routes correctly
- RBAC should distinguish "Manage Providers" vs "View Providers"

## Requirements

### Functional
- Admin sidebar shows "Providers" navigation item
- Link routes to `/admin/providers` correctly
- Only admins with proper permissions see the link
- Permission checks on API calls

### Non-Functional
- Consistent with other admin nav items
- Clear permission error messages

## Related Code Files

### Files to Review
- `services/web/src/components/admin-panel-modules/admin-nav-items.ts`
- `services/web/src/pages/Admin.tsx`
- `services/web/src/hooks/useAuth.ts` (or similar auth hook)
- `services/api/src/middleware/` (permission middleware)

### Files to Potentially Modify
- `admin-nav-items.ts` - if providers link missing
- Route config - if route not defined

## Implementation Steps

1. **Check admin-nav-items.ts**
   - Verify "Providers" item exists in nav config
   - Check icon, label, route path
   - Verify permission requirement on nav item

2. **Review Admin.tsx routing**
   - Confirm `/admin/providers` route defined
   - Check route has auth guard
   - Verify lazy loading if applicable

3. **Audit RBAC Implementation**
   - Find permission constants (e.g., `MANAGE_PROVIDERS`, `VIEW_PROVIDERS`)
   - Check where permissions enforced:
     - Frontend: nav visibility, button visibility
     - Backend: API middleware

4. **Verify Permission Flow**
   - Trace from login → user permissions → UI visibility
   - Confirm API endpoints check permissions

## Todo List
- [ ] Verify "Providers" in admin-nav-items.ts
- [ ] Confirm /admin/providers route exists
- [ ] Identify permission constants for providers
- [ ] Check frontend permission guards
- [ ] Verify API permission middleware
- [ ] Document any missing RBAC controls

## Success Criteria
- Navigation link visible to authorized admins
- Route correctly loads ProvidersPage
- Unauthorized users cannot access (403 or redirect)
- Permission model documented

## Risk Assessment
- **Medium Risk**: Missing RBAC could be security issue
- **Mitigation**: Document gaps, prioritize fixes

## Security Considerations
- Ensure no permission bypass in frontend
- API must independently verify permissions
- Audit logs for provider management actions

## Next Steps
- Fix any navigation gaps found
- Create security tasks if RBAC missing
- Proceed to Phase 3 for pricing consolidation
