---
phase: 4
title: "Refactor EphemeralInbox Page"
status: pending
priority: P2
effort: 1h
---

# Phase 04: Refactor EphemeralInbox Page

## Context Links
- [Phase 01](./phase-01-extract-ephemeral-hook.md) - useEphemeralInbox hook
- [EphemeralInbox.tsx](../../services/web/src/pages/EphemeralInbox.tsx) - target file

## Overview
Refactor standalone `/e/:token` page to use extracted hook, reducing code duplication.

## Key Insights
- Current page: ~245 lines with embedded state logic
- After refactor: ~80 lines focused on UI
- Must maintain all existing functionality
- Vietnamese UI text preserved

## Requirements

### Functional
- All existing features work: create, view, extend, poll
- URL routing unchanged
- Error states preserved
- Loading states preserved

### Non-Functional
- Significant code reduction
- Cleaner separation of concerns

## Architecture

```
EphemeralInbox.tsx (refactored)
├── useParams() → token
├── useEphemeralInbox({ token, autoCreate: !token })
├── UI States: loading | error | main
└── Components: EphemeralHeader, EphemeralMessageList (unchanged)
```

## Related Code Files

### Modify
- `services/web/src/pages/EphemeralInbox.tsx`

### No Changes
- `ephemeral-inbox-modules/ephemeral-header.tsx`
- `ephemeral-inbox-modules/ephemeral-message-list.tsx`

## Implementation Steps

1. Import hook:
   ```typescript
   import { useEphemeralInbox } from '../hooks/useEphemeralInbox';
   ```
2. Replace state declarations with hook:
   ```typescript
   const { token: urlToken } = useParams<{ token?: string }>();
   const {
     inbox, messages, isLoading, isCreating, isExtending, error,
     lastRefresh, createInbox, extendInbox, token
   } = useEphemeralInbox({
     token: urlToken,
     autoCreate: !urlToken,
     persistKey: 'ephemeral_page_token'
   });
   ```
3. Remove duplicate state:
   - Delete useState for inbox, messages, isLoading, etc.
   - Delete useCallback for fetchInbox, fetchMessages, createInbox
   - Delete useEffect for initial load and polling
4. Update navigate on create:
   - Hook's createInbox should return token
   - Component navigates: `navigate(\`/e/${token}\`, { replace: true })`
5. Verify handleExtend works with hook's extendInbox
6. Keep all JSX rendering logic (loading, error, main views)
7. Test all scenarios:
   - Direct visit to `/e` (auto-create)
   - Direct visit to `/e/:token` (load existing)
   - Extend button
   - Message polling
   - Expired inbox

## Todo List
- [ ] Import useEphemeralInbox hook
- [ ] Replace state with hook usage
- [ ] Remove duplicate callbacks
- [ ] Remove duplicate effects
- [ ] Update navigation after create
- [ ] Verify extend functionality
- [ ] Test auto-create flow
- [ ] Test existing token flow
- [ ] Test expired inbox handling
- [ ] Verify no regressions

## Success Criteria
- All existing functionality preserved
- Code reduced from ~245 to ~80 lines
- No TypeScript errors
- All test scenarios pass

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Regression in create flow | Manual test before/after |
| Polling stops working | Verify visibility listener |
| Error handling differs | Compare error states |

## Security Considerations
- No changes to security model

## Next Steps
- Phase 05: Final styling and polish
