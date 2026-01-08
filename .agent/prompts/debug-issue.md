# Prompt Template: Debug Production Issue

## Usage
Use when investigating bugs, errors, or unexpected behavior in production.

---

## Template

```
# Debug: [Brief Issue Description]

## Symptoms
- What is happening: [describe observed behavior]
- What should happen: [describe expected behavior]
- When it started: [timestamp or event that triggered it]
- Frequency: [always/intermittent/once]

## Environment
- Service: [api/web/worker]
- Environment: [prod/staging/dev]
- Affected users: [all/specific/percentage]

## Error Details
```
[Paste error message, stack trace, or log output]
```

## Already Tried
- [ ] [List debugging steps already attempted]

## Files to Investigate
- [List suspected files based on error]

## Request
1. Analyze the error and identify root cause
2. Provide minimal fix (no refactoring)
3. Add logging if issue is unclear
4. Write regression test

## Constraints
- Fix must be backward compatible
- No feature additions
- Prefer targeted fix over broad refactor
```

---

## Example Usage

```
# Debug: Telegram notifications not sending for per-inbox links

## Symptoms
- What is happening: Users report not receiving Telegram notifications for new emails
- What should happen: When email arrives at linked inbox, Telegram message should be sent
- When it started: After Phase 06 deployment (2026-01-05)
- Frequency: Intermittent - some inboxes work, others don't

## Environment
- Service: api (worker process)
- Environment: prod
- Affected users: ~30% of users with inbox telegram links

## Error Details
```
2026-01-06T10:15:23.456Z [WARN] failed to send inbox Telegram notifications
  err: { code: "ETELEGRAM", message: "Bad Request: chat not found" }
  inboxEmail: "user@domain.com"
```

## Already Tried
- [x] Verified bot token is valid
- [x] Checked InboxTelegramLink table - records exist
- [x] Confirmed telegramChatId format looks correct

## Files to Investigate
- services/api/src/services/telegramBot.ts
- services/api/src/worker.ts (line 273-281)
- services/api/src/services/inbox-telegram-service.ts

## Request
1. Analyze why "chat not found" for some links
2. Check if chatId format changed between user/inbox linking
3. Add defensive check for stale chat IDs
4. Write test for notification sending

## Constraints
- Fix must be backward compatible
- Don't change existing link structure
- Prefer targeted fix
```
