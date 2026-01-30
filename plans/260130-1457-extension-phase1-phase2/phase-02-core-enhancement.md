---
title: "Phase 2: Core Enhancement"
status: pending
priority: P2
effort: 10h
---

# Phase 2: Core Enhancement

## Context Links

- [Extension Source](../../services/extension/src/)
- [API Client](../../services/extension/src/shared/api.ts)
- [MessageList Component](../../services/extension/src/components/popup/MessageList.tsx)
- [InboxList Component](../../services/extension/src/components/popup/InboxList.tsx)
- [Outbound API](../../services/api/src/routes/outbound.ts)
- [Storage Module](../../services/extension/src/shared/storage.ts)

## Overview

Core feature enhancements: email reply/forward, global search across inboxes, pinned inboxes, and message preview tooltips.

## Key Insights

- Outbound email API exists at `/outbound` routes (reply, forward support)
- Search endpoint exists: `GET /messages/search`
- Storage already syncs inboxes - can add `pinnedInboxIds` array
- React 18 with Zustand for state management

---

## Feature 1: Email Reply/Forward

### Requirements

- Reply button in message view
- Forward button in message view
- Compose modal with To, Subject, Body fields
- Use existing outbound API endpoints
- Show sending status and confirmation

### Architecture

```
MessageList.tsx (view mode)
        │
        ├──► Reply button → ComposeModal (reply mode)
        │
        └──► Forward button → ComposeModal (forward mode)
                    │
                    ▼
            api.sendReply() / api.forwardMessage()
                    │
                    ▼
            POST /outbound/reply or /outbound/forward
```

### Related Code Files

**Create:**
- `src/components/shared/ComposeModal.tsx` - Compose/reply/forward modal
- `src/hooks/useCompose.ts` - Compose state management

**Modify:**
- `src/shared/api.ts` - Add reply/forward methods
- `src/shared/types.ts` - Add compose types
- `src/components/popup/MessageList.tsx` - Add reply/forward buttons
- `src/shared/i18n.ts` - Add compose message keys

### Implementation Steps

1. **Add API methods** to `api.ts`:
   ```typescript
   async sendReply(messageId: string, body: { content: string }) {
     return this.request('/outbound/reply', {
       method: 'POST',
       body: JSON.stringify({ originalMessageId: messageId, ...body })
     });
   }

   async forwardMessage(messageId: string, body: { to: string; content?: string }) {
     return this.request('/outbound/forward', {
       method: 'POST',
       body: JSON.stringify({ originalMessageId: messageId, ...body })
     });
   }
   ```

2. **Create ComposeModal.tsx** (~120 lines):
   ```typescript
   interface ComposeModalProps {
     isOpen: boolean;
     onClose: () => void;
     mode: 'reply' | 'forward';
     originalMessage: Message;
     onSend: (data: ComposeData) => Promise<void>;
   }
   // Modal with form fields, loading state, error handling
   ```

3. **Create useCompose.ts** hook (~50 lines):
   ```typescript
   export function useCompose() {
     const [isOpen, setIsOpen] = useState(false);
     const [mode, setMode] = useState<'reply' | 'forward'>('reply');
     const [sending, setSending] = useState(false);
     // Handle send logic with API calls
     return { isOpen, mode, openReply, openForward, send, close };
   }
   ```

4. **Update MessageList.tsx** - Add buttons to message detail view:
   ```typescript
   // In selectedMessage view, add action buttons
   <div className="flex gap-2 mt-4">
     <button onClick={() => openReply(selectedMessage)}>
       <Reply className="w-4 h-4" /> {t('reply')}
     </button>
     <button onClick={() => openForward(selectedMessage)}>
       <Forward className="w-4 h-4" /> {t('forward')}
     </button>
   </div>
   ```

5. **Add i18n keys**: `reply`, `forward`, `sendMessage`, `sending`, `messageSent`, `to`, `composeBody`

### Todo List

- [ ] Add reply/forward methods to `api.ts`
- [ ] Add compose types to `types.ts`
- [ ] Create `ComposeModal.tsx` component
- [ ] Create `useCompose.ts` hook
- [ ] Add reply/forward buttons to `MessageList.tsx`
- [ ] Add i18n translations (EN/VI)
- [ ] Handle API errors gracefully
- [ ] Write unit tests for compose logic

---

## Feature 2: Global Search

### Requirements

- Search input in main view (above inbox list)
- Search across all inboxes and messages
- Display results grouped by inbox
- Debounced search (300ms)
- Clear search button

### Architecture

```
SearchInput (global)
        │
        ▼
  useGlobalSearch hook
        │
        ├──► Debounce 300ms
        │
        └──► GET /messages/search?q={query}
                    │
                    ▼
            GlobalSearchResults.tsx
```

### Related Code Files

**Create:**
- `src/components/shared/GlobalSearchResults.tsx` - Search results display
- `src/hooks/useGlobalSearch.ts` - Search state and API calls

**Modify:**
- `src/shared/api.ts` - Add search method
- `src/entrypoints/sidepanel/App.tsx` - Add global search UI
- `src/shared/types.ts` - Add search result types

### Implementation Steps

1. **Add API method** to `api.ts`:
   ```typescript
   async searchMessages(query: string, limit = 20) {
     return this.request<{ data: Message[]; total: number }>(
       `/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`
     );
   }
   ```

2. **Create useGlobalSearch.ts** (~60 lines):
   ```typescript
   export function useGlobalSearch() {
     const [query, setQuery] = useState('');
     const [results, setResults] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);

     // Debounced search effect
     useEffect(() => {
       const timer = setTimeout(async () => {
         if (query.length >= 2) {
           setLoading(true);
           const response = await api.searchMessages(query);
           setResults(response.data);
           setLoading(false);
         }
       }, 300);
       return () => clearTimeout(timer);
     }, [query]);

     return { query, setQuery, results, loading, clear };
   }
   ```

3. **Create GlobalSearchResults.tsx** (~80 lines):
   ```typescript
   interface GlobalSearchResultsProps {
     results: Message[];
     loading: boolean;
     onSelectMessage: (msg: Message) => void;
   }
   // Grouped by inbox, clickable items, loading skeleton
   ```

4. **Update sidepanel/App.tsx** - Add search to home view:
   ```typescript
   const { query, setQuery, results, loading, clear } = useGlobalSearch();

   // In home view, add search above InboxList
   <SearchInput
     value={query}
     onChange={setQuery}
     placeholder={t('searchAllMessages')}
   />
   {query && <GlobalSearchResults results={results} loading={loading} />}
   ```

5. **Add i18n keys**: `searchAllMessages`, `noSearchResults`, `searchResultsCount`

### Todo List

- [ ] Add search method to `api.ts`
- [ ] Add search result types to `types.ts`
- [ ] Create `useGlobalSearch.ts` hook
- [ ] Create `GlobalSearchResults.tsx` component
- [ ] Integrate in sidepanel App
- [ ] Add i18n translations (EN/VI)
- [ ] Add keyboard navigation for results
- [ ] Write unit tests for search hook

---

## Feature 3: Pinned Inboxes

### Requirements

- Pin icon on each inbox item
- Pinned inboxes appear at top of list
- Persist pinned state across sessions
- Maximum 5 pinned inboxes
- Visual distinction for pinned items

### Architecture

Store `pinnedInboxIds: string[]` in chrome.storage.local. Sort inboxes with pinned first.

### Related Code Files

**Modify:**
- `src/shared/storage.ts` - Add pinned inbox helpers
- `src/shared/types.ts` - Update StorageData type
- `src/components/popup/InboxList.tsx` - Add pin/unpin logic and UI

### Implementation Steps

1. **Update types.ts**:
   ```typescript
   export interface StorageData {
     // ...existing
     pinnedInboxIds: string[];
   }
   ```

2. **Add storage helpers** to `storage.ts`:
   ```typescript
   getPinnedInboxIds: async () => {
     const ids = await storage.get('pinnedInboxIds');
     return ids || [];
   },

   togglePinned: async (inboxId: string) => {
     const current = await storage.getPinnedInboxIds();
     const isPinned = current.includes(inboxId);

     if (isPinned) {
       await storage.set('pinnedInboxIds', current.filter(id => id !== inboxId));
     } else if (current.length < 5) {
       await storage.set('pinnedInboxIds', [...current, inboxId]);
     }
   }
   ```

3. **Update InboxList.tsx** (~40 lines addition):
   ```typescript
   const [pinnedIds, setPinnedIds] = useState<string[]>([]);

   useEffect(() => {
     storage.getPinnedInboxIds().then(setPinnedIds);
   }, []);

   const sortedInboxes = useMemo(() => {
     const pinned = inboxes.filter(i => pinnedIds.includes(i.id));
     const unpinned = inboxes.filter(i => !pinnedIds.includes(i.id));
     return [...pinned, ...unpinned];
   }, [inboxes, pinnedIds]);

   const handleTogglePin = async (inboxId: string) => {
     await storage.togglePinned(inboxId);
     const updated = await storage.getPinnedInboxIds();
     setPinnedIds(updated);
   };

   // Add pin button in inbox item
   <button onClick={() => handleTogglePin(inbox.id)}>
     <Pin className={cn("w-3.5 h-3.5", pinnedIds.includes(inbox.id) && "fill-current text-amber-500")} />
   </button>
   ```

4. **Add i18n keys**: `pinInbox`, `unpinInbox`, `pinnedInboxes`

### Todo List

- [ ] Update `types.ts` with pinnedInboxIds
- [ ] Add pin helpers to `storage.ts`
- [ ] Add pin/unpin UI to `InboxList.tsx`
- [ ] Sort inboxes with pinned first
- [ ] Add visual distinction (icon, background)
- [ ] Limit to 5 pinned max
- [ ] Add i18n translations (EN/VI)
- [ ] Write unit tests for pin logic

---

## Feature 4: Message Preview Tooltip

### Requirements

- Hover over inbox item → Show tooltip with latest message preview
- Show: sender, subject, first 100 chars of body
- Delay 500ms before showing
- Dismiss on mouse leave

### Architecture

Use CSS hover + delayed tooltip or lightweight React tooltip component.

### Related Code Files

**Create:**
- `src/components/shared/MessagePreviewTooltip.tsx` - Tooltip component

**Modify:**
- `src/components/popup/InboxList.tsx` - Add tooltip triggers
- `src/shared/api.ts` - Add fetch latest message method (if needed)

### Implementation Steps

1. **Create MessagePreviewTooltip.tsx** (~70 lines):
   ```typescript
   interface MessagePreviewTooltipProps {
     inboxId: string;
     children: React.ReactNode;
   }

   export default function MessagePreviewTooltip({ inboxId, children }: Props) {
     const [show, setShow] = useState(false);
     const [message, setMessage] = useState<Message | null>(null);
     const timeoutRef = useRef<number>();

     const handleMouseEnter = () => {
       timeoutRef.current = setTimeout(async () => {
         const response = await api.getMessages(inboxId, 1);
         if (response.data[0]) {
           setMessage(response.data[0]);
           setShow(true);
         }
       }, 500);
     };

     const handleMouseLeave = () => {
       clearTimeout(timeoutRef.current);
       setShow(false);
     };

     return (
       <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
         {children}
         {show && message && (
           <div className="absolute z-50 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-3 w-64">
             <p className="font-bold text-xs truncate">{message.from}</p>
             <p className="text-xs text-slate-600 truncate">{message.subject}</p>
             <p className="text-xs text-slate-400 line-clamp-2">{message.textBody?.slice(0, 100)}</p>
           </div>
         )}
       </div>
     );
   }
   ```

2. **Update InboxList.tsx** - Wrap inbox items:
   ```typescript
   <MessagePreviewTooltip inboxId={inbox.id}>
     <div className="card-material group p-3.5">
       {/* existing inbox item content */}
     </div>
   </MessagePreviewTooltip>
   ```

3. **Add caching** - Cache fetched messages to avoid repeated API calls

4. **Add i18n keys**: `noMessages`, `loadingPreview`

### Todo List

- [ ] Create `MessagePreviewTooltip.tsx` component
- [ ] Add hover delay logic (500ms)
- [ ] Integrate in `InboxList.tsx`
- [ ] Cache fetched message previews
- [ ] Style tooltip with dark mode support
- [ ] Add i18n translations (EN/VI)
- [ ] Test tooltip positioning edge cases

---

## Success Criteria

- [ ] Reply button sends reply via API
- [ ] Forward button opens compose with recipients
- [ ] Global search returns results across all inboxes
- [ ] Pinned inboxes persist and appear at top
- [ ] Hovering inbox shows message preview tooltip
- [ ] All features have EN/VI translations
- [ ] Unit tests pass for all new hooks/utilities
- [ ] E2E tests for reply/forward flow

## Security Considerations

- Reply/forward content sanitized before sending
- Search queries URL-encoded
- Message preview respects inbox access permissions
- No sensitive data logged

## Testing Strategy

**Unit Tests:**
- `useCompose.test.ts` - Compose state management
- `useGlobalSearch.test.ts` - Debounce and result handling
- `storage.test.ts` - Pin/unpin logic

**E2E Tests:**
- Reply to message flow
- Forward message flow
- Global search with results
- Pin/unpin inbox persistence

## Next Steps

After completing Phase 2:
1. Run full test suite
2. Update extension version in `package.json`
3. Build for Chrome and Firefox
4. Submit to extension stores
