# Phase 05: Testing & Security

**Parent**: [plan.md](./plan.md)
**Dependencies**: [Phase 01-04](./plan.md)
**Status**: pending
**Priority**: P1
**Effort**: 1h

## Overview

Comprehensive testing and security validation for Telegram authentication.

## Unit Tests

### 1. Verification Function Tests

```typescript
// services/api/src/test/telegram-auth.test.ts

import { verifyTelegramAuth, isAuthDateFresh } from '../utils/telegram-auth';

describe('verifyTelegramAuth', () => {
  const BOT_TOKEN = 'test:bot_token';

  it('should verify valid Telegram auth data', () => {
    // Generate valid test data with correct hash
    const data = {
      id: 123456789,
      first_name: 'Test',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'computed_valid_hash', // Use actual computation
    };
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(true);
  });

  it('should reject tampered data', () => {
    const data = {
      id: 123456789,
      first_name: 'Test',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'invalid_hash',
    };
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(false);
  });

  it('should handle missing optional fields', () => {
    // Ensure hash computation works without username, photo_url, etc.
  });
});

describe('isAuthDateFresh', () => {
  it('should accept recent auth_date', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isAuthDateFresh(now)).toBe(true);
    expect(isAuthDateFresh(now - 3600)).toBe(true); // 1 hour ago
  });

  it('should reject old auth_date', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isAuthDateFresh(now - 86401)).toBe(false); // >24h ago
  });
});
```

### 2. API Route Tests

```typescript
// services/api/src/test/telegram-auth-routes.test.ts

describe('POST /auth/telegram', () => {
  it('should return JWT for existing linked user', async () => {
    // Create user with telegramId
    // Send valid auth data
    // Expect { token, user }
  });

  it('should return requiresEmail for new Telegram user', async () => {
    // Send valid auth data for unknown telegramId
    // Expect { requiresEmail: true, tempToken }
  });

  it('should reject invalid hash', async () => {
    // Send data with bad hash
    // Expect 401
  });

  it('should reject expired auth_date', async () => {
    // Send data with old auth_date
    // Expect 401
  });

  it('should be rate limited', async () => {
    // Send 11 requests quickly
    // Expect 429 on 11th
  });
});

describe('POST /auth/telegram/complete', () => {
  it('should create user with email', async () => {
    // Get tempToken from /auth/telegram
    // Send with email
    // Expect { token, user }
  });

  it('should reject duplicate email', async () => {
    // Try to complete with existing email
    // Expect 409
  });

  it('should reject expired tempToken', async () => {
    // Wait for token to expire (or mock time)
    // Expect 401
  });
});

describe('POST /auth/telegram/link', () => {
  it('should link Telegram to authenticated user', async () => {
    // Login as existing user
    // Send Telegram auth data
    // Expect { success: true }
  });

  it('should reject if Telegram already linked to another user', async () => {
    // Create user1 with telegramId
    // Login as user2
    // Try to link same telegramId
    // Expect 409
  });
});

describe('DELETE /auth/telegram/unlink', () => {
  it('should unlink Telegram', async () => {
    // User with Telegram + password
    // Unlink
    // Expect success
  });

  it('should block unlink if only auth method', async () => {
    // User with only Telegram (no password, no passkey)
    // Try unlink
    // Expect 400
  });
});
```

## Security Checklist

### HMAC Verification
- [ ] Hash computed correctly (sorted keys, newline separator)
- [ ] Bot token never logged or exposed
- [ ] Constant-time comparison (crypto.timingSafeEqual)

### Timestamp Validation
- [ ] auth_date checked against server time
- [ ] Max age configurable (default 24h)
- [ ] Reject future timestamps

### Rate Limiting
- [ ] `/auth/telegram` - 10/min per IP
- [ ] `/auth/telegram/complete` - 5/min per IP
- [ ] `/auth/telegram/link` - 5/min per user

### Audit Logging
- [ ] `TELEGRAM_LOGIN` - successful login
- [ ] `TELEGRAM_REGISTER` - new user created
- [ ] `TELEGRAM_LINKED` - account linked
- [ ] `TELEGRAM_UNLINKED` - account unlinked
- [ ] `TELEGRAM_AUTH_FAILED` - invalid hash/date

### Input Validation
- [ ] Zod schemas for all request bodies
- [ ] telegramId stored as String (numeric overflow safe)
- [ ] photo_url validated as URL
- [ ] username sanitized (alphanumeric + underscore only)

## Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Frontend
VITE_TELEGRAM_BOT_USERNAME=YourBotName

# Optional
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400  # 24h default
```

## Implementation Steps

1. [ ] Write unit tests for `verifyTelegramAuth` and `isAuthDateFresh`
2. [ ] Write integration tests for all `/auth/telegram/*` routes
3. [ ] Add constant-time hash comparison
4. [ ] Verify rate limiting configuration
5. [ ] Add audit log events
6. [ ] Run full test suite
7. [ ] Manual testing with real Telegram account

## Related Files

- `services/api/src/test/telegram-auth.test.ts` (new)
- `services/api/src/test/telegram-auth-routes.test.ts` (new)
- `services/api/src/utils/telegram-auth.ts`
- `services/api/src/routes/telegram-auth.ts`

## Success Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] HMAC verification rejects tampered data
- [ ] Rate limiting works (verified with manual test)
- [ ] Audit logs created for all auth events
- [ ] No bot token in logs or responses

## Security Review Checklist

| Item | Status | Notes |
|------|--------|-------|
| HMAC-SHA256 verification | pending | |
| auth_date freshness check | pending | Max 24h |
| Rate limiting | pending | 10/min per IP |
| Constant-time comparison | pending | Use timingSafeEqual |
| No token exposure | pending | Check logs |
| Audit logging | pending | All events |
| Input validation | pending | Zod schemas |
