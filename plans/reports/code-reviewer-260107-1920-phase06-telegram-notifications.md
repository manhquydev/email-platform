# Code Review Summary - Phase 06: Public Inbox Viewer Telegram Notifications

**Review ID:** ac16ada
**Date:** 2026-01-07
**Rating:** 8.5/10

---

## Scope

- Files reviewed:
  - `services/api/src/services/telegramBot.ts` (notifyInboxTelegramSubscribers, webhook handler)
  - `services/api/src/services/inbox-telegram-service.ts` (new service)
  - `services/api/src/worker.ts` (per-inbox notification call)
  - `services/api/src/test/public-inbox.test.ts` (new)
  - `services/api/src/test/inbox-telegram.test.ts` (new)
- Lines analyzed: ~500
- Focus: Phase 06 implementation - per-inbox Telegram notifications

---

## Overall Assessment

Solid implementation with good separation of concerns. Non-blocking notification handling correctly implemented. Test coverage is comprehensive. Minor improvements possible in error handling and edge cases.

---

## Critical Issues

**None found.**

---

## High Priority Findings

### 1. Potential Database Logging Failure in Notification Loop (telegramBot.ts:479-490)

```typescript
} catch (err: any) {
    await prisma.telegramNotificationLog.create({...});
}
```

**Issue:** If the logging itself fails (e.g., DB connection issue), it throws and stops processing remaining subscribers.

**Recommendation:** Wrap logging in try-catch or use Promise.allSettled for the entire loop.

### 2. Sequential Processing of Notifications (telegramBot.ts:458-491)

**Issue:** `notifyInboxTelegramSubscribers` processes subscribers sequentially with `for...of` loop. With many subscribers, this could cause delays.

**Recommendation:** Consider `Promise.allSettled` for parallel processing with individual error handling per subscriber.

---

## Medium Priority Improvements

### 1. Token Validation Logic (inbox-telegram-service.ts:101-107)

```typescript
const tokenRecord = await prisma.inboxTelegramAuthToken.findFirst({
    where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() },
    },
});
```

**Note:** Uses `findFirst` instead of `findUnique` for token lookup. Acceptable since token has `@unique` constraint, but `findUnique` would be more explicit and slightly more performant.

### 2. Missing Rate Limiting on Token Generation API

**Issue:** `POST /api/public/telegram/generate-token` has no rate limiting. Attacker could spam token generation for an inbox.

**Recommendation:** Add rate limiting (e.g., max 5 requests per minute per inboxEmail).

### 3. Error Message Exposure (inbox-telegram-service.ts:35)

```typescript
throw new Error(`Maximum ${MAX_LINKS_PER_INBOX} Telegram links per inbox`);
```

**Note:** Exposes internal limit. Not a security issue but could be cleaner with generic message.

### 4. Dynamic Import in Webhook Handler (telegramBot.ts:510)

```typescript
const { linkInboxToTelegram } = await import("./inbox-telegram-service");
```

**Note:** Dynamic import is used to avoid circular dependency. This is acceptable but adds slight overhead per webhook call.

---

## Low Priority Suggestions

### 1. Type Safety Enhancement (telegramBot.ts:479)

```typescript
} catch (err: any) {
```

**Suggestion:** Use `unknown` type with proper type narrowing instead of `any`.

### 2. Magic Numbers (inbox-telegram-service.ts:6-7)

```typescript
const MAX_LINKS_PER_INBOX = 5;
const TOKEN_EXPIRY_HOURS = 24;
```

**Note:** Good practice to have constants, but consider moving to config file for easier adjustment.

### 3. Test Cleanup Order (public-inbox.test.ts:42-47)

```typescript
await prisma.inbox.delete({ where: { id: testInboxId } }).catch(() => {});
```

**Note:** Using `.catch(() => {})` silences errors. Consider logging cleanup failures for debugging.

---

## Positive Observations

1. **Non-blocking design:** Telegram notifications in worker.ts wrapped in try-catch, failures don't block email processing
2. **PII Protection:** `sourceIp` correctly excluded from public API responses (test at line 116 verifies this)
3. **Comprehensive tests:** Both service functions and API endpoints tested with positive/negative cases
4. **Link limit enforcement:** MAX_LINKS_PER_INBOX prevents abuse
5. **Token reuse prevention:** Expired/used tokens properly rejected
6. **Status logging:** TelegramNotificationLog tracks success/failure for debugging
7. **Graceful error messages:** User-facing messages in Vietnamese match existing patterns

---

## Recommended Actions

1. **[HIGH]** Add error handling around notification log creation to prevent loop termination
2. **[MEDIUM]** Add rate limiting to token generation endpoint
3. **[MEDIUM]** Consider parallel notification sending with `Promise.allSettled`
4. **[LOW]** Replace `err: any` with proper unknown type handling

---

## Security Audit

| Check | Status |
|-------|--------|
| PII exposure in responses | PASS - sourceIp excluded |
| Token entropy | PASS - 6-char alphanumeric (32 chars set) |
| Token expiry | PASS - 24 hours |
| Used token rejection | PASS |
| Expired token rejection | PASS |
| Link count limit | PASS - max 5 per inbox |
| XSS in Telegram messages | PASS - HTML properly escaped via parseMode |

---

## Metrics

- Test coverage: 10 test cases covering core flows
- Type coverage: Good - minor `any` usage in catch blocks
- Error handling: Adequate with try-catch wrappers

---

## Unresolved Questions

None.
