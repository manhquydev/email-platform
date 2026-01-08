# Phase 02: Backend Auth Routes

**Parent**: [plan.md](./plan.md)
**Dependencies**: [Phase 01](./phase-01-database-schema.md)
**Status**: pending
**Priority**: P1
**Effort**: 3h

## Overview

Implement Telegram authentication API endpoints with HMAC-SHA256 verification.

## API Endpoints

### 1. POST /auth/telegram - Login/Register via Telegram

**Request Body** (from Telegram Widget):
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://t.me/i/userpic/...",
  "auth_date": 1704825600,
  "hash": "abc123..."
}
```

**Response (existing user)**:
```json
{
  "token": "jwt...",
  "user": { "id": "uuid", "email": "john@example.com", "role": "USER" }
}
```

**Response (new user - needs email)**:
```json
{
  "requiresEmail": true,
  "tempToken": "short-lived-jwt",
  "telegramUser": { "id": 123456789, "username": "johndoe", "firstName": "John" }
}
```

### 2. POST /auth/telegram/complete - Complete registration with email

**Request Body**:
```json
{
  "tempToken": "short-lived-jwt",
  "email": "john@example.com",
  "password": "optional-for-fallback"
}
```

### 3. POST /auth/telegram/link - Link Telegram to existing account

**Headers**: `Authorization: Bearer <jwt>`

**Request Body**: Same as `/auth/telegram`

### 4. DELETE /auth/telegram/unlink - Unlink Telegram

**Headers**: `Authorization: Bearer <jwt>`

### 5. GET /auth/telegram/status - Check link status

**Headers**: `Authorization: Bearer <jwt>`

**Response**:
```json
{
  "linked": true,
  "telegramId": "123456789",
  "telegramUsername": "johndoe",
  "linkedAt": "2026-01-09T..."
}
```

## Verification Logic

```typescript
// services/api/src/utils/telegram-auth.ts

import crypto from 'crypto';

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...checkData } = data;

  // 1. Build check string (sorted keys, newline separated)
  const checkString = Object.keys(checkData)
    .sort()
    .filter(k => checkData[k] !== undefined && checkData[k] !== '')
    .map(k => `${k}=${checkData[k]}`)
    .join('\n');

  // 2. Secret = SHA256(botToken)
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  // 3. HMAC-SHA256(checkString, secretKey)
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
}

export function isAuthDateFresh(authDate: number, maxAgeSeconds = 86400): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - authDate) < maxAgeSeconds;
}
```

## Implementation Steps

1. [ ] Create `services/api/src/utils/telegram-auth.ts` - verification functions
2. [ ] Create `services/api/src/routes/telegram-auth.ts` - new route file
3. [ ] Implement `POST /auth/telegram` with:
   - HMAC verification
   - auth_date freshness check (24h max)
   - Lookup by telegramId
   - Return JWT or requiresEmail flag
4. [ ] Implement `POST /auth/telegram/complete` for email collection
5. [ ] Implement `POST /auth/telegram/link` (authenticated)
6. [ ] Implement `DELETE /auth/telegram/unlink` (authenticated)
7. [ ] Implement `GET /auth/telegram/status` (authenticated)
8. [ ] Register routes in `server.ts`
9. [ ] Add rate limiting: 10 req/min per IP on auth endpoints

## Zod Schemas

```typescript
const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

const completeRegistrationSchema = z.object({
  tempToken: z.string(),
  email: z.string().email(),
  password: z.string().min(6).optional(),
});
```

## Related Files

- `services/api/src/routes/telegram-auth.ts` (new)
- `services/api/src/utils/telegram-auth.ts` (new)
- `services/api/src/server.ts` (register routes)
- `services/api/src/routes/auth.ts` (reference patterns)

## Success Criteria

- [ ] HMAC verification rejects tampered data
- [ ] Old auth_date (>24h) rejected with 401
- [ ] Existing Telegram user gets JWT
- [ ] New Telegram user gets tempToken + requiresEmail
- [ ] Complete registration creates user with email
- [ ] Link/unlink works for authenticated users
- [ ] All events logged to AuditLog

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bot token exposure | Low | Critical | Keep in env, never log |
| Replay attack | Medium | High | Enforce auth_date < 24h |
| Email collision | Medium | Medium | Check email uniqueness before create |
