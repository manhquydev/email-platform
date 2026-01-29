# Phase 3: Rate Limiting Enhancement

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Depends on:** [Phase 2](./phase-02-jwt-token-security.md)
- **Research:** [OWASP API Security](./research/researcher-01-owasp-api-security.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-24 |
| Priority | 🟠 P1 - High |
| Effort | 1-2 days |
| Status | ⬜ Pending |
| Review | ⬜ Not reviewed |

**Description:** Enhance rate limiting with per-user limits, stricter 2FA protection, and remove localhost bypass in production.

## Key Insights
- Current: localhost IPs bypass rate limiting
- Per-IP limits vulnerable in shared environments
- 2FA brute force: 5 attempts/5min may be insufficient
- Need exponential backoff for sensitive endpoints

## Requirements

### Functional
- Per-user rate limiting for authenticated routes
- Exponential backoff for 2FA attempts
- Remove localhost bypass in production
- Tiered limits based on user tier

### Non-Functional
- Distributed rate limiting via Redis
- No single point of failure

## Architecture

```
Request → Rate Limit Check → Auth → Business Logic
              ↓
         ┌────────────┐
         │   Redis    │
         │ (Counters) │
         └────────────┘
```

## Related Code Files

| Action | File |
|--------|------|
| 🔧 Modify | `services/api/src/server.ts` |
| 🔧 Modify | `services/api/src/routes/auth.ts` |
| ➕ Create | `services/api/src/middleware/rate-limit-config.ts` |

## Implementation Steps

### 1. Remove Localhost Bypass in Production
```typescript
// server.ts
app.register(rateLimit, {
  max: appConfig.rateLimitMax,
  timeWindow: appConfig.rateLimitTimeWindow,
  allowList: process.env.NODE_ENV !== 'production'
    ? ["127.0.0.1", "::1"]
    : [],
  redis: redisClient, // Distributed rate limiting
});
```

### 2. Per-User Rate Limiting
```typescript
// rate-limit-config.ts
export const userRateLimitConfig = {
  keyGenerator: (request: FastifyRequest) => {
    const user = request.user as { userId?: string };
    return user?.userId || request.ip;
  },
  max: (request: FastifyRequest) => {
    const tier = (request.user as any)?.tier || 'FREE';
    return TIER_RATE_LIMITS[tier];
  }
};

const TIER_RATE_LIMITS = {
  FREE: 100,
  STARTER: 500,
  PROFESSIONAL: 2000,
  ENTERPRISE: 10000
};
```

### 3. 2FA Exponential Backoff
```typescript
// auth.ts - Enhanced 2FA rate limiting
app.post("/auth/2fa/verify", {
  config: {
    rateLimit: {
      max: async (request, key) => {
        const attempts = await redis.get(`2fa:attempts:${key}`);
        if (attempts >= 3) return 0; // Block after 3 attempts
        return 3;
      },
      timeWindow: async (request, key) => {
        const failures = await redis.get(`2fa:failures:${key}`);
        // Exponential backoff: 1min, 5min, 15min, 1hour
        const backoffs = [60000, 300000, 900000, 3600000];
        return backoffs[Math.min(failures, 3)] || 3600000;
      },
      keyGenerator: (request) => {
        const body = request.body as { tempToken?: string };
        return body?.tempToken?.slice(0, 50) || request.ip;
      },
    },
  },
}, async (request, reply) => { ... });
```

### 4. Sensitive Endpoint Stricter Limits
```typescript
// Stricter limits for auth endpoints
const AUTH_RATE_LIMITS = {
  '/auth/login': { max: 5, timeWindow: '5 minutes' },
  '/auth/register': { max: 3, timeWindow: '1 hour' },
  '/auth/forgot-password': { max: 2, timeWindow: '15 minutes' },
  '/auth/2fa/verify': { max: 3, timeWindow: 'dynamic' },
};
```

## Todo List

- [ ] Configure Redis for distributed rate limiting
- [ ] Remove localhost bypass in production
- [ ] Implement per-user rate limiting
- [ ] Add tier-based rate limits
- [ ] Implement 2FA exponential backoff
- [ ] Add rate limit headers to responses
- [ ] Write tests for rate limiting
- [ ] Monitor rate limit metrics

## Success Criteria

- [ ] No localhost bypass in production
- [ ] Rate limits applied per-user when authenticated
- [ ] 2FA has exponential backoff
- [ ] Rate limit headers in responses
- [ ] Metrics visible in Prometheus/Grafana

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legitimate users blocked | Medium | Medium | Tier-based limits, clear errors |
| Redis failure | Low | High | Fallback to in-memory |
| Bypass via proxy | Low | Medium | X-Forwarded-For validation |

## Security Considerations

- Log rate limit violations for security monitoring
- Alert on sustained rate limit hits
- Consider CAPTCHA for repeated violations

## Next Steps

1. Test rate limits in staging
2. Monitor false positive rate
3. Proceed to Phase 4: Input Validation
