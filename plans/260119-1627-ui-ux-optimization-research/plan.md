---
title: "UI/UX Optimization Research & Implementation"
description: "Optimize user experience with performance, accessibility, and modern interaction patterns"
status: in_progress
priority: P2
effort: 12h
branch: main
tags: [ui, ux, performance, accessibility, mobile]
created: 2026-01-19
phase1_completed: 2026-01-19
---

# UI/UX Optimization Plan

## Context Links
- [Research: React UI Patterns](./research-react-ui-patterns.md)
- [Scout: UI Codebase](./scout-ui-codebase.md)

## Overview
Improve email platform's UI/UX focusing on performance, accessibility, mobile experience, and micro-interactions while maintaining the existing Glassmorphism ("Nebula Glass") design system.

## Current State Analysis

### Strengths ✅
- Feature-based modular components (`*-modules/` pattern)
- Design tokens system (`design-tokens.css`)
- Mobile hooks exist (`useSwipeActions`, `useBreakpoint`)
- Framer Motion integrated with tree-shaking (`utils/motion.ts`)
- CommandPalette for keyboard-first UX

### Gaps ⚠️
- Layout components have redundant logic (`AppShell`, `MainLayout`)
- Focus rings not universally applied
- No list virtualization for large inboxes
- Touch targets may be undersized on mobile
- Skeleton variants limited

---

## Approach A: Incremental Enhancement (Recommended)

**Philosophy**: Small, iterative improvements. Ship weekly. Lower risk.

### Phase 1: Performance Quick Wins (3h)
| Task | File | Effort |
|------|------|--------|
| Add TanStack Virtual to MessageListPane | `components/dashboard/MessageListPane.tsx` | 1.5h |
| Extend Skeleton variants (inbox, message detail) | `components/Skeleton.tsx` | 1h |
| Lazy load heavy admin components | `components/admin/*.tsx` | 0.5h |

### Phase 2: Accessibility Hardening (3h)
| Task | File | Effort |
|------|------|--------|
| Universal focus ring utility class | `styles/focus-stream.css` | 0.5h |
| ARIA live regions for toasts | `hooks/useAppToast.ts` | 0.5h |
| Keyboard nav for message list (j/k) | `hooks/useKeyboardShortcuts.ts` | 1h |
| Touch target audit (min 44px) | `components/ui/Button.tsx` | 1h |

### Phase 3: Mobile Polish (3h)
| Task | File | Effort |
|------|------|--------|
| Bottom nav for mobile breakpoint | `layouts/AppShell.tsx` | 1.5h |
| Swipe-to-archive on messages | `components/dashboard/MessageListPane.tsx` | 1h |
| Reduce glassmorphism on low-power devices | `hooks/useReducedMotion.ts` (new) | 0.5h |

### Phase 4: Micro-interactions (3h)
| Task | File | Effort |
|------|------|--------|
| Button loading/success states | `components/ui/Button.tsx` | 1h |
| List item enter/exit animations | `utils/motion.ts` | 1h |
| Copy feedback animation | `components/copy-first/CopyButton.tsx` | 0.5h |
| Pull-to-refresh enhancement | `components/PullToRefresh.tsx` | 0.5h |

### Pros
✅ Low risk - each phase is independent
✅ Immediate value - ship after each phase
✅ Easy rollback - changes are isolated
✅ Team-friendly - parallel work possible

### Cons
❌ Takes longer overall (4 weeks)
❌ May miss systemic improvements
❌ Technical debt in layout components remains

---

## Approach B: Design System Refactor

**Philosophy**: Fix foundational issues first. Higher upfront investment, cleaner long-term.

### Phase 1: Layout Consolidation (4h)
| Task | File | Effort |
|------|------|--------|
| Merge AppShell + MainLayout logic | `layouts/UnifiedShell.tsx` (new) | 2h |
| Extract navigation state to context | `contexts/NavigationContext.tsx` | 1h |
| Remove redundant responsive logic | Multiple layout files | 1h |

### Phase 2: Tailwind Design Token Migration (3h)
| Task | File | Effort |
|------|------|--------|
| Convert CSS vars to Tailwind config | `tailwind.config.js` | 1.5h |
| Cleanup nebula-glass.css unused classes | `styles/nebula-glass.css` | 1h |
| Enable Tailwind tree-shaking | Build config | 0.5h |

### Phase 3: Component Library Upgrade (3h)
| Task | File | Effort |
|------|------|--------|
| Adopt Radix UI primitives for a11y | `components/ui/*` | 2h |
| Standardize touch targets (44px min) | All interactive components | 1h |

### Phase 4: Performance & Polish (2h)
| Task | File | Effort |
|------|------|--------|
| TanStack Virtual integration | `MessageListPane.tsx` | 1h |
| LazyMotion optimization | `utils/motion.ts` | 0.5h |
| Skeleton system expansion | `components/Skeleton.tsx` | 0.5h |

### Pros
✅ Cleaner architecture long-term
✅ Better bundle size (Tailwind tree-shaking)
✅ Built-in accessibility with Radix
✅ Eliminates layout redundancy

### Cons
❌ Higher risk - touching core layout
❌ Longer before first value (2 weeks minimum)
❌ Requires comprehensive testing
❌ Team must pause other features

---

## Trade-off Comparison

| Criteria | Approach A (Incremental) | Approach B (Refactor) |
|----------|--------------------------|----------------------|
| **Time to first value** | 1 week | 2-3 weeks |
| **Total effort** | 12h (spread) | 12h (concentrated) |
| **Risk level** | 🟢 Low | 🟡 Medium |
| **Technical debt** | Partially addressed | Fully addressed |
| **Bundle size impact** | Minimal | -15-20% estimated |
| **Accessibility** | Improved | Excellent (Radix) |
| **Team disruption** | None | High |

---

## Recommendation: Approach A (Incremental)

**Rationale**:
1. Current codebase is already well-structured (modular components, hooks exist)
2. Glassmorphism system works - no need to rebuild
3. Incremental allows measuring impact per change
4. Lower risk for production system

**Suggested Hybrid**: After completing Approach A, revisit layout consolidation (Approach B Phase 1) as a standalone refactor.

---

## Success Metrics
- [ ] Lighthouse Performance score ≥ 90
- [ ] Lighthouse Accessibility score ≥ 95
- [ ] Message list renders 1000+ items smoothly (60fps)
- [ ] All interactive elements have 44px touch targets
- [ ] Keyboard navigation covers all primary actions

## Dependencies
- TanStack Virtual: `npm install @tanstack/react-virtual`
- Optional: Radix UI (if Approach B adopted)

## Unresolved Questions
1. Should CommandPalette (CMD+K) be promoted as primary navigation?
2. Is there budget for Radix UI migration in Approach B?
3. Should glassmorphism be reduced on mobile for battery/performance?
