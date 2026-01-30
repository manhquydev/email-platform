---
title: "Ephemera Extension Phase 1 & 2 Enhancement"
description: "Quick wins and core enhancements for browser extension including OTP UI, shortcuts, search, and reply/forward"
status: pending
priority: P1
effort: 16h
branch: main
tags: [extension, wxt, react, zustand, i18n]
created: 2026-01-30
---

# Ephemera Browser Extension Enhancement Plan

## Overview

Enhance the Ephemera browser extension with two phases of features:
- **Phase 1**: Quick wins (OTP UI, shortcuts, context menu, countdown)
- **Phase 2**: Core enhancements (reply/forward, global search, pinned inboxes, preview tooltip)

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-quick-wins.md) | OTP Auto-Extract, Shortcuts, Context Menu, Countdown | Pending | 6h |
| [Phase 2](./phase-02-core-enhancement.md) | Reply/Forward, Search, Pinned, Tooltips | Pending | 10h |

## Key Dependencies

- Backend OTP extraction already exists (`services/api/src/services/otp-extractor.service.ts`)
- Outbound email API exists (`services/api/src/routes/outbound.ts`)
- WXT framework with React 18, Zustand, Tailwind CSS
- Existing i18n support (EN/VI via `_locales/`)

## Architecture Overview

```
services/extension/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts      # Service worker, alarms, context menus
│   │   ├── content.ts         # Field detection, UI injection
│   │   ├── popup/             # Popup UI (React)
│   │   └── sidepanel/         # Side panel UI (React)
│   ├── components/
│   │   ├── popup/             # InboxList, MessageList, Settings, Login
│   │   └── shared/            # CreateInboxModal, QRCodeModal, SearchInput
│   ├── shared/                # api.ts, storage.ts, types.ts, i18n.ts
│   ├── background/            # push-handler.ts
│   ├── content/               # field-detector.ts, ui-injector.ts
│   └── utils/                 # cn.ts, accessibility.ts
└── public/_locales/           # EN, VI, FR, ES translations
```

## Success Criteria

- [ ] All Phase 1 features implemented and tested
- [ ] All Phase 2 features implemented and tested
- [ ] i18n translations for EN and VI
- [ ] Unit tests for new utilities
- [ ] E2E tests for critical flows
- [ ] Files under 200 lines
- [ ] No TypeScript errors

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Keyboard shortcut conflicts | Use uncommon combos (Ctrl+Shift+E/C) |
| OTP extraction edge cases | Backend handles extraction; UI just displays |
| Reply/forward API complexity | Leverage existing outbound.ts routes |
| Cross-browser compatibility | Use webextension-polyfill (already in use) |
