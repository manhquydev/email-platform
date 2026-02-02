# Phase 3: Pin/Unpin Inbox Feature

## Context
- [Parent Plan](./plan.md)
- Currently uses "Make Permanent" toggle (removes expiresAt)
- Need visual pin icon and pinned-first sorting

## Overview
| Field | Value |
|-------|-------|
| Priority | Medium |
| Status | ✅ Done |
| Effort | 1h |
| Depends on | Phase 1 (i18n keys) |

## Requirements

### Functional
- Pin icon button on each inbox item
- Pinned inboxes sorted to top
- Visual indicator for pinned state
- Persist pin state in browser.storage.local

### Non-Functional
- No backend changes required
- Pin state local to extension only

## Architecture

```
┌─────────────────────────────────────┐
│ InboxList.tsx                       │
│  ├─ usePinnedInboxes hook           │
│  │   └─ browser.storage.local       │
│  ├─ Pinned section (if any pinned)  │
│  └─ Regular section                 │
└─────────────────────────────────────┘
```

## Files to Modify

| File | Action |
|------|--------|
| `src/components/popup/InboxList.tsx` | Add pin button and sorting |
| `src/hooks/usePinnedInboxes.ts` | NEW: Hook for pin state management |

## Implementation Steps

### 1. Create usePinnedInboxes hook

```typescript
// src/hooks/usePinnedInboxes.ts
import { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';

const STORAGE_KEY = 'pinned_inbox_ids';

export function usePinnedInboxes() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load from storage
    browser.storage.local.get(STORAGE_KEY).then((result) => {
      const ids = result[STORAGE_KEY] || [];
      setPinnedIds(new Set(ids));
    });
  }, []);

  const togglePin = async (inboxId: string) => {
    const newPinned = new Set(pinnedIds);
    if (newPinned.has(inboxId)) {
      newPinned.delete(inboxId);
    } else {
      newPinned.add(inboxId);
    }
    setPinnedIds(newPinned);
    await browser.storage.local.set({ [STORAGE_KEY]: Array.from(newPinned) });
  };

  const isPinned = (inboxId: string) => pinnedIds.has(inboxId);

  return { pinnedIds, togglePin, isPinned };
}
```

### 2. Add pin button to InboxList.tsx

```tsx
import { Pin } from 'lucide-react';
import { usePinnedInboxes } from '../../hooks/usePinnedInboxes';

// In component:
const { isPinned, togglePin } = usePinnedInboxes();

// Sort inboxes: pinned first
const sortedInboxes = [...inboxes].sort((a, b) => {
  const aPinned = isPinned(a.id);
  const bPinned = isPinned(b.id);
  if (aPinned && !bPinned) return -1;
  if (!aPinned && bPinned) return 1;
  return 0; // Keep original order for same pin status
});

// Pin button in action buttons:
<button
  onClick={() => togglePin(inbox.id)}
  className={cn(
    "p-2 rounded-xl transition-all duration-200",
    isPinned(inbox.id)
      ? "text-primary-500 bg-primary-50 dark:bg-primary-900/20"
      : "text-slate-400 hover:text-primary-500 hover:bg-slate-50"
  )}
  title={isPinned(inbox.id) ? t('unpinInbox') : t('pinInbox')}
>
  <Pin className={cn("w-3.5 h-3.5", isPinned(inbox.id) && "fill-current")} />
</button>
```

### 3. Add "Pinned" section header (optional)

```tsx
{sortedInboxes.some(i => isPinned(i.id)) && (
  <div className="text-[10px] font-bold text-primary-500 uppercase tracking-wider px-1 mb-2">
    {t('pinnedInboxes')}
  </div>
)}
```

## Todo List

- [ ] Create `usePinnedInboxes.ts` hook
- [ ] Import Pin icon from lucide-react
- [ ] Add pin button to inbox action buttons
- [ ] Implement sorting logic (pinned first)
- [ ] Add optional "Pinned" section header
- [ ] Test pin persistence across popup opens

## Success Criteria

- Pin icon visible on hover for each inbox
- Clicking pin toggles filled/outline state
- Pinned inboxes appear at top of list
- Pin state persists after closing popup

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Storage quota | Pin IDs only (tiny footprint) |
| Orphaned pin IDs | Clean up when inbox deleted |
