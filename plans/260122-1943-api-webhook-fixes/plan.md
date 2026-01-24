---
title: "API & Webhook Security Fixes"
description: "Fix 4 audit issues: raw body parsing, SePay dev bypass, duplicate SSRF, missing webhook event"
status: completed
completed: 2026-01-22
priority: P1
effort: 2h
branch: main
tags: [security, webhooks, api, stripe, sepay]
created: 2026-01-22
---

# API & Webhook Security Fixes

## Overview

Fix 4 issues discovered during audit:
1. **Critical**: Raw body parsing disabled - Stripe webhook verification fails
2. **Critical**: SePay dev bypass without environment check
3. **Medium**: Duplicate SSRF check function (DRY violation)
4. **Minor**: Missing `email.forwarded` webhook event

## Research Summary

| Issue | Root Cause | Risk |
|-------|------------|------|
| Raw body | Lines 110-115 commented out in server.ts | Stripe webhooks reject all requests |
| SePay bypass | No `NODE_ENV` check at line 103-106 | Production accepts unsigned webhooks |
| SSRF duplicate | Same 36-line function in 2 files | Maintenance burden, divergence risk |
| Missing event | `email.forwarded` not in WEBHOOK_EVENTS | Incomplete API coverage |

---

## Approach A: Minimal Targeted Fixes (Recommended)

**Philosophy**: Fix each issue directly with smallest change footprint.

### Changes

#### 1. server.ts - Enable Raw Body (Lines 110-115)
```typescript
// UNCOMMENT and keep existing config
app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
});
```

#### 2. sepay.service.ts - Add Env Check (Lines 103-106)
```typescript
// Before
if (!secretKey) {
  console.warn("⚠️ SePay secret key not configured...");
  return true;
}

// After
if (!secretKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error("SePay secret key required in production");
    return false;
  }
  console.warn("⚠️ SePay secret key not configured - DEV MODE ONLY");
  return true;
}
```

#### 3. Extract SSRF Utility
Create `services/api/src/utils/network.ts`:
```typescript
export const isInternalUrl = (urlString: string): boolean => {
  // Move existing 36-line function here
};
```

Update imports in:
- `routes/webhooks.ts` - delete lines 8-44, add import
- `webhookWorker.ts` - delete lines 7-43, add import

#### 4. webhookService.ts - Add Missing Event
```typescript
export const WEBHOOK_EVENTS = {
  'email.received': 'Triggered when a new email arrives',
  'email.read': 'Triggered when an email is marked as read',
  'email.deleted': 'Triggered when an email is deleted',
  'email.forwarded': 'Triggered when an email is forwarded',  // ADD
  // ... rest unchanged
};
```

### Pros
- Minimal code changes (< 50 lines modified)
- Low regression risk
- Fast to implement (~1h)
- Easy to review

### Cons
- SSRF utility is basic (no IPv6 handling yet)
- No DNS rebinding protection (out of scope)

---

## Approach B: Enhanced Security Overhaul

**Philosophy**: Take opportunity to strengthen SSRF protection with advanced patterns from research.

### Additional Changes (on top of Approach A)

#### Enhanced SSRF Utility with IPv6 + Metadata
```typescript
// services/api/src/utils/network.ts
import { isIPv4, isIPv6 } from 'net';

const BLOCKED_RANGES = {
  ipv4: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16', '127.0.0.0/8'],
  ipv6: ['::1/128', 'fc00::/7', 'fe80::/10', '::ffff:0:0/96'],
  metadata: ['169.254.169.254'],
};

export const isInternalUrl = (urlString: string): boolean => {
  // Full implementation with:
  // - IPv4 range checking
  // - IPv6 mapped address detection
  // - Cloud metadata endpoint blocking
  // - Protocol whitelist (http/https only)
  // - Credential rejection (user:pass@host)
};

export const validateWebhookUrl = (url: string): { valid: boolean; reason?: string } => {
  // Returns structured validation result
};
```

#### Add ipaddr.js Dependency
```bash
pnpm add ipaddr.js
```

### Pros
- Production-grade SSRF protection
- Handles IPv6 edge cases
- Blocks cloud metadata endpoints (AWS/GCP/Azure)
- Structured validation with error reasons

### Cons
- Larger change scope (~150 lines)
- New dependency
- More testing required
- Overkill if webhooks only go to user-controlled URLs

---

## Recommendation: Approach A

**Rationale**:
1. Critical issues fixed immediately with minimal risk
2. SSRF enhancement can be separate follow-up (not blocking)
3. Current SSRF logic already covers common attack vectors
4. Matches YAGNI principle - fix what's broken, don't over-engineer

---

## Implementation Checklist

### Phase 1: Critical Fixes (30 min)
- [ ] Uncomment raw body registration in server.ts
- [ ] Add NODE_ENV check to sepay.service.ts
- [ ] Verify Stripe webhook works locally

### Phase 2: SSRF Refactor (20 min)
- [ ] Create `utils/network.ts` with isInternalUrl
- [ ] Update webhooks.ts import
- [ ] Update webhookWorker.ts import
- [ ] Delete duplicate code

### Phase 3: Missing Event (10 min)
- [ ] Add `email.forwarded` to WEBHOOK_EVENTS
- [ ] Verify forwarding service triggers it (if exists)

### Phase 4: Verification (30 min)
- [ ] Run existing tests
- [ ] Manual test Stripe webhook with test event
- [ ] Manual test SePay in dev (should work) and mock prod (should fail without key)
- [ ] Verify SSRF blocking works

---

## Files Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| server.ts | Uncomment | ~5 |
| sepay.service.ts | Add env check | ~6 |
| utils/network.ts | Create | ~40 |
| webhooks.ts | Delete + import | -36, +1 |
| webhookWorker.ts | Delete + import | -36, +1 |
| webhookService.ts | Add event | +1 |

**Total**: ~50 lines modified, 1 new file

---

## Success Criteria

1. Stripe test webhook succeeds with valid signature
2. SePay webhook rejected in production without secret key
3. No duplicate `isInternalUrl` in codebase
4. `GET /webhooks/events` returns `email.forwarded`
5. All existing tests pass

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Raw body breaks other routes | Low | Medium | `global: false` ensures opt-in only |
| SePay prod disruption | Low | High | Verify secret key is set in prod env |
| Import path issues | Low | Low | TypeScript will catch at compile |

---

## Unresolved Questions

1. Is `email.forwarded` event already triggered somewhere in forwarding logic, or does trigger code need adding?
2. Are there other routes besides Stripe that need raw body access?
