# Phase 04: Mobile UX Optimization

**Date:** 2026-01-14
**Status:** Pending
**Priority:** Medium
**Estimated Complexity:** Medium

## Context
- [Main Plan](./plan.md)
- [Email UX Patterns Research](../reports/researcher-260114-0631-email-ux-patterns.md)

## Overview
Optimize mobile experience with swipe gestures, bottom sheets, and touch-friendly interactions.

## Current State
- Mobile header with logo and notifications
- Bottom navigation (MobileNav)
- No swipe gestures
- Modal-based interactions
- Touch targets may be too small

## Target State
- Swipe gestures on inbox cards and messages
- Bottom sheet for actions and filters
- Larger touch targets (min 44px)
- Pull-to-refresh
- Haptic feedback (where supported)

## Requirements

### Functional
- [ ] Swipe left on inbox card: Delete
- [ ] Swipe right on inbox card: Copy email
- [ ] Swipe left on message: Delete
- [ ] Swipe right on message: Mark read/unread
- [ ] Pull-to-refresh on lists
- [ ] Bottom sheet for inbox actions
- [ ] Bottom sheet for filter options

### Non-Functional
- [ ] Touch targets ≥ 44px
- [ ] Smooth 60fps animations
- [ ] Works with screen readers
- [ ] No accidental swipe triggers

## Architecture

```
Mobile Flow:
┌─────────────────────────┐
│ Header: Logo + Actions  │
├─────────────────────────┤
│                         │
│  ← Swipe: Delete        │
│  [Inbox Card]           │
│  Swipe →: Copy          │
│                         │
│  [Inbox Card]           │
│                         │
├─────────────────────────┤
│ [Inbox] [Search] [+]    │
└─────────────────────────┘

Bottom Sheet (on long press):
┌─────────────────────────┐
│ ══════ (drag handle)    │
│ 📋 Copy Email           │
│ 👁️ View Messages        │
│ 🔄 Transfer Ownership   │
│ 🗑️ Delete               │
└─────────────────────────┘
```

## Implementation Steps

1. **Add react-swipeable-list**
   - Install package
   - Wrap InboxCard with SwipeableListItem
   - Configure swipe thresholds

2. **Create SwipeableInboxCard component**
   - Swipe left → Delete (red background)
   - Swipe right → Copy (green background)
   - Visual feedback during swipe

3. **Create SwipeableMessageItem component**
   - Swipe left → Delete
   - Swipe right → Toggle read
   - Integrate with EmailStream

4. **Create BottomSheet component**
   - Draggable sheet from bottom
   - Snap points (closed, half, full)
   - Backdrop dismiss

5. **Create InboxActionSheet component**
   - List of actions for selected inbox
   - Triggered by long press or "..." menu

6. **Add pull-to-refresh**
   - Use native CSS overscroll or library
   - Trigger data reload
   - Loading indicator

7. **Audit touch targets**
   - Ensure all buttons ≥ 44x44px
   - Add padding to small icons
   - Test with touch simulator

## Files to Modify
- `services/web/src/components/InboxCard.tsx`
- `services/web/src/components/EmailStream.tsx`
- `services/web/src/pages/InboxManager.tsx`

## Files to Create
- `services/web/src/components/mobile/SwipeableInboxCard.tsx`
- `services/web/src/components/mobile/SwipeableMessageItem.tsx`
- `services/web/src/components/mobile/BottomSheet.tsx`
- `services/web/src/components/mobile/InboxActionSheet.tsx`
- `services/web/src/components/mobile/PullToRefresh.tsx`

## Dependencies to Add
```json
{
  "react-swipeable-list": "^1.9.0"
}
```

## Success Criteria
- [ ] Swipe gestures work on iOS and Android browsers
- [ ] Bottom sheet slides smoothly
- [ ] Pull-to-refresh triggers reload
- [ ] All touch targets ≥ 44px
- [ ] No accidental actions from scrolling

## Risk Assessment
- **Medium:** Swipe gesture conflicts with horizontal scroll
- **Low:** Bottom sheet implementation well-documented
- **Mitigation:** Add swipe threshold, disable during scroll

## Security Considerations
- No new security concerns (UI-only changes)
