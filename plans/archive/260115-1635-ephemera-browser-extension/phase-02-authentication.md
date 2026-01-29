# Phase 2: Authentication & State

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Depends On:** [Phase 1: Project Setup](./phase-01-project-setup.md)
- **API Reference:** `services/api/src/routes/auth.ts`

## Overview

| Field | Value |
|-------|-------|
| Priority | P0 - Critical Path |
| Status | Pending |
| Effort | 2-3 days |
| Dependencies | Phase 1 complete |

Implement authentication flow with JWT storage, Zustand state management, and anonymous mode for users who don't want to create accounts.

## Key Insights

- JWT tokens stored in `chrome.storage.local` (persists across sessions)
- Service Worker cannot access DOM - use message passing
- Anonymous mode uses `chrome.storage.session` (clears on browser close)
- Zustand middleware syncs state with chrome.storage

## Requirements

### Functional
- Login with email/password
- Logout clears all stored data
- Anonymous mode creates temp inboxes without login
- Auth state persists across popup open/close
- Handle 2FA flow if user has it enabled

### Non-Functional
- < 100ms state hydration on popup open
- Graceful handling of expired tokens
- Clear error messages for auth failures

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Popup                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Zustand AuthStore                      │    │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────────────┐    │    │
│  │  │ token   │  │ user    │  │ isAuthenticated  │    │    │
│  │  └────┬────┘  └────┬────┘  └────────┬─────────┘    │    │
│  └───────┼────────────┼────────────────┼──────────────┘    │
│          └────────────┼────────────────┘                    │
│                       ▼                                     │
│              chrome.storage.local                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Ephemera API   │
              │  /auth/login    │
              │  /auth/me       │
              └─────────────────┘
```

## Related Code Files

### Create
- `services/extension/src/stores/auth-store.ts`
- `services/extension/src/stores/inbox-store.ts`
- `services/extension/src/utils/api.ts`
- `services/extension/src/hooks/use-auth.ts`
- `services/extension/src/components/login-form.tsx`
- `services/extension/src/components/auth-guard.tsx`

### Reference
- `services/web/src/contexts/AuthContext.tsx` - Auth pattern
- `services/web/src/utils/api.ts` - API client
- `services/api/src/routes/auth.ts` - API endpoints

## Implementation Steps

### Step 1: Create API Client (1h)

Create `src/utils/api.ts`:
```typescript
const API_BASE = 'https://api.manhquy.click'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `API Error: ${response.status}`)
  }
  return response.json()
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; role: string } }>(
      '/auth/login', { method: 'POST', body: { email, password } }
    ),
  me: (token: string) =>
    api<{ user: { id: string; email: string; role: string; tier: string } }>(
      '/auth/me', { token }
    )
}
```

### Step 2: Create Auth Store with Chrome Storage (1.5h)

Create `src/stores/auth-store.ts` using Zustand with persist middleware configured for chrome.storage.

### Step 3: Create Login Form Component (1h)

Create `src/components/login-form.tsx` with email/password inputs, error display, and loading states.

### Step 4: Create Inbox Store (1h)

Create `src/stores/inbox-store.ts` for managing inbox list, create, and delete operations.

### Step 5: Update App with Auth Flow (1h)

Update `src/popup/App.tsx` to show login form when not authenticated, inbox list when authenticated.

## Todo List

- [ ] Create API client utility
- [ ] Create Zustand auth store with chrome.storage persistence
- [ ] Create useAuth hook
- [ ] Create LoginForm component
- [ ] Create AuthGuard component
- [ ] Create inbox store
- [ ] Update App.tsx with auth flow
- [ ] Test login/logout flow
- [ ] Test persistence across popup close/open

## Success Criteria

- [ ] Can login with valid credentials
- [ ] Token persists after closing popup
- [ ] User info loads on popup open
- [ ] Logout clears all stored data
- [ ] Error messages display correctly

## Security Considerations

- JWT stored in chrome.storage.local (sandboxed per extension)
- No tokens in URL or logs
- HTTPS only for API calls
- Clear sensitive data on logout

## Next Steps

→ [Phase 3: Popup UI](./phase-03-popup-ui.md)
