# Phase 03: Virtualized Inbox List

> **Priority:** P1 | **Status:** pending | **Effort:** 2 days

---

## Context

- [Current Inbox List](../../services/web/src/components/inbox-manager/mobile-layout-modules/mobile-inboxes-tab.tsx)
- [Existing Virtualized Email List](../../services/web/src/components/email-stream-modules/virtualized-email-list.tsx)
- [@tanstack/react-virtual docs](https://tanstack.com/virtual/latest)

## Overview

Apply virtualization cho inbox list để cải thiện scroll performance. Hiện tại render tất cả inbox cards, gây lag khi có nhiều items.

## Key Insights

- Dự án đã có `virtualized-email-list.tsx` cho messages - có thể tham khảo pattern
- `@tanstack/react-virtual` lightweight hơn `react-window`
- Dynamic height items cần `measureElement` callback

## Requirements

### Functional
- Virtualize inbox list with dynamic item heights
- Maintain scroll position when switching tabs
- Support pull-to-refresh integration
- Preserve swipe gestures on items

### Non-functional
- Scroll FPS >= 55 on mid-range devices
- Initial render < 16ms
- Memory: max ~50 DOM nodes visible

## Architecture

```
┌─────────────────────────────────┐
│     Virtualized Container        │
│  ┌───────────────────────────┐  │
│  │ InboxCard (visible)       │  │
│  ├───────────────────────────┤  │
│  │ InboxCard (visible)       │  │
│  ├───────────────────────────┤  │
│  │ InboxCard (visible)       │  │
│  ├───────────────────────────┤  │
│  │ ... (virtualized)         │  │
│  └───────────────────────────┘  │
│         ↕ scroll                 │
└─────────────────────────────────┘
```

## Related Code Files

### Create
```
services/web/src/components/mobile/
└── VirtualizedInboxList.tsx    # Main virtualized list component
```

### Modify
```
services/web/src/components/inbox-manager/mobile-layout-modules/mobile-inboxes-tab.tsx
package.json (add @tanstack/react-virtual if not present)
```

### Reference
```
services/web/src/components/email-stream-modules/virtualized-email-list.tsx
```

## Implementation Steps

### Step 1: Install dependency (if needed)
```bash
cd services/web
npm install @tanstack/react-virtual
```

### Step 2: Create VirtualizedInboxList
```tsx
// services/web/src/components/mobile/VirtualizedInboxList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useCallback } from 'react';
import type { Inbox, ShareMode } from '../../types';
import { SwipeableInboxCard } from '../mobile';
import { InboxCard } from '../InboxCard';

interface VirtualizedInboxListProps {
  inboxes: Inbox[];
  selectedInboxIds: Set<string>;
  focusedIndex: number;
  onViewMessages: (inbox: Inbox) => void;
  onDeleteInbox: (inbox: Inbox) => void;
  onTransferInbox: (inbox: Inbox) => void;
  onExtendInbox: (inbox: Inbox) => void;
  onTogglePermanent: (inbox: Inbox) => void;
  onShareModeChange: (inboxId: string, mode: ShareMode) => void;
  onVisibilityRules: (inbox: Inbox) => void;
  onToggleSelect: (inboxId: string) => void;
  onLongPress: (inbox: Inbox) => void;
  onSetFocusedIndex: (index: number) => void;
}

// Estimated row height for initial render
const ESTIMATED_ROW_HEIGHT = 120;

export function VirtualizedInboxList({
  inboxes,
  selectedInboxIds,
  focusedIndex,
  onViewMessages,
  onDeleteInbox,
  onTransferInbox,
  onExtendInbox,
  onTogglePermanent,
  onShareModeChange,
  onVisibilityRules,
  onToggleSelect,
  onLongPress,
  onSetFocusedIndex,
}: VirtualizedInboxListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: inboxes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 3, // Render 3 extra items above/below viewport
    measureElement: (element) => {
      // Dynamic height measurement
      return element.getBoundingClientRect().height;
    },
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }} // Performance optimization
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const inbox = inboxes[virtualRow.index];
          const email = `${inbox.localPart}@${inbox.domain?.name}`;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SwipeableInboxCard
                email={email}
                onDelete={() => onDeleteInbox(inbox)}
                onCopy={() => onLongPress(inbox)}
              >
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onLongPress(inbox);
                  }}
                >
                  <InboxCard
                    inbox={inbox}
                    isSelected={selectedInboxIds.has(inbox.id)}
                    isActive={virtualRow.index === focusedIndex}
                    onSelect={() => onSetFocusedIndex(virtualRow.index)}
                    onToggleSelect={() => onToggleSelect(inbox.id)}
                    onCopy={() => {}}
                    onDelete={() => onDeleteInbox(inbox)}
                    onViewMessages={() => onViewMessages(inbox)}
                    onTransfer={() => onTransferInbox(inbox)}
                    onExtend={() => onExtendInbox(inbox)}
                    onTogglePermanent={() => onTogglePermanent(inbox)}
                    onShareModeChange={(mode) => onShareModeChange(inbox.id, mode)}
                    onVisibilityRules={() => onVisibilityRules(inbox)}
                  />
                </div>
              </SwipeableInboxCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 3: Integrate with PullToRefresh
```tsx
// Update mobile-inboxes-tab.tsx
import { VirtualizedInboxList } from '../mobile/VirtualizedInboxList';

// In MobileInboxesTab component:
<PullToRefresh onRefresh={onPullRefresh} isRefreshing={isRefreshing}>
  {busy && inboxes.length === 0 ? (
    <div className="grid grid-cols-1 gap-4">
      {Array(6).fill(0).map((_, i) => <InboxCardSkeleton key={i} />)}
    </div>
  ) : filteredInboxes.length === 0 ? (
    <EmptyInboxState onCreateInbox={onCreateInbox} />
  ) : (
    <VirtualizedInboxList
      inboxes={filteredInboxes}
      selectedInboxIds={selectedInboxIds}
      focusedIndex={focusedIndex}
      onViewMessages={onViewMessages}
      onDeleteInbox={onDeleteInbox}
      onTransferInbox={onTransferInbox}
      onExtendInbox={onExtendInbox}
      onTogglePermanent={onTogglePermanent}
      onShareModeChange={onShareModeChange}
      onVisibilityRules={onVisibilityRules}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
      onSetFocusedIndex={onSetFocusedIndex}
    />
  )}
</PullToRefresh>
```

### Step 4: Add scroll position persistence
```tsx
// Hook to persist scroll position across tab changes
function useScrollPersistence(key: string, containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Restore position
    const savedPos = sessionStorage.getItem(`scroll_${key}`);
    if (savedPos) {
      container.scrollTop = parseInt(savedPos, 10);
    }

    // Save position on scroll
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${key}`, String(container.scrollTop));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [key, containerRef]);
}
```

### Step 5: Performance optimizations
```tsx
// Add CSS containment
.virtualized-list {
  contain: strict;
  will-change: transform;
}

// Disable pointer events during scroll
.virtualized-list.scrolling * {
  pointer-events: none;
}
```

## Todo List

- [ ] Check if `@tanstack/react-virtual` already installed
- [ ] Create `VirtualizedInboxList.tsx` component
- [ ] Integrate with `mobile-inboxes-tab.tsx`
- [ ] Add scroll position persistence
- [ ] Test with 100+ inboxes
- [ ] Profile scroll FPS on mid-range device
- [ ] Verify swipe gestures work in virtualized context
- [ ] Test pull-to-refresh integration

## Success Criteria

- [ ] Scroll FPS >= 55 with 100+ items
- [ ] Initial render < 50 DOM nodes
- [ ] No visible jank during fast scroll
- [ ] Swipe actions work correctly
- [ ] Scroll position preserved on tab switch

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Dynamic height measurement issues | Medium | Medium | Use `measureElement` callback |
| Pull-to-refresh conflict | Low | Medium | Ensure proper container structure |
| Focus management broken | Low | Low | Explicit `focusedIndex` handling |

## Security Considerations

- No security impact - rendering optimization only

## Next Steps

→ Phase 04: Haptic Feedback & Polish
