# Prompt Template: Performance Optimization

## Usage
Use when investigating and fixing performance issues.

---

## Template

```
# Optimize: [Component/Feature Name]

## Performance Issue
- What's slow: [describe slow operation]
- Current latency: [e.g., "2-3 seconds" or "p99: 5s"]
- Target latency: [e.g., "< 500ms" or "p99: < 1s"]
- Impact: [users affected, frequency]

## Metrics/Evidence
```
[Paste metrics, traces, or profiling data]
```

## Suspected Causes
1. [Most likely cause]
2. [Second possibility]
3. [Third possibility]

## Current Implementation
- File(s): [path/to/files]
- Key operations: [database queries, external calls, etc.]

## Constraints
- No breaking changes
- Maintain correctness over speed
- Solution must be production-safe
- Consider memory/CPU tradeoffs

## Request
1. Profile and identify bottleneck
2. Propose optimization with benchmarks
3. Implement with before/after metrics
4. Document any tradeoffs

## Optimization Types to Consider
- [ ] Database query optimization (indexes, N+1)
- [ ] Caching (Redis, in-memory)
- [ ] Pagination improvements
- [ ] Async/parallel processing
- [ ] Algorithm improvements
```

---

## Example Usage

```
# Optimize: Message Search Endpoint

## Performance Issue
- What's slow: GET /messages/search with fuzzy matching
- Current latency: 2-5 seconds for users with >500 messages
- Target latency: < 500ms for any user
- Impact: All users, every search request

## Metrics/Evidence
```
2026-01-07T14:30:00Z [INFO] GET /messages/search completed
  duration: 4523ms
  query: { q: "invoice", inboxId: "abc123" }
  messagesScanned: 847
  resultsReturned: 23
```

## Suspected Causes
1. Full table scan for LIKE queries without proper index
2. Loading full message content when only subject/preview needed
3. No result caching for repeated searches

## Current Implementation
- File(s): services/api/src/routes/messages.ts
- Key operations:
  - prisma.message.findMany with ILIKE on subject/body
  - Full message select including htmlBody

## Constraints
- No breaking changes to API response format
- Maintain fuzzy search capability
- Solution must work with PostgreSQL

## Request
1. Profile query execution plan
2. Consider: PostgreSQL full-text search (tsvector)
3. Implement with before/after benchmarks
4. Add index migration if needed

## Optimization Types to Consider
- [x] Database query optimization (add GIN index for full-text)
- [x] Caching (cache common searches in Redis)
- [ ] Pagination improvements (already paginated)
- [ ] Select only needed columns
```
