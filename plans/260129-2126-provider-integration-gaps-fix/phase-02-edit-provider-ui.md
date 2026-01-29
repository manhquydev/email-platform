# Phase 2: Edit Provider UI

## Overview
- **Priority**: P1
- **Effort**: 1.5h
- **Status**: Pending

## Requirements
Add Edit Provider modal in Admin UI to update:
- Company name
- Contact email
- Billing email
- Webhook URL
- Tier

## Files to Modify
- `services/web/src/pages/admin/providers-modules/provider-form-modal.tsx` - Add edit mode
- `services/web/src/pages/admin/providers-modules/use-providers-page-data.ts` - Add update handler

## Todo
- [ ] Add isEdit prop to ProviderFormModal
- [ ] Add updateProvider API call
- [ ] Add Edit button to providers-table
- [ ] Populate form with existing data when editing
