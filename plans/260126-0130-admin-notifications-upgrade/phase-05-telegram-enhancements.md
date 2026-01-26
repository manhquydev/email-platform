# Phase 5: Telegram Enhancements

## Context Links
- [Parent Plan](./plan.md)
- [Telegram Research](./research/researcher-01-telegram-bot-api.md)
- [Current Telegram Service](../../services/api/src/services/telegram/notifications.ts)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 5h
- **Description:** Enhance Telegram notifications with inline keyboards, delivery tracking, silent mode, and deep links.

## Key Insights
- Inline keyboards for "Acknowledge" action (tracks read status)
- URL buttons for deep links to admin panel
- Silent notifications (`disable_notification: true`) for low-priority
- Rate limit ~30 msg/sec - use queue for bulk
- MarkdownV2 for rich formatting

## Requirements

### Functional
- Inline keyboard with Acknowledge button
- URL button linking to web notification
- Silent notification option in compose form
- Delivery status tracking (sent/failed/acknowledged)
- Protected content option (no forwarding)

### Non-Functional
- Queue for bulk sends (>50 recipients)
- Retry failed sends (max 3 attempts)
- Log Telegram message_id for reference

## Architecture

```
NotificationService.send()
    │
    ├── Web: Create Notification DB record
    │
    └── Telegram:
        ├── Build message with MarkdownV2
        ├── Add inline keyboard
        ├── Send via bot.sendMessage()
        ├── Store message_id in NotificationLog
        └── Handle callback for Acknowledge
```

## Related Code Files

### Modify
- `services/api/src/services/telegram/notifications.ts`
- `services/api/src/routes/notifications.ts`
- `services/telegram/src/bot.ts` - Add callback handler

### Create
- `services/api/src/services/telegram/notification-formatter.ts`
- `services/api/src/services/telegram/inline-keyboard-builder.ts`

## Implementation Steps

### 1. Create Keyboard Builder
```typescript
// inline-keyboard-builder.ts
export function buildNotificationKeyboard(notificationId: string, options: {
  showAcknowledge?: boolean;
  webUrl?: string;
}) {
  const keyboard = [];

  if (options.showAcknowledge) {
    keyboard.push([{
      text: '✓ Đã xem',
      callback_data: `ack:${notificationId}`,
    }]);
  }

  if (options.webUrl) {
    keyboard.push([{
      text: '🔗 Xem trên Web',
      url: options.webUrl,
    }]);
  }

  return { inline_keyboard: keyboard };
}
```

### 2. Format Message with MarkdownV2
```typescript
// notification-formatter.ts
export function formatNotificationMessage(notification: {
  title: string;
  message: string;
  type: NotificationType;
}) {
  const typeEmoji = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    SUCCESS: '✅',
    ERROR: '❌',
    PROMOTION: '🎉',
  };

  return `${typeEmoji[notification.type]} *${escapeMarkdown(notification.title)}*\n\n${escapeMarkdown(notification.message)}`;
}

function escapeMarkdown(text: string) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
```

### 3. Handle Acknowledge Callback
```typescript
// In bot.ts
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data?.startsWith('ack:')) {
    const notificationId = data.split(':')[1];
    await prisma.notificationLog.updateMany({
      where: {
        notificationId,
        channel: 'TELEGRAM',
      },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });
    await ctx.answerCallbackQuery({ text: 'Đã xác nhận!' });
    // Update button to show acknowledged
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  }
});
```

### 4. Update Send Function
```typescript
async function sendNotificationToUser(
  userId: string,
  notification: Notification,
  options: {
    silent?: boolean;
    showAcknowledge?: boolean;
  }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });

  if (!user?.telegramChatId) return;

  const message = formatNotificationMessage(notification);
  const keyboard = buildNotificationKeyboard(notification.id, {
    showAcknowledge: options.showAcknowledge,
    webUrl: `${APP_URL}/notifications/${notification.id}`,
  });

  const result = await bot.telegram.sendMessage(
    user.telegramChatId,
    message,
    {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_notification: options.silent,
      protect_content: true,
    }
  );

  // Log delivery
  await prisma.notificationLog.create({
    data: {
      notificationId: notification.id,
      channel: 'TELEGRAM',
      status: 'SENT',
      metadata: { messageId: result.message_id },
    },
  });
}
```

### 5. Add Silent Toggle to Compose Form
```tsx
<Checkbox
  label="Gửi im lặng (không rung/thông báo)"
  checked={isSilent}
  onChange={setIsSilent}
/>
```

## Todo List
- [ ] Create notification-formatter.ts
- [ ] Create inline-keyboard-builder.ts
- [ ] Update sendNotificationToUser with keyboards
- [ ] Add callback handler in bot.ts
- [ ] Store Telegram message_id in logs
- [ ] Add silent option to compose form
- [ ] Add acknowledge tracking in logs
- [ ] Implement retry logic for failed sends
- [ ] Test MarkdownV2 escaping
- [ ] Test acknowledge button flow
- [ ] Test silent mode

## Success Criteria
- [ ] Notifications show inline keyboard
- [ ] Acknowledge button updates status
- [ ] Web link opens correct notification
- [ ] Silent mode works (no vibration)
- [ ] Message_id stored in logs
- [ ] Failed sends retried up to 3 times

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| MarkdownV2 escape issues | Thorough character escaping |
| Callback data size limit (64 bytes) | Use short IDs |
| Rate limiting | Queue for bulk sends |

## Security Considerations
- Validate callback data format
- Only allow acknowledge from original recipient
- Protected content prevents forwarding

## Next Steps
- Phase 6: Analytics uses delivery status data
