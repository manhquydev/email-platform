---
title: "Extension Improvements"
description: "Enhance browser extension with comprehensive testing, i18n, and store publishing"
status: pending
priority: P2
effort: 12h
branch: main
tags: [extension, testing, i18n, chrome-web-store]
created: 2026-01-16
---

# Extension Improvements Plan

## Overview

Enhance the Ephemera browser extension with comprehensive testing, internationalization, and prepare for Chrome Web Store publishing.

**Reference:** [Brainstorm Report](../reports/brainstorm-260116-2219-extension-status-check.md)

## Current State

- ✅ Extension production-ready (398 KB bundle)
- ✅ Multi-platform builds (Chrome MV3, Firefox MV2, Safari MV2)
- ✅ 79/79 unit tests passing
- ✅ E2E test infrastructure ready (Playwright)
- ⚠️ Coverage at 30.9% (core files at 100%)
- ⚠️ Partial i18n (infrastructure only)
- ⚠️ Not published to stores

## Implementation Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 01](./phase-01-unit-testing.md) | Unit Tests for Components & API | 4h | ✅ Completed |
| [Phase 02](./phase-02-e2e-testing.md) | E2E Testing with Playwright | 3h | ✅ Completed |
| [Phase 03](./phase-03-i18n-localization.md) | Full i18n Localization | 3h | ⬜ Pending |
| [Phase 04](./phase-04-store-publishing.md) | Chrome Web Store Publishing | 2h | ⬜ Pending |

## Success Criteria

1. **Testing:** ≥80% code coverage with unit + E2E tests
2. **i18n:** Support for EN, VI languages with proper fallbacks
3. **Publishing:** Extension approved and live on Chrome Web Store

## Dependencies

- Backend VAPID keys configured for push notifications
- Chrome Developer account ($5 one-time fee)
- Store assets (icons, screenshots, promotional images)

## Risks

| Risk | Mitigation |
|------|------------|
| Store rejection | Follow Chrome policies strictly, minimal permissions |
| E2E test flakiness | Use stable selectors, proper waits |
| i18n missing translations | Use fallback to English |

## Next Steps

1. Start with Phase 01: Unit Testing
2. Run tests in CI pipeline
3. Proceed to E2E after unit tests pass
