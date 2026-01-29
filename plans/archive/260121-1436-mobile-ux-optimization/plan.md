# Mobile UX Optimization Plan

> **Status:** pending | **Created:** 2026-01-21 | **Timeline:** 1-2 weeks

---

## Overview

Mobile-First Redesign cho Ephemera Email Platform, tối ưu trải nghiệm cho **power users** với các cải tiến về navigation, performance, và interactions.

## Problem Statement

- Navigation phức tạp (dual patterns: tab + sidebar)
- Toolbar quá tải trên màn hình nhỏ
- Performance chậm khi scroll danh sách dài
- Thiếu haptic feedback và gestures nâng cao

## Solution Summary

| Change | Description |
|--------|-------------|
| Bottom Tab Navigation | Thay top tabs + sidebar bằng thumb-friendly bottom nav |
| Toolbar → Action Sheet | Collapse toolbar vào BottomSheet |
| Virtualized Lists | `@tanstack/virtual` cho inbox list |
| Haptic Feedback | Vibration API cho touch actions |
| Responsive Typography | `clamp()` fluid sizing |

## Phases

| Phase | Title | Status | Effort |
|-------|-------|--------|--------|
| 01 | [Bottom Tab Navigation](./phase-01-bottom-tab-navigation.md) | pending | 2-3 days |
| 02 | [Toolbar to Action Sheet](./phase-02-toolbar-to-action-sheet.md) | pending | 1 day |
| 03 | [Virtualized Inbox List](./phase-03-virtualized-inbox-list.md) | pending | 2 days |
| 04 | [Haptic Feedback & Polish](./phase-04-haptic-feedback-polish.md) | pending | 1 day |

## Dependencies

- `@tanstack/react-virtual` - virtualization
- `framer-motion` - animations (existing)
- `BottomSheet` component (existing)

## Success Metrics

- [ ] Lighthouse Performance > 90 on mobile
- [ ] Touch target 100% compliance (48px min)
- [ ] Time to interactive < 2s on 3G
- [ ] Scroll FPS > 55 on mid-range devices

## Related Files

- Brainstorm: `plans/reports/brainstorm-260121-1436-mobile-ux-optimization.md`
- Design Guidelines: `docs/design-guidelines.md`
- Code Standards: `docs/code-standards.md`
