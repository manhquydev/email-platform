# Research Report: Per-Inbox Telegram Notification System

## Key Findings

### Existing Telegram Integration

**Files:**
- `services/api/src/routes/telegram.ts` - Routes for link/unlink/preferences
- `services/api/src/services/telegramBot.ts` - Core Telegram logic (876 lines)

**Existing Functions:**
- `generateLinkToken()` - 6-char alphanumeric token
- `createTelegramLinkToken(userId)` - Creates token with 15min expiry
- `linkTelegramAccount(token, chatId)` - Links user to Telegram
- `notifyNewEmail(userId, message)` - Sends email notification
- `sendTelegramMessage(chatId, text, options)` - Core message sender
- `handleTelegramWebhook(update)` - Handles /start, /link, /settings

**Current Telegram Flow:**
1. User generates token from Settings page
2. User scans QR/clicks link → opens Telegram bot
3. User sends `/start TOKEN` to bot
4. Bot calls `linkTelegramAccount()` → links User.telegramChatId
5. On email receipt (worker.ts:262-268), calls `notifyNewEmail(ownerId, msg)`

### Email Notification Trigger (worker.ts:262-268)

```typescript
if (messageWithRelations.inbox.ownerId) {
  await notifyNewEmail(messageWithRelations.inbox.ownerId, messageWithRelations);
}
```

**Current limitation:** Notifications tied to inbox OWNER, not individual Telegram subscribers.

### Database Schema (Existing)

**TelegramLinkToken**
- `id`, `userId`, `token` (unique), `expiresAt`, `usedAt`, `createdAt`

**User (Telegram fields)**
- `telegramChatId` (unique), `telegramLinkedAt`, `notifyOnEmail` (default true)

## Recommended Schema Additions

### New Model: InboxTelegramLink
```prisma
model InboxTelegramLink {
  id              String   @id @default(uuid())
  inboxEmail      String   // "john@domain.com"
  telegramChatId  String
  telegramUsername String?
  createdAt       DateTime @default(now())
  status          String   @default("ACTIVE") // ACTIVE, PAUSED, REVOKED

  @@unique([inboxEmail, telegramChatId])
  @@index([inboxEmail])
}
```

### New Model: InboxTelegramAuthToken
```prisma
model InboxTelegramAuthToken {
  id          String   @id @default(uuid())
  inboxEmail  String
  token       String   @unique
  expiresAt   DateTime // 24h expiry
  usedAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([token])
}
```

### New Model: TelegramNotificationLog
```prisma
model TelegramNotificationLog {
  id              String   @id @default(uuid())
  inboxEmail      String
  messageId       String
  telegramChatId  String
  status          String   // SENT, FAILED
  errorMessage    String?
  sentAt          DateTime @default(now())

  @@index([inboxEmail])
  @@index([telegramChatId])
}
```

## API Endpoints Needed

### Public Endpoints (no auth)

```
POST /api/public/telegram/generate-token
  Body: { inboxEmail: "john@domain.com" }
  Response: {
    token: "ABC123",
    qrCodeDataUrl: "data:image/png;base64,...",
    telegramLink: "https://t.me/BotName?start=inbox_ABC123",
    expiresAt: "2026-01-08T16:00:00Z"
  }

DELETE /api/public/telegram/:inboxEmail
  Body: { token: "ABC123" } // For verification
  Response: { success: true }
```

### Webhook Extension

Modify `handleTelegramWebhook()` to handle inbox-specific tokens:
- Token format: `inbox_XXXXXX` (prefix distinguishes from user tokens)
- On `/start inbox_TOKEN`: Call `linkInboxToTelegram(token, chatId)`

## Integration Points

### Worker.ts Modification (line 262)

**Current:**
```typescript
if (messageWithRelations.inbox.ownerId) {
  await notifyNewEmail(messageWithRelations.inbox.ownerId, messageWithRelations);
}
```

**New (add after):**
```typescript
// Per-inbox Telegram notifications
await notifyInboxTelegramSubscribers(
  `${messageWithRelations.inbox.localPart}@${messageWithRelations.inbox.domain.name}`,
  messageWithRelations
);
```

### New Service Function

```typescript
async function notifyInboxTelegramSubscribers(inboxEmail: string, message: {...}) {
  const links = await prisma.inboxTelegramLink.findMany({
    where: { inboxEmail, status: 'ACTIVE' }
  });

  for (const link of links) {
    try {
      await sendTelegramMessage(link.telegramChatId, formatMessage(message));
      await logNotification(inboxEmail, message.id, link.telegramChatId, 'SENT');
    } catch (err) {
      await logNotification(inboxEmail, message.id, link.telegramChatId, 'FAILED', err.message);
    }
  }
}
```

## QR Code Generation

Use `qrcode` npm package (already common in Node.js):
```typescript
import QRCode from 'qrcode';
const dataUrl = await QRCode.toDataURL(telegramLink);
```

## Frontend Component Requirements

**TelegramLinkModal.tsx**
- Generate token on mount → POST /api/public/telegram/generate-token
- Display QR code (react-qr-code or QRCode.react)
- Display Telegram deep link button
- Show 24h countdown timer
- Poll /api/public/telegram/status/:token every 3s for success
- Show success message with linked info

## Unresolved Questions

1. Max Telegram links per inbox? (suggest: 5)
2. Should existing User-level Telegram notifications still trigger?
3. How to handle bot blocked by user (Telegram API error 403)?
4. Notification format - same as existing or simplified?
5. Should users be able to revoke their own link from Telegram? (/unlink_inbox command)
