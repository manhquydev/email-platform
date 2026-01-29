# Phase 05: API Error Handling

## Context Links
- [Plan](./plan.md)
- [Phase 04](./phase-04-routing-integration.md)

## Overview

Integrate error pages with API error responses. When API returns 403, 500, or 503, redirect or display appropriate error page.

## Key Insights

- API calls use centralized `api.ts` utility
- Currently errors are caught individually in components
- Need global error handling strategy for critical errors
- 401 should redirect to login, not error page
- 403/500/503 should show error pages

## Requirements

1. Enhance api.ts to detect critical error status codes
2. Create useApiErrorHandler hook for consistent handling
3. Redirect to 403 page on forbidden responses
4. Display 503 page during maintenance mode
5. Handle 500 errors gracefully with retry option

## Architecture

**API Error Handling Strategy:**
```typescript
// utils/api.ts
const api = {
  async request(url, options) {
    const response = await fetch(url, options);

    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      throw new ApiError('Unauthorized', 401);
    }

    if (response.status === 403) {
      window.location.href = '/403';
      throw new ApiError('Forbidden', 403);
    }

    if (response.status === 503) {
      window.location.href = '/503';
      throw new ApiError('Service Unavailable', 503);
    }

    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }

    return response.json();
  }
};
```

**Custom Error Class:**
```typescript
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## Related Code Files

- `services/web/src/utils/api.ts` - API utility
- `services/web/src/App.tsx` - Add 503 route
- `services/web/src/hooks/` - Custom hooks directory

## Implementation Steps

1. Create ApiError class in utils/api.ts
2. Add error status code handling in api request method
3. Add /503 route in App.tsx within PublicLayout
4. Create useApiErrorHandler hook (optional, for component-level handling)
5. Test 403 response redirects to /403
6. Test 503 response redirects to /503
7. Verify 500 errors are caught by ErrorBoundary

## Error Code Handling Matrix

| Status | Action | Destination |
|--------|--------|-------------|
| 401 | Redirect | /login |
| 403 | Redirect | /403 |
| 404 | Throw | Component handles |
| 500 | Throw | ErrorBoundary catches |
| 503 | Redirect | /503 |

## Todo List

- [ ] Create ApiError class
- [ ] Add status code handling in api.ts
- [ ] Add /503 route in App.tsx
- [ ] Handle 403 → redirect to /403
- [ ] Handle 503 → redirect to /503
- [ ] Test API error scenarios
- [ ] Verify ErrorBoundary catches unhandled errors

## Success Criteria

- [ ] 403 API response shows access denied page
- [ ] 503 API response shows maintenance page
- [ ] 500 errors bubble up to ErrorBoundary
- [ ] 401 redirects to login (not error page)
- [ ] Error pages display correct illustrations

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Redirect loop | Low | High | Check current path before redirect |
| Lost error context | Medium | Low | Log errors before redirect |

## Security Considerations

- Never expose sensitive error details to users
- Log detailed errors server-side only
- 403 message should be generic, not reveal resource existence

## Next Steps

After Phase 05, error pages implementation is complete. Consider:
- Add analytics tracking for error page views
- Add "Report Issue" button linking to /support
- Monitor error rates via Prometheus/Grafana
