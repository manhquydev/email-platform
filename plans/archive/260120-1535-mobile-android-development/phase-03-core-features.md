# Phase 3: Core Features (Inbox/Messages)

## Priority: P0 (Critical)
## Effort: 8h
## Status: pending

## Context Links
- Research: `./research-expo-rn-android.md`
- Existing screens: `app/(tabs)/inboxes.tsx`, `app/message/[id].tsx`
- API routes: `services/api/src/routes/inboxes.ts`, `messages.ts`

## Overview
Hoàn thiện core email features: inbox list, message view, swipe actions, search.

## Key Insights
- FlashList cho performance tốt hơn FlatList
- react-native-render-html đã có cho HTML body
- Cần swipe gestures cho quick actions

## Requirements

### Functional
- View inbox list với unread count
- View message detail với HTML/plain text
- Swipe to delete/mark read
- Pull to refresh
- Search messages
- View/download attachments

### Non-functional
- Smooth scrolling (60fps)
- < 100ms list render

## Implementation Steps

### 3.1 Enhance Inbox List (2h)

```typescript
// app/(tabs)/inboxes.tsx
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';

export default function InboxesScreen() {
  // Add search state
  const [searchQuery, setSearchQuery] = useState('');

  // Use optimistic updates
  const { optimisticDelete } = useOptimisticUpdates();

  return (
    <FlashList
      data={filteredInboxes}
      renderItem={({ item }) => (
        <SwipeableInboxCard
          inbox={item}
          onDelete={() => optimisticDelete(item.id)}
        />
      )}
      estimatedItemSize={72}
      ListHeaderComponent={<SearchBar value={searchQuery} onChange={setSearchQuery} />}
    />
  );
}
```

### 3.2 Create SwipeableInboxCard (1.5h)
```typescript
// src/components/SwipeableInboxCard.tsx
- Left swipe: Delete (red background)
- Right swipe: Mark read/unread (blue background)
- Haptic feedback on action
```

### 3.3 Message List Screen (1.5h)
```typescript
// app/inbox/[id].tsx
- List messages in inbox
- Sort by date (newest first)
- Show unread indicator
- Tap to view detail
```

### 3.4 Enhance Message Detail (1.5h)
```typescript
// app/message/[id].tsx
- Auto mark as read on view
- HTML rendering with sanitization
- Attachment list with download
- Delete action in header
```

### 3.5 Attachment Handling (1h)
```typescript
// src/utils/attachments.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function downloadAttachment(id: string, filename: string) {
  const uri = `${API_URL}/attachments/${id}/download`;
  const fileUri = FileSystem.documentDirectory + filename;

  await FileSystem.downloadAsync(uri, fileUri, {
    headers: { Authorization: `Bearer ${token}` }
  });

  await Sharing.shareAsync(fileUri);
}
```

### 3.6 Search Implementation (0.5h)
```typescript
// Debounced search với TanStack Query
const { data: searchResults } = useQuery({
  queryKey: ['messages', 'search', debouncedQuery],
  queryFn: () => messagesApi.search(debouncedQuery),
  enabled: debouncedQuery.length >= 2,
});
```

## Todo List
- [ ] Migrate inbox list to FlashList
- [ ] Create SwipeableInboxCard component
- [ ] Implement message list screen
- [ ] Enhance message detail with attachments
- [ ] Add attachment download/share
- [ ] Implement search with debounce

## Success Criteria
- [ ] Inbox scrolls at 60fps with 100+ items
- [ ] Swipe actions work smoothly
- [ ] Attachments download and share
- [ ] Search returns results in < 500ms

## Files to Create/Modify
- `app/(tabs)/inboxes.tsx` (modify)
- `app/inbox/[id].tsx` (modify)
- `app/message/[id].tsx` (modify)
- `src/components/SwipeableInboxCard.tsx` (new)
- `src/components/SearchBar.tsx` (new)
- `src/utils/attachments.ts` (new)
