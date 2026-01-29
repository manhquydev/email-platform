# Approach A: Incremental Enhancement

## Overview

**Effort**: 12-16 hours
**Priority**: P1
**Risk Level**: Low
**ROI**: High (80% value with 40% effort)

Quick-win approach focusing on custom alias input and domain selection with minimal backend restructuring. Preserves 0-click experience while adding customization options.

## Pros & Cons

| Pros | Cons |
|------|------|
| Fast time-to-market (3-4 days) | No multi-inbox support |
| Low risk, minimal breaking changes | Basic premium differentiation only |
| Immediate user value | No OTP auto-extraction UI |
| Easy rollback if issues | Limited competitive advantage |

---

## Phase 1: Backend - Custom Alias & Domain Support (4-5h)

### Context Links
- [Current Service](../../services/api/src/services/ephemeral-inbox.service.ts)
- [API Routes](../../services/api/src/routes/ephemeral-inbox.ts)
- [Prisma Schema](../../services/api/prisma/schema.prisma)

### Requirements

**Functional**:
- Accept optional `localPart` parameter in create endpoint
- Accept optional `domainId` parameter in create endpoint
- Validate alias format (alphanumeric, dots, hyphens, 3-30 chars)
- Check alias uniqueness per domain
- Return available public domains list

**Non-functional**:
- Maintain backward compatibility (random alias if not provided)
- No performance regression on create (<100ms)

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `services/api/src/services/ephemeral-inbox.service.ts` | Modify | Add `localPart`, `domainId` params to `create()` |
| `services/api/src/routes/ephemeral-inbox.ts` | Modify | Update schema, add `/ephemeral/domains` endpoint |
| `services/api/src/lib/validation.ts` | Create | Alias validation utilities |

### Implementation Steps

1. **Create alias validation utility**
   ```typescript
   // services/api/src/lib/alias-validation.ts
   const ALIAS_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;
   const RESERVED_WORDS = ['admin', 'support', 'help', 'postmaster', 'abuse', 'noreply', 'system'];

   export function validateAlias(alias: string): { valid: boolean; error?: string }
   ```

2. **Update ephemeral-inbox.service.ts**
   ```typescript
   // Modify create() signature
   async create(options?: {
     expiryHours?: number;
     localPart?: string;    // Custom alias
     domainId?: string;     // Specific domain
   }): Promise<EphemeralInbox>
   ```

3. **Add domain listing method**
   ```typescript
   async getPublicDomains(): Promise<{ id: string; name: string; isPremium: boolean }[]>
   ```

4. **Update API routes**
   - Extend POST `/ephemeral/inbox` body schema
   - Add GET `/ephemeral/domains` endpoint

### API Changes

```typescript
// POST /ephemeral/inbox - Updated
{
  expiryHours?: number;    // 1-24, default 2
  localPart?: string;      // Optional custom alias
  domainId?: string;       // Optional domain selection
}

// GET /ephemeral/domains - New
// Response:
{
  domains: [
    { id: "uuid", name: "ephemera.email", isPremium: false },
    { id: "uuid", name: "tempbox.io", isPremium: false },
    { id: "uuid", name: "privaterelay.email", isPremium: true }
  ]
}
```

### Todo List

- [ ] Create `alias-validation.ts` with regex + reserved words
- [ ] Update `create()` to accept optional `localPart`
- [ ] Update `create()` to accept optional `domainId`
- [ ] Add uniqueness check before inbox creation
- [ ] Add `getPublicDomains()` method
- [ ] Update route schema validation
- [ ] Add `/ephemeral/domains` endpoint
- [ ] Write unit tests for alias validation

---

## Phase 2: Frontend - UI Controls (4-5h)

### Context Links
- [Hero Widget](../../services/web/src/pages/landing-page-modules/components/hero-inbox-widget.tsx)
- [Ephemeral Service](../../services/web/src/services/ephemeralService.ts)
- [useEphemeralInbox Hook](../../services/web/src/hooks/useEphemeralInbox.ts)

### Requirements

**Functional**:
- Add "Custom Alias" input field (collapsible, opt-in)
- Add domain dropdown selector
- Show validation errors inline
- Preserve random generation as default (0-click)

**Non-functional**:
- Mobile-responsive design
- Instant feedback on alias availability
- Match existing neo-glass design system

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `hero-inbox-widget.tsx` | Modify | Add alias input, domain dropdown |
| `ephemeralService.ts` | Modify | Add `getDomains()`, update `create()` params |
| `useEphemeralInbox.ts` | Modify | Add domains state, alias validation |

### UI Mockup (Text)

```
┌─────────────────────────────────────────────────────┐
│ ✉ Email Tạm Thời                        ⏱ 01:59:45 │
├─────────────────────────────────────────────────────┤
│ ▼ Tùy chỉnh địa chỉ (tùy chọn)                      │
│ ┌─────────────────────┐ @ ┌──────────────────────┐  │
│ │ my-custom-alias     │   │ ephemera.email    ▼  │  │
│ └─────────────────────┘   └──────────────────────┘  │
│ ✓ Có sẵn                                            │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ my-custom-alias@ephemera.email           📋  🔄 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Update ephemeralService.ts**
   ```typescript
   getDomains: async (): Promise<Domain[]> => { ... }
   create: async (options?: {
     expiryHours?: number;
     localPart?: string;
     domainId?: string;
   }): Promise<EphemeralInbox> => { ... }
   ```

2. **Add collapsible customization panel to hero widget**
   - Toggle button: "Tùy chỉnh địa chỉ"
   - Alias input with debounced availability check
   - Domain dropdown populated from API

3. **Add real-time alias validation**
   - Client-side regex check
   - Debounced server-side uniqueness check (300ms)
   - Visual feedback (green check / red X)

4. **Preserve default behavior**
   - If no customization, auto-generate random alias
   - Customization panel collapsed by default

### Todo List

- [ ] Add `getDomains()` to ephemeralService
- [ ] Update `create()` signature in ephemeralService
- [ ] Create `AliasCustomizer` component
- [ ] Add domain dropdown with loading state
- [ ] Implement debounced availability check
- [ ] Add inline validation feedback
- [ ] Update useEphemeralInbox hook
- [ ] Test mobile responsiveness

---

## Phase 3: Premium Domain Gating (2-3h)

### Requirements

- Mark certain domains as "premium" in database
- Show lock icon on premium domains for anonymous users
- Redirect to login/upgrade when premium domain selected
- Allow premium domains for authenticated users with STARTER+ tier

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `schema.prisma` | Modify | Add `tier` field to Domain (optional) |
| `ephemeral-inbox.service.ts` | Modify | Check user tier for premium domains |
| `hero-inbox-widget.tsx` | Modify | Show premium badges, gate selection |

### Database Change

```prisma
model Domain {
  // ... existing fields
  minTier  SubscriptionTier?  // null = free, STARTER = starter+, etc.
}
```

### Implementation Steps

1. **Add `minTier` to Domain model** (optional migration)
2. **Update `getPublicDomains()` to include tier info**
3. **Backend validation**: Reject premium domain for unauthorized users
4. **Frontend**: Show lock icon, prompt upgrade modal

### Todo List

- [ ] Add `minTier` field to Domain model
- [ ] Run Prisma migration
- [ ] Seed 2-3 premium domains for testing
- [ ] Update backend validation
- [ ] Add premium badge UI
- [ ] Add upgrade prompt modal

---

## Phase 4: Polish & Testing (2-3h)

### Requirements

- Error handling for all edge cases
- Rate limiting adjustments if needed
- E2E tests for critical paths
- Performance verification

### Todo List

- [ ] Add error toasts for validation failures
- [ ] Test alias collision handling
- [ ] Test domain not found handling
- [ ] Verify rate limits still appropriate
- [ ] Add E2E test: custom alias creation
- [ ] Add E2E test: domain selection
- [ ] Performance test: create latency
- [ ] Cross-browser testing

---

## Success Criteria

- [ ] Users can input custom alias (validated)
- [ ] Users can select from 3+ public domains
- [ ] Random alias remains default (0-click preserved)
- [ ] Premium domains show lock for free users
- [ ] Alias uniqueness enforced (no duplicates)
- [ ] Mobile-responsive UI
- [ ] Create latency <150ms (p95)
- [ ] All tests passing

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Alias squatting/abuse | Medium | Medium | Rate limiting, reserved words list |
| Performance degradation | Low | Medium | Uniqueness check uses index |
| Breaking existing tokens | Low | High | Backward compatible API |
| UI complexity increase | Medium | Low | Collapsible panel, opt-in |

## Rollout Strategy

1. **Day 1-2**: Backend changes, feature flagged
2. **Day 2-3**: Frontend changes, internal testing
3. **Day 3-4**: Beta release to 10% users
4. **Day 4+**: Full rollout if metrics stable
