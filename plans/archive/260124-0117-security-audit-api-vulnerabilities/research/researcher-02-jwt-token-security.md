# Research Report: JWT Security & Token Management

## Executive Summary
Current security posture (JWT + API Key) lacks revocation and rotation capabilities. Implementing **Refresh Token Rotation** with reuse detection is critical to mitigate token theft. **Redis** is recommended for short-lived revocation blacklists and rate limiting, while the primary database (Postgres) should store hashed long-lived refresh tokens and API keys.

## 1. JWT Revocation Strategies

Since JWTs are stateless, revocation requires adding state.

### Strategy A: Allowlist (Database/Redis)
- **Mechanism:** Store valid `jti` (JWT ID) or `session_id` in DB/Redis. Check existence on *every* request.
- **Pros:** Immediate revocation, strict control.
- **Cons:** High latency (db hit per request), defeats stateless benefits.

### Strategy B: Denylist / Blocklist (Recommended)
- **Mechanism:** When logging out/revoking, store the JWT's `jti` in Redis with TTL = remaining token lifetime.
- **Check:** Middleware checks if `jti` exists in Redis. If yes -> 401.
- **Pros:** Low latency, records automatically expire (Redis TTL), only stores revoked tokens (smaller dataset).
- **Cons:** Small window of vulnerability if Redis goes down.

**Implementation Pattern (Fastify):**
```javascript
// Logout Route
await redis.set(`blacklist:${jti}`, 'revoked', 'EX', decoded.exp - Date.now()/1000);

// Hook/Decorator
fastify.addHook('onRequest', async (req) => {
  if (req.user && await redis.get(`blacklist:${req.user.jti}`)) {
    throw new Error('Token revoked');
  }
});
```

## 2. Refresh Token Rotation (RTR)

Mitigates impact of stolen long-term credentials.

### Pattern: Rotation on Reuse Detection
1. **Issue:** Client sends valid Refresh Token (RT-A).
2. **Rotate:** Server invalidates RT-A, issues RT-B.
3. **Theft Scenario:** Attacker tries to use RT-A later.
4. **Detection:** Server sees RT-A is already used/invalid.
5. **Action:** Server **revokes entire token family** (RT-B and all descendants). User forced to re-login.

**Storage Schema (Postgres):**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  token_hash VARCHAR NOT NULL,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL, -- Links rotation chain
  is_revoked BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL
);
```

## 3. API Key Security Best Practices

API Keys are long-lived credentials equivalent to passwords.

### Storage & Handling
- **Hashing:** NEVER store plain text. Store `scrypt` or `argon2` hash.
- **Display:** Show full key *only once* upon creation.
- **Prefixing:** Use identifiable prefixes (e.g., `ephemera_live_...`) to allow secret scanning tools to detect leaks.

### Control Mechanisms
- **Scopes:** granular permissions column (e.g., `["email:send", "analytics:read"]`).
- **Expiration:** Optional `expires_at` for temporary access.
- **Last Used:** Track `last_used_at` to identify and prune stale keys.

## 4. 2FA Brute Force Protection

Protect against code guessing attacks.

### Algorithm
1. **Rate Limit:** 3 attempts per 60 seconds (Redis sliding window).
2. **Exponential Backoff:** After limit hit, block for: 1m -> 5m -> 15m -> Lock Account.
3. **Identifier:** Rate limit by `user_id` AND `ip_address`.

## 5. Storage Comparison: Redis vs Database

| Feature | Redis | Database (Postgres) | Use Case |
| :--- | :--- | :--- | :--- |
| **Speed** | Extremely High (<1ms) | Moderate (5-20ms) | High-frequency checks (Blacklist, Rate Limit) |
| **Persistence** | Volatile (usually) | Strong ACID | Long-term data (Refresh Tokens, API Keys) |
| **TTL Support** | Native (Auto-expire) | Requires cron jobs | JWT Blacklist, 2FA codes |
| **Querying** | Key-Value (Limited) | Complex Relations | Analytics, complex auth queries |

## Unresolved Questions
- Does current Fastify setup use a centralized Redis instance available for both caching and auth?
- Are API keys currently used for server-to-server or client-side access? (Client-side requires stricter CORS/Scopes).

## Sources
- [Refresh Token Rotation Best Practices](https://medium.com/vertexaisearch-redirect)
- OWASP Cheat Sheet Series: Session Management
- RFC 6749 (OAuth 2.0) Section 10.4
