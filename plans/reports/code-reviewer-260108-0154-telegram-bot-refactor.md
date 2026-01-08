# Code Review: telegramBot.ts

**File:** `services/api/src/services/telegramBot.ts`
**Lines:** 1176 (limit: 200)
**Date:** 2026-01-08

## Summary

File is 6x over the 200-line limit. Contains mixed concerns: API wrappers, link management, webhook handlers, and notification logic. Needs modularization.

---

## Critical Issues

None found.

---

## High Priority

| Issue | Line(s) | Description |
|-------|---------|-------------|
| File size | 1-1176 | 6x over 200-line limit; split into modules |
| Webhook handler | 515-934 | 420 lines in single function; deeply nested if-else chain |
| No input validation | 182-225, 230-285 | Token/chatId not validated beyond existence check |

---

## Medium Priority

| Issue | Line(s) | Description |
|-------|---------|-------------|
| Code duplication | Multiple | `webUrl` fetched 8+ times; `prisma.user.findFirst({where:{telegramChatId}})` repeated 7 times |
| Type interface location | 937-970 | `TelegramUpdate` interface should be in separate types file |
| Dynamic import | 528 | Avoid dynamic `await import()` in hot path; use static import |
| Missing request timeout | 90-100, 129-143 | Fetch calls have no timeout; could hang indefinitely |

---

## Low Priority

| Issue | Line(s) | Description |
|-------|---------|-------------|
| Magic numbers | 165, 406, 459 | 15min, 3500 chars, 200 chars - extract to constants |
| Console logging | Multiple | Use structured logger instead of `console.error/log` |
| Empty catch | 1134 | Silent catch hides errors |

---

## Refactoring Recommendations

Split into modules:
1. `telegram/api.ts` - `sendMessage`, `sendPhoto`, `respondToCallbackQuery` (lines 76-144, 974-1018)
2. `telegram/link-service.ts` - Token CRUD, link/unlink logic (lines 149-364)
3. `telegram/webhook-handler.ts` - Command/callback routing (lines 515-934)
4. `telegram/notifications.ts` - `notifyNewEmail`, `notifyInboxTelegramSubscribers` (lines 369-510)
5. `telegram/types.ts` - `TelegramUpdate` interface
6. `telegram/constants.ts` - Magic numbers, message templates

Webhook handler pattern:
```typescript
// Replace 420-line if-else with command pattern
const commandHandlers: Record<string, Handler> = {
  '/start': handleStart,
  '/link': handleLink,
  '/settings': handleSettings,
  // ...
};
```

---

## Security Findings

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| Low | Token displayed in error messages (line 571) | Avoid exposing tokens in UI |
| Low | No rate limiting on webhook | Add rate limiter to prevent abuse |
| Info | HTML escaping present (line 16-21) | Good - prevents injection |

---

## Positive Observations

- HTML escaping implemented for Telegram messages
- Transaction usage for atomic operations (lines 209-222)
- Promise.allSettled for parallel notifications (line 473)
- Error logging for failed operations

---

## Next Steps

1. Create `services/api/src/services/telegram/` directory
2. Extract API functions to `api.ts`
3. Extract link logic to `link-service.ts`
4. Refactor webhook handler with command pattern
5. Add fetch timeouts using AbortController

---

*Reviewed by code-reviewer agent*
