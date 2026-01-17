# Research Report: Security Patterns (260117-2310)

## 1. TOTP Encryption Key Validation

**Best Practice:** Validate crypto secrets at app startup, fail fast.

```typescript
// config.ts - Add validation function
function validateTotpKey(key: string): void {
  if (!key || key.length !== 64) {
    throw new Error('TOTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  if (/^0+$/.test(key)) {
    throw new Error('TOTP_ENCRYPTION_KEY cannot be all zeros');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('TOTP_ENCRYPTION_KEY must be valid hex');
  }
}

// Call at startup before server.listen()
validateTotpKey(appConfig.totpEncryptionKey);
```

**Trade-offs:**
- Fail-fast prevents silent security issues
- Requires proper env setup before deployment

## 2. Fastify preHandler Race Condition

**Problem:** `return reply.send()` doesn't stop handler execution.

**Solution:** Throw error instead of returning.

```typescript
// WRONG - race condition
app.decorate("requireAdmin", async (request, reply) => {
  await app.authenticate(request, reply);
  if (reply.sent) return; // Handler may already execute
  if (request.user?.role !== "ADMIN") {
    return reply.status(403).send({ error: "Admin required" });
  }
});

// CORRECT - throw to stop execution
app.decorate("requireAdmin", async (request, reply) => {
  await app.authenticate(request, reply);
  if (!request.user || request.user.role !== "ADMIN") {
    throw app.httpErrors.forbidden("Admin access required");
  }
});
```

**Key Insight:** Fastify `@fastify/sensible` provides `httpErrors` that properly halt execution.

## 3. JWT Refresh Token Pattern

**Industry Standard Lifetimes:**
- Access Token: 15 minutes (stateless, short-lived)
- Refresh Token: 7-30 days (stored in DB/Redis, revocable)

**Implementation:**

```typescript
// Login response
{
  accessToken: jwt.sign(payload, secret, { expiresIn: '15m' }),
  refreshToken: crypto.randomUUID(), // Store in Redis
  expiresIn: 900 // seconds
}

// Refresh endpoint
POST /auth/refresh { refreshToken }
→ Validate refreshToken in Redis
→ Issue new accessToken
→ Optionally rotate refreshToken (sliding expiry)
```

## 4. JWT Blacklist with Redis

**Pattern:** Store revoked token JTI (JWT ID) in Redis with TTL.

```typescript
// On logout or revoke
await redis.setex(`blacklist:${jti}`, JWT_EXPIRY_SECONDS, '1');

// In authenticate middleware
const jti = decoded.jti;
if (await redis.exists(`blacklist:${jti}`)) {
  throw new Error('Token revoked');
}
```

**Trade-offs:**
- Adds Redis lookup per request (~1ms)
- Alternative: Short access tokens + refresh rotation (no blacklist needed)

## Recommended Approach

1. **TOTP Key:** Add validation in `config.ts`, throw on invalid
2. **requireAdmin:** Use `throw httpErrors.forbidden()` pattern
3. **JWT:** Reduce access token to 15min, add refresh token with Redis storage
4. **Blacklist:** Optional - only needed for emergency revocation

## Sources
- OWASP JWT Best Practices
- Fastify Error Handling Docs
- Node.js Crypto Module Docs

## Unresolved Questions
- Should refresh tokens be stored in Redis or PostgreSQL?
- Is 15min access token too aggressive for mobile users?
