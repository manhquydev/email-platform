# Phase 04: Account Linking

**Parent**: [plan.md](./plan.md)
**Dependencies**: [Phase 02](./phase-02-backend-auth-routes.md), [Phase 03](./phase-03-frontend-integration.md)
**Status**: pending
**Priority**: P2
**Effort**: 1h

## Overview

Allow existing users to link/unlink Telegram from their account settings. Separate from login flow.

## User Stories

1. **Link Telegram**: User clicks "Link Telegram" in Settings, authenticates via widget, account linked
2. **Unlink Telegram**: User clicks "Unlink Telegram", confirms, Telegram removed from account
3. **View Status**: User sees current Telegram link status (username, linked date)

## Settings Page UI

```tsx
// services/web/src/pages/Settings/TelegramSection.tsx

import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function TelegramSection() {
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['telegram-auth-status'],
    queryFn: () => api.get('/auth/telegram/status'),
  });

  const linkMutation = useMutation({
    mutationFn: (userData: TelegramUser) => api.post('/auth/telegram/link', userData),
    onSuccess: () => queryClient.invalidateQueries(['telegram-auth-status']),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => api.delete('/auth/telegram/unlink'),
    onSuccess: () => queryClient.invalidateQueries(['telegram-auth-status']),
  });

  if (status?.data?.linked) {
    return (
      <div className="telegram-linked">
        <div className="flex items-center gap-2">
          <TelegramIcon />
          <span>@{status.data.telegramUsername || status.data.telegramId}</span>
        </div>
        <p className="text-sm text-gray-500">
          Linked on {new Date(status.data.linkedAt).toLocaleDateString()}
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm('Unlink Telegram? You can re-link anytime.')) {
              unlinkMutation.mutate();
            }
          }}
        >
          Unlink Telegram
        </Button>
      </div>
    );
  }

  return (
    <div className="telegram-unlinked">
      <p>Link your Telegram account for quick login.</p>
      <TelegramLoginButton
        botName={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
        onAuth={(user) => linkMutation.mutate(user)}
      />
    </div>
  );
}
```

## Backend Considerations

### Link Endpoint Security

```typescript
// POST /auth/telegram/link
// Must verify:
// 1. User is authenticated (JWT)
// 2. Telegram data is valid (HMAC)
// 3. Telegram ID not already linked to another account

app.post('/auth/telegram/link', { preHandler: app.authenticate }, async (req, reply) => {
  const userId = req.user.userId;
  const telegramData = telegramAuthSchema.parse(req.body);

  // Verify HMAC
  if (!verifyTelegramAuth(telegramData, process.env.TELEGRAM_BOT_TOKEN!)) {
    return reply.status(401).send({ error: 'Invalid Telegram data' });
  }

  // Check auth_date freshness
  if (!isAuthDateFresh(telegramData.auth_date)) {
    return reply.status(401).send({ error: 'Auth data expired' });
  }

  // Check if Telegram ID already linked to another user
  const existing = await prisma.user.findUnique({
    where: { telegramId: String(telegramData.id) },
  });

  if (existing && existing.id !== userId) {
    return reply.status(409).send({ error: 'Telegram account already linked to another user' });
  }

  // Link Telegram
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramId: String(telegramData.id),
      telegramUsername: telegramData.username,
      telegramFirstName: telegramData.first_name,
      telegramPhotoUrl: telegramData.photo_url,
      telegramAuthDate: new Date(telegramData.auth_date * 1000),
    },
  });

  await recordAudit(userId, 'TELEGRAM_LINKED', { telegramId: telegramData.id });

  return { success: true };
});
```

### Unlink Considerations

- User must have alternative login method (email/password or passkey)
- Warn if Telegram is only auth method

```typescript
app.delete('/auth/telegram/unlink', { preHandler: app.authenticate }, async (req, reply) => {
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.telegramId) {
    return reply.status(400).send({ error: 'Telegram not linked' });
  }

  // Check if user has password or passkey
  const hasPassword = user.passwordHash && user.passwordHash !== '';
  const hasPasskey = await prisma.passkeyCredential.count({ where: { userId } }) > 0;

  if (!hasPassword && !hasPasskey) {
    return reply.status(400).send({
      error: 'Cannot unlink Telegram. Set a password or add a passkey first.',
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramId: null,
      telegramUsername: null,
      telegramFirstName: null,
      telegramPhotoUrl: null,
      telegramAuthDate: null,
    },
  });

  await recordAudit(userId, 'TELEGRAM_UNLINKED', {});

  return { success: true };
});
```

## Implementation Steps

1. [ ] Create `TelegramSection.tsx` component for Settings page
2. [ ] Integrate into existing Settings/Profile page
3. [ ] Implement link conflict check (Telegram ID already used)
4. [ ] Implement unlink safety check (alternative auth required)
5. [ ] Add audit logging for link/unlink events
6. [ ] Test link/unlink flow end-to-end

## Related Files

- `services/web/src/pages/Settings.tsx` or `Profile.tsx`
- `services/web/src/components/TelegramSection.tsx` (new)
- `services/api/src/routes/telegram-auth.ts`

## Success Criteria

- [ ] Linked status displays correctly (username, date)
- [ ] Link button shows widget when not linked
- [ ] Link fails if Telegram already used by another account
- [ ] Unlink requires confirmation
- [ ] Unlink blocked if no alternative auth method
- [ ] Audit logs created for link/unlink

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User locked out after unlink | Medium | High | Require alt auth before unlink |
| Telegram ID collision | Low | Medium | Check and reject with clear error |
