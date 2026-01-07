# Phase 06: Worker Integration + Tests

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-telegram-integration.md](./research/researcher-02-telegram-integration.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| None | Phase 01, 02, 03, 04, 05 | - |

**FINAL PHASE - Run after all others complete.**

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P1 | pending | 3h |

Integrate inbox-based Telegram notifications into the email worker, extend webhook handler to process `inbox_` prefixed tokens, and add comprehensive tests.

## Key Insights

- Worker already calls `notifyNewEmail()` for user notifications at line 264
- Add new `notifyInboxTelegramSubscribers()` call after existing notification
- Extend `handleTelegramWebhook()` to detect `inbox_` prefix in start command
- Log all notifications to `TelegramNotificationLog`

## Requirements

1. Add `notifyInboxTelegramSubscribers()` to worker.ts
2. Extend webhook handler for inbox token linking
3. Create notification logging function
4. Add unit tests for new functions
5. Add integration tests for public endpoints

## Related Code Files (EXCLUSIVE TO THIS PHASE)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/worker.ts` | Modify | Add inbox notification call |
| `services/api/src/services/telegramBot.ts` | Modify | Add webhook handler, notification function |
| `services/api/src/test/public-inbox.test.ts` | Create | Public inbox API tests |
| `services/api/src/test/inbox-telegram.test.ts` | Create | Telegram linking tests |

## File Ownership

- **ONLY this phase** modifies `worker.ts` and `telegramBot.ts`
- Other phases created new files; this phase integrates them

## Implementation Steps

### 1. Add notification function to telegramBot.ts

Add after existing `notifyNewEmail` function:

```typescript
/**
 * Notify all Telegram subscribers for a specific inbox
 */
export async function notifyInboxTelegramSubscribers(
  inboxEmail: string,
  message: {
    id: string;
    fromAddress: string | null;
    subject: string | null;
    textBody: string | null;
  }
): Promise<void> {
  const links = await prisma.inboxTelegramLink.findMany({
    where: { inboxEmail, status: "ACTIVE" },
  });

  if (links.length === 0) return;

  const botToken = getBotToken();
  if (!botToken) return;

  const webUrl = process.env.WEB_URL || "https://app.manhquy.click";
  const viewUrl = `${webUrl}/inbox-viewer?email=${encodeURIComponent(inboxEmail)}`;

  // Format message
  const text = `📧 <b>New Email</b>

<b>To:</b> ${inboxEmail}
<b>From:</b> ${message.fromAddress || "(unknown)"}
<b>Subject:</b> ${message.subject || "(no subject)"}

<i>${(message.textBody || "").slice(0, 200)}${
    (message.textBody?.length || 0) > 200 ? "..." : ""
  }</i>`;

  for (const link of links) {
    try {
      const success = await sendTelegramMessage(link.telegramChatId, text, {
        parseMode: "HTML",
        replyMarkup: {
          inline_keyboard: [
            [{ text: "View Email", url: viewUrl }],
          ],
        },
      });

      // Log notification
      await prisma.telegramNotificationLog.create({
        data: {
          inboxEmail,
          messageId: message.id,
          telegramChatId: link.telegramChatId,
          status: success ? "SENT" : "FAILED",
          errorMessage: success ? null : "Send failed",
        },
      });
    } catch (err: any) {
      // Log failed notification
      await prisma.telegramNotificationLog.create({
        data: {
          inboxEmail,
          messageId: message.id,
          telegramChatId: link.telegramChatId,
          status: "FAILED",
          errorMessage: err.message || "Unknown error",
        },
      });
    }
  }
}
```

### 2. Extend webhook handler in telegramBot.ts

Find `handleTelegramWebhook` function and add inbox token handling:

```typescript
// Inside handleTelegramWebhook, in the /start command handler
// After existing user token handling:

// Check for inbox linking token (prefix: inbox_)
if (startParam.startsWith("inbox_")) {
  const { linkInboxToTelegram } = await import("./inbox-telegram-service");

  const result = await linkInboxToTelegram(
    startParam,
    chatId.toString(),
    from?.username
  );

  if (result.success) {
    await sendTelegramMessage(
      chatId.toString(),
      `✅ <b>Liên kết thành công!</b>\n\nBạn sẽ nhận thông báo khi có email mới đến <b>${result.inboxEmail}</b>`,
      { parseMode: "HTML" }
    );
  } else {
    await sendTelegramMessage(
      chatId.toString(),
      `❌ <b>Liên kết thất bại</b>\n\n${result.error || "Token không hợp lệ hoặc đã hết hạn"}`,
      { parseMode: "HTML" }
    );
  }
  return;
}
```

### 3. Modify worker.ts

Add after existing Telegram notification (around line 268):

```typescript
// Release 2b: Per-Inbox Telegram Notifications
try {
  const inboxEmail = `${messageWithRelations.inbox.localPart}@${messageWithRelations.inbox.domain.name}`;
  await notifyInboxTelegramSubscribers(inboxEmail, {
    id: message.id,
    fromAddress,
    subject: message.subject,
    textBody,
  });
} catch (inboxTelegramErr) {
  logger.warn({ err: inboxTelegramErr }, 'failed to send inbox Telegram notifications');
}
```

Also add import at top:

```typescript
import { notifyNewEmail, notifyInboxTelegramSubscribers } from './services/telegramBot';
```

### 4. Create public-inbox.test.ts

```typescript
// services/api/src/test/public-inbox.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";

describe("Public Inbox API", () => {
  let app: FastifyInstance;
  let testInboxId: string;
  let testMessageId: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create test domain and inbox
    const domain = await prisma.domain.create({
      data: { name: "test-public.example.com", status: "VERIFIED", verificationToken: "test" },
    });

    const inbox = await prisma.inbox.create({
      data: { domainId: domain.id, localPart: "testuser" },
    });
    testInboxId = inbox.id;

    // Create test message
    const message = await prisma.message.create({
      data: {
        inboxId: inbox.id,
        fromAddress: "sender@example.com",
        subject: "Test Subject",
        textBody: "Test body content",
        htmlBody: "<p>Test HTML</p>",
      },
    });
    testMessageId = message.id;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { inboxId: testInboxId } });
    await prisma.inbox.delete({ where: { id: testInboxId } });
    await prisma.domain.deleteMany({ where: { name: "test-public.example.com" } });
    await app.close();
  });

  it("POST /api/public/inbox/search - finds existing inbox", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/public/inbox/search",
      payload: { email: "testuser@test-public.example.com" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.inbox.email).toBe("testuser@test-public.example.com");
  });

  it("POST /api/public/inbox/search - returns 404 for non-existent inbox", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/public/inbox/search",
      payload: { email: "nonexistent@test-public.example.com" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /api/public/inbox/:email/messages - returns paginated messages", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/public/inbox/testuser@test-public.example.com/messages",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/public/inbox/:email/messages/:messageId - returns message detail", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/public/inbox/testuser@test-public.example.com/messages/${testMessageId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.message.subject).toBe("Test Subject");
    expect(body.message.htmlBody).toBeDefined();
    // Verify sourceIp is not exposed
    expect(body.message.sourceIp).toBeUndefined();
  });
});
```

### 5. Create inbox-telegram.test.ts

```typescript
// services/api/src/test/inbox-telegram.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";
import {
  generateInboxLinkToken,
  linkInboxToTelegram,
  getTokenStatus,
} from "../services/inbox-telegram-service";

describe("Inbox Telegram Service", () => {
  let app: FastifyInstance;
  let testInboxEmail: string;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create test domain and inbox
    const domain = await prisma.domain.create({
      data: { name: "test-telegram.example.com", status: "VERIFIED", verificationToken: "test" },
    });

    await prisma.inbox.create({
      data: { domainId: domain.id, localPart: "tgtest" },
    });

    testInboxEmail = "tgtest@test-telegram.example.com";
  });

  afterAll(async () => {
    await prisma.inboxTelegramAuthToken.deleteMany({ where: { inboxEmail: testInboxEmail } });
    await prisma.inboxTelegramLink.deleteMany({ where: { inboxEmail: testInboxEmail } });
    await prisma.inbox.deleteMany({});
    await prisma.domain.deleteMany({ where: { name: "test-telegram.example.com" } });
    await app.close();
  });

  it("generateInboxLinkToken - creates token with QR code", async () => {
    const result = await generateInboxLinkToken(testInboxEmail);

    expect(result.token).toMatch(/^inbox_[A-Z0-9]{6}$/);
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.telegramLink).toContain("t.me/");
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("getTokenStatus - returns valid token status", async () => {
    const { token } = await generateInboxLinkToken(testInboxEmail);
    const status = await getTokenStatus(token);

    expect(status.valid).toBe(true);
    expect(status.used).toBe(false);
    expect(status.expired).toBe(false);
  });

  it("linkInboxToTelegram - links inbox to chat", async () => {
    const { token } = await generateInboxLinkToken(testInboxEmail);
    const result = await linkInboxToTelegram(token, "123456789", "testuser");

    expect(result.success).toBe(true);
    expect(result.inboxEmail).toBe(testInboxEmail);

    // Verify link created
    const link = await prisma.inboxTelegramLink.findFirst({
      where: { inboxEmail: testInboxEmail, telegramChatId: "123456789" },
    });
    expect(link).not.toBeNull();
    expect(link?.status).toBe("ACTIVE");
  });

  it("linkInboxToTelegram - rejects expired token", async () => {
    // Create expired token
    const token = "inbox_EXPIRE";
    await prisma.inboxTelegramAuthToken.create({
      data: {
        inboxEmail: testInboxEmail,
        token,
        expiresAt: new Date(Date.now() - 1000), // Expired
      },
    });

    const result = await linkInboxToTelegram(token, "999999", "testuser");

    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid or expired");
  });

  it("POST /api/public/telegram/generate-token - returns token data", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/public/telegram/generate-token",
      payload: { inboxEmail: testInboxEmail },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeDefined();
    expect(body.qrCodeDataUrl).toBeDefined();
    expect(body.telegramLink).toBeDefined();
  });

  it("GET /api/public/telegram/status/:token - returns status", async () => {
    const genRes = await app.inject({
      method: "POST",
      url: "/api/public/telegram/generate-token",
      payload: { inboxEmail: testInboxEmail },
    });
    const { token } = JSON.parse(genRes.payload);

    const res = await app.inject({
      method: "GET",
      url: `/api/public/telegram/status/${token}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.valid).toBe(true);
    expect(body.used).toBe(false);
  });
});
```

## Todo Checklist

- [ ] Add `notifyInboxTelegramSubscribers()` to telegramBot.ts
- [ ] Extend webhook handler for `inbox_` tokens
- [ ] Add notification call to worker.ts (after line 268)
- [ ] Add import for new function in worker.ts
- [ ] Create `test/public-inbox.test.ts`
- [ ] Create `test/inbox-telegram.test.ts`
- [ ] Run tests: `npm test`
- [ ] Manual test: send email, verify Telegram notification
- [ ] Verify notification logs created in DB

## Success Criteria

1. Emails trigger notifications to linked Telegram users
2. Webhook handles `inbox_` tokens correctly
3. Notification logs created for each send attempt
4. All tests pass
5. Existing user-level notifications still work

## Conflict Prevention

- Only this phase modifies `worker.ts` and `telegramBot.ts`
- Previous phases created separate files
- Tests in new files only

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Worker crash on notification error | Low | High | Try-catch, non-blocking |
| Duplicate notifications | Low | Medium | Check existing links |
| Test database pollution | Medium | Low | Cleanup in afterAll |

## Security Considerations

1. **Non-blocking notifications** - Worker continues if notification fails
2. **Logging** - All attempts logged for debugging
3. **No sensitive data in logs** - Only IDs, not content
4. **Rate limiting** - Telegram API has its own limits
