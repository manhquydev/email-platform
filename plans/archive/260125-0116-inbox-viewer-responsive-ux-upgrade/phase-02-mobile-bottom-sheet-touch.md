---
title: "Phase 2: Mobile Bottom Sheet & Touch"
status: pending
priority: P1
effort: 3h
---

# Phase 2: Mobile Bottom Sheet & Touch Interactions

## Context Links
- [Mobile UX Research](./research/researcher-mobile-email-ux.md)
- [Phase 1: Layout Foundation](./phase-01-responsive-layout-foundation.md)

## Overview
Implement mobile-specific UX: bottom sheet for message detail, swipe gestures, and touch-optimized targets. Runs in **parallel with Phase 3**.

## Parallelization Info
- **Can run parallel with:** Phase 3 (Desktop)
- **Depends on:** Phase 1
- **File ownership (EXCLUSIVE):**
  - `message-list.tsx`
  - `message-list-item.tsx`
  - `message-detail.tsx`
  - NEW: `mobile-bottom-sheet.tsx`

## Conflict Prevention
- Phase 3 owns keyboard navigation; Phase 2 owns touch/swipe
- No shared file modifications between Phase 2 and Phase 3

## Key Insights
- Thumb zone = bottom 1/3 of screen for primary actions
- Touch targets minimum 44-48px
- Bottom sheet retains inbox context (vs full-screen push)
- Swipe: Right = positive action, Left = negative/options

## Requirements

### Functional
- Bottom sheet opens when message selected on mobile
- Swipe down to dismiss bottom sheet
- Drag handle for sheet manipulation
- Touch targets >= 44px on all interactive elements

### Non-Functional
- Sheet animation <= 200ms
- No jank during swipe gesture
- Works without JavaScript (graceful degradation)

## Architecture

### Bottom Sheet States
```
Closed:     [Message List - Full Screen]

Peek:       [Message List - 40%]
            ─────────────────────
            [Bottom Sheet - 60%]

Full:       [Bottom Sheet - 95%]
            (drag handle visible)
```

### Component Structure
```
MobileBottomSheet
├── DragHandle (swipe indicator)
├── SheetHeader (subject, close button)
└── MessageDetail (content)
```

## Related Code Files

### Modify
- `services/web/src/components/inbox-viewer/message-list.tsx`
- `services/web/src/components/inbox-viewer/message-list-item.tsx`
- `services/web/src/components/inbox-viewer/message-detail.tsx`

### Create
- `services/web/src/components/inbox-viewer/mobile-bottom-sheet.tsx`

## Implementation Steps

1. **Create mobile-bottom-sheet.tsx**
   ```tsx
   interface MobileBottomSheetProps {
     isOpen: boolean;
     onClose: () => void;
     children: React.ReactNode;
   }
   ```
   - Use CSS transforms for performance
   - Touch event handlers for swipe-to-dismiss
   - Backdrop with opacity transition

2. **Update message-list-item.tsx touch targets**
   - Increase padding: `p-4` → `p-4 md:p-4` (mobile uses larger)
   - Add `min-h-[56px]` for 44px+ touch target
   - Increase font sizes on mobile: `text-sm` → `text-sm md:text-sm`

3. **Add swipe gesture detection**
   ```tsx
   // In message-list-item.tsx
   const [swipeOffset, setSwipeOffset] = useState(0);
   // Touch handlers for swipe reveal
   ```

4. **Update message-list.tsx for mobile**
   - Add `touch-action: pan-y` for vertical scroll priority
   - Increase row heights on mobile

5. **Integrate bottom sheet in InboxViewer**
   - Show `<MobileBottomSheet>` on mobile when message selected
   - Pass `selectedMessage` to sheet content

6. **Add haptic feedback (optional)**
   ```tsx
   navigator.vibrate?.(10); // Subtle feedback
   ```

## Todo List
- [ ] Create mobile-bottom-sheet.tsx component
- [ ] Implement drag-to-dismiss gesture
- [ ] Add backdrop overlay with fade
- [ ] Update message-list-item touch targets (44px+)
- [ ] Add swipe-to-reveal quick actions
- [ ] Test on iOS Safari and Chrome Android
- [ ] Verify gesture doesn't conflict with scroll

## Success Criteria
- [ ] Bottom sheet opens on message tap (mobile)
- [ ] Swipe down dismisses sheet
- [ ] All touch targets >= 44px
- [ ] Animation completes in <= 200ms
- [ ] No scroll conflicts

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| iOS Safari gesture conflicts | Test `touch-action` CSS |
| Performance on low-end devices | Use CSS transforms only |
| Swipe vs scroll confusion | Require horizontal swipe start |

## Security Considerations
None - UI only changes.

## Next Steps
After Phase 2 + Phase 3 complete, proceed to Phase 4 (Density Controls).
