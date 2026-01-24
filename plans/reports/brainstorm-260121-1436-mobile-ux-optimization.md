# Brainstorm Report: Mobile UX Optimization

> **Date:** 2026-01-21 | **Approach:** Mobile-First Redesign | **Priority:** P0

---

## Problem Statement

Ephemera Email Platform cần tối ưu trải nghiệm mobile cho **power users** với ưu tiên **mobile-first**. Các vấn đề hiện tại:
- Navigation phức tạp (tab + sidebar = 2 patterns)
- Toolbar quá tải trên màn hình nhỏ
- Performance chậm khi scroll danh sách dài
- Thiếu haptic feedback và gestures nâng cao

---

## Current State Analysis

### Existing Mobile Infrastructure ✅
| Component | Status |
|-----------|--------|
| `SwipeableInboxCard` | Implemented |
| `SwipeableEmailItem` | Implemented |
| `useSwipeActions` hook | Implemented |
| `PullToRefresh` | Implemented |
| `BottomSheet` | Implemented |
| `touch-targets.css` (44px) | Implemented |
| `MobileSidebar` | Implemented |

### Identified Issues ❌
| Issue | Impact |
|-------|--------|
| Dual navigation patterns | High - user confusion |
| Toolbar overflow | High - unusable on small screens |
| Non-virtualized inbox list | Medium - scroll lag |
| No haptic feedback | Medium - poor tactile UX |
| Fixed font sizes | Low - accessibility |

---

## Chosen Solution: Approach B - Mobile-First Redesign

### Key Changes

#### 1. Bottom Tab Navigation
Replace top tabs + sidebar with thumb-friendly bottom navigation:
```
┌─────────────────────────────┐
│         CONTENT             │
├─────────────────────────────┤
│  📥    📧    ➕    ⚙️    👤 │
│ Inbox  Mail  New  Settings  │
└─────────────────────────────┘
```

#### 2. Gesture-First Interactions
- Swipe right → Copy email
- Swipe left → Delete/Archive
- Long press → Multi-select mode
- Double tap → Expand message

#### 3. Collapsible Toolbar → Action Sheet
- Collapse toolbar into icon menu
- Actions open in `BottomSheet`
- Reduce cognitive load

#### 4. Virtualized Lists
- Apply `@tanstack/virtual` for inbox list
- Reduce DOM nodes, improve scroll performance

#### 5. Haptic Feedback
- Vibration API for touch actions
- Subtle feedback on gestures

#### 6. Responsive Typography
- `clamp()` for fluid text sizing
- Viewport-aware adjustments

---

## Implementation Priority

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| P0 | Bottom tab navigation | High | Medium |
| P0 | Toolbar → Action Sheet | High | Low |
| P1 | Virtualized inbox list | High | Medium |
| P1 | Haptic feedback utility | Medium | Low |
| P2 | Responsive typography | Medium | Low |
| P2 | Skeleton streaming | Low | Low |
| P3 | Offline indicator | Medium | Medium |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Feature flag for gradual rollout |
| Gesture conflicts | `touch-action` CSS, passive listeners |
| Performance regression | Lighthouse CI monitoring |
| Accessibility | WCAG audit after each change |

---

## Success Metrics

- [ ] Lighthouse Performance score > 90 on mobile
- [ ] Touch target compliance 100% (48px minimum)
- [ ] Time to first interaction < 2s on 3G
- [ ] Scroll FPS > 55 on mid-range devices
- [ ] User task completion rate +20%

---

## Dependencies

- `@tanstack/react-virtual` for virtualization
- Existing `framer-motion` for animations
- Existing `BottomSheet` component

---

## Next Steps

→ Create detailed implementation plan with phases
