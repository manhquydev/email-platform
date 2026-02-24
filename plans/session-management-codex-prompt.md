# Codex Prompt: Fix Session Management UX & Add "Remember Me"

> **Dán toàn bộ nội dung dưới đây vào Codex (OpenAI) để thực thi.**

---

## Context & Codebase Overview

You are working on a production email platform built with:
- **Frontend**: React + TypeScript + Vite (`services/web/`)
- **Backend**: Fastify + Prisma + PostgreSQL (`services/api/`)
- **Auth stack**: JWT access tokens (15 min) + httpOnly refresh token cookie (7 days) + CSRF double-submit pattern

Key files you MUST read before starting:
- `services/web/src/context/AuthContext.tsx` — auth state, background refresh, logout logic
- `services/web/src/utils/token-manager.ts` — token storage, refresh API call
- `services/web/src/utils/api.ts` — Axios instance with request/response interceptors
- `services/web/src/pages/login-modules/login-hooks.ts` — login form logic
- `services/web/src/pages/login-modules/login-components.tsx` — login form UI
- `services/api/src/routes/auth.ts` — all auth endpoints (login, refresh, logout)

---

## Problem Statement

### Bug 1: Silent Logout — No Redirect to Login Page

**Symptom:** After the user leaves the tab idle for more than 15 minutes, the session silently expires. When they come back:
- The app still renders the authenticated UI (dashboard/inbox)
- API calls fail with 401
- User is never redirected to `/login` — they must manually click "Đăng xuất"

**Root cause analysis:**
1. `AuthContext.tsx` calls `logout()` inside `handleVisibilityChange` when `tokenManager.refreshAccessToken()` fails (line ~258). `logout()` clears state: `setUser(null)`, `setToken("")`.
2. However, `logout()` does **not** navigate to `/login`. It only calls `toast.success("Đã đăng xuất")`.
3. The Axios response interceptor in `api.ts` (line 65) calls `window.location.href = '/login'` when refresh fails — but this only fires on actual API calls, not during the proactive visibility-change refresh.
4. The `auth:unauthorized` event handler in `AuthContext` sets `user = null` but also has no navigation call.
5. Result: React state becomes `user = null, token = ""` but the Router is still on `/app`. The `ProtectedRoute` component presumably checks `isAuthenticated` and should redirect... but something in the timing prevents this.
6. Additionally, the `handleUnauthorized` dependency on `token` causes double re-initialization on every `token` change, creating subtle loop risks.

### Bug 2: No "Remember Me" Feature

**Symptom:** Every session expires after 7 days (refresh token) regardless. There is no way for users to opt into longer sessions, which is a UX standard expected on all modern web apps (Gmail, GitHub, Linear all have this).

**Current behavior:**
- Access token: always 15 min
- Refresh token cookie: always 7 days
- No `rememberMe` flag sent from frontend
- No `maxAge` variation in backend

---

## Required Fixes

### Fix 1: Redirect to `/login` on Session Expiry

#### `services/web/src/context/AuthContext.tsx`

1. Import `useNavigate` is not available directly here (it's a context provider, not a component inside Router). Instead, use the `window.location` redirect approach, or use a custom event.

**Preferred approach — dispatch a custom event + listen in Router-level component:**

In `logout()`, after clearing tokens, dispatch:
```ts
window.dispatchEvent(new CustomEvent('auth:session-expired'));
```

Then, in `AuthContext`, modify the `handleUnauthorized` listener and the `logout` function so that **whenever a logout is triggered by session expiry** (not user-initiated manual logout), it navigates to `/login` with a `?reason=expired` query param.

**Concrete changes:**

a) Add a `reason` parameter to `logout`:
```ts
const logout = useCallback((reason?: 'manual' | 'expired') => {
    clarityTrack("logout");
    tokenManager.clearTokens();
    setToken("");
    setUser(null);
    // Clear background refresh timer
    if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
    }
    // Notify other tabs
    channelRef.current?.postMessage({ type: 'logout' });
    
    if (reason === 'expired') {
        // Redirect to login with reason
        window.location.replace('/login?reason=expired');
    } else {
        toast.success("Đã đăng xuất");
    }
}, [setToken]);
```

b) Change all calls that invoke `logout()` on refresh failure to `logout('expired')`:
- Background refresh timer's catch block (2 places in the file)
- `handleVisibilityChange`'s catch block
- `handleUnauthorized` event listener

c) In `handleUnauthorized`, also call `window.location.replace('/login?reason=expired')` if already not on the login page.

d) **Fix the dependency bug:** The `useEffect` for `initAuth` has `[token, setToken]` as dependencies. This causes it to re-run every time token changes (including after refresh), creating a potential loop. Refactor so that `initAuth` runs only on mount by using a `hasInitialized` ref:
```ts
const hasInitialized = useRef(false);
useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    initAuth();
    // ... add event listener
}, []); // Run only once on mount
```
The token value at mount time is captured from localStorage via `useLocalStorage` initial read, so this is safe.

#### `services/web/src/pages/Login.tsx` (or equivalent entry point)

On the login page, read the `?reason=expired` query param and show a toast/banner:
```ts
const [searchParams] = useSearchParams();
useEffect(() => {
    if (searchParams.get('reason') === 'expired') {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
}, []);
```

---

### Fix 2: Add "Remember Me" Feature

#### Backend: `services/api/src/routes/auth.ts`

**Constants to add at top:**
```ts
const REFRESH_TOKEN_EXPIRY_DEFAULT = "7d";     // Session login
const REFRESH_TOKEN_EXPIRY_REMEMBER = "30d";   // Remember Me login
const COOKIE_MAX_AGE_DEFAULT = 7 * 24 * 60 * 60;       // 7 days in seconds
const COOKIE_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60;     // 30 days in seconds
```

**Modify `/auth/login` body schema** to accept `rememberMe`:
```ts
const bodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    rememberMe: z.boolean().optional().default(false),
});
const { email, password, rememberMe } = parsed.data;
```

**Modify cookie and token generation** based on `rememberMe`:
```ts
const refreshExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER : REFRESH_TOKEN_EXPIRY_DEFAULT;
const cookieMaxAge = rememberMe ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE_DEFAULT;

const refreshToken = app.jwt.sign(
    { userId: user.id, type: "refresh", jti: loginRefreshJti },
    { expiresIn: refreshExpiry }
);

reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: cookieMaxAge,
    path: '/auth/refresh',
});
reply.setCookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: cookieMaxAge,
    path: '/',
});
```

Apply the same `rememberMe` logic to `/auth/2fa/verify` — pass the `rememberMe` flag through the `tempToken` payload (add it when issuing the tempToken in login, then read it in 2FA verify).

**Modify tempToken to carry rememberMe:**
```ts
// In /auth/login when 2FA required:
const tempToken = app.jwt.sign(
    { userId: user.id, pending2FA: true, rememberMe: !!rememberMe } as any,
    { expiresIn: "5m" }
);
```

#### Frontend: `services/web/src/context/AuthContext.tsx`

Modify the `login` function signature to accept `rememberMe`:
```ts
login: (email: string, pass: string, rememberMe?: boolean) => Promise<...>
```
Pass it in the API body:
```ts
body: { email, password: pass, rememberMe: !!rememberMe }
```

#### Frontend: `services/web/src/pages/login-modules/login-hooks.ts`

Add `rememberMe` state:
```ts
const [rememberMe, setRememberMe] = useState(false);
```
Read from `localStorage` on init (persist checkbox preference):
```ts
const [rememberMe, setRememberMe] = useState(() =>
    localStorage.getItem('rememberMePref') === 'true'
);
```
When changed, persist preference (NOT the session itself):
```ts
const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    localStorage.setItem('rememberMePref', String(checked));
};
```
Pass to `login()`:
```ts
const res = await login(email, password, rememberMe);
```
Return `rememberMe`, `setRememberMe` (or `handleRememberMeChange`) from the hook.

#### Frontend: `services/web/src/pages/login-modules/login-components.tsx`

Add `rememberMe` checkbox to `LoginForm`. Props to add:
```ts
rememberMe: boolean;
onRememberMeChange: (checked: boolean) => void;
```

Add the checkbox UI between the password field and submit button:
```tsx
{/* Remember Me */}
<div className="flex items-center justify-between">
    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
        <div className="relative">
            <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => onRememberMeChange(e.target.checked)}
                className="sr-only peer"
            />
            <div className="w-4 h-4 rounded border border-border bg-surface-elevated 
                peer-checked:bg-primary peer-checked:border-primary 
                transition-colors flex items-center justify-center">
                {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        </div>
        <span className="text-sm text-text-secondary group-hover:text-text-main transition-colors">
            Ghi nhớ đăng nhập <span className="text-xs text-text-secondary/60">(30 ngày)</span>
        </span>
    </label>
</div>
```

---

## Additional UX Polish

### Expired Session Toast on Login Page

In the Login page component (wherever `LoginForm` is rendered), add:
```ts
const [searchParams] = useSearchParams();
useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'expired') {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
            duration: 5000,
            icon: '⏱️',
        });
        // Clean up URL without reload
        window.history.replaceState({}, '', '/login');
    }
}, []);
```

### Session Expiry Warning (optional but recommended)

In `AuthContext.tsx`, before the background refresh timer triggers, add a proactive warning toast when the refresh token is near expiry (e.g., 24h before in "regular" mode, 3 days before in "remember me" mode). This requires the backend to return `refreshTokenExpiresAt` in the login response, or the frontend decodes it from the cookie (not possible with httpOnly). **Simplest approach**: store `sessionExpiresAt` in non-sensitive `localStorage` at login time, then check it on background refresh.

---

## Constraints & Rules

1. **Do NOT change the CSRF double-submit security pattern** — it must remain intact on all refresh calls.
2. **Do NOT store refresh tokens in localStorage** — they must remain in httpOnly cookies only.
3. **Do NOT break the BroadcastChannel multi-tab sync** — ensure logout in one tab still syncs to all tabs.
4. **Preserve all existing Vietnamese UI strings** — do not translate or change any displayed Vietnamese text.
5. **Follow existing code style**: use `useCallback`, proper TypeScript types, no `any` except where already used.
6. **Run `tsc --noEmit`** in `services/web/` after changes to ensure no type errors.
7. **Do NOT modify the Prisma schema** — this feature requires no DB changes.
8. **Test the following scenarios manually after implementation:**
   - [ ] Login without "Ghi nhớ" → verify refresh token cookie expires in 7 days
   - [ ] Login with "Ghi nhớ" checked → verify refresh token cookie expires in 30 days
   - [ ] Go idle 20+ minutes → return to tab → verify redirect to `/login?reason=expired` with toast
   - [ ] Manual logout → verify redirect does NOT show expired toast (no `?reason=expired`)
   - [ ] Open 2 tabs → logout in tab 1 → verify tab 2 also redirects

---

## Files to Modify (Summary)

| File | Change |
|------|--------|
| `services/api/src/routes/auth.ts` | Add `rememberMe` to login + 2FA routes, vary cookie TTL |
| `services/web/src/context/AuthContext.tsx` | Add `reason` param to `logout`, fix redirect on expiry, fix init loop |
| `services/web/src/utils/token-manager.ts` | Minor: ensure `clearTokens` doesn't lose any state |
| `services/web/src/pages/login-modules/login-hooks.ts` | Add `rememberMe` state, pass to `login()` |
| `services/web/src/pages/login-modules/login-components.tsx` | Add "Ghi nhớ đăng nhập" checkbox to `LoginForm` |
| `services/web/src/pages/Login.tsx` | Read `?reason=expired` and show toast |
