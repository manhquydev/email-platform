---
title: "Phase 1: Responsive Layout Foundation"
status: completed
priority: P1
effort: 2h
---

# Phase 1: Responsive Layout Foundation

## Context Links
- [Mobile UX Research](./research/researcher-mobile-email-ux.md)
- [Desktop UX Research](./research/researcher-desktop-email-ux.md)
- [Design Guidelines](../../docs/design-guidelines.md)
- [Code Review Report](../../plans/reports/code-reviewer-260125-0133-phase1-responsive-layout.md)

## Overview
Establish responsive breakpoints and layout structure. Convert from desktop-first to mobile-first CSS. Create foundation for parallel Phase 2/3 work.

## Parallelization Info
- **Can run parallel with:** None (foundation)
- **Blocks:** Phase 2, Phase 3
- **File ownership:** InboxViewer.tsx, inbox-viewer-components.tsx

## Key Insights
- Current: `lg:flex-row` = desktop-first (wrong)
- Target: Mobile-first with `md:` and `lg:` breakpoints
- Breakpoints: 640px (sm), 768px (md), 1024px (lg)
- Mobile = single column, desktop = split pane

## Requirements

### Functional
- Mobile: Full-width message list, no detail pane visible
- Tablet (768px+): Show detail pane side-by-side
- Desktop (1024px+): 1/3 list + 2/3 detail ratio

### Non-Functional
- No layout shift on resize
- Transitions <= 200ms per Version C

## Architecture

### Layout States
```
Mobile (<768px):    [Message List Full Width]
                    [Bottom Sheet for Detail]

Tablet (768-1024):  [List 40%] [Detail 60%]

Desktop (1024+):    [List 33%] [Detail 67%]
```

## Related Code Files

### Modify
- `services/web/src/pages/InboxViewer.tsx`
- `services/web/src/pages/inbox-viewer-modules/inbox-viewer-components.tsx`

### Create
- None (layout only)

## Implementation Steps

1. **Update InboxViewer.tsx main container**
   - Change `bg-gray-100 dark:bg-gray-900` → `bg-black`
   - Remove `flex-col lg:flex-row` → use responsive grid

2. **Create responsive grid layout**
   ```tsx
   // Mobile-first: stack, tablet+: side-by-side
   <div className="grid grid-cols-1 md:grid-cols-[40%_60%] lg:grid-cols-[33%_67%] gap-0 md:gap-4 h-[calc(100vh-180px)]">
   ```

3. **Update MessageListPane responsive width**
   - Remove `lg:w-1/3`
   - Add `w-full` (grid handles width)

4. **Update MessageDetailPane responsive behavior**
   - Add `hidden md:block` for desktop-only
   - Mobile will use bottom sheet (Phase 2)

5. **Add CSS custom property for layout height**
   ```tsx
   style={{ '--inbox-height': 'calc(100vh - 180px)' }}
   ```

6. **Update header padding for mobile**
   - `px-4` → `px-4 md:px-6`

## Todo List
- [x] Convert bg colors to Version C (black base)
- [x] Implement mobile-first grid layout
- [x] Hide detail pane on mobile (<768px)
- [x] Update responsive padding/margins
- [x] Test on 375px, 768px, 1024px, 1440px widths
- [x] Verify no horizontal scroll on mobile

## Success Criteria
- [x] Mobile shows only message list
- [x] Tablet shows 40/60 split
- [x] Desktop shows 33/67 split
- [x] No layout shift during resize
- [x] Version C colors applied

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Breaking existing desktop layout | Test at 1024px+ first |
| Grid not supported | Fallback flexbox (99% browser support) |

## Security Considerations
None - layout only changes.

## Next Steps
After completion, Phase 2 and Phase 3 can run in parallel.
