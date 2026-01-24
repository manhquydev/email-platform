# Test Report: Chrome Extension

**Date:** 2026-01-20
**Scope:** `services/extension` full test suite

## Test Results Overview
- **Total Tests:** 183
- **Passed:** 183
- **Failed:** 0
- **Skipped:** 0
- **Duration:** 8.41s

## Failed Tests
None.

## Performance Metrics
- **Total Duration:** 8.41s
- **Slowest Tests:**
  - `src/components/popup/Login.test.tsx` (5561ms)
  - `src/components/popup/MessageList.test.tsx` (3169ms)

## Warnings & Issues
- **React Testing Warnings:** Multiple `act(...)` warnings observed in:
  - `src/components/popup/MessageList.test.tsx`
  - `src/components/popup/Settings.test.tsx`

  *Recommendation:* Wrap state updates in `act()` or await asynchronous operations properly to resolve these React warnings.

## Next Steps
- Fix `act(...)` warnings to clean up test output.
- Consider adding end-to-end (E2E) tests if not already covered by `playwright` scripts (not executed in this run).
