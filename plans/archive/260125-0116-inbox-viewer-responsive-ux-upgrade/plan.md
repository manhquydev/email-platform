---
title: "Inbox Viewer Responsive UX Upgrade"
description: "Mobile-first redesign with bottom sheet, command palette, and density controls"
status: completed
priority: P1
effort: 12h
branch: main
tags: [ux, responsive, mobile, desktop, accessibility]
created: 2026-01-25
---

# Inbox Viewer Responsive UX Upgrade

## Overview
Transform `/inbox-viewer` into a professional-grade email client with thumb-zone mobile UX and keyboard-first desktop experience following Version C design system.

## Dependency Graph
```
Phase 1 (Foundation) ──┬──> Phase 2 (Mobile)
                       └──> Phase 3 (Desktop)
                                   │
Phase 4 (Polish) <─────────────────┘
         │
         v
Phase 5 (Audit)
```

## Execution Strategy
| Phase | Parallel | Depends On | Effort |
|-------|----------|------------|--------|
| 1. Layout Foundation | - | None | 2h |
| 2. Mobile Bottom Sheet | Yes (with 3) | Phase 1 | 3h |
| 3. Desktop Command Palette | Yes (with 2) | Phase 1 | 3h |
| 4. Density & Polish | No | Phase 2, 3 | 2h |
| 5. Accessibility Audit | No | Phase 4 | 2h |

## Phase Files
- [Phase 1: Responsive Layout Foundation](./phase-01-responsive-layout-foundation.md)
- [Phase 2: Mobile Bottom Sheet & Touch](./phase-02-mobile-bottom-sheet-touch.md)
- [Phase 3: Desktop Command Palette & Ghost Actions](./phase-03-desktop-command-palette.md)
- [Phase 4: Density Controls & Polish](./phase-04-density-controls-polish.md)
- [Phase 5: Accessibility & Performance Audit](./phase-05-accessibility-performance-audit.md)

## File Ownership Matrix
| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|------|---------|---------|---------|---------|---------|
| InboxViewer.tsx | ✓ | - | - | - | - |
| inbox-viewer-components.tsx | ✓ | - | - | - | - |
| message-list.tsx | - | ✓ | - | - | - |
| message-list-item.tsx | - | ✓ | - | - | - |
| message-detail.tsx | - | ✓ | - | - | - |
| use-keyboard-navigation.ts | - | - | ✓ | - | - |
| NEW: mobile-bottom-sheet.tsx | - | ✓ | - | - | - |
| NEW: command-palette.tsx | - | - | ✓ | - | - |
| NEW: ghost-action-bar.tsx | - | - | ✓ | - | - |
| NEW: density-context.tsx | - | - | - | ✓ | - |
| hero-email-address.tsx | - | - | - | ✓ | - |
| search-form.tsx | - | - | - | ✓ | - |

## Success Criteria
- [x] Mobile: Bottom sheet works with swipe-to-dismiss
- [x] Mobile: Touch targets >= 44px
- [x] Desktop: Cmd+K opens command palette
- [x] Desktop: Ghost actions appear on hover
- [x] All: Density toggle (compact/comfortable)
- [x] All: Lighthouse accessibility score >= 95
