---
title: "Inbox Viewer UI/UX Upgrade to Version C"
description: "Migrate inbox-viewer page to Superhuman-style design with keyboard navigation and virtualized lists"
status: pending
priority: P1
effort: 8h
branch: main
tags: [ui-ux, version-c, inbox-viewer, keyboard-navigation, performance]
created: 2026-01-24
---

# Inbox Viewer UI/UX Upgrade Plan

## Overview

Upgrade `/inbox-viewer` page from deprecated glassmorphism patterns to Version C (Superhuman-style) design system featuring pure black backgrounds, zinc monochrome palette, border-based elevation, full keyboard navigation, and virtualized scrolling.

## Research References

- [Email Inbox UI Patterns](./research/researcher-260124-2307-email-inbox-ui-patterns.md)
- [Dark Theme Minimal UI Trends](./research/researcher-260124-2307-dark-theme-minimal-ui-trends.md)

## Design System References

- `docs/design-guidelines.md` - Version C quick reference
- `docs/design-system-version-c.md` - Complete specification

## Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-design-system-migration.md) | Migrate colors/styles to Version C | 2h | pending |
| [Phase 2](./phase-02-hero-address-component.md) | Hero email address with copy button | 1h | pending |
| [Phase 3](./phase-03-keyboard-navigation.md) | j/k navigation, focus management | 2h | pending |
| [Phase 4](./phase-04-virtualized-list.md) | react-virtuoso for message list | 2h | pending |
| [Phase 5](./phase-05-loading-states.md) | Skeleton loaders, transitions | 1h | pending |

## Files to Modify

```
services/web/src/pages/inbox-viewer-modules/
├── inbox-viewer-components.tsx (198 lines)
└── use-inbox-viewer-data.ts (268 lines)

services/web/src/components/inbox-viewer/
├── message-list.tsx (127 lines)
├── message-detail.tsx (121 lines)
└── search-form.tsx (79 lines)
```

## Key Dependencies

- `react-virtuoso` - Virtual scrolling (install in Phase 4)
- `dompurify` - Already installed for HTML sanitization
- `date-fns` - Already installed for date formatting

## Success Criteria

- [ ] All glassmorphism patterns removed (`backdrop-blur`, `bg-white/80`)
- [ ] Pure black (#000) background throughout
- [ ] Zinc palette only, no slate/gray
- [ ] Border-based elevation, no shadows
- [ ] j/k keyboard navigation functional
- [ ] Virtualized list handles 1000+ messages at 60fps
- [ ] Skeleton loading states on all async operations
- [ ] All transitions <= 150ms

## Validation Summary

**Validated:** 2026-01-24
**Questions asked:** 5

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| HTML email rendering | **White container** - Keep emails in white "paper" container for safety |
| Keyboard shortcuts hint | **Always visible** - Show j/k/Enter/r hints permanently |
| Message volume target | **Up to 1000 messages** - Full react-virtuoso implementation |
| Mobile UX approach | **Desktop keyboard-first** - Focus on j/k, Enter/Esc experience |
| Raw Source feature | **No, keep simple** - Clean UI without developer features |

### Action Items

- [x] No plan changes required - all recommendations confirmed
