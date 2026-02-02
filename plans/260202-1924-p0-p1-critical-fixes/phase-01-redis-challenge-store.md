---
parent: plan.md
priority: P0
status: pending
effort: 2h
---

# Phase 1: Redis Challenge Store Migration

## Context
- **Issue:** `services/api/src/routes/anonymous-auth.ts:13` uses in-memory `Map` for WebAuthn challenges
- **Impact:** Breaks horizontal scaling - challenges stored on instance A won't be found on instance B
- **Risk:** High - authentication failures in multi-instance deployments

## Key Insights
- Redis already configured in project (`ioredis` installed)
- Pattern exists in `token-revocation.service.ts` using `redis.setex()`
- Challenge TTL: 5 minutes (300 seconds)

## Related Code Files

### Modify
- `services/api/src/routes/anonymous-auth.ts` - Replace Map with Redis

### Reference
- `services/api/src/config/redis.ts` - Redis config
- `services/api/src/services/token-revocation.service.ts` - Pattern example

## Implementation Steps

1. **Import Redis client**
   ```typescript
   import Redis from "ioredis";
   import { redisConfig } from "../config/redis";
   ```

2. **Initialize Redis connection**
   ```typescript
   const redis = new Redis(redisConfig);
   const CHALLENGE_PREFIX = "auth:challenge:";
   const CHALLENGE_TTL_SECONDS = 300;
   ```

3. **Replace helper functions** (make async)
   ```typescript
   async function setChallenge(key: string, challenge: string): Promise<void> {
     await redis.set(`${CHALLENGE_PREFIX}${key}`, challenge, "EX", CHALLENGE_TTL_SECONDS);
   }

   async function getChallenge(key: string): Promise<string | null> {
     return await redis.get(`${CHALLENGE_PREFIX}${key}`);
   }

   async function deleteChallenge(key: string): Promise<void> {
     await redis.del(`${CHALLENGE_PREFIX}${key}`);
   }
   ```

4. **Remove cleanup interval** - Redis TTL handles expiration automatically

5. **Update all call sites** to use `await`

6. **Add error handling** for Redis connection failures

## Todo List
- [ ] Import Redis and config
- [ ] Create async helper functions with key prefix
- [ ] Remove `setInterval` cleanup code
- [ ] Remove in-memory `Map` declaration
- [ ] Update route handlers to await helpers
- [ ] Add try-catch for Redis errors
- [ ] Test WebAuthn registration flow
- [ ] Test WebAuthn authentication flow

## Success Criteria
- [ ] Challenges persist across API restarts
- [ ] Challenges accessible from any API instance
- [ ] Challenges auto-expire after 5 minutes
- [ ] All WebAuthn tests pass

## Security Considerations
- Key prefix prevents collision with other Redis data
- TTL prevents stale challenge accumulation
- No sensitive data logged
