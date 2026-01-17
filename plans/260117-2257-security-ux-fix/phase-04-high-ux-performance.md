# Phase 4: High Priority UX/Performance

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Research:** [UX Performance](./research/researcher-02-ux-performance.md)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Effort | 8h |
| Status | Pending |
| Dependencies | Phase 2 |

Fix 8 high-priority UX and performance issues.

## Issues Addressed

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | Fuzzy search missing indexes | messages.ts | 2-5s query time |
| 2 | Offset pagination slow | messages.ts, Dashboard.tsx | Degrades at 500+ items |
| 3 | Mobile touch targets 24px | MessageList.tsx | Misclicks, accessibility fail |
| 4 | iPhone safe area | Dashboard.tsx | Content hidden under notch |
| 5 | SSE no reconnection | realtime-sse.ts | Manual refresh needed |
| 6 | No query caching | messages.ts | Wasted DB load |
| 7 | Search debounce 500ms | Dashboard.tsx | Excess API calls |
| 8 | No loading state for realtime | Dashboard.tsx | Confusing flash |

## Implementation Steps

### 1. pg_trgm GIN Indexes (1h)

```sql
-- Migration: add_fuzzy_search_indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_message_subject_trgm
  ON "Message" USING GIN (subject gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_message_textbody_trgm
  ON "Message" USING GIN ("textBody" gin_trgm_ops);

-- Composite index for cursor pagination
CREATE INDEX CONCURRENTLY idx_message_cursor
  ON "Message" ("inboxId", "receivedAt" DESC, id);
```

**Prisma migration:**
```bash
npx prisma migrate dev --name add_fuzzy_search_indexes
```

### 2. Cursor-based Pagination (2h)

```typescript
// messages.ts - Add cursor pagination
app.get('/inboxes/:id/messages', async (req, reply) => {
  const { cursor, limit = 50 } = req.query;

  const messages = await prisma.message.findMany({
    where: { inboxId: req.params.id, deletedAt: null },
    take: limit + 1, // Fetch one extra to check hasMore
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { receivedAt: 'desc' },
  });

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
});
```

**Frontend update:**
```tsx
// Dashboard.tsx
const loadMoreMessages = async () => {
  const response = await api(`/inboxes/${id}/messages?cursor=${lastCursor}`);
  setMessages(prev => [...prev, ...response.data]);
  setLastCursor(response.nextCursor);
  setHasMore(response.hasMore);
};
```

### 3. Mobile Touch Targets (1h)

```tsx
// MessageList.tsx - Increase button sizes
// BEFORE
<button className="p-1.5 rounded hover:bg-bg">
  <svg className="w-4 h-4" />
</button>

// AFTER - 44px minimum (p-2.5 + w-6 = ~44px)
<button className="p-2.5 rounded hover:bg-bg min-w-[44px] min-h-[44px] flex items-center justify-center">
  <svg className="w-5 h-5" />
</button>
```

### 4. iPhone Safe Area (30min)

```tsx
// Dashboard.tsx - Add safe area padding
<div className="flex flex-col h-full pb-safe-area-inset-bottom">
  {/* content */}
</div>

// index.html - Add viewport meta
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
/* index.css */
.pb-safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.pt-safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}
```

### 5. SSE Reconnection (1h)

```typescript
// useRealtimeSubscription.ts
const connectSSE = () => {
  const sse = new EventSource(url);
  let retries = 0;

  sse.onerror = () => {
    sse.close();
    if (retries < 5) {
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      setTimeout(connectSSE, delay);
    } else {
      startPolling();
    }
  };

  sse.onopen = () => {
    retries = 0;
  };
};
```

### 6. Redis Query Caching (1.5h)

```typescript
// services/api/src/utils/cache.ts
export async function cachedQuery<T>(
  key: string,
  ttlSeconds: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await queryFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
  return result;
}

// messages.ts - Cache search results
const cacheKey = `search:${inboxId}:${q}:${limit}`;
const messages = await cachedQuery(cacheKey, 60, () =>
  prisma.$queryRaw`...fuzzy search...`
);
```

### 7. Search Debounce 800ms (30min)

```tsx
// Dashboard.tsx
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    loadMessages(selectedInbox, { search: query });
  }, 800), // Was 500ms
  [selectedInbox]
);
```

### 8. Realtime Loading State (30min)

```tsx
// Dashboard.tsx
const [isRealtimeUpdating, setIsRealtimeUpdating] = useState(false);

const handleNewMessage = (msg) => {
  setIsRealtimeUpdating(true);
  setMessages(prev => [msg, ...prev]);
  setTimeout(() => setIsRealtimeUpdating(false), 300);
};

// In render
{isRealtimeUpdating && (
  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
)}
```

## Todo List

- [ ] Create Prisma migration for pg_trgm indexes
- [ ] Implement cursor pagination in API
- [ ] Update Dashboard to use cursor pagination
- [ ] Increase touch targets to 44px
- [ ] Add safe area CSS utilities
- [ ] Update viewport meta tag
- [ ] Add SSE reconnection with backoff
- [ ] Implement Redis cache utility
- [ ] Cache fuzzy search results
- [ ] Increase debounce to 800ms
- [ ] Add realtime update indicator

## Success Criteria

- [ ] Fuzzy search < 500ms for 10k messages
- [ ] "Load more" works instantly at 1000+ messages
- [ ] Touch targets pass WCAG 2.5.5 (44px)
- [ ] No content under iPhone notch
- [ ] SSE auto-reconnects on network drop
- [ ] Repeated searches hit cache
- [ ] No search while typing
- [ ] Visual feedback on new messages

## Next Steps
- Phase 5: Medium priority fixes
