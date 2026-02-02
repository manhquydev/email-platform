---
title: "Phase 7: PWA, Extension Outbound & Analytics"
description: "Mobile optimization, extension compose feature, and admin analytics dashboard"
status: pending
priority: P1
effort: 24h
branch: main
tags: [pwa, mobile, extension, analytics, monitoring, phase7]
created: 2026-02-01
---

# Phase 7: PWA Enhancement, Extension Outbound & Analytics Dashboard

Transform Ephemera into a mobile-first platform with full-featured browser extension and comprehensive analytics.

## Overview

**Status:** Pending
**Total Effort:** 24 hours
**Priority:** P1 (PWA) → P2 (Extension/Analytics)
**Dependencies:** vite-plugin-pwa@1.2.0 already installed

## Implementation Phases

### Phase 1: PWA Enhancement ✅ [Priority: P1, Effort: 8h]
**Status:** 🔴 Pending
**Progress:** 0%

Transform web app into installable PWA with offline capabilities and push notifications.

**Key Features:**
- Service Worker with Workbox caching strategies
- IndexedDB for offline email storage
- Web Push notifications (VAPID backend + frontend)
- Install prompts (Android/iOS)
- Offline fallback UI

**Files:** [phase-01-pwa-enhancement.md](./phase-01-pwa-enhancement.md)

---

### Phase 2: Extension Outbound ✅ [Priority: P2, Effort: 6h]
**Status:** 🔴 Pending
**Progress:** 0%

Add email composition capability to browser extension for feature parity with web app.

**Key Features:**
- Port ComposeModal to extension
- Tiptap rich text editor integration
- Attachment support via chrome.storage
- Offline draft queue
- Side Panel compose UI

**Files:** [phase-02-extension-outbound.md](./phase-02-extension-outbound.md)

---

### Phase 3: Analytics Dashboard ✅ [Priority: P2, Effort: 10h]
**Status:** 🔴 Pending
**Progress:** 0%

Admin dashboard for monitoring email deliverability, system health, and queue performance.

**Key Features:**
- Email metrics (bounce/spam rate, volume trends)
- BullMQ queue monitoring (depth, latency, failures)
- System health (Redis/PostgreSQL stats)
- Recharts visualizations
- Prometheus metrics export

**Files:** [phase-03-analytics-dashboard.md](./phase-03-analytics-dashboard.md)

---

## Dependencies

### Libraries to Install
```bash
# Phase 1 - PWA
npm install idb workbox-window --workspace=services/web

# Phase 2 - Extension
npm install @tiptap/react @tiptap/starter-kit react-dropzone --workspace=services/extension

# Phase 3 - Analytics
npm install recharts prom-client --workspaces
```

### Infrastructure
- Redis (already running) - BullMQ metrics
- PostgreSQL (already running) - query stats via pg_stat_statements
- Prometheus + Grafana (optional) - Phase 3

---

## Success Criteria

- [ ] PWA installable on Android/iOS with offline email access
- [ ] Web Push notifications working for new emails
- [ ] Extension can compose and send emails with attachments
- [ ] Admin dashboard displays real-time queue and system metrics
- [ ] Lighthouse PWA score ≥90
- [ ] All phases pass existing test suites

---

## Risk Mitigation

**PWA Risks:**
- **IndexedDB quota limits** → Implement auto-cleanup policy for old emails
- **iOS install UX** → Show manual instructions (no beforeinstallprompt)
- **Service Worker caching bugs** → Comprehensive offline testing

**Extension Risks:**
- **CSP restrictions** → Use chrome.storage for attachments, not blob URLs
- **Tiptap bundle size** → Lazy load editor components

**Analytics Risks:**
- **High cardinality metrics** → Aggregate before exposing to Prometheus
- **Real-time polling overhead** → Use React Query with 30s stale time

---

## Next Steps

1. Review Phase 1 plan: `phase-01-pwa-enhancement.md`
2. Run `/plan:validate` for confirmation interview
3. Execute with `/cook {plan-path}` after validation
