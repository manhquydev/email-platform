# Phase 03: Frontend Integration

**Parent**: [plan.md](./plan.md)
**Dependencies**: [Phase 02](./phase-02-backend-auth-routes.md)
**Status**: pending
**Priority**: P2
**Effort**: 2h

## Overview

Add Telegram Login Widget to web frontend. Users see "Login with Telegram" button on login page.

## Telegram Widget Setup

### 1. BotFather Configuration (One-time)

```
1. Open @BotFather in Telegram
2. Send /setdomain
3. Select your bot
4. Enter: app.manhquy.click (production domain)
```

For local dev, use ngrok or add `127.0.0.1 local.manhquy.click` to hosts file.

### 2. Widget Script

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YourBotUsername"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write">
</script>
```

## React Component

```tsx
// services/web/src/components/TelegramLoginButton.tsx

import { useEffect, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
}

export function TelegramLoginButton({ botName, onAuth, buttonSize = 'large' }: Props) {
  useEffect(() => {
    // Expose callback to window for Telegram widget
    (window as any).onTelegramAuth = onAuth;

    // Load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    const container = document.getElementById('telegram-login-container');
    container?.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
      container?.querySelector('script')?.remove();
    };
  }, [botName, onAuth, buttonSize]);

  return <div id="telegram-login-container" />;
}
```

## Login Page Integration

```tsx
// In services/web/src/pages/Login.tsx

import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

function LoginPage() {
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const telegramLoginMutation = useMutation({
    mutationFn: (userData: TelegramUser) => api.post('/auth/telegram', userData),
    onSuccess: (response) => {
      if (response.data.requiresEmail) {
        setTempToken(response.data.tempToken);
        setShowEmailPrompt(true);
      } else {
        // Login successful
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      }
    },
  });

  return (
    <div>
      {/* Existing login form */}

      <div className="divider">OR</div>

      <TelegramLoginButton
        botName={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
        onAuth={(user) => telegramLoginMutation.mutate(user)}
      />

      {showEmailPrompt && (
        <EmailPromptModal
          tempToken={tempToken}
          onComplete={() => navigate('/dashboard')}
        />
      )}
    </div>
  );
}
```

## Email Prompt Modal (New Users)

```tsx
// services/web/src/components/EmailPromptModal.tsx

function EmailPromptModal({ tempToken, onComplete }: Props) {
  const [email, setEmail] = useState('');

  const completeMutation = useMutation({
    mutationFn: (data: { tempToken: string; email: string }) =>
      api.post('/auth/telegram/complete', data),
    onSuccess: (response) => {
      localStorage.setItem('token', response.data.token);
      onComplete();
    },
  });

  return (
    <Modal>
      <h2>Complete Registration</h2>
      <p>Telegram doesn't share your email. Please provide one to continue.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <Button onClick={() => completeMutation.mutate({ tempToken, email })}>
        Continue
      </Button>
    </Modal>
  );
}
```

## Implementation Steps

1. [ ] Create `TelegramLoginButton.tsx` component
2. [ ] Create `EmailPromptModal.tsx` for new user email collection
3. [ ] Add env var `VITE_TELEGRAM_BOT_USERNAME` to `.env.example`
4. [ ] Integrate button into Login page (below existing form)
5. [ ] Add "OR" divider between traditional login and Telegram
6. [ ] Handle loading/error states for mutations
7. [ ] Test widget loads correctly (requires HTTPS or localhost)

## Related Files

- `services/web/src/pages/Login.tsx`
- `services/web/src/components/TelegramLoginButton.tsx` (new)
- `services/web/src/components/EmailPromptModal.tsx` (new)
- `services/web/.env.example`

## Success Criteria

- [ ] Telegram button renders on Login page
- [ ] Clicking button opens Telegram popup
- [ ] Successful auth redirects to dashboard (existing user)
- [ ] New user sees email prompt modal
- [ ] Email submission completes registration
- [ ] Error states displayed properly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Widget blocked by CSP | Medium | High | Add telegram.org to CSP |
| HTTPS required | High | Blocking | Use ngrok for local dev |
| Mobile browser issues | Low | Medium | Test on iOS/Android |
