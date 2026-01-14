# Phase 01: Split-Pane Layout

**Date:** 2026-01-14
**Status:** ✅ Complete
**Completed:** 2026-01-14
**Priority:** High
**Estimated Complexity:** Medium

## Context
- [Main Plan](./plan.md)
- [Email Viewer Patterns Research](../reports/researcher-260114-0631-email-viewer-patterns.md)

## Overview
Replace tab-based switching with a 3-column split-pane layout for desktop, maintaining full-page flow for mobile.

## Current State
- Tab navigation switches between "Hộp thư" (Inboxes) and "Tin nhắn" (Messages)
- User loses context when switching tabs
- Email detail opens as modal overlay blocking the list

## Target State
- **Desktop (≥1024px):** 3-column layout: Inbox List | Message List | Reading Pane
- **Tablet (768-1023px):** 2-column: Inbox+Message combined | Reading Pane
- **Mobile (<768px):** Single column with navigation stack

## Requirements

### Functional
- [x] Collapsible left sidebar for inbox list
- [x] Resizable panes with drag handles (desktop)
- [x] Persistent inbox selection while viewing messages
- [x] Smooth transitions between panes
- [x] Remember user's pane size preferences (localStorage)

### Non-Functional
- [x] No layout shift during loading
- [x] Maintain keyboard navigation (j/k/Enter)
- [ ] Support RTL layouts (future enhancement)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Header: InboxSelector + Search + Actions                     │
├──────────┬────────────────────┬─────────────────────────────┤
│ Inboxes  │ Messages           │ Reading Pane                │
│ (280px)  │ (350px)            │ (flex-1)                    │
│          │                    │                             │
│ [Card]   │ [EmailStream]      │ [MessageDetail]             │
│ [Card]   │                    │                             │
│ [Card]   │                    │                             │
├──────────┴────────────────────┴─────────────────────────────┤
│ Mobile: Bottom Nav                                           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Create SplitPaneLayout component**
   - Use CSS Grid with `grid-template-columns`
   - Implement resize handles with mouse/touch events
   - Store pane widths in localStorage

2. **Refactor InboxManager.tsx**
   - Remove TabNavigation for desktop
   - Keep tabs for mobile as bottom sheet navigation
   - Extract MessageDetail from modal to inline pane

3. **Create InboxSidebar component**
   - Compact version of InboxCard for sidebar
   - Collapsible with icon-only mode
   - Active state indicator

4. **Update FocusStreamLayout**
   - Support new layout mode prop
   - Handle responsive breakpoints

5. **Add ResizeHandle component**
   - Drag to resize panes
   - Double-click to reset to default

## Files to Modify
- `services/web/src/pages/InboxManager.tsx`
- `services/web/src/layouts/FocusStreamLayout.tsx`
- `services/web/src/components/InboxCard.tsx` (add compact variant)

## Files to Create
- `services/web/src/layouts/SplitPaneLayout.tsx`
- `services/web/src/components/ResizeHandle.tsx`
- `services/web/src/components/InboxSidebar.tsx`
- `services/web/src/hooks/usePaneResize.ts`

## Success Criteria
- [x] 3-column layout renders correctly on desktop
- [x] Pane resizing works smoothly
- [x] Mobile maintains single-column flow
- [x] No regression in existing functionality
- [x] Keyboard navigation preserved

## Implementation Summary

### Components Created
| Component | Location | Description |
|-----------|----------|-------------|
| SplitPaneLayout | `components/split-pane/SplitPaneLayout.tsx` | Responsive 3-column layout with resize handles |
| ResizeHandle | `components/split-pane/ResizeHandle.tsx` | Draggable resize handle with double-click reset |
| InboxSidebar | `components/split-pane/InboxSidebar.tsx` | Compact inbox list for sidebar |
| usePaneResize | `hooks/usePaneResize.ts` | Hook for resize logic with localStorage persistence |
| useBreakpoint | `hooks/useBreakpoint.ts` | Hook for responsive breakpoint detection |

### Files Modified
| File | Changes |
|------|---------|
| `pages/InboxManager.tsx` | Integrated split-pane for desktop, kept tabs for mobile |

## Risk Assessment
- **Medium:** Large refactor of InboxManager (826 lines)
- **Low:** CSS Grid well-supported in target browsers
- **Mitigation:** Incremental refactor, keep old layout as fallback

## Security Considerations
- No new security concerns (UI-only changes)
