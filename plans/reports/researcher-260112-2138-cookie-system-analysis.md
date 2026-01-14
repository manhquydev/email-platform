# Cookie System Analysis Report

**Date:** 2026-01-12 | **Status:** Complete

## Executive Summary

This project does **NOT use HTTP cookies** for authentication or session management. Instead, it uses a **localStorage + JWT token** approach.

---

## Security Audit Results

### 1. CSP Headers Configuration

| Aspect | Status | Details |
|--------|--------|---------|
| Helmet installed | ✅ | `@fastify/helmet` registered globally |
| CSP configured | ⚠️ | Using **default Helmet CSP** - no custom config |
| crossOriginResourcePolicy | ✅ | Set to `cross-origin` for static assets |

**Current config** (`server.ts:95-98`):
```javascript
app.register(helmet, {
  global: true,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});
```

**Default Helmet CSP includes:**
- `default-src 'self'`
- `script-src 'self'` (blocks inline scripts)
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data:`

### 2. Email Sanitization (XSS Protection)

| Component | Sanitization | Method |
|-----------|-------------|--------|
| `MessageDetail.tsx` | ✅ | `DOMPurify.sanitize(htmlBody)` |
| `message-detail.tsx` | ✅ | `DOMPurify.sanitize()` with `USE_PROFILES: {html: true}` |
| `AdminEmails.tsx` | ✅ | `DOMPurify.sanitize(htmlBody)` |

**All 3 files using `dangerouslySetInnerHTML` are properly sanitized with DOMPurify.**

### 3. Backend Email Sanitizer

`services/api/src/utils/email-sanitizer.ts` provides:
- ✅ Tracking pixel removal (1x1 images, known domains)
- ✅ Tracking link rewriting
- ✅ Script tag removal for analytics/tracking
- ✅ Privacy header sanitization
- ✅ UTM parameter stripping

---

## Security Assessment Summary

| Category | Risk Level | Status |
|----------|------------|--------|
| XSS via email content | 🟢 Low | DOMPurify on all HTML renders |
| XSS via inline scripts | 🟢 Low | Helmet CSP blocks inline |
| Token theft via XSS | 🟡 Medium | localStorage readable by JS |
| CSRF | 🟢 None | No cookies = no CSRF |
| Tracking protection | 🟢 Good | Backend sanitizer active |

## Current Authentication Architecture

### Backend (Fastify API)
- **No cookie plugin installed** - `@fastify/cookie` not in dependencies
- Uses `@fastify/jwt` for token signing/verification
- Tokens returned in JSON response body, not Set-Cookie headers
- Authentication via `Authorization: Bearer <token>` header or `X-API-Key` header

### Frontend (React)
- **localStorage-based token storage** via `useLocalStorage` hook
- Token stored at key `"token"` in localStorage
- Token passed in `Authorization` header for API calls
- No cookies set or read by frontend code

## Token Flow

```
1. User login → POST /auth/login
2. API returns { token: "jwt...", user: {...} }
3. Frontend stores token in localStorage
4. Subsequent requests include Authorization: Bearer <token>
5. Logout clears localStorage token
```

## Key Files

| File | Purpose |
|------|---------|
| `services/api/src/server.ts` | JWT plugin registration, authenticate decorator |
| `services/api/src/routes/auth.ts` | Login/register endpoints, token generation |
| `services/web/src/context/AuthContext.tsx` | Token state management |
| `services/web/src/hooks/useLocalStorage.ts` | localStorage wrapper |
| `services/web/src/utils/api.ts` | API calls with Authorization header |

## Security Characteristics

### Current Approach (localStorage + JWT)
| Aspect | Status |
|--------|--------|
| XSS Protection | ❌ Vulnerable - JS can read localStorage |
| CSRF Protection | ✅ Not vulnerable - no cookies |
| Token Expiry | ✅ 30-day expiry in JWT |
| 2FA Support | ✅ TOTP with backup codes |
| API Key Auth | ✅ Alternative auth via X-API-Key |

### If Cookies Were Used (httpOnly)
| Aspect | Status |
|--------|--------|
| XSS Protection | ✅ httpOnly cookies not readable by JS |
| CSRF Protection | ❌ Would need CSRF tokens |
| Complexity | Higher - need cookie config, CORS credentials |

## Privacy Policy Reference

From `services/web/src/pages/Legal/PrivacyPolicy.tsx`:
> "Không cookies theo dõi: Chỉ sử dụng cookies thiết yếu cho xác thực"

Translation: "No tracking cookies: Only essential cookies for authentication"

**Note:** This is technically inaccurate - the app uses localStorage, not cookies.

## Dependencies Related to Cookies

| Package | Location | Purpose |
|---------|----------|---------|
| `cookie` | API (transitive via light-my-request) | Testing only |
| `cookiejar` | API (dev, via supertest) | Testing only |
| `set-cookie-parser` | API (transitive) | Testing only |

No runtime cookie dependencies in production code.

## Recommendations (If Cookie Migration Desired)

1. Install `@fastify/cookie` on backend
2. Set token via `reply.setCookie()` with:
   - `httpOnly: true`
   - `secure: true` (production)
   - `sameSite: 'strict'`
   - `path: '/'`
   - `maxAge: 30 * 24 * 60 * 60` (30 days)
3. Add CSRF protection middleware
4. Update frontend to use `credentials: 'include'` in fetch
5. Update CORS config for credentials

## Conclusion

The project uses **localStorage + JWT Bearer tokens** - no HTTP cookies involved. This is a deliberate architectural choice that simplifies CORS handling but requires XSS mitigation at the application level.
