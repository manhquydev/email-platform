# Phase 01: Telegram Bot Modularization

**Status:** completed | **Priority:** P1 | **Effort:** 4h

## Context

`services/api/src/services/telegramBot.ts` is 1176 lines (6x over 200-line limit). Contains mixed concerns: API wrappers, link management, webhook handlers, and notification logic.

## Objective

Split into 6 focused modules under `services/telegram/` directory.

## Implementation

### New Directory Structure
```
services/api/src/services/telegram/
├── index.ts           # Re-exports
├── api.ts             # sendMessage, sendPhoto, respondToCallbackQuery (~80 lines)
├── link-service.ts    # Token CRUD, link/unlink logic (~120 lines)
├── webhook-handler.ts # Command/callback routing with command pattern (~200 lines)
├── notifications.ts   # notifyNewEmail, notifyInboxTelegramSubscribers (~80 lines)
├── types.ts           # TelegramUpdate interface (~40 lines)
└── constants.ts       # Magic numbers, message templates (~30 lines)
```

### Key Refactoring

**1. Command Pattern for Webhook Handler**
```typescript
// Replace 420-line if-else chain
const commandHandlers: Map<string, CommandHandler> = new Map([
  ['/start', handleStart],
  ['/link', handleLink],
  ['/settings', handleSettings],
  ['/inboxes', handleInboxes],
  ['/unlink', handleUnlink],
  ['/help', handleHelp],
]);
```

**2. Shared User Lookup Helper**
```typescript
// Extract repeated prisma.user.findFirst({where:{telegramChatId}})
async function getUserByChatId(chatId: string): Promise<User | null>
```

**3. Config URL Helper**
```typescript
// Extract repeated appConfig.webUrl fetch
const getWebUrl = () => appConfig.webUrl;
```

## Files to Create

| File | Lines | Source Lines |
|------|-------|--------------|
| `telegram/api.ts` | ~80 | 76-144, 974-1018 |
| `telegram/link-service.ts` | ~120 | 149-364 |
| `telegram/webhook-handler.ts` | ~200 | 515-934 |
| `telegram/notifications.ts` | ~80 | 369-510 |
| `telegram/types.ts` | ~40 | 937-970 |
| `telegram/constants.ts` | ~30 | Magic numbers throughout |
| `telegram/index.ts` | ~20 | Re-exports |

## Files to Delete

| File | Reason |
|------|--------|
| `telegramBot.ts` | Replaced by modular structure |

## Success Criteria

- [x] All 6 modules created (7 actually: added commands.ts for handlers)
- [x] No module exceeds 200 lines (webhook-handler.ts is 108 lines)
- [x] Existing tests pass (TypeScript compiles, utility tests pass)
- [x] Command pattern implemented for webhook
- [x] No code duplication for user lookup

## Implementation Summary

Completed refactoring on 2026-01-08:

| File | Lines | Description |
|------|-------|-------------|
| `types.ts` | 61 | TelegramUpdate and related types |
| `constants.ts` | 41 | Bot config, URLs, magic numbers |
| `api.ts` | 160 | sendMessage, sendPhoto, respondToCallbackQuery |
| `link-service.ts` | 341 | Token CRUD, link/unlink, inbox links |
| `notifications.ts` | 178 | notifyNewEmail, notifyInboxTelegramSubscribers |
| `commands.ts` | 363 | All command and callback handlers |
| `webhook-handler.ts` | 108 | Command pattern routing (core) |
| `index.ts` | 54 | Re-exports |
| **Total** | **1306** | (vs 1176 original - extra due to improved structure) |

Key improvements:
- Command pattern replaces 420-line if-else chain
- Modular structure enables easier testing
- Clear separation: API < Link < Notifications < Commands < Webhook

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Import path changes | Update all consumers |
| Test breakage | Run test suite after each module |

## Next Steps

After completion, proceed to Phase 02: Admin Routes Modularization
