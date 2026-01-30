---
title: "Extension Enhancements"
description: "Optional enhancements: offline mode, background hardening, settings preload"
status: pending
priority: P2
effort: 4h
branch: main
tags: [extension, offline, performance, chrome]
created: 2026-01-31
---

# Extension Enhancements Plan

## Overview
Three optional enhancements for production-ready extension. Not critical but improve UX.

## Phases

| Phase | Name | Priority | Effort | Status |
|-------|------|----------|--------|--------|
| 1 | [Offline Mode](./phase-01-offline-mode.md) | Medium | 2h | Pending |
| 2 | [Background Hardening](./phase-02-background-hardening.md) | Low | 1h | Pending |
| 3 | [Settings Quick Access](./phase-03-settings-quick-access.md) | Low | 1h | Pending |

## Current State Analysis

### storage.ts (85 lines)
- Uses `browser.storage.local` - good foundation for offline cache
- Has helpers for auth, settings, inboxes, pinned items
- Missing: message caching methods

### api.ts (265 lines)
- Standard fetch-based API client with token refresh
- No caching layer - all requests hit network
- `getMessages()` is main target for cache-first strategy

### MessageList.tsx (272 lines)
- Fetches messages on mount via `api.getMessages()`
- No offline indicator or cached data fallback
- Loading states exist but no offline-aware UI

### background.ts (296 lines)
- Has alarm for polling (`poll_messages` every 1 min)
- Push notification setup exists
- Missing: explicit keep-alive, reconnection logic

### App.tsx (310 lines)
- Loads settings via `storage.getSettings()` on mount
- Theme applied on init - good pattern
- Settings not preloaded/cached in memory

## Dependencies
- `webextension-polyfill` - already used
- `browser.storage.local` - already used
- No new dependencies needed

## Success Criteria
- [ ] Messages viewable when offline (Phase 1)
- [ ] Offline indicator shown in UI (Phase 1)
- [ ] Service worker stays alive during idle (Phase 2)
- [ ] Settings load instantly on navigation (Phase 3)
