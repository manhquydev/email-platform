# Phase 3: Rate Limiting

## Overview
- **Priority**: P2
- **Effort**: 1h
- **Status**: Pending

## Requirements
Add rate limiting to provider API routes:
- 100 requests/minute per providerId
- Return 429 with retry-after header

## Files to Modify
- `services/api/src/routes/provider.ts` - Add rate limit middleware
- `services/api/src/middleware/` - Create provider-rate-limit.ts if needed

## Todo
- [ ] Create rate limit middleware for provider routes
- [ ] Apply to all /v1/provider/* endpoints
- [ ] Add X-RateLimit-* headers to responses
