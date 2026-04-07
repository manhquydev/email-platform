# Login Session Production Verification Checklist

Purpose: confirm "Remember me (30 days)" does not logout users around 10-15 minutes on production.

## Scope
- Domain: `<production-app-domain>` (example: `https://app.example.com`)
- API: `<production-api-domain>` (example: `https://api.example.com`)
- Flow: login -> refresh rotation -> multi-tab stability (30-60 minutes)

## Preconditions
- Test user exists and is not disabled.
- Browser profile in normal mode (no extension blocking cookies).
- DevTools open on both app and api domains.

## DevTools Setup
1. App tab -> DevTools -> Application -> Cookies.
2. Confirm cookie `csrfToken` exists for shared domain.
3. API tab -> DevTools -> Application -> Cookies.
4. Confirm cookie `refreshToken` exists, `HttpOnly=true`, `Secure=true`, `SameSite=Lax`, `Path=/auth`.
5. Network panel: enable `Preserve log`.

## Test A: Single-tab 30-minute baseline
1. Login with "Remember me (30 days)" checked.
2. Capture login response (`/auth/login`):
   - response has `token`, `csrfToken`
   - `Set-Cookie: refreshToken` contains `Max-Age=2592000`
3. Keep tab active and use app normally for 30 minutes.
4. Watch `/auth/refresh` calls:
   - status `200`
   - request includes `X-CSRF-Token`
   - request cookies include `refreshToken` and `csrfToken`
5. Expected: no redirect to `/login`, no unauthorized toast.

## Test B: Background wake-up (hidden tab)
1. Login with remember-me.
2. Leave tab hidden for 20 minutes.
3. Return to tab.
4. Expected:
   - app continues authenticated
   - if first refresh fails transiently, app does not immediately logout
   - subsequent interval refresh recovers

## Test C: Multi-tab 60-minute stability
1. Open 3 tabs of app after login.
2. In tab-1 keep active, tab-2 and tab-3 alternate hidden/visible.
3. During 60 minutes:
   - perform actions in each tab every 5-10 minutes
   - monitor `/auth/refresh` and auth channel sync behavior
4. Expected:
   - no forced logout in any tab
   - refresh lock prevents refresh storms
   - all tabs remain authenticated

## Test D: Security hardening validation
1. Login -> call `POST /auth/logout`.
2. Attempt `POST /auth/refresh` with previous cookies.
3. Expected: `401 Invalid or expired refresh token`.
4. In DevTools cookies, verify `csrfToken` is removed (including domain-scoped cookie variant).
5. Disable test user in admin/db.
6. Attempt `POST /auth/refresh` again.
7. Expected: `403 Account is disabled`.

## Failure Signals To Capture
- First logout timestamp.
- Last successful `/auth/refresh` response before logout.
- Cookie snapshot (`refreshToken`, `csrfToken` attributes).
- Request headers for failed refresh (`X-CSRF-Token`, `Cookie`).
- Console errors and API response body.

## Pass Criteria
- No unexpected logout in Test A/B/C.
- Remember-me cookie rotates correctly and keeps `Max-Age=2592000`.
- Security behavior in Test D matches expected `401/403`.

## Rollback Trigger
- Any reproducible logout within 30 minutes under Test A/B/C.
- Refresh requests missing cookies due cookie domain/path mismatch.
- Disabled user still receives new access token on refresh.
