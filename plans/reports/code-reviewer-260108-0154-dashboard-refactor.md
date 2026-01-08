# Code Review: Dashboard.tsx

**File:** `services/web/src/pages/Dashboard.tsx`
**Lines:** 797 (violates 200-line limit by 4x)
**Date:** 2026-01-08

## Critical Issues

1. **File size violation** - 797 lines vs 200 max; requires immediate splitting

## High Priority

1. **State explosion** - 18+ useState hooks creating complex state management
2. **Missing memoization** - No useMemo/useCallback for derived values (activeDomain, activeInbox recalc every render)
3. **Duplicate Sidebar render** - Lines 359-375 and 730-749 repeat identical props (DRY violation)
4. **Missing useEffect deps** - Line 56 missing `selectedInbox`, `messageSearch` in dependency array

## Medium Priority

1. **Inline SVG icons** - ~15 inline SVGs should extract to Icon components
2. **IIFE in JSX** - Line 595-619 OTP extraction runs every render; extract to useMemo
3. **Large JSX blocks** - Detail pane (509-699) should be `<MessageDetailPane>` component
4. **No error boundaries** - Single error crashes entire dashboard

## Low Priority

1. **Magic numbers** - `10000` (polling), `500` (debounce), `10 * 60 * 1000` (extend time)
2. **Vietnamese strings** - Hardcoded; should use i18n

## Recommended Refactoring

### Extract Components (~5 new files)
```
components/
  MessageListPane.tsx     # Lines 378-507 (~130 lines)
  MessageDetailPane.tsx   # Lines 509-699 (~190 lines)
  MobileSidebar.tsx       # Lines 701-753 (~50 lines)
  OTPHighlight.tsx        # Lines 595-619 (~25 lines)
  AttachmentList.tsx      # Lines 639-667 (~30 lines)
```

### Extract Custom Hooks (~3 new files)
```
hooks/
  useDashboardData.ts     # loadDomains, loadInboxes, loadMessages + state
  useMessageActions.ts    # handleSelectMessage, handleMarkUnread, handleDelete, handleTogglePin
  useUrlSync.ts           # URL param sync logic (lines 33-56)
```

### Create Shared Props Interface
```ts
interface SidebarProps { domains, inboxes, selectedDomainId, ... }
// Reuse for desktop and mobile sidebar
```

## Quick Wins

1. Extract `POLLING_INTERVAL = 10000`, `DEBOUNCE_MS = 500` constants
2. Memoize: `const activeDomain = useMemo(() => domains.find(...), [domains, selectedDomain])`
3. Create `<SidebarWithProps sidebar={sidebarProps} />` wrapper to eliminate duplication

## Metrics

- Estimated refactored Dashboard.tsx: ~150 lines
- New files needed: 8 (5 components + 3 hooks)
- Complexity reduction: High
