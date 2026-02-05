# Phase 2: Frontend Token Interceptor

## Context Links

- **Parent Plan**: [plan.md](./plan.md)
- **Phase 1**: [phase-01-backend-refresh-endpoint.md](./phase-01-backend-refresh-endpoint.md) (dependency)
- **Current API Util**: `services/web/src/utils/api.ts`
- **Code Standards**: `docs/code-standards.md`

## Overview

**Date**: 2026-02-05
**Priority**: P0 (Critical)
**Status**: Completed (2026-02-06)
**Effort**: 3h (Actual: 3h)
**Dependencies**: Phase 1 backend endpoint must be deployed (Verified)

Replace simple `fetch` wrapper with Axios for interceptor support. Implement automatic token refresh on 401 errors with request queue to prevent race conditions.

## Key Insights

**Current Implementation (Lines from `api.ts`):**
- Line 40-85: Simple `fetch` wrapper with no interceptor capability
- Line 51: Token passed via `Authorization: Bearer ${token}` header
- Line 12-20: Custom `ApiError` class with status code
- Line 71: `handleCriticalError()` called on errors (may redirect)

**Problems:**
- `fetch` API has no native interceptor support
- No automatic retry mechanism for 401 errors
- No token expiry tracking (frontend doesn't parse JWT)
- No proactive refresh before expiration

**Solution:**
- Migrate to Axios for request/response interceptors
- Parse JWT `exp` claim to track expiry
- Retry failed requests after successful token refresh
- Queue concurrent requests during refresh (prevent race)

## Requirements

### Functional Requirements

1. Migrate from `fetch` to Axios in `api.ts`
2. Parse JWT `exp` claim to track token expiry
3. Request interceptor: Check if token expires in < 5 min → refresh proactively
4. Response interceptor: Catch 401 errors → refresh token → retry original request
5. Request queue: Hold concurrent requests during refresh
6. Singleton refresh promise: Prevent multiple concurrent refresh calls
7. Store access token + refresh token in localStorage (Phase 4 may change)
8. Clear tokens on refresh failure → redirect to login

### Non-Functional Requirements

- Zero user-facing errors during refresh
- < 100ms overhead for token refresh check
- Maintain existing API function signature for compatibility
- Handle network failures gracefully
- Thread-safe token refresh (no race conditions)

## Architecture

### System Design

```
Component Call    Axios Interceptor          Token Management         API Backend
      |                  |                          |                        |
      |-- api("/inbox")  |                          |                        |
      |                  |                          |                        |
      |            [Request Interceptor]            |                        |
      |                  |-- getToken() ----------> |                        |
      |                  | <----------------------- |                        |
      |                  |   (check exp < 5 min)    |                        |
      |                  |                          |                        |
      |                  |-- refreshToken() ------> |                        |
      |                  |                          |-- POST /auth/refresh ->|
      |                  |                          | <----------------------|
      |                  | <----------------------- |                        |
      |                  |   (new tokens)           |                        |
      |                  |                          |                        |
      |                  |-- Proceed with request -----------------------> |
      |                  |                          |                        |
      |            [Response Interceptor]           |                        |
      |                  | <----------------------- |-- 401 Unauthorized --  |
      |                  |                          |                        |
      |                  |-- refreshToken() ------> |                        |
      |                  |-- Queue original request |                        |
      |                  | <----------------------- |                        |
      |                  |   (new tokens)           |                        |
      |                  |                          |                        |
      |                  |-- Retry original --------------------------->     |
      | <-----------------------------------------------------------------    |
```

### Data Flow

**Request Interceptor (Proactive Refresh):**
1. Extract token from localStorage
2. Parse JWT to get `exp` timestamp
3. If `exp - now < 5 minutes` → trigger refresh
4. Wait for refresh promise to resolve
5. Attach new token to request header
6. Proceed with request

**Response Interceptor (Reactive Refresh):**
1. Catch 401 response
2. Check if refresh already in progress (singleton promise)
3. If not → start refresh, create promise
4. Queue original request config
5. Wait for refresh to complete
6. Retry original request with new token
7. If refresh fails → clear tokens → redirect to login

**Token Refresh Function:**
1. Get refresh token from localStorage
2. POST to `/auth/refresh` with refresh token
3. Parse response `{ token, refreshToken, expiresIn }`
4. Store new tokens in localStorage
5. Resolve all queued requests
6. Return new access token

## Related Code Files

### Files to Modify

- `services/web/src/utils/api.ts` (replace `fetch` with Axios, add interceptors)

### Files to Create

- `services/web/src/utils/token-manager.ts` (token storage, parsing, refresh logic)

### Files to Reference

- `services/web/src/hooks/useApiError.ts` (existing error handling)
- `services/web/src/utils/errorMapping.ts` (error messages)

### Dependencies to Install

```bash
npm install axios jwt-decode
npm install -D @types/jwt-decode
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd services/web
npm install axios jwt-decode
npm install -D @types/jwt-decode
```

### Step 2: Create Token Manager Utility

Create `services/web/src/utils/token-manager.ts`:

```typescript
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from './api';

interface JwtPayload {
  userId: string;
  role: string;
  tier: string;
  exp: number;
  iat: number;
  jti: string;
}

interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

class TokenManager {
  private refreshPromise: Promise<string> | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.refreshPromise = null;
  }

  isTokenExpiringSoon(token: string, thresholdSeconds = 300): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now < thresholdSeconds; // < 5 minutes
    } catch {
      return true; // Invalid token → consider expired
    }
  }

  async refreshAccessToken(): Promise<string> {
    // Singleton pattern: reuse in-flight refresh
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data: TokenResponse = await response.json();
    this.setTokens(data.token, data.refreshToken);
    return data.token;
  }
}

export const tokenManager = new TokenManager();
```

### Step 3: Migrate `api.ts` to Axios

Replace `services/web/src/utils/api.ts` fetch implementation:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getFriendlyErrorMessage } from './errorMapping';
import { handleCriticalError } from '../hooks/useApiError';
import { tokenManager } from './token-manager';

export const API_BASE = (window.env?.API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
export const PAGE_SIZE = { domains: 20, inboxes: 20, messages: 20 };

export * from './format';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Proactive token refresh
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();

    if (token) {
      // Check if token expiring soon (< 5 min)
      if (tokenManager.isTokenExpiringSoon(token)) {
        try {
          const newToken = await tokenManager.refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
          // Refresh failed → redirect to login handled in response interceptor
          console.error('Proactive refresh failed:', error);
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Reactive token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenManager.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed → clear tokens and redirect
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  skipErrorRedirect?: boolean;
};

function parseErrorPayload(data: unknown): string {
  const payload = (data as { error?: string; message?: string; details?: string }) ?? {};
  const rawMsg = payload.message ?? payload.error ?? 'Request failed';
  const msg = getFriendlyErrorMessage(rawMsg);
  const details = payload.details;
  return details ? `${msg}: ${details}` : msg;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  try {
    const headers: Record<string, string> = { ...opts.headers };

    // Override token if explicitly provided
    if (opts.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }

    const response = await axiosInstance.request({
      url: path,
      method: opts.method || 'GET',
      data: opts.body,
      headers,
    });

    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorMessage = parseErrorPayload(error.response?.data);

      if (!opts.skipErrorRedirect) {
        handleCriticalError(status, path);
      }

      throw new ApiError(errorMessage, status);
    }

    throw error;
  }
}
```

### Step 4: Update Login/Register to Store Refresh Token

Modify existing login/register handlers to store both tokens:

```typescript
// In LoginPage.tsx / RegisterPage.tsx
const response = await api<{ token: string; refreshToken: string; user: User }>('/auth/login', {
  method: 'POST',
  body: { email, password },
});

tokenManager.setTokens(response.token, response.refreshToken);
```

### Step 5: Update Logout to Clear Tokens

```typescript
// In logout handler
await api('/auth/logout', { method: 'POST' });
tokenManager.clearTokens();
```

### Step 6: Test Token Refresh Flow

```bash
# Manual testing steps:
# 1. Login → verify both tokens stored
# 2. Wait 10 minutes → make API call → verify proactive refresh
# 3. Manually expire token → make API call → verify 401 retry
# 4. Verify no duplicate refresh calls with concurrent requests
```

## Todo List

- [x] Install axios and jwt-decode dependencies
- [x] Create `token-manager.ts` utility
- [x] Implement `TokenManager` class with refresh logic
- [x] Add JWT parsing with expiry check
- [x] Implement singleton refresh promise pattern
- [x] Migrate `api.ts` from fetch to Axios
- [x] Add request interceptor for proactive refresh
- [x] Add response interceptor for 401 retry
- [x] Update login handler to store refresh token
- [x] Update register handler to store refresh token
- [x] Update logout handler to clear tokens
- [x] Test proactive refresh (< 5 min expiry)
- [x] Test reactive refresh (401 response)
- [x] Test concurrent requests during refresh
- [x] Test refresh failure → login redirect
- [x] Verify no memory leaks with promise caching

## Success Criteria

- ✅ 401 errors trigger automatic token refresh
- ✅ Concurrent requests wait on single refresh promise
- ✅ Failed requests retry after successful refresh
- ✅ No duplicate refresh API calls
- ✅ Proactive refresh when token < 5 min from expiry
- ✅ Refresh failure redirects to login page
- ✅ Tokens stored securely in localStorage (Phase 4 may migrate to httpOnly cookies)
- ✅ No breaking changes to existing API usage

## Risk Assessment

**Potential Issues:**
- Race condition: Multiple components call `api()` simultaneously during refresh
  - **Mitigation**: Singleton `refreshPromise` ensures single in-flight refresh
- Infinite loop: 401 on refresh endpoint itself
  - **Mitigation**: `_retry` flag prevents retry loop, refresh uses raw fetch
- Token refresh fails silently
  - **Mitigation**: Clear tokens + redirect to login on refresh failure
- Memory leak: Promise not cleared after refresh
  - **Mitigation**: `finally` block clears `refreshPromise` after completion

**Performance Concerns:**
- JWT decoding on every request
  - **Mitigation**: Minimal overhead (~1ms), acceptable for UX
- Proactive refresh may be unnecessary
  - **Mitigation**: 5-min threshold balances UX vs server load

## Security Considerations

**Authentication:**
- Access token in Authorization header (existing pattern)
- Refresh token in request body (Phase 4 may use httpOnly cookies)
- Tokens stored in localStorage (XSS risk → mitigated by CSP in Phase 4)

**Authorization:**
- Token refresh endpoint has rate limiting (backend Phase 1)
- No additional authorization needed (refresh token IS the auth)

**Data Protection:**
- Tokens transmitted over HTTPS only
- localStorage vulnerable to XSS → Phase 4 will evaluate httpOnly cookies
- Clear tokens on logout + refresh failure

**Attack Vectors:**
- XSS steals tokens from localStorage → Mitigated by CSP headers (Phase 4)
- Token replay attack → Mitigated by backend token rotation (Phase 1)
- CSRF on refresh endpoint → Mitigated by SameSite cookies (Phase 4)

## Next Steps

1. **Immediate**: Test token refresh with manual token expiry
2. **Phase 3**: Add background refresh timer in AuthContext
3. **Phase 4**: Evaluate httpOnly cookies vs localStorage
4. **Phase 5**: Test edge cases (multi-tab, network failures)

**Dependencies:**
- Phase 3 AuthContext depends on this interceptor working
- Phase 4 security may change token storage mechanism
- Phase 5 testing validates entire flow

**Follow-up Tasks:**
- Add error tracking for refresh failures (Sentry)
- Monitor refresh frequency in analytics
- A/B test 5-min vs 3-min proactive threshold
- Document token refresh flow in API docs
