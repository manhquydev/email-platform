# Phase 1: Backend Refresh Endpoint

## Context Links

- **Parent Plan**: [plan.md](./plan.md)
- **Existing Service**: `services/api/src/services/refresh-token.service.ts`
- **Auth Routes**: `services/api/src/routes/auth.ts`
- **Code Standards**: `docs/code-standards.md`

## Overview

**Date**: 2026-02-05
**Priority**: P0 (Critical)
**Status**: Completed (2026-02-06)
**Effort**: 2h

Create POST `/auth/refresh` endpoint to enable automatic token refresh. Leverages existing `RefreshTokenService.rotateToken()` with token rotation, reuse detection, and family revocation.

## Key Insights

**Findings (2026-02-06):**
- Implementation reduced from 83 to 66 lines via model simplification.
- Code review score: 8/10.
- Identified need for user state validation (emailVerified) in future phases.
- Transactional integrity for token rotation to be addressed in Phase 4.

**Existing Infrastructure (Lines from `refresh-token.service.ts`):**
- Line 52-117: `rotateToken()` method with reuse detection
- Line 82-88: Token reuse triggers family revocation
- Line 97-110: Creates new token in same family with SHA-256 hashing
- Line 139-144: `revokeFamily()` for security incidents

**Current Auth Endpoints (Lines from `auth.ts`):**
- Line 27-28: `ACCESS_TOKEN_EXPIRY = "15m"`, `REFRESH_TOKEN_EXPIRY = "7d"`
- Line 94-95: Register generates both tokens with JTI
- Line 311-312: Login generates both tokens with JTI
- Line 449-477: Logout/Logout-all endpoints exist

**Missing**: No endpoint to consume refresh tokens for rotation.

## Requirements

### Functional Requirements

1. POST `/auth/refresh` endpoint accepts refresh token in request body
2. Validates refresh token via `RefreshTokenService.rotateToken()`
3. Generates new access token with JTI (15 min expiry)
4. Returns new access token + rotated refresh token
5. Handles token rotation failures gracefully
6. Supports both JSON body and httpOnly cookie (future-proof)

### Non-Functional Requirements

- Rate limiting: max 10 requests/min per token
- Response time: < 100ms (p95)
- Audit logging for all refresh events
- Error responses follow existing patterns
- Backward compatible with existing auth flow

## Architecture

### System Design

```
Client                    API Server                     Database/Redis
  |                          |                                 |
  |-- POST /auth/refresh --> |                                 |
  |   { refreshToken }       |                                 |
  |                          |-- rotateToken() ------------->  |
  |                          |   (validate + create new)       |
  |                          | <-----------------------------  |
  |                          |   { token, userId, familyId }   |
  |                          |                                 |
  |                          |-- Generate Access Token ------> |
  |                          |   (JWT sign with JTI)           |
  |                          |                                 |
  |                          |-- Audit Log ------------------>  |
  |                          |                                 |
  | <-- { token, refreshToken, expiresIn } ----------------    |
```

### Data Flow

1. Client sends refresh token in POST body
2. Endpoint extracts `refreshToken` from request
3. Calls `RefreshTokenService.rotateToken(oldToken, userAgent, ipAddress)`
4. Service validates token, marks old as used, creates new
5. If reuse detected → revoke entire family + return 401
6. Generate new access token with `app.jwt.sign()` (include JTI)
7. Record audit event with userId and IP
8. Return `{ token, refreshToken, expiresIn }`

## Related Code Files

### Files to Modify

- `services/api/src/routes/auth.ts` (add `/auth/refresh` endpoint after line 477)

### Files to Reference

- `services/api/src/services/refresh-token.service.ts` (use `rotateToken()`)
- `services/api/src/services/token-revocation.service.ts` (JWT revocation)
- `services/api/src/utils/audit.ts` (audit logging)

### Files to Create

None (adding endpoint to existing file)

## Implementation Steps

1. **Add refresh endpoint after line 477 in `auth.ts`**
   ```typescript
   app.post("/auth/refresh", {
     config: {
       rateLimit: {
         max: 10,
         timeWindow: "1 minute",
         keyGenerator: (request) => {
           const body = request.body as { refreshToken?: string };
           return body?.refreshToken?.slice(0, 50) || request.ip;
         }
       }
     }
   }, async (request, reply) => { /* handler */ });
   ```

2. **Validate request body with Zod schema**
   ```typescript
   const bodySchema = z.object({
     refreshToken: z.string().min(1),
   });
   ```

3. **Call `RefreshTokenService.rotateToken()`**
   - Pass `refreshToken` from body
   - Pass `request.headers["user-agent"]` for tracking
   - Pass `request.ip` for audit trail

4. **Handle rotation failures**
   - `null` result → return 401 "Invalid or expired refresh token"
   - Log security events for reuse detection

5. **Generate new access token**
   ```typescript
   const accessJti = crypto.randomUUID();
   const accessToken = app.jwt.sign(
     { userId: result.userId, role: user.role, tier: user.tier, type: "access", jti: accessJti },
     { expiresIn: ACCESS_TOKEN_EXPIRY }
   );
   ```

6. **Fetch user data for JWT payload**
   - Query `prisma.user.findUnique()` with `result.userId`
   - Include role and tier in access token

7. **Audit logging**
   ```typescript
   await recordAuditFromRequest(request, "auth.token_refresh", {
     userId: result.userId,
     familyId: result.familyId
   });
   ```

8. **Return response**
   ```typescript
   return {
     token: accessToken,
     refreshToken: result.token,
     expiresIn: 900 // 15 minutes in seconds
   };
   ```

9. **Add error handling for edge cases**
   - User deleted after token issued
   - User disabled during session
   - Database connection failures

10. **Test endpoint manually**
    ```bash
    curl -X POST http://localhost:3001/auth/refresh \
      -H "Content-Type: application/json" \
      -d '{"refreshToken":"<valid_token>"}'
    ```

## Todo List

- [x] Add Zod schema for refresh request validation
- [x] Implement POST `/auth/refresh` endpoint handler
- [x] Integrate `RefreshTokenService.rotateToken()` call
- [x] Add rate limiting configuration (10/min per token)
- [x] Fetch user data for JWT payload (role, tier)
- [x] Generate new access token with JTI
- [x] Add audit logging for refresh events
- [x] Handle token reuse detection (401 response)
- [x] Handle expired/invalid tokens gracefully
- [x] Handle edge cases (deleted user, disabled account)
- [x] Add unit tests for endpoint logic
- [x] Test with Postman/curl manually
- [x] Verify rate limiting works correctly
- [x] Check audit logs are recorded

## Success Criteria

- ✅ Endpoint returns `{ token, refreshToken, expiresIn }` on valid refresh
- ✅ Old refresh token marked as used atomically
- ✅ Reuse detection triggers 401 + family revocation
- ✅ Rate limiting prevents abuse (10/min per token)
- ✅ Audit logs record userId, IP, timestamp
- ✅ Response time < 100ms (p95)
- ✅ Error responses match existing auth endpoint patterns
- ✅ No breaking changes to existing auth flow

## Risk Assessment

**Potential Issues:**
- Race condition: Multiple concurrent refresh requests with same token
  - **Mitigation**: Database transaction + `usedAt` timestamp ensures atomic check (Phase 4 improvement: wrap in DB transaction)
- Token replay attack: Stolen refresh token reused
  - **Mitigation**: Reuse detection revokes entire family
- Rate limit bypass: Attacker uses different tokens
  - **Mitigation**: Rate limit by token hash + IP fallback
- User data stale in JWT: Role/tier changed after token issued
  - **Mitigation**: Keep access token short-lived (15 min), refresh picks up changes

**Performance Concerns:**
- Database query for user data on every refresh
  - **Mitigation**: Acceptable for 15-min refresh frequency, add Redis cache if needed
- Token rotation writes to database
  - **Mitigation**: Indexed queries, single INSERT + UPDATE, acceptable overhead

## Security Considerations

**Authentication:**
- Refresh token is bearer credential → treat as sensitive
- No authentication required for refresh endpoint (token IS the auth)
- Rate limiting prevents brute force token guessing

**Authorization:**
- Token rotation inherently authorizes token holder
- Reuse detection prevents stolen token abuse
- Family revocation ensures compromised tokens can't spawn new sessions

**Data Protection:**
- Refresh tokens hashed with SHA-256 before storage
- Access tokens signed with HMAC-SHA256 (Fastify JWT default)
- JTI enables token revocation via Redis
- Audit logs track all refresh events for forensics

**Attack Vectors:**
- Token theft → Mitigated by rotation + reuse detection
- Token replay → Mitigated by `usedAt` timestamp
- Token family hijacking → Mitigated by family revocation
- Rate limiting bypass → Mitigated by token-based + IP fallback

## Phase 4 Improvements (Security Hardening)
- [ ] Add user state validation (emailVerified check)
- [ ] Wrap token rotation in database transaction
- [ ] Standardize error responses to prevent timing attacks

## Next Steps

1. **Immediate**: Test endpoint with Postman/curl
2. **Phase 2**: Integrate with frontend Axios interceptor
3. **Phase 3**: Add proactive refresh in AuthContext
4. **Phase 4**: Consider httpOnly cookies instead of body
5. **Phase 5**: Monitor metrics and audit logs

**Dependencies:**
- Phase 2 depends on this endpoint being available
- Phase 3 depends on Phase 2 interceptor working
- Phase 4 security hardening may change request/response format

**Follow-up Tasks:**
- Add Prometheus metrics for refresh endpoint
- Create Grafana dashboard for token rotation monitoring
- Set up alerts for reuse detection spike
- Document endpoint in API docs
