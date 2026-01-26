---
phase: 1
title: "Extract useEphemeralInbox Hook"
status: pending
priority: P1
effort: 1h
---

# Phase 01: Extract useEphemeralInbox Hook

## Context Links
- [EphemeralInbox.tsx](../../services/web/src/pages/EphemeralInbox.tsx) - source logic
- [ephemeralService.ts](../../services/web/src/services/ephemeralService.ts) - API layer

## Overview
Extract reusable hook from `EphemeralInbox.tsx` to enable shared logic between homepage widget and standalone page.

## Key Insights
- Current page has ~100 lines of state/effect logic tightly coupled to component
- Hook must handle: create, fetch, extend, poll, localStorage persistence
- Polling should pause when tab hidden (already implemented, preserve behavior)

## Requirements

### Functional
- Create inbox (auto or manual trigger)
- Fetch existing inbox by token
- Extend expiry
- Poll messages at 10s interval
- Persist/restore token from localStorage

### Non-Functional
- No breaking changes to existing page
- Type-safe with existing interfaces

## Architecture

```
useEphemeralInbox(options?)
  ├── State: inbox, messages, loading, error
  ├── Actions: createInbox, refreshMessages, extendInbox
  └── Effects: polling, visibility, localStorage sync
```

## Related Code Files

### Create
- `services/web/src/hooks/useEphemeralInbox.ts`

### Modify
- None in this phase (refactor in Phase 04)

## Implementation Steps

1. Create `services/web/src/hooks/useEphemeralInbox.ts`
2. Define hook options interface:
   ```typescript
   interface UseEphemeralInboxOptions {
     token?: string;           // Existing token to load
     autoCreate?: boolean;     // Auto-create on mount if no token
     pollInterval?: number;    // Default 10000ms
     persistKey?: string;      // localStorage key, default 'ephemeral_token'
   }
   ```
3. Extract state: `inbox`, `messages`, `isLoading`, `isCreating`, `isExtending`, `error`, `lastRefresh`
4. Extract callbacks: `createInbox`, `fetchInbox`, `fetchMessages`, `handleExtend`
5. Implement localStorage sync:
   - On successful create: save token
   - On mount with `autoCreate`: check localStorage first
   - On inbox expired/not found: clear localStorage
6. Return object:
   ```typescript
   return {
     inbox, messages, isLoading, isCreating, isExtending, error, lastRefresh,
     createInbox, refreshMessages: () => fetchMessages(token), extendInbox: handleExtend,
     token: inbox?.token
   };
   ```
7. Add barrel export in `services/web/src/hooks/index.ts`

## Todo List
- [ ] Create useEphemeralInbox.ts file
- [ ] Define options interface
- [ ] Extract state management logic
- [ ] Implement localStorage persistence
- [ ] Add visibility-based polling pause
- [ ] Export from hooks/index.ts
- [ ] Verify TypeScript compiles

## Success Criteria
- Hook compiles without errors
- Can be imported and used independently
- localStorage persistence works (manual test)

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Breaking existing page | Phase 04 does refactor separately |
| Race conditions on create | Use `isCreating` guard |

## Security Considerations
- Token stored in localStorage (acceptable for ephemeral, short-lived)
- No PII stored

## Next Steps
- Phase 02: Create HeroInboxWidget using this hook
