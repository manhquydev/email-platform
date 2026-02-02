---
title: "P0/P1 Critical Fixes"
description: "Fix critical security and stability issues: Redis challenge store, SNS validation, PWA finalization, Extension CSP"
status: pending
priority: P0
effort: 8h
branch: main
tags: [security, redis, sns, pwa, extension, critical]
created: 2026-02-02
---

# P0/P1 Critical Fixes Implementation Plan

Fix critical security vulnerabilities and stability issues identified in project audit.

## Overview

| Priority | Issue | Effort | Risk |
|----------|-------|--------|------|
| **P0** | Anonymous auth uses in-memory store (breaks multi-instance) | 2h | High |
| **P0** | SES webhook SNS signature validation skipped | 2h | Critical |
| **P1** | Commit & test current PWA changes | 2h | Medium |
| **P1** | Extension CSP missing `img-src` directive | 1h | Medium |

**Total Effort:** 8 hours

## Implementation Phases

### Phase 1: Redis Challenge Store [P0] - 2h
**Status:** 🔴 Pending
**File:** [phase-01-redis-challenge-store.md](./phase-01-redis-challenge-store.md)

Migrate in-memory challenge store to Redis for multi-instance support.

---

### Phase 2: SNS Signature Validation [P0] - 2h
**Status:** 🔴 Pending
**File:** [phase-02-sns-signature-validation.md](./phase-02-sns-signature-validation.md)

Implement proper AWS SNS signature validation using `sns-validator` package.

---

### Phase 3: PWA Finalization [P1] - 2h
**Status:** 🔴 Pending
**File:** [phase-03-pwa-finalization.md](./phase-03-pwa-finalization.md)

Review, test, and commit current PWA implementation changes.

---

### Phase 4: Extension CSP Fix [P1] - 1h
**Status:** 🔴 Pending
**File:** [phase-04-extension-csp-fix.md](./phase-04-extension-csp-fix.md)

Add missing `img-src` directive to extension CSP for email image rendering.

---

## Dependencies

- Redis (already configured in project)
- `sns-validator` npm package (to install)
- Existing PWA code (uncommitted)

## Success Criteria

- [ ] Challenge store works across multiple API instances
- [ ] SNS webhooks reject forged messages
- [ ] PWA installable on mobile devices
- [ ] Email images render correctly in extension

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Redis connection failure | Fail request with error logging (no fallback) |
| SNS validation breaking existing webhooks | Always validate, no dev skip |
| PWA breaking existing features | Run full test suite before commit |

## Validation Summary

**Validated:** 2026-02-02
**Questions asked:** 4

### Confirmed Decisions
- **Redis fallback strategy:** Fail request on Redis error (ensures consistency across instances)
- **SNS validation in dev:** Always validate (same behavior dev/prod)
- **PWA commit approach:** Commit as-is (code already reviewed during creation)
- **Extension img-src:** Allow `https:` and `data:` URLs (standard for email images)

### Action Items
- [x] Plan validated - no changes required
- [ ] Proceed with implementation
