---
title: Share Mode Toggle Visibility Fix
description: >-
  Fix two UI gaps hiding the already-working per-inbox shareMode toggle:
  CSS-hidden on mobile tab, missing control on desktop /app/manager dashboard.
status: completed
priority: P2
branch: main
tags:
  - ui-fix
  - tdd
  - share-mode
blockedBy: []
blocks: []
created: '2026-07-10T03:54:50.945Z'
createdBy: 'ck:plan'
source: skill
---

# Share Mode Toggle Visibility Fix

## Overview

The per-inbox `shareMode` (`PUBLIC`/`PRIVATE`, controls `/inbox-viewer` access) toggle is fully implemented backend + frontend (`ShareModeToggle` component, `PATCH /inboxes/:id`, context-menu entry point all work) but is invisible in the two surfaces users actually reach for it:

1. Mobile inbox tab: `services/web/src/components/InboxCard.tsx:130` wraps the toggle in `hidden sm:block` — hides it below 640px, exactly the viewport the mobile tab (`VirtualizedInboxList.tsx`) always runs at. Root cause confirmed: `variant='mobile'` is never used anywhere in the web app, so the `!isMobile` guard is always true and the CSS class is the only thing hiding it.
2. Desktop `/app/manager` dashboard: `desktop-manager-workspace-pane.tsx:64` shows `Chế độ chia sẻ: {shareMode}` as static text only — no control, even though `onShareModeChange` is already available one level up in `desktop-inbox-layout.tsx:45` and just isn't threaded down.

No backend change, no new component — reuse `ShareModeToggle` (`inbox-card-modules/inbox-card-components.tsx:61-101`) in both fixes. Full research: `plans/reports/brainstorm-260710-1047-share-mode-toggle-visibility-fix-report.md`.

**Out of scope:** context menu toggle (works), mobile long-press action sheet (works), backend, the separate `/inbox-viewer` "Inbox not found" routing regression tracked in `plans/260409-1638-public-inbox-viewer-regression/plan.md` (different bug, no file overlap — not blocked by or blocking this plan).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Mobile Toggle Visibility Fix](./phase-01-mobile-toggle-visibility-fix.md) | Completed |
| 2 | [Desktop Workspace Pane Toggle](./phase-02-desktop-workspace-pane-toggle.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->
