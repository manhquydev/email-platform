# Code Review: Session Management Implementation

**Date:** 2026-02-24
**Reviewer:** code-reviewer (aaf0f51)
**Score: 7.5/10**

---

## Scope

- Files reviewed: 7
  - `services/api/src/routes/auth.ts`
  - `services/web/src/context/AuthContext.tsx`
  - `services/web/src/pages/login-modules/login-hooks.ts`
  - `services/web/src/pages/login-modules/login-components.tsx`
  - `services/web/src/pages/Login.tsx`
  - `services/web/src/utils/token-manager.ts`
  - `services/web/src/utils/api.ts`
- Lines of code analyzed: ~1,200
- Review focus: Session management (httpOnly cookies, CSRF, rememberMe, multi-tab sync, token refresh)

---

## Overall Assessment

Implementation is solid. httpOnly cookie + CSRF double-submit pattern is correctly implemented. rememberMe properly propagated through 2FA flow. initAuth loop fixed with `hasInitialized` ref. BroadcastChannel graceful degradation is in place. Main weaknesses: **5 navigation callsites still call `logout()` without `'manual'` reason** (silent redirect risk), **duplicate `startBackgroundRefresh` function** defined in two separate `useEffect` hooks, and **SSO endpoint leaks tokens in redirect URL**.

---

## Critical Issues (Must Fix)

### 1. SSO endpoint leaks tokens in redirect URL
**File:** `services/api/src/routes/auth.ts` (near bottom, `/auth/sso` handler)

```typescript
// CURRENT - tokens in URL = logged in server logs, browser history, Referer headers
const redirectUrl = `${appConfig.webUrl}/auth/sso?accessToken=${accessToken}&refreshToken=${refreshToken}`;
return reply.redirect(redirectUrl);
```

The SSO flow bypasses the httpOnly cookie architecture entirely. `refreshToken` is exposed in plain URL. Fix: set httpOnly cookie before redirect, only pass `accessToken` (short-lived) as URL param, or use POST-based redirect.

```typescript
// BETTER: set cookie, redirect without refresh token in URL
reply.setCookie('refreshToken', refreshToken, { httpOnly: true, ... });
const redirectUrl = `${appConfig.webUrl}/auth/sso?accessToken=${accessToken}`;
return reply.redirect(redirectUrl);
```

---

### 2. Five logout callsites missing `'manual'` reason
**Files:**
- `services/web/src/components/AppHeader.tsx:44` — `logout()`
- `services/web/src/components/NavigationSidebar.tsx:24` — `logout()`
- `services/web/src/components/Navigation/DesktopNav.tsx:31` — `logout()`
- `services/web/src/components/Navigation/HamburgerMenu.tsx:38` — `logout()`
- `services/web/src/components/settings/GeneralSettings.tsx:55` — `logout()`

`logout()` without a reason defaults to `undefined`. The current `logout` implementation:
```typescript
const logout = useCallback((reason?: 'manual' | 'expired') => {
    ...
    if (reason === 'expired') {
        window.location.replace('/login?reason=expired');
    } else {
        toast.success("Đã đăng xuất"); // shows toast for undefined too - OK
    }
}, [setToken]);
```

For these UI-initiated logouts `undefined` falls through to the `toast.success` branch — **functionally correct today**, but the type contract says `'manual' | 'expired'`. If a future developer adds `reason === 'manual'` branching, these callsites break silently. Fix: pass `'manual'` explicitly at all 5 callsites.

---

## High Priority Findings

### 3. Duplicate `startBackgroundRefresh` function in AuthContext
**File:** `services/web/src/context/AuthContext.tsx`

`startBackgroundRefresh` is defined identically **twice** — once inside the `useEffect` that depends on `[user, logout]` (the main background refresh), and again inside the visibility change `useEffect` (also `[user, logout]`). This is a DRY violation and creates two competing timer managers. The visibility handler's local `startBackgroundRefresh` also duplicates all the refresh logic.

**Impact:** On tab focus, `startBackgroundRefresh()` inside the visibility handler creates a new interval independently from the one in the main background refresh effect. Both effects depend on `[user, logout]` and both set `refreshTimerRef.current`. Risk of double-interval if user toggled state.

**Fix:** Extract `startBackgroundRefresh` to a `useCallback` above both `useEffect` hooks, then reference it from both.

```typescript
const startBackgroundRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
        // ... single definition
    }, REFRESH_INTERVAL);
}, [logout]);
```

### 4. `api.ts` 401 interceptor hard-redirects without calling `logout()`
**File:** `services/web/src/utils/api.ts:65`

```typescript
} catch (refreshError) {
    tokenManager.clearTokens();
    window.location.href = '/login'; // bypasses logout() entirely
    return Promise.reject(refreshError);
}
```

This clears localStorage but does NOT:
- Clear cookies via `POST /auth/logout`
- Notify other tabs via BroadcastChannel
- Set `?reason=expired` on the redirect

Fix: dispatch the `auth:unauthorized` custom event instead:
```typescript
window.dispatchEvent(new CustomEvent('auth:unauthorized'));
```
The `handleUnauthorized` in `AuthContext` already handles this correctly.

### 5. `login-hooks.ts:handleLoginSuccess` duplicates token storage
**File:** `services/web/src/pages/login-modules/login-hooks.ts:42-44`

```typescript
const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem('token', token);      // duplicates AuthContext storage
    localStorage.setItem('user', JSON.stringify(user)); // not used by AuthContext
    window.location.href = user.role === 'ADMIN' ? '/admin' : '/app';
};
```

This writes to `localStorage.token` directly, bypassing `tokenManager` (which uses `accessToken` key) and `AuthContext`. Used by PasskeyLogin and Telegram auth. Creates key inconsistency: AuthContext reads `token` (via `useLocalStorage("token", "")`), but `tokenManager.getAccessToken()` reads `accessToken`. Both keys may exist simultaneously with different values.

---

## Medium Priority Improvements

### 6. `AuthContext` BroadcastChannel logout handler does not call `POST /auth/logout`
**File:** `services/web/src/context/AuthContext.tsx:150`

```typescript
if (type === 'logout') {
    tokenManager.clearTokens();
    setUser(null);
    setToken("");
    // No server-side token revocation
}
```

When Tab B receives logout from Tab A, it clears local state but the access token from Tab B is never revoked. Server-side revocation should use `tokenRevocationService`. Since Tab A already called `/auth/logout` (which clears the shared httpOnly cookie), this is mitigated — but if Tab B had a different access token JTI, it stays valid for up to 15 minutes.

### 7. `rememberMe` not sent to `/auth/refresh` endpoint
**File:** `services/api/src/routes/auth.ts` — `/auth/refresh` handler

When the token rotates, the new cookie is always set with `maxAge: 7 * 24 * 60 * 60` (7 days), ignoring the original `rememberMe=30d` preference. The `rememberMe` intent is lost after first rotation.

Fix: encode `rememberMe` in the refresh token JWT payload and read it during rotation:
```typescript
// In RefreshTokenService.rotateToken, return rememberMe from stored token metadata
reply.setCookie('refreshToken', rotated.token, {
    maxAge: rotated.rememberMe ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE_DEFAULT,
    ...
});
```

### 8. `login-hooks.ts` missing `useEffect` cleanup for redirect
**File:** `services/web/src/pages/login-modules/login-hooks.ts:36-38`

```typescript
useEffect(() => {
    if (token) navigate("/app");
}, [token, navigate]);
```

Minor: this fires on every token change including during background refresh. Should add a guard: only navigate if not already on `/app`.

### 9. `register` endpoint uses hardcoded 7-day cookie (no rememberMe)
**File:** `services/api/src/routes/auth.ts` — `/auth/register` handler

Registration always uses 7-day TTL, which is fine since rememberMe is a login preference. No issue, but worth noting the inconsistency with the login path if someone registers and is immediately logged in.

---

## Low Priority Suggestions

### 10. `tempToken` in 2FA carries `rememberMe` but exposes it in JWT payload
**File:** `services/api/src/routes/auth.ts`

```typescript
const tempToken = app.jwt.sign({ userId: user.id, pending2FA: true, rememberMe: !!rememberMe } as any, { expiresIn: "5m" });
```

The `as any` cast bypasses type checking. Define a proper interface:
```typescript
interface TempToken2FA {
    userId: string;
    pending2FA: true;
    rememberMe: boolean;
}
```

### 11. `AuthContext` token sync in BroadcastChannel checks `getRefreshToken()` which always returns `null`
**File:** `services/web/src/context/AuthContext.tsx:162-164`

```typescript
const refreshToken = tokenManager.getRefreshToken(); // always returns null (Phase 4)
if (refreshToken) {
    tokenManager.setTokens(newToken, refreshToken); // never executes
}
```

Dead code. `getRefreshToken()` was intentionally changed to return `null` in Phase 4. Simplify to:
```typescript
tokenManager.setTokens(newToken, '');
```

### 12. `login-components.tsx` "Quên mật khẩu?" is an `<a href="#">` not a `<Link>`
**File:** `services/web/src/pages/login-modules/login-components.tsx`

Minor: should be `<Link to="/forgot-password">` to avoid page reload.

---

## Positive Observations

- **CSRF implementation is correct**: timing-safe comparison with `crypto.timingSafeEqual`, proper double-submit cookie+header pattern, new token generated on each refresh rotation.
- **rememberMe properly threaded through 2FA**: `tempToken` carries `rememberMe`, 2FA verify route reads it correctly for cookie TTL.
- **initAuth loop fixed**: `hasInitialized.current` ref prevents re-running on token state changes. Clean solution.
- **BroadcastChannel graceful degradation**: `typeof BroadcastChannel === 'undefined'` check is correct.
- **2FA exponential backoff**: `twoFactorBackoff.isInBackoff()` called before JWT verification — correct order (fails fast before expensive ops).
- **Account lockout**: proper implementation with 5-attempt threshold, 15-min lock, counter reset on success.
- **Modular structure**: login-hooks/login-components separation is clean, respects 200-line limit.
- **Background refresh interval**: paused when tab hidden (visibilitychange), restarted on focus — good battery/resource management.

---

## Recommended Actions

1. **[Critical]** Fix SSO endpoint — set httpOnly cookie before redirect, remove `refreshToken` from URL
2. **[Critical]** Update 5 manual logout callsites to `logout('manual')` for type correctness
3. **[High]** Extract `startBackgroundRefresh` to single `useCallback` — eliminate duplicate definition
4. **[High]** Fix `api.ts` 401 interceptor to dispatch `auth:unauthorized` event instead of `window.location.href`
5. **[High]** Audit `handleLoginSuccess` in `login-hooks.ts` — align key usage with `tokenManager` (`accessToken` key)
6. **[Medium]** Preserve `rememberMe` through token rotation (encode in refresh token metadata)
7. **[Low]** Remove dead code: BroadcastChannel `getRefreshToken()` branch (always null)

---

## Metrics

- Type Coverage: ~85% — `as any` used in 2FA tempToken and `handleLoginSuccess`; decoded JWT lacks proper typing
- Test Coverage: Not assessed (no test files in scope)
- Linting Issues: 4 `eslint-disable` suppressions observed; pragmatic but acceptable

---

## Unresolved Questions

1. Does `RefreshTokenService.rotateToken()` store `rememberMe` in the DB token record? If not, Issue #7 has no fix path without schema change.
2. Is `PasskeyLogin` component using `handleLoginSuccess` from `login-hooks.ts`? If so, the `localStorage.token` vs `accessToken` key mismatch (Issue #5) affects passkey auth sessions.
3. What browser targets are required? If IE11 support is needed, BroadcastChannel degradation is critical path — currently graceful but silent.
