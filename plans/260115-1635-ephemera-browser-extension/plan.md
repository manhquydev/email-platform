---
title: "Ephemera Browser Extension"
description: "Chrome extension for disposable email management with quick inbox creation, auto-fill, and real-time notifications"
status: pending
priority: P1
effort: 6-8 weeks
branch: main
tags: [extension, chrome, frontend, api]
created: 2026-01-15
---

# Ephemera Browser Extension

## Overview

Build a Chrome Web Store extension (Manifest V3) that integrates with Ephemera email platform, providing quick inbox creation, form auto-fill, and real-time notifications directly from the browser toolbar.

## Research Reports

- [Chrome MV3 Best Practices](./research/researcher-01-chrome-mv3.md)
- [CRXJS + Vite Setup](./research/researcher-02-crxjs-vite.md)
- [Brainstorm Report](../reports/brainstorm-260115-1635-ephemera-browser-extension.md)

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Project Setup | Completed | 3-4d | [phase-01](./phase-01-project-setup.md) |
| 2 | Authentication & State | Completed | 2-3d | [phase-02](./phase-02-authentication.md) |
| 3 | Popup UI | Completed | 4-5d | [phase-03](./phase-03-popup-ui.md) |
| 4 | Content Script & Auto-fill | Completed | 3-4d | [phase-04](./phase-04-content-script.md) |
| 5 | Backend API Endpoints | Completed | 2-3d | [phase-05](./phase-05-api-endpoints.md) |
| 6 | Real-time Notifications | Completed | 2-3d | [phase-06](./phase-06-notifications.md) |
| 7 | Store Submission | Pending | 3-4d | [phase-07](./phase-07-store-submission.md) |

## Technical Stack

| Component | Technology |
|-----------|------------|
| Build | Vite + CRXJS |
| Framework | React 19 + TypeScript |
| Styling | TailwindCSS |
| State | Zustand + chrome.storage |
| API | Existing Ephemera API + new endpoints |

## Key Dependencies

- Ephemera API (`api.manhquy.click`)
- Chrome Extension APIs (storage, alarms, notifications)
- Web Push API for real-time updates

## Success Criteria

- [ ] Published on Chrome Web Store
- [ ] 1-click inbox creation < 2s
- [ ] Auto-fill works on major sites
- [ ] Real-time notifications < 5s latency
- [ ] 4.0+ star rating target

## Validation Summary

**Validated:** 2026-01-15
**Questions asked:** 8

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Anonymous Mode | Yes, implement for MVP (24h TTL, 10/hour limit) |
| Content Script Scope | All HTTP/HTTPS sites |
| Rate Limits | 10/hour anonymous, 50/hour authenticated |
| 2FA Support | Yes, support TOTP in extension login flow |
| Notifications | Web Push API (real-time) |
| Auto-fill Icon Position | Inside field, right edge |
| Freemium Limit | 5 inboxes free |
| Store Regions | Worldwide launch |

### Action Items

- [ ] Add TOTP input step to login form in Phase 2
- [ ] Ensure freemium limit (5 inboxes) enforced in popup UI
- [ ] Document worldwide region selection in Phase 7 store listing
