---
title: "Extension Enhancements"
description: "Offline mode, background hardening, settings preload"
status: pending
priority: P3
effort: 4h
branch: main
tags: [extension, offline, performance]
created: 2026-01-31
---

# Extension Enhancements

Optional improvements for production-ready browser extension.

## Phases

| Phase | Title | Priority | Effort | Status |
|-------|-------|----------|--------|--------|
| 01 | [Offline Mode](./phase-01-offline-mode.md) | Medium | 2-3h | Pending |
| 02 | [Background Hardening](./phase-02-background-hardening.md) | Low | 1h | Pending |
| 03 | [Settings Preload](./phase-03-settings-preload.md) | Low | 30min | Pending |

## Context

- Extension uses WXT framework with MV3 service worker
- Current implementation: network-first, no offline support
- Storage via `chrome.storage.local` wrapped in `storage.ts`
- API client in `api.ts` with token refresh logic

## Key Files

- `services/extension/src/shared/storage.ts` - Storage wrapper
- `services/extension/src/shared/api.ts` - API client
- `services/extension/src/components/popup/MessageList.tsx` - Message display
- `services/extension/src/entrypoints/background.ts` - Service worker
- `services/extension/src/entrypoints/popup/App.tsx` - Popup entry

## Dependencies

- None blocking; phases can be done independently
- Phase 1 most impactful for UX
