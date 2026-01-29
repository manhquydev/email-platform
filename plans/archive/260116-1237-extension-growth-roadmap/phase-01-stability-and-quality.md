# Phase 1: Stability & Quality

**Priority:** P0 | **Effort:** 12h | **Status:** Pending

## Overview

Foundation phase addressing critical gaps from audits. Focus on error resilience, accessibility compliance, and testing infrastructure. Must complete before adding new features.

## Requirements

### Error Handling (4h)
- [ ] Add React ErrorBoundary wrapper to popup and sidepanel entrypoints
- [ ] Implement retry logic with exponential backoff in `shared/api.ts`
- [ ] Replace `window.confirm` with styled confirmation modal
- [ ] Add error recovery buttons to error states

### Accessibility (4h)
- [ ] Add `aria-label` to all icon-only buttons (refresh, copy, delete, toggle)
- [ ] Implement keyboard navigation with `role="listbox"` in InboxList
- [ ] Add focus trap to content script dropdown
- [ ] Ensure 4.5:1 contrast ratio for slate-400 text
- [ ] Add `prefers-reduced-motion` media query check

### Testing Infrastructure (3h)
- [ ] Configure Vitest for extension testing
- [ ] Write unit tests for critical utilities: `normalizeInbox`, `formatTimeLeft`, `storage`
- [ ] Add integration tests for API client
- [ ] Target: 60% coverage on `shared/` directory

### Quick Fixes (1h)
- [ ] Replace `Math.random()` device ID with `crypto.randomUUID()`
- [ ] Fix deprecated `addListener` in ui-injector.ts
- [ ] Add debounce to refresh buttons (300ms)
- [ ] Extract magic numbers to constants file

## Implementation Steps

1. Create `components/ErrorBoundary.tsx` with fallback UI
2. Wrap `<App />` in both `popup/main.tsx` and `sidepanel/main.tsx`
3. Add retry wrapper to `apiClient.get()` with 3 attempts, 1s/2s/4s backoff
4. Create `components/ConfirmModal.tsx` to replace native confirm
5. Audit all `<button>` elements, add missing aria-labels
6. Add `tabIndex` and `onKeyDown` handlers to InboxList cards
7. Setup Vitest config in `vitest.config.ts`
8. Write test files in `__tests__/` directory

## Success Criteria

- [ ] No unhandled React errors crash UI (ErrorBoundary catches all)
- [ ] All interactive elements keyboard-accessible
- [ ] Accessibility score >= 85/100 (from 62)
- [ ] Test coverage >= 60% on shared utilities
- [ ] Zero `Math.random()` usage for security-sensitive IDs

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ErrorBoundary hides real bugs | Medium | Medium | Log errors to console, show report button |
| Keyboard nav breaks mouse UX | Low | Medium | Test both input methods thoroughly |
| Vitest config conflicts with WXT | Low | Low | Follow WXT testing docs |

## Dependencies

- None (internal improvements only)

## Deliverables

- `components/ErrorBoundary.tsx`
- `components/ConfirmModal.tsx`
- `shared/constants.ts`
- `vitest.config.ts`
- `__tests__/*.test.ts` files
