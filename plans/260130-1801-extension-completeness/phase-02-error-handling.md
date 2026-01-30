# Phase 2: Error Handling

## Context
- [Parent Plan](./plan.md)
- `ErrorBoundary.tsx` exists but not wrapped in `App.tsx`
- Uses i18n keys: `errorBoundary_title`, `errorBoundary_message` (added in Phase 1)

## Overview
| Field | Value |
|-------|-------|
| Priority | High |
| Status | ⬜ Pending |
| Effort | 15min |
| Depends on | Phase 1 (i18n keys) |

## Current State

**ErrorBoundary.tsx** (already implemented):
- Class component with `getDerivedStateFromError`
- Displays error UI with retry button
- Uses `t('errorBoundary_title')` and `t('errorBoundary_message')`

**App.tsx** (needs update):
- No ErrorBoundary wrapper
- Crashes propagate to extension failure

## Files to Modify

| File | Action |
|------|--------|
| `src/entrypoints/popup/App.tsx` | Import and wrap with ErrorBoundary |

## Implementation Steps

### 1. Import ErrorBoundary in App.tsx

```typescript
import { ErrorBoundary } from '../../components/ErrorBoundary';
```

### 2. Wrap main content

```tsx
return (
  <ErrorBoundary>
    <div className="w-[400px] min-h-[500px] ...">
      {/* existing content */}
    </div>
  </ErrorBoundary>
);
```

## Todo List

- [ ] Import ErrorBoundary in App.tsx
- [ ] Wrap root div with ErrorBoundary
- [ ] Test error recovery with retry button

## Success Criteria

- App crashes display friendly error UI
- Retry button resets error state
- No unhandled errors crash extension

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| ErrorBoundary doesn't catch async errors | Keep local try/catch for API calls |
| Retry doesn't restore state | Component remounts on retry |
