# Phase 5: Admin Enhancement

**Effort:** 2 hours
**Status:** pending
**Risk:** LOW

## Objective

Add BUSINESS tier to all admin dropdowns and finalize USAGE_BASED removal.

## Files to Update

### 5.1 `services/api/src/routes/admin/packages.ts`

**Line 37 & 80** - Add BUSINESS to targetTier enum:
```typescript
// BEFORE:
targetTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),

// AFTER:
targetTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]).optional(),
```

**Line 34 & 77** - Remove USAGE_BASED from type enum:
```typescript
// BEFORE:
type: z.enum(["TIME_BASED", "USAGE_BASED"]),

// AFTER:
type: z.enum(["TIME_BASED"]).default("TIME_BASED"),
```

### 5.2 `services/web/src/pages/admin/packages-modules/package-form-modal.tsx`

Update tier dropdown:
```tsx
<option value="FREE">FREE</option>
<option value="STARTER">STARTER</option>
<option value="PROFESSIONAL">PROFESSIONAL</option>
<option value="BUSINESS">BUSINESS</option>
<option value="ENTERPRISE">ENTERPRISE</option>
```

Remove type dropdown (or hide since only TIME_BASED now).

### 5.3 Already Done (Verify)

- `services/api/src/routes/admin/users.ts` - ✅ BUSINESS added
- `services/web/src/pages/admin/users-page-modules/users-page-components.tsx` - ✅ BUSINESS added

### 5.4 Clean Up Existing USAGE_BASED Packages

```bash
# Deactivate any USAGE_BASED packages in production
ssh -i .ssh/id_ed25519 root@165.22.48.193 \
  "docker exec email-platform-postgres-1 psql -U postgres -d email_service -c \
  \"UPDATE \\\"ServicePackage\\\" SET \\\"isActive\\\" = false WHERE type = 'USAGE_BASED';\""
```

## Todo

- [ ] Add BUSINESS to packages.ts validation
- [ ] Remove USAGE_BASED from packages.ts
- [ ] Update package-form-modal.tsx
- [ ] Verify admin/users already has BUSINESS
- [ ] Deactivate USAGE_BASED packages in DB

## Success Criteria

- All 5 tiers selectable in admin
- Cannot create USAGE_BASED packages
- Existing USAGE_BASED packages deactivated
