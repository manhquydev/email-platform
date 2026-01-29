# Phase 2: JWT & Token Security

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Depends on:** [Phase 1](./phase-01-critical-bola-idor-fixes.md)
- **Research:** [JWT Token Security](./research/researcher-02-jwt-token-security.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-24 |
| Priority | 🟠 P1 - High |
| Effort | 2-3 days |
| Status | ⬜ Pending |
| Review | ⬜ Not reviewed |

**Description:** Implement JWT revocation, refresh token rotation, and enhanced API key security.

## Key Insights
- Current JWT tokens valid until expiry (no revocation)
- Refresh tokens reusable indefinitely
- API keys lack scope restrictions
- Need Redis for token denylist

## Requirements

### Functional
- Ability to revoke active JWT tokens
- Refresh token rotation on use
- API key scopes and expiration
- Token family revocation on reuse detection

### Non-Functional
- Token validation latency <5ms
- Redis failover handling

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server  │────▶│    Redis    │
│             │     │              │     │  (Denylist) │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │ (RefreshTkn) │
                    └──────────────┘
```

## Related Code Files

| Action | File |
|--------|------|
| 🔧 Modify | `services/api/src/server.ts` |
| 🔧 Modify | `services/api/src/routes/auth.ts` |
| 🔧 Modify | `services/api/src/routes/api-keys.ts` |
| ➕ Create | `services/api/src/services/token-revocation.service.ts` |
| ➕ Create | `services/api/src/services/refresh-token.service.ts` |
| 🔧 Modify | `services/api/prisma/schema.prisma` |

## Implementation Steps

### 1. Create Token Revocation Service
```typescript
// token-revocation.service.ts
export class TokenRevocationService {
  private redis: Redis;

  async revokeToken(jti: string, expiresIn: number): Promise<void> {
    await this.redis.setex(`revoked:${jti}`, expiresIn, '1');
  }

  async isRevoked(jti: string): Promise<boolean> {
    return await this.redis.exists(`revoked:${jti}`) === 1;
  }
}
```

### 2. Add JWT ID (jti) to Tokens
```typescript
// auth.ts - Include jti in token payload
const jti = crypto.randomUUID();
const accessToken = app.jwt.sign({
  userId, role, tier, type: "access", jti
}, { expiresIn: ACCESS_TOKEN_EXPIRY });
```

### 3. Check Revocation in Auth Middleware
```typescript
// server.ts - authenticate decorator
const decoded = await request.jwtVerify();
if (decoded.jti && await tokenRevocation.isRevoked(decoded.jti)) {
  return reply.status(401).send({ error: "Token revoked" });
}
```

### 4. Implement Refresh Token Rotation
```typescript
// Prisma schema addition
model RefreshToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  familyId  String   // For reuse detection
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  @@index([familyId])
}
```

### 5. Add API Key Scopes
```typescript
// Prisma schema addition
model ApiKey {
  // existing fields...
  scopes    String[] @default(["read", "write"])
}

// Scope check in authenticate
if (apiKeyRecord.scopes && !apiKeyRecord.scopes.includes(requiredScope)) {
  return reply.status(403).send({ error: "Insufficient scope" });
}
```

## Todo List

- [ ] Create TokenRevocationService with Redis
- [ ] Add jti claim to all JWT tokens
- [ ] Implement revocation check in auth middleware
- [ ] Create RefreshToken model in Prisma
- [ ] Implement refresh token rotation
- [ ] Add reuse detection and family revocation
- [ ] Add scopes field to ApiKey model
- [ ] Implement scope enforcement
- [ ] Add logout endpoint that revokes tokens
- [ ] Write tests for all new functionality

## Success Criteria

- [ ] Tokens can be revoked and become immediately invalid
- [ ] Refresh tokens rotated on each use
- [ ] Reused refresh token triggers family revocation
- [ ] API keys support scope restrictions
- [ ] All auth tests pass
- [ ] <5ms latency for token validation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Redis unavailable | Low | High | Fallback to allow (with logging) |
| Migration breaks auth | Medium | Critical | Thorough testing, staged rollout |
| Performance impact | Low | Medium | Redis connection pooling |

## Security Considerations

- Hash refresh tokens before storage (Argon2)
- Log all token revocation events
- Set appropriate TTL for Redis keys
- Handle Redis connection failures gracefully

## Next Steps

1. Set up Redis connection if not exists
2. Run Prisma migration
3. Implement services
4. Update auth routes
5. Proceed to Phase 3: Rate Limiting
