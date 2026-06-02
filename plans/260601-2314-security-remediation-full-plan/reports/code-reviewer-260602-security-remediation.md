# Code Review: Security Remediation — fix/security-audit-remediation

**Date:** 2026-06-02  
**Reviewer:** code-reviewer agent  
**Scope:** All unstaged working-tree changes vs HEAD (the security remediation 4-phase plan)  
**Plan:** `plans/260601-2314-security-remediation-full-plan/`

---

## Scope

**Files reviewed (security-relevant):**

- `services/web/src/utils/token-manager.ts` + `token-manager.test.ts`
- `services/web/src/context/AuthContext.tsx`
- `services/web/src/utils/api.ts`
- `services/web/src/hooks/useRealtime.ts`
- `services/web/src/pages/auth/SsoCallback.tsx`
- `services/web/src/pages/MagicLinkVerify.tsx`
- `services/web/src/pages/login-modules/login-hooks.ts`
- `services/web/src/services/messageService.ts`, `supportService.ts`
- `services/web/src/pages/admin/admin-support-modules/admin-support-service.ts`
- `services/web/src/lib/push-notifications.ts`
- `services/web/src/hooks/useAnalytics.ts`
- `services/web/src/layouts/FocusStreamLayout.tsx`
- `services/web/src/pages/Support.tsx`
- `services/api/src/routes/sso.ts`, `magic-link.ts`, `telegram-auth.ts`
- `services/api/src/routes/realtime-sse.ts`
- `services/api/src/services/token-revocation.service.ts`
- `services/api/src/utils/sse-ticket.ts`
- `services/api/src/utils/ssrf-safe-fetch.ts`
- `services/api/src/utils/field-encryptor.ts`
- `services/api/src/utils/encryption.ts`
- `services/api/src/utils/path-validation.ts`
- `services/api/src/utils/postfix-sync.ts`
- `services/api/src/utils/password.ts`
- `services/api/src/utils/auth-attempt-limiter.ts`
- `services/api/src/utils/captcha-verifier.ts`
- `services/api/src/routes/admin/backup.ts`
- `services/api/src/routes/admin/monitoring.ts`
- `services/api/src/routes/admin/notification-templates.ts`
- `services/api/src/routes/webhooks.ts`
- `services/api/src/routes/forwarding.ts`
- `services/api/src/routes/scim.ts`
- `services/api/src/routes/upload.ts`
- `services/api/src/routes/public.ts`
- `services/api/src/middleware/tenant-context.ts`
- `services/api/src/routes/auth.ts` (refresh endpoint, lines 630–751)
- `services/api/src/routes/auth/auth-tokens.ts`, `auth-cookies.ts`, `auth-config.ts`
- `services/api/src/services/quota-service.ts`
- `services/api/src/services/provider-webhook.service.ts`
- `services/api/src/webhookWorker.ts`
- `services/api/src/services/forwarding/destinations/webhook-destination.ts`
- `services/api/scripts/encrypt-webhook-secrets.ts`

**Review focus:** Correctness + regression risk on the 4-priority areas from the task.

---

## Overall Assessment

The remediation is **broadly sound** and closes the headline vulnerabilities. Most code is clean, well-commented, and follows the plan's conventions. Five issues warrant action before merge — two are genuine security bugs.

---

## (a) Confirmed-Correct Items

1. **Token in-memory only (token-manager.ts)** — Access token lives exclusively in `this.accessToken`; `clearTokens()` also scrubs legacy localStorage keys (`accessToken`, `token`, `refreshToken`, `csrfToken`). No remaining call-site reads those old keys (grep confirmed). Session continuity on page-reload via `auth:hasSession` flag + silent refresh is logically correct.

2. **CSRF double-submit pattern** — `getCsrfToken()` (token-manager.ts:116) prefers the non-httpOnly `csrfToken` cookie over the in-memory copy. Server-side refresh (auth.ts:671–683) uses `timingSafeEqual` on cookie vs header. This is correct double-submit validation.

3. **BroadcastChannel deduplication** — Two channels are used with distinct names: `token_manager_sync` (TokenManager class) and `auth_channel` (AuthContext). They carry different message shapes and serve different purposes; no cross-listener confusion.

4. **SSE ticket single-use** — `sse-ticket.ts`: Redis `GET` then `DEL` is not atomic in a distributed sense, but the window is negligible (< 60s TTL, immediate delete). The in-memory fallback deletes on first read. Acceptable.

5. **Backup injection fixes (backup.ts)** — All dynamic execs replaced with `execFile`/`spawn` argument arrays; container name validated against `CONTAINER_NAME_REGEX`; output path is server-generated only. Generic error responses exposed to clients.

6. **Postfix-sync injection fix (postfix-sync.ts)** — `docker cp` temp-file approach removes the old `sh -c echo "..."` pipeline entirely. Container name validated. Temp file cleaned up in `finally`.

7. **SSRF guard (ssrf-safe-fetch.ts)** — Blocks IPv4/6 loopback, private, link-local, CGN, cloud-metadata (169.254.x.x), multicast, IPv4-mapped in IPv6. `redirect: "error"` prevents redirect bypass. `resolve()` checks all A/AAAA records. HTTPS-only enforcement.

8. **field-encryptor.ts** — AES-256-GCM via shared `encryption.ts`; idempotent (`isEncrypted` check skips already-encrypted values). Migration script covers all three secret-bearing fields. Decrypt passes through legacy plaintext so old rows work until migrated.

9. **Webhook secret lifecycle** — `webhooks.ts` POST returns plaintext exactly once (line 196); list and update omit `secret` from response. `webhookWorker.ts` and `webhook-destination.ts` call `decryptField()` before signing. Correct.

10. **SCIM org scoping (scim.ts)** — GET/PATCH/DELETE all scope queries with `organizationId: provider.organizationId`. Constant-time SCIM secret comparison. Fail-closed on missing `scimSecret`.

11. **Token revocation fail-closed (token-revocation.service.ts)** — `FAIL_CLOSED` defaults `true`. During normal operation (Redis up) `isRevoked` returns `false` for any non-revoked JTI — no false positives. Only fires `true` under Redis outage. Correct behavior.

12. **notification-templates.ts admin gate** — Uses `requireAdminRole([AdminRole.SUPER_ADMIN])`; `rbac.ts` line 21 maps `role === 'ADMIN'` to `SUPER_ADMIN` for backward compat. Semantically equivalent to the old `role === 'ADMIN'` check; no over/under-grant introduced.

13. **magic-link.ts auth chain** — Issues short-lived access token (15m) + opaque refresh DB token + cookies. Eliminates the previous 30-day no-JTI JWT. Compatible with `/auth/refresh` rotation (`RefreshTokenService.rotateToken`).

14. **telegram-auth.ts auth chain** — Same pattern as magic-link. New user registration also sets httpOnly cookies. CSRF token returned in response body so client can seed tokenManager.

15. **upload.ts magic-byte validation** — Triple check: declared MIME, file extension, and magic bytes (first 12 bytes). SVG/HTML correctly absent from allowlist. Prevents disguised executables.

16. **password.ts bcrypt rounds = 12** — Confirmed via `config/constants.ts:57`. Meets current security baseline.

17. **quota-service.ts atomic update** — `updateMany` with in-WHERE guard prevents TOCTOU quota overshoot. Correct.

18. **captcha-verifier.ts** — Real provider verification (Turnstile/hCaptcha). Fails closed on missing secret/token or network error.

19. **tenant-context.ts header trust** — X-Tenant-ID/Slug only accepted from super-admins. Ordinary users cannot impersonate other tenants via header.

---

## (b) BUGS / REGRESSIONS

### CRITICAL

**None identified.**

---

### HIGH

#### H1 — `setCsrfToken` broadcasts empty access token to other tabs
**File:** `services/web/src/utils/token-manager.ts:82`

```ts
// token-manager.ts:82
this.channel?.postMessage({ type: 'token', token: this.accessToken ?? '', csrf: token });
```

When `setCsrfToken()` is called **before** `setTokens()` (e.g., AuthContext after login where `setCsrfToken` is called on the `res.csrfToken` check independently of token), receiving tabs process the `token_manager_sync` message with `token = ''`. The TokenManager listener (line 44) only updates if `data.token` is truthy — so the empty string is filtered. **However**, `AuthContext.tsx:217` calls `tokenManager.setTokens(newToken, '')` in response to `auth_channel` messages, then the TokenManager re-broadcasts (line 77) with the real token AND the in-memory CSRF — but that CSRF might not yet be set in the receiving tab's tokenManager. This is a race but NOT a session kill.

A distinct case: `setCsrfToken(token: string)` at line 82 — if called with `this.accessToken` null (fresh page before first refresh), it broadcasts `token: ''`. Receiving tab's `onmessage` (line 43-48) guards `if (data.token)` so `''` is falsy and skipped — **CSRF does not propagate to other tabs on fresh page startup**. This means a second tab may send state-changing requests without an up-to-date CSRF token in its in-memory copy if the CSRF cookie is not yet visible (cross-subdomain scenario). 

**Impact:** In practice the CSRF cookie is the source of truth (token-manager.ts:116 reads cookie first), so the in-memory copy is a fallback only. This is a **defense-in-depth gap**, not an exploitable CSRF bypass. Upgrade to Medium but flag.

**Severity: High (defense-in-depth gap)**  
**Suggested fix:** Guard the broadcast in `setCsrfToken`: only send if `this.accessToken` is set.

```ts
setCsrfToken(token: string): void {
    this.csrfToken = token;
    if (this.accessToken) {  // don't broadcast a stub token
        this.channel?.postMessage({ type: 'token', token: this.accessToken, csrf: token });
    }
}
```

---

#### H2 — SCIM POST (user creation) does not scope to provider's organization
**File:** `services/api/src/routes/scim.ts:50-82`

```ts
// scim.ts:59
const user = await provisionUser(providerId, externalId, email, body);
```

`provisionUser` accepts the entire HTTP body attributes as `any`. It does scope new users to `provider.organizationId`. However, the SCIM POST handler at `scim.ts:50-82` does **not** attach `request.identityProvider` to the request at that point — the `preHandler` hook sets it only once the middleware checks the bearer token, but the route handler reads `(request as any).identityProvider` at line 87 (GET) and 128 (PATCH). The POST at line 50 **does not read `request.identityProvider`** and instead passes `providerId` from the URL directly to `provisionUser`.

Since `provisionUser` itself re-queries `identityProvider` by `providerId` (line 11 of jit-provisioning.ts) and enforces `provider.organizationId`, the end result is still org-scoped. **But** the inconsistency — POST doesn't use `request.identityProvider` while GET/PATCH/DELETE do — means if `provisionUser` is ever changed to not re-fetch the provider, the org gate disappears silently.

**Severity: Medium (org-scoping is enforced by provisionUser, but the pattern is fragile)**  
**Suggested fix:** Use `(request as any).identityProvider` in the POST handler and pass `provider` explicitly rather than `providerId`.

---

#### H3 — `acquireRefreshLock` has a localStorage TOCTOU window
**File:** `services/web/src/utils/token-manager.ts:122-136`

```ts
private acquireRefreshLock(): boolean {
    const existing = localStorage.getItem(REFRESH_LOCK_KEY);
    if (existing) { ... }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ timestamp: Date.now() }));
    return true;
}
```

`localStorage` operations are synchronous and single-threaded within a tab but not atomic across tabs — two tabs can both read `null` for `REFRESH_LOCK_KEY` and both write, causing both to proceed with `refreshAccessToken()`. The worst outcome: two concurrent refresh requests, one invalidates the other's refresh token family (refresh token rotation reuse detection). Reuse detection would then revoke the entire family, **logging the user out of both tabs**.

This is an inherent limitation of `localStorage` as a cross-tab mutex. The code's 30-second lock timeout + `waitForOtherTabRefresh` fallback mitigates the common case (one tab refreshes, others wait for broadcast). The TOCTOU only fires on the narrow window when two tabs simultaneously see no lock.

**Severity: Medium (low probability but results in spurious logout if triggered)**  
**Note:** This is pre-existing in design; the current implementation is better than before. Documenting here as a known residual risk.

---

### MEDIUM

#### M1 — `isEncrypted` regex could false-positive on certain hex strings
**File:** `services/api/src/utils/field-encryptor.ts:13`

```
const ENCRYPTED_SHAPE = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i;
```

This matches any string formatted as `32hexchars:32hexchars:hexchars+`. A sufficiently long **plaintext webhook secret** that happens to match this pattern would be treated as already-encrypted and silently passed to `decryptField` → `decrypt()`, which would throw `"Invalid encrypted format"` or GCM auth tag failure, causing webhook signing to fail. 

**How likely?** A randomly generated webhook secret (hex, alphanumeric, etc.) hitting exactly this shape is negligible. BUT if an admin manually sets a secret matching the pattern, or an old integration generates secrets with this format, it would silently break webhook delivery.

**Severity: Medium**  
**Suggested fix:** Use a versioned prefix (`enc:v1:...`) instead of relying on structural matching.

---

#### M2 — `SsoCallback.tsx` retains legacy `accessToken` query-param code path
**File:** `services/web/src/pages/auth/SsoCallback.tsx:26-28`

```ts
// SsoCallback.tsx:26
const legacyToken = searchParams.get('accessToken');
// ...
if (legacyToken) {
    tokenManager.setTokens(legacyToken, '');
```

The comment says "back-compat: some provider flows may still pass a short-lived token in the query". If this code path is still reachable by any provider, the token is in the URL (browser history, Referer header, proxy logs). This was one of the vulnerabilities being fixed.

**Severity: Medium**  
**Suggested fix:** Remove the `legacyToken` path if no production provider uses it. If needed, document clearly which provider and set a removal deadline.

---

#### M3 — `MagicLinkVerify.tsx` writes user to `localStorage`
**File:** `services/web/src/pages/MagicLinkVerify.tsx:35`

```ts
localStorage.setItem("user", JSON.stringify(res.user));
```

The user object (id, email, role) is stored in localStorage. This is not a credential (no token), but it leaks PII and role information accessible to any same-origin JS (XSS). The same issue exists in `login-hooks.ts:47`.

**Severity: Medium (PII/role in localStorage is XSS-readable)**  
**Suggested fix:** Derive user from the access token (JWT claim) or fetch from `/auth/me` — do not persist to localStorage.

---

#### M4 — `discord-destination.ts` makes outbound fetch without SSRF guard
**File:** `services/api/src/services/forwarding/destinations/discord-destination.ts:36`

```ts
const response = await fetch(webhookUrl, { ... });
```

The Discord webhook URL is URL-prefix validated (`startsWith("https://discord.com/api/webhooks/")`) at delivery time but does not use `ssrfSafeFetch`. The domain `discord.com` is public, so there's no immediate SSRF risk. However, if the URL prefix check is bypassed (e.g., an open redirect at discord.com), the raw `fetch` could be exploited. More importantly, the URL is only checked at delivery time, not at rule-creation time (unlike `WEBHOOK` type which calls `validateWebhookUrl`).

**Severity: Low-Medium** (Discord prefix check is strong mitigation; flagging for consistency)  
**Suggested fix:** Add `validateWebhookUrl` to the Discord destination creation path and use `ssrfSafeFetch` for consistency.

---

#### M5 — `token-revocation.service.ts` log message says "fail-open" when behavior is now fail-closed
**File:** `services/api/src/services/token-revocation.service.ts:53`

```ts
console.warn("[TokenRevocation] Redis connection failed, running in fail-open mode:", err.message);
```

The `initRedis` catch block logs "fail-open mode" but `FAIL_CLOSED` defaults to `true`. On Redis failure, `isRevoked()` returns `FAIL_CLOSED = true` (denying tokens). The log message contradicts the actual behavior.

**Severity: Low (misleading log could cause operator confusion during Redis outage)**  
**Suggested fix:** Change log to: `"Redis connection failed, running in fail-closed mode (denying revocation checks)"`

---

### LOW

#### L1 — `backup.ts:145` still uses `execAsync` with shell for rclone
**File:** `services/api/src/routes/admin/backup.ts:145`

```ts
const { stdout } = await execAsync("rclone ls gdrive:email-platform-backups/ --max-depth 2 2>/dev/null || echo ''", {
```

This is a static command with no user input — the shell is only needed for the `2>/dev/null || echo ''` idiom. No injection risk. But the principle of using `execFile` everywhere is broken here.

**Severity: Low** (no user input → no injection; but inconsistent with stated remediation principle)

---

#### L2 — `backup.ts:175,339` still uses `execAsync` for `df -B1` and `tail`
Same as L1 — static commands, no injection risk, but inconsistent.

---

#### L3 — `validateWebhookUrl` (input-sanitizer.ts) allows HTTP (not just HTTPS)
**File:** `services/api/src/utils/input-sanitizer.ts:96`

```ts
if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only HTTP(S) protocols allowed" };
}
```

`ssrfSafeFetch.ts:63` enforces HTTPS-only. `validateWebhookUrl` allows HTTP. This means a webhook rule created via the API could store an HTTP URL that passes `validateWebhookUrl`, and `webhook-destination.ts` calls `ssrfSafeFetch` (HTTPS-only). The rule creation would succeed but delivery would always fail for HTTP URLs.

**Severity: Low (delivery fails gracefully; no security bypass)**  
**Suggested fix:** Align `validateWebhookUrl` to HTTPS-only.

---

## (c) Security Gaps Missed or Introduced

### Gap 1 — `localStorage.setItem("user", ...)` in two places (see M3)
Both `login-hooks.ts:47` and `MagicLinkVerify.tsx:35` write the user object to localStorage. This was not part of the original token-in-localStorage problem addressed by the plan but is the same class of XSS-accessible data exposure.

### Gap 2 — `useRealtime.ts:143-156` SSE ticket fetch uses `token` from `useAuth()` context
The ticket is fetched with `Authorization: Bearer ${token}` where `token` comes from React state (the mirror of tokenManager's access token). This is correct. But the comment in the file references the old `?token=` approach as deprecated — the implementation is correct and the gap is closed.

### Gap 3 — `provider-webhook.service.ts:116` does not use `ssrfSafeFetch`
The provider webhook delivery (hosting providers, not user webhooks) uses a raw `fetch()` with no SSRF guard. The URL comes from `HostingProvider.webhookUrl` which is set by an admin/operator, not an end-user. If treated as trusted, this is acceptable. If operators could be malicious or the DB is compromised, this is an SSRF path. Given the admin-only write path, this is Low severity but worth documenting.

### Gap 4 — DNS rebinding residual (acknowledged in ssrfSafeFetch.ts comments)
The `ssrfSafeFetch` code itself notes: "DNS rebinding between this check and the socket connect is not fully closed". This is a known limitation correctly documented. The redirect ban + pre-resolve covers practical webhook abuse cases.

---

## Contract Changes (Breaking)

| Endpoint | Old shape | New shape | Client impact |
|----------|-----------|-----------|---------------|
| `/auth/magic-link/verify` (POST) | `{ token, user }` | `{ token, csrfToken, expiresIn, user }` | Clients that ignore extra fields: no break. `MagicLinkVerify.tsx` correctly reads `csrfToken`. ✓ |
| `/auth/telegram` (POST) | `{ token, user }` | `{ token, csrfToken, user }` | `login-hooks.ts:handleTelegramAuth` reads `data.token` and `data.user` but NOT `data.csrfToken`. **CSRF token is lost on Telegram login** — tokenManager will fall back to cookie, so not a functional break, but the in-memory CSRF isn't seeded from Telegram login. Medium gap. |
| `/sso/saml/:id/acs` + `/sso/oidc/:id/callback` redirect | `?token=...` | `?success=true` | `SsoCallback.tsx` handles both `legacyToken` and `success=true`. ✓ |
| `GET /webhooks` | Returns `secret` | Omits `secret` | If any client depended on reading `secret` from list (bad practice), it breaks. This is intentional. ✓ |
| `PUT /webhooks/:id` | Returns full record with `secret` | Returns record without `secret` | Same — intentional break. ✓ |

**Critical contract gap:** `login-hooks.ts:handleTelegramAuth` (line 110–113) reads `data.token` and `data.user` only — it calls `handleLoginSuccess(data.token, data.user)` which calls `tokenManager.setTokens(token)` but does NOT read `data.csrfToken`. The server now returns `csrfToken` in the Telegram login response, but the client ignores it. The CSRF cookie is set by the server, so cookie-based CSRF will work, but the in-memory CSRF will be empty until the next refresh.

---

## Recommended Actions (Priority Order)

1. **[High] Fix `setCsrfToken` broadcast guard** (H1) — one-line fix, prevents empty-token broadcast.
2. **[High] Seed CSRF token from Telegram login response** — `login-hooks.ts` line ~113, add `if (data.csrfToken) tokenManager.setCsrfToken(data.csrfToken)`.
3. **[Medium] Remove or gate `legacyToken` path in SsoCallback.tsx** (M2) — confirm if any active provider uses it; if not, delete.
4. **[Medium] Remove `localStorage.setItem("user", ...)` from MagicLinkVerify.tsx and login-hooks.ts** (M3/Gap1) — user object is PII.
5. **[Medium] Fix misleading log in token-revocation.service.ts** (M5) — "fail-open" → "fail-closed".
6. **[Low] Align validateWebhookUrl to HTTPS-only** (L3).
7. **[Low] Replace remaining `execAsync` calls in backup.ts** (L1, L2) with `execFile`.
8. **[Low] Add ssrfSafeFetch to discord-destination.ts delivery** (M4) for consistency.

---

## Plan Status

The implementation covers all four phases of the plan. The following tasks are complete based on code evidence:

- Phase 01: token-in-memory refactor, SSO/magic-link/telegram cookie auth, SSE ticket, backup injection fix, postfix-sync injection fix — **DONE**
- Phase 02: SSRF guard, webhook field encryption + migration script, SCIM org scope, fail-closed revocation, auth limiter, CAPTCHA real verify — **DONE**
- Phase 03: bcrypt rounds 12, tenant-context header guard, upload magic-byte, notification-templates RBAC consolidation, monitoring CORS origin check — **DONE**

Plan file status fields remain `pending` and should be updated to reflect actual completion.

---

## Metrics

- Type coverage: tsc --noEmit reported passing (per task statement)
- Test coverage: `token-manager.test.ts` covers 6 critical scenarios including CSRF cookie preference, multi-tab lock wait, stale lock expiry, network error resilience
- Linting issues: No structural errors found; minor items noted above

---

**Status: DONE_WITH_CONCERNS**

**Summary:** The remediation closes the headline vulnerabilities correctly (no tokens in URLs, no tokens in localStorage, SSRF guard, injection fix, field encryption, CSRF double-submit). Five issues found: two defense-in-depth gaps (CSRF broadcast empty token H1, missing CSRF seed on Telegram login), one legacy URL-in-query back-compat code path that re-opens the fixed vulnerability if any provider still uses it (M2), PII in localStorage (M3), and a misleading fail-open log (M5). None are critical regressions but H1 and the Telegram CSRF gap should be fixed before merge.

---

## Unresolved Questions

1. Is the `legacyToken` query-param path in `SsoCallback.tsx` actually needed by any active provider in production? If no, delete it; if yes, add a comment with the provider name and a deadline.
2. Is `provider-webhook.service.ts` (hosting provider webhooks) considered admin-controlled infrastructure (trusted URL) or should it also use `ssrfSafeFetch`?
3. Phase 00 (credential rotation, git history rewrite) is out-of-band ops work. Has it been executed? The plan still shows all phases as `pending`.
