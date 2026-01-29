# Phase 04: Routing Integration

## Context Links
- [Plan](./plan.md)
- [Phase 03](./phase-03-error-page-component.md)

## Overview

Integrate ErrorPage component with App.tsx routing (replace Navigate fallback with 404) and enhance ErrorBoundary to use ErrorPage(500) as fallback.

## Key Insights

- Current fallback: `<Route path="*" element={<Navigate to="/" replace />}` - redirects to home
- ErrorBoundary has hardcoded Vietnamese fallback UI
- 404 should use PublicLayout wrapper for consistent nav/footer
- ErrorBoundary wraps entire app, so fallback needs minimal dependencies

## Requirements

1. Replace `Navigate to="/"` with 404 ErrorPage route
2. Wrap 404 route in PublicLayout for nav/footer
3. Update ErrorBoundary to use ErrorPage(500) as fallback
4. Ensure ErrorBoundary fallback works without router context
5. Add dedicated 403 route for access denied scenarios

## Architecture

**App.tsx Changes:**
```tsx
// Before
<Route path="*" element={<Navigate to="/" replace />} />

// After
<Route element={<PublicLayout />}>
  {/* ... existing public routes ... */}
  <Route path="/403" element={<ErrorPage code={403} />} />
</Route>
<Route path="*" element={
  <PublicLayout>
    <ErrorPage code={404} />
  </PublicLayout>
} />
```

**ErrorBoundary Enhancement:**
```tsx
export class ErrorBoundary extends Component<Props, State> {
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorPage
          code={500}
          showRetry
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
```

## Related Code Files

- `services/web/src/App.tsx` - Main routing
- `services/web/src/components/ErrorBoundary.tsx` - Error boundary
- `services/web/src/pages/ErrorPage.tsx` - Error page component
- `services/web/src/layouts/PublicLayout.tsx` - Layout wrapper

## Implementation Steps

1. Import ErrorPage in App.tsx
2. Add /403 route within PublicLayout routes
3. Replace wildcard route with ErrorPage(404) wrapped in PublicLayout
4. Update ErrorBoundary to import and use ErrorPage
5. Test 404 by navigating to unknown URL
6. Test ErrorBoundary by triggering runtime error
7. Test 403 by navigating to /403

## Todo List

- [ ] Import ErrorPage in App.tsx
- [ ] Add /403 route for access denied
- [ ] Replace Navigate fallback with ErrorPage(404)
- [ ] Wrap 404 route in PublicLayout
- [ ] Update ErrorBoundary fallback to use ErrorPage(500)
- [ ] Test 404 renders for unknown routes
- [ ] Test 403 renders correctly
- [ ] Test ErrorBoundary catches and displays 500

## Success Criteria

- [ ] `/unknown-path` shows 404 page with nav/footer
- [ ] `/403` shows access denied page
- [ ] Runtime error triggers 500 page via ErrorBoundary
- [ ] Retry button in 500 page resets error state
- [ ] Home button navigates to `/`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ErrorBoundary circular dependency | Low | High | Keep ErrorPage deps minimal |
| Router context unavailable in ErrorBoundary | Medium | Medium | Use window.location for home button |

## Security Considerations

- 403 page should not expose protected resource details
- Error messages should be generic, not leak stack traces

## Next Steps

Proceed to Phase 05 (API Error Handling) for backend error integration.
