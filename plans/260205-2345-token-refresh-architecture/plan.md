---
title: "Token Refresh Architecture Implementation"
description: "Fix session timeout issues by implementing automatic token refresh with OAuth2 best practices"
status: in-progress
priority: P0
effort: 9h
branch: main
tags: [authentication, security, session-management, oauth2]
created: 2026-02-05
---

# Token Refresh Architecture Implementation

## Problem Statement

Users are being logged out every 15 minutes during active usage due to access token expiration without automatic refresh mechanism.

**Current Issues:**
- Access tokens expire after 15 minutes (hardcoded in `services/api/src/routes/auth.ts:27`)
- Frontend has NO auto-refresh mechanism
- Users lose session even when actively using the app
- Refresh tokens (7 days) exist but are NOT utilized

## Solution Overview

Implement OAuth2-compliant token refresh architecture with:
- Backend `/auth/refresh` endpoint leveraging existing `RefreshTokenService`
- Frontend Axios interceptor for automatic 401 retry
- Proactive token refresh (< 5 min remaining)
- Request queue during refresh to prevent race conditions
- Security hardening (httpOnly cookies, CSRF protection, reuse detection)

## Implementation Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-backend-refresh-endpoint.md) | Backend Refresh Endpoint | 2h | Completed (2026-02-06) |
| [Phase 2](./phase-02-frontend-token-interceptor.md) | Frontend Token Interceptor | 3h | Completed (2026-02-06) |
| [Phase 3](./phase-03-auth-context-management.md) | AuthContext + Token Management | 1.5h | Completed (2026-02-06) |
| [Phase 4](./phase-04-security-hardening.md) | Security Hardening | 1h | Pending |
| [Phase 5](./phase-05-edge-cases-testing.md) | Edge Cases + Testing | 1.5h | Pending |

## Critical Dependencies

**Already Implemented (Leverage These):**
- ✅ `RefreshTokenService` with token rotation (`services/api/src/services/refresh-token.service.ts`)
- ✅ Token family tracking with reuse detection
- ✅ Redis-based JWT revocation service
- ✅ Secure SHA-256 token hashing

**Missing Components (Must Build):**
- ❌ No `/auth/refresh` HTTP endpoint (service exists, no route)
- ❌ No frontend Axios interceptor for 401 retry
- ❌ No proactive token refresh (< 5 min remaining)
- ❌ No request queue during refresh

## Architecture Constraints

- Must work with existing Fastify JWT setup (`services/api/src/server.ts`)
- Must integrate with existing `RefreshTokenService.rotateToken()` method
- Must support both API key and JWT auth (backward compatible)
- Frontend uses simple `fetch` wrapper (`services/web/src/utils/api.ts`) → migrate to Axios

## Success Criteria

- ✅ Users NOT logged out during active usage
- ✅ Sessions persist 7-30 days as desired
- ✅ Zero UX interruption (silent background refresh)
- ✅ < 100ms overhead for token refresh
- ✅ Pass security audit (OWASP top 10)
- ✅ No race conditions with concurrent requests

## Security Considerations

- Token rotation prevents replay attacks
- Reuse detection triggers family revocation
- Rate limiting prevents abuse (max 10 refresh/min per token)
- httpOnly cookies preferred over localStorage
- CSRF protection via SameSite=Strict
- Audit logging for all refresh events

## Next Steps After Completion

1. Monitor refresh endpoint metrics (response time, error rate)
2. Analyze audit logs for suspicious patterns
3. Consider extending refresh token expiry to 30 days
4. Implement "Remember Me" functionality
5. Add device management UI (view/revoke sessions)

## Unresolved Questions

- Should refresh tokens use httpOnly cookies or localStorage? (Phase 4 decision)
- Should we implement device fingerprinting? (Privacy concerns)
- What's the ideal proactive refresh threshold? (5 min vs 3 min vs 10 min)
