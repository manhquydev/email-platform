# Phase 4: Frontend Cleanup

**Effort:** 3 hours
**Status:** pending
**Risk:** LOW

## Objective

Remove all credits-related UI from web and mobile apps.

## Web App Changes

### 4.1 `services/web/src/types.ts`

Remove `credits` from User type:
```typescript
// DELETE:
credits?: number;
```

### 4.2 `services/web/src/context/AuthContext.tsx`

Remove credits from user state if present.

### 4.3 `services/web/src/components/settings/SubscriptionSettings.tsx`

Remove credits display card/section.

### 4.4 `services/web/src/components/settings/subscription-modules/subscription-stats-cards.tsx`

Remove credits stat card.

### 4.5 `services/web/src/components/ComposeModal.tsx`

Remove credits warning/check when composing email.

### 4.6 `services/web/src/components/AppHeader.tsx`

Remove credits display if any.

### 4.7 `services/web/src/pages/Settings.tsx`

Remove credits section if any.

## Mobile App Changes

### 4.8 `services/mobile/src/types/index.ts`

Remove credits from User type.

### 4.9 `services/mobile/app/(tabs)/settings.tsx`

Remove credits display.

### 4.10 `services/mobile/src/components/AISummaryCard.tsx`

Remove credits reference if any.

## Admin Packages UI

### 4.11 `services/web/src/pages/admin/packages-modules/types.ts`

Remove creditAmount from types.

### 4.12 `services/web/src/pages/admin/packages-modules/package-form-modal.tsx`

- Remove creditAmount field
- Remove USAGE_BASED from type dropdown

### 4.13 `services/web/src/pages/admin/packages-modules/packages-table.tsx`

Remove creditAmount column.

## Todo

- [ ] Update web types
- [ ] Remove credits from SubscriptionSettings
- [ ] Remove credits from ComposeModal
- [ ] Update mobile types
- [ ] Remove credits from mobile settings
- [ ] Update admin packages forms
- [ ] Run `npm run build` in web & mobile

## Success Criteria

- No "credits" text in UI
- Web builds without errors
- Mobile builds without errors
