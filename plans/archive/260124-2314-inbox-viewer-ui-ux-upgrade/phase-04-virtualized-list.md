# Phase 4: Virtualized Message List

## Context Links

- [Plan Overview](./plan.md)
- [Email UI Patterns Research](./research/researcher-260124-2307-email-inbox-ui-patterns.md)
- [react-virtuoso docs](https://virtuoso.dev/)

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 - Important |
| Status | pending |
| Effort | 2h |
| Dependencies | Phase 1, Phase 2, Phase 3 |

Replace standard `<ul>` with `react-virtuoso` for virtual scrolling. Critical for "public inbox floods" where users may receive 1000+ messages. Only DOM nodes in viewport are rendered.

## Key Insights

From research:
- "Use `react-virtuoso` for variable height support"
- "Only render DOM nodes in viewport"
- Standard list with 1000+ items causes severe jank
- Variable height items (due to subject length) require react-virtuoso over react-window

## Requirements

### Functional
- Virtualize message list for 1000+ items
- Maintain current selection/focus state
- Support variable height list items
- Preserve keyboard navigation (j/k)

### Non-Functional
- 60fps scroll on 1000+ messages
- Initial render < 100ms
- Smooth scroll-to-index for keyboard nav

## Architecture

### Dependencies

```bash
pnpm add react-virtuoso --filter web
```

### Component Structure

```
MessageList (refactored)
├── Virtuoso
│   └── MessageListItem (memoized)
├── EmptyState
└── Pagination
```

## Related Code Files

### Files to Modify
1. `services/web/src/components/inbox-viewer/message-list.tsx`
2. `services/web/package.json` (add dependency)

### Files to Create
1. `services/web/src/components/inbox-viewer/message-list-item.tsx`

## Implementation Steps

### Step 1: Install react-virtuoso

```bash
cd services/web
pnpm add react-virtuoso
```

### Step 2: Create MessageListItem component

Extract list item to separate memoized component:

```tsx
// services/web/src/components/inbox-viewer/message-list-item.tsx
import { memo } from "react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  preview: string;
  attachmentCount: number;
}

interface MessageListItemProps {
  message: Message;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

export const MessageListItem = memo(function MessageListItem({
  message,
  isSelected,
  isFocused,
  onClick,
}: MessageListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors duration-100
        ${isFocused
          ? "bg-zinc-900 border-l-2 border-l-white"
          : "bg-black hover:bg-zinc-900 border-l-2 border-l-transparent"}
        ${isSelected ? "ring-1 ring-inset ring-zinc-700" : ""}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={`text-sm truncate max-w-[200px]
          ${message.isRead ? "text-zinc-500" : "text-white font-medium"}`}>
          {message.fromAddress || "(unknown)"}
        </span>
        <span className="text-xs text-zinc-600 flex-shrink-0">
          {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
        </span>
      </div>

      <div className={`text-sm mb-1 truncate
        ${message.isRead ? "text-zinc-400" : "text-white font-medium"}`}>
        {message.subject || "(no subject)"}
      </div>

      <div className="text-xs text-zinc-600 truncate">
        {message.preview}
      </div>

      {message.attachmentCount > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>{message.attachmentCount}</span>
        </div>
      )}
    </div>
  );
});
```

### Step 3: Refactor message-list.tsx with Virtuoso

```tsx
// services/web/src/components/inbox-viewer/message-list.tsx
import { useRef, useCallback } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { MessageListItem } from "./message-list-item";

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  focusedIndex: number;
  onSelect: (id: string) => void;
  onFocusChange: (index: number) => void;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function MessageList({
  messages,
  selectedId,
  focusedIndex,
  onSelect,
  onFocusChange,
  total,
  page,
  onPageChange,
  loading = false,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  // Scroll to focused index when it changes
  const scrollToIndex = useCallback((index: number) => {
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "center",
      behavior: "smooth",
    });
  }, []);

  // Expose scroll function via effect when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < messages.length) {
      scrollToIndex(focusedIndex);
    }
  }, [focusedIndex, messages.length, scrollToIndex]);

  if (loading) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
    return <MessageListEmpty />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          itemContent={(index, message) => (
            <MessageListItem
              message={message}
              isSelected={selectedId === message.id}
              isFocused={focusedIndex === index}
              onClick={() => {
                onFocusChange(index);
                onSelect(message.id);
              }}
            />
          )}
          style={{ height: "100%" }}
          className="divide-y divide-zinc-900"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-3 border-t border-zinc-800">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded-md border border-zinc-800 text-zinc-400
              hover:border-zinc-700 hover:text-white disabled:opacity-50
              transition-colors text-sm"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-zinc-500 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-md border border-zinc-800 text-zinc-400
              hover:border-zinc-700 hover:text-white disabled:opacity-50
              transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Skeleton component for loading state
function MessageListSkeleton() {
  return (
    <div className="divide-y divide-zinc-900">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-4 bg-zinc-900 rounded w-32" />
            <div className="h-3 bg-zinc-900 rounded w-16" />
          </div>
          <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-900 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

// Empty state component
function MessageListEmpty() {
  return (
    <div className="p-8 text-center">
      <svg className="w-16 h-16 mx-auto text-zinc-700 mb-4" fill="none"
        stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="text-zinc-400 text-lg font-medium mb-1">No emails</p>
      <p className="text-zinc-600 text-sm">This inbox is empty or has expired</p>
    </div>
  );
}
```

### Step 4: Update parent component props

Ensure `inbox-viewer-components.tsx` passes new props:

```tsx
<MessageList
  messages={messages}
  selectedId={selectedMessage?.id || null}
  focusedIndex={focusedIndex}
  onSelect={onSelect}
  onFocusChange={onFocusChange}
  total={total}
  page={page}
  onPageChange={onPageChange}
  loading={loading}
/>
```

## Todo List

- [ ] Install react-virtuoso: `pnpm add react-virtuoso --filter web`
- [ ] Create `message-list-item.tsx` component
- [ ] Refactor `message-list.tsx` with Virtuoso
- [ ] Add scroll-to-index for keyboard navigation
- [ ] Update MessageListPane to pass focusedIndex
- [ ] Test with 100+ messages
- [ ] Test keyboard navigation still works
- [ ] Verify smooth scrolling
- [ ] Profile performance with React DevTools

## Success Criteria

- [ ] List renders 1000+ messages without jank
- [ ] Initial render < 100ms
- [ ] Scroll maintains 60fps
- [ ] j/k navigation scrolls focused item into view
- [ ] Selection state preserved during scroll
- [ ] Memoized items don't re-render unnecessarily

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Variable height calculation | Medium | react-virtuoso handles this natively |
| Focus state lost on scroll | Medium | Use Virtuoso's scrollToIndex API |
| Bundle size increase | Low | react-virtuoso is ~10KB gzipped |
| SSR compatibility | Low | Virtuoso supports SSR |

## Security Considerations

- No security impact
- Virtual scrolling is purely client-side optimization

## Next Steps

After Phase 4:
- Proceed to Phase 5: Loading States
- Virtualized list now handles scale; polish loading UX
