# Phase 1: Offline Mode

## Context Links
- [storage.ts](../../services/extension/src/shared/storage.ts)
- [api.ts](../../services/extension/src/shared/api.ts)
- [MessageList.tsx](../../services/extension/src/components/popup/MessageList.tsx)
- [background.ts](../../services/extension/src/entrypoints/background.ts)

## Overview
- **Priority:** Medium
- **Status:** Pending
- **Effort:** 2h

Enable viewing cached messages when offline. Cache-first strategy for message reads.

## Key Insights
- `browser.storage.local` already used - no new storage API needed
- Messages are inbox-scoped: cache key = `messages_${inboxId}`
- Extension popup has no network status awareness currently
- Background script already polls every 1 min - can update cache

## Requirements

### Functional
- Cache messages per inbox in local storage
- Show cached messages when network unavailable
- Display offline indicator when disconnected
- Sync fresh data when back online

### Non-Functional
- Cache size limit: 50 messages per inbox
- Stale cache acceptable for 24h
- No blocking on cache writes

## Architecture

```
[User opens inbox]
       |
       v
[Check navigator.onLine]
       |
  +----+----+
  |         |
Online   Offline
  |         |
  v         v
[Fetch API] [Load Cache]
  |         |
  v         |
[Update Cache]
  |         |
  +----+----+
       |
       v
[Render Messages]
```

## Related Code Files

### Modify
- `services/extension/src/shared/storage.ts` - add message cache methods
- `services/extension/src/shared/api.ts` - add cache-first wrapper
- `services/extension/src/components/popup/MessageList.tsx` - offline UI
- `services/extension/src/entrypoints/background.ts` - sync on reconnect

### Create
- None (add to existing files)

## Implementation Steps

### Step 1: Add cache methods to storage.ts
```typescript
// Add to storage object
getMessageCache: async (inboxId: string) => {
  const key = `messages_${inboxId}`;
  const result = await browser.storage.local.get(key);
  return result[key] || null;
},

setMessageCache: async (inboxId: string, messages: Message[]) => {
  const key = `messages_${inboxId}`;
  const cached = {
    messages: messages.slice(0, 50), // limit
    cachedAt: Date.now()
  };
  await browser.storage.local.set({ [key]: cached });
},

clearMessageCache: async (inboxId: string) => {
  const key = `messages_${inboxId}`;
  await browser.storage.local.remove(key);
}
```

### Step 2: Add cache-first method to api.ts
```typescript
// Add to ApiClient class
async getMessagesWithCache(inboxId: string, limit = 10) {
  const cached = await storage.getMessageCache(inboxId);

  if (!navigator.onLine && cached) {
    return { data: cached.messages, fromCache: true };
  }

  try {
    const response = await this.getMessages(inboxId, limit);
    // Update cache async (don't await)
    storage.setMessageCache(inboxId, response.data);
    return { ...response, fromCache: false };
  } catch (err) {
    if (cached) {
      return { data: cached.messages, fromCache: true };
    }
    throw err;
  }
}
```

### Step 3: Update MessageList.tsx
```typescript
// Add state
const [isOffline, setIsOffline] = useState(!navigator.onLine);
const [fromCache, setFromCache] = useState(false);

// Add effect for online/offline
useEffect(() => {
  const handleOnline = () => setIsOffline(false);
  const handleOffline = () => setIsOffline(true);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Update fetchMessages to use cache-first
const fetchMessages = async () => {
  setLoading(true);
  try {
    const response = await api.getMessagesWithCache(inboxId);
    setMessages(response.data);
    setFromCache(response.fromCache);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load');
  } finally {
    setLoading(false);
  }
};

// Add offline indicator in header
{isOffline && (
  <span className="text-[10px] text-amber-500 font-bold">OFFLINE</span>
)}
```

### Step 4: Add sync-on-reconnect to background.ts
```typescript
// Add at end of defineBackground
self.addEventListener('online', async () => {
  console.log('Back online - syncing data');
  try {
    const dashboard = await api.getDashboard();
    await storage.setInboxes(dashboard.inboxes);
  } catch (e) {
    console.error('Sync failed:', e);
  }
});
```

## Todo List
- [ ] Add `getMessageCache` method to storage.ts
- [ ] Add `setMessageCache` method to storage.ts
- [ ] Add `clearMessageCache` method to storage.ts
- [ ] Add `getMessagesWithCache` to ApiClient
- [ ] Add isOffline state to MessageList
- [ ] Add online/offline event listeners
- [ ] Add offline indicator UI element
- [ ] Add sync-on-reconnect in background.ts
- [ ] Test offline behavior manually

## Success Criteria
- [ ] Messages display when popup opened offline
- [ ] Offline indicator visible when disconnected
- [ ] Fresh data loads when back online
- [ ] Cache updates after successful fetch
- [ ] No errors thrown when offline

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stale data confusion | Medium | Low | Show "cached" indicator |
| Storage quota exceeded | Low | Medium | Limit 50 msgs/inbox |
| Race conditions | Low | Low | Async cache writes |

## Security Considerations
- Cached messages contain email content - already in local storage
- No additional permissions needed
- Clear cache on logout (add to `clearAuth`)
