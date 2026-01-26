# Phase 3: Keyboard Navigation

## Context Links

- [Plan Overview](./plan.md)
- [Email UI Patterns Research](./research/researcher-260124-2307-email-inbox-ui-patterns.md)
- [Design System V3](../../docs/design-system-version-c.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | pending |
| Effort | 2h |
| Dependencies | Phase 1, Phase 2 |

Implement Superhuman-style keyboard navigation. Power users expect to navigate email without a mouse. Current implementation only has `r` for refresh; need full `j/k` navigation, `Enter/Esc` for detail view, and visual focus indicators.

## Key Insights

From research:
- `j` (next), `k` (previous) for traversing list
- `Enter` opens details; `Esc` returns to list
- Active email needs high-contrast highlight (border-left or background)
- Avoid triggering shortcuts when typing in inputs

## Requirements

### Functional
- `j` / `ArrowDown` - Move to next message
- `k` / `ArrowUp` - Move to previous message
- `Enter` - Open selected message detail
- `Esc` - Return focus to list (close detail view focus)
- `r` - Refresh (already implemented)
- `/` - Focus search input (if in search mode)

### Non-Functional
- Visual focus indicator: `border-l-2 border-white bg-zinc-900`
- Smooth scroll to keep focused item visible
- No shortcuts when focus in input/textarea

## Architecture

### State Management

Add to `useInboxViewerData`:
```typescript
interface UseInboxViewerDataReturn {
  // ... existing
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
}
```

### Focus Flow

```
[Search Form] --Tab--> [Message List] --j/k--> [Message Items]
                                        |
                                    Enter
                                        v
                                [Message Detail] --Esc--> [Message List]
```

## Related Code Files

### Files to Modify
1. `services/web/src/pages/inbox-viewer-modules/use-inbox-viewer-data.ts`
2. `services/web/src/components/inbox-viewer/message-list.tsx`

### Files to Create
1. `services/web/src/hooks/use-keyboard-navigation.ts`

## Implementation Steps

### Step 1: Create useKeyboardNavigation hook

```typescript
// services/web/src/hooks/use-keyboard-navigation.ts
import { useEffect, useCallback, useRef } from "react";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onEnter: (index: number) => void;
  onEscape: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEnter,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const focusedIndexRef = useRef(0);

  const isInputFocused = useCallback(() => {
    const active = document.activeElement;
    return (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute("contenteditable") === "true"
    );
  }, []);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          focusedIndexRef.current = Math.min(
            focusedIndexRef.current + 1,
            itemCount - 1
          );
          onSelect(focusedIndexRef.current);
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0);
          onSelect(focusedIndexRef.current);
          break;

        case "Enter":
          e.preventDefault();
          onEnter(focusedIndexRef.current);
          break;

        case "Escape":
          e.preventDefault();
          onEscape();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, onSelect, onEnter, onEscape, isInputFocused]);

  const setFocusedIndex = useCallback((index: number) => {
    focusedIndexRef.current = index;
  }, []);

  return { setFocusedIndex, focusedIndex: focusedIndexRef.current };
}
```

### Step 2: Update use-inbox-viewer-data.ts

Add keyboard navigation state and handlers:

```typescript
// Add to state
const [focusedIndex, setFocusedIndex] = useState(0);

// Reset focus when messages change
useEffect(() => {
  setFocusedIndex(0);
}, [messages]);

// Add keyboard nav handler
const handleKeyboardSelect = useCallback((index: number) => {
  setFocusedIndex(index);
  // Auto-scroll handled by message-list component
}, []);

const handleKeyboardEnter = useCallback((index: number) => {
  if (messages[index]) {
    handleSelectMessage(messages[index].id);
  }
}, [messages, handleSelectMessage]);

const handleKeyboardEscape = useCallback(() => {
  // Return focus to list, deselect message
  setSelectedMessage(null);
}, []);

// Update return object
return {
  // ... existing
  focusedIndex,
  setFocusedIndex,
  handleKeyboardSelect,
  handleKeyboardEnter,
  handleKeyboardEscape,
};
```

### Step 3: Update message-list.tsx with focus indicators

```tsx
import { useEffect, useRef } from "react";

interface MessageListProps {
  // ... existing
  focusedIndex: number;
  onFocusChange: (index: number) => void;
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  focusedIndex,
  onFocusChange,
  // ... rest
}: MessageListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Scroll focused item into view
  useEffect(() => {
    const item = itemRefs.current[focusedIndex];
    if (item) {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <ul ref={listRef} className="divide-y divide-zinc-900">
      {messages.map((msg, index) => (
        <li
          key={msg.id}
          ref={(el) => (itemRefs.current[index] = el)}
          onClick={() => {
            onFocusChange(index);
            onSelect(msg.id);
          }}
          className={`p-4 cursor-pointer transition-colors duration-100
            ${focusedIndex === index
              ? "bg-zinc-900 border-l-2 border-l-white"
              : "bg-black hover:bg-zinc-900 border-l-2 border-l-transparent"}
            ${selectedId === msg.id
              ? "ring-1 ring-inset ring-zinc-700"
              : ""}`}
        >
          {/* ... content */}
        </li>
      ))}
    </ul>
  );
}
```

### Step 4: Add keyboard hint UI

Add a subtle hint showing available shortcuts:

```tsx
// In MessageListPane, after the toolbar
<div className="px-3 py-1.5 border-b border-zinc-900 flex items-center gap-3
  text-xs text-zinc-600">
  <span className="flex items-center gap-1">
    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">j</kbd>
    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">k</kbd>
    <span>navigate</span>
  </span>
  <span className="flex items-center gap-1">
    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">Enter</kbd>
    <span>open</span>
  </span>
  <span className="flex items-center gap-1">
    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">r</kbd>
    <span>refresh</span>
  </span>
</div>
```

## Todo List

- [ ] Create `use-keyboard-navigation.ts` hook
- [ ] Add `focusedIndex` state to use-inbox-viewer-data
- [ ] Update message-list.tsx with focus indicator styles
- [ ] Implement scroll-into-view on focus change
- [ ] Add keyboard hint bar UI
- [ ] Test j/k navigation
- [ ] Test Enter to open message
- [ ] Test Esc to return to list
- [ ] Verify no shortcuts fire when typing in search
- [ ] Test with screen reader

## Success Criteria

- [ ] j/k moves focus indicator through list
- [ ] Arrow keys also work (Down/Up)
- [ ] Enter opens currently focused message
- [ ] Esc clears selected message
- [ ] Focused item auto-scrolls into view
- [ ] No shortcuts trigger when typing in inputs
- [ ] Visual focus indicator is high-contrast

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Conflicts with browser shortcuts | Low | Only use j/k/Enter/Esc |
| Screen reader compatibility | Medium | Use semantic list markup, aria-labels |
| Fast typing causes scroll jank | Low | Use `scrollIntoView` with block: nearest |

## Security Considerations

- No security impact
- Keyboard handlers are client-side only

## Next Steps

After Phase 3:
- Proceed to Phase 4: Virtualized List
- Keyboard navigation will work with virtualized items
