# Research Report: UX & Performance Optimizations (260117-2310)

## 1. Real-time Fallback Strategy
**Pattern:** WebSocket (Primary) → SSE (Secondary) → Long Polling (Tertiary).
- **Socket.io:** Best choice as it handles negotiation and fallback automatically.
- **Manual Implementation:** Use `Transport` abstraction. Monitor `onClose` and `onError`.
- **Backoff:** Exponential with jitter: `delay = min(max_delay, (2^attempt) * base + random_jitter)`.

## 2. Connection Status UI
**Patterns:**
- **Status Indicator:** Color-coded dot (Green: Connected, Yellow: Reconnecting, Red: Offline).
- **Toast/Banner:** "Connection lost. Retrying in X seconds..." (Use non-blocking overlay).
- **Optimistic UI:** Show sent messages immediately with "Sending..." state; revert on failure.

## 3. N+1 & Prisma Optimization
**Problem:** Sequential `findMany` and `count` calls.
**Solution:** Use `prisma.$transaction([])` to execute both in one database round-trip.
```typescript
const [data, total] = await prisma.$transaction([
  prisma.email.findMany({ where, skip, take }),
  prisma.email.count({ where })
]);
```
*Note: This doesn't reduce DB load, only network latency between App and DB.*

## 4. Cursor-based Pagination
**Vs Offset:**
- **Offset (`skip`):** Slows down as pages increase (O(N) scan). Inconsistent if items added/deleted.
- **Cursor (`cursor`):** Constant time (O(1) with index). Stable.
**Recommendation:** Use Cursor for message lists/feeds. Use Offset only for small admin tables where "Jump to Page X" is required.

## 5. pg_trgm Fuzzy Search
**GIN vs GiST:**
- **GIN:** Faster search, slower updates. Better for static/read-heavy text.
- **GiST:** Faster updates, slightly slower search. Supports "Nearest Neighbor" (<-> operator).
**Implementation (PostgreSQL):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_email_subject_trgm ON "Email" USING GIN (subject gin_trgm_ops);
```
**Prisma Usage:** Use `prisma.$queryRaw` for `%` (similarity) operator as Prisma doesn't natively support trigram operators yet.

## Recommended Approaches
1. **Real-time:** Use Socket.io for built-in fallback/reconnection logic.
2. **Pagination:** Migrate `MessageList` to cursor-based pagination using `id` or `createdAt`.
3. **Search:** Deploy GIN index on `subject` and `body` fields via manual migration.
4. **Queries:** Wrap all list+count operations in `$transaction`.

## Sources
- [Prisma Pagination Docs](https://www.prisma.io/docs/concepts/components/prisma-client/pagination)
- [PostgreSQL pg_trgm docs](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Socket.io Internal Architecture](https://socket.io/docs/v4/how-it-works/)

## Unresolved Questions
- Should we implement custom SSE fallback if the user forbids Socket.io due to bundle size?
- Is there a specific latency threshold where we should force-trigger a fallback to polling?
