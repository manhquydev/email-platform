---
parent: ./plan.md
phase: 03
title: Full i18n Localization
---

# Phase 03: Full i18n Localization

## Context

- **Parent Plan:** [Extension Improvements](./plan.md)
- **Dependencies:** None (can run parallel to testing)
- **Docs:** [Chrome i18n API](https://developer.chrome.com/docs/extensions/reference/i18n/)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-16 |
| Description | Implement full internationalization with EN/VI languages |
| Priority | P2 |
| Implementation Status | ⬜ Not Started |
| Review Status | ⬜ Pending |
| Effort | 3h |

## Key Insights

1. Extension already has partial i18n in `shared/i18n.ts`
2. WXT supports `_locales` directory for Chrome i18n API
3. Vietnamese already partially supported in field-detector
4. Need consistent approach across all UI strings

## Requirements

1. Support English (en) and Vietnamese (vi) languages
2. Use Chrome i18n API (`chrome.i18n.getMessage`)
3. Fallback to English for missing translations
4. Localize all user-facing strings

## Architecture

```
services/extension/
├── public/
│   └── _locales/
│       ├── en/
│       │   └── messages.json
│       └── vi/
│           └── messages.json
├── src/
│   └── shared/
│       └── i18n.ts           # Updated helper
```

## Related Code Files

| File | Strings to Localize |
|------|---------------------|
| `components/popup/Login.tsx` | Sign in, Email, Password, errors |
| `components/popup/InboxList.tsx` | Active Inboxes, Create, Copy, etc. |
| `components/popup/MessageList.tsx` | Back, No messages, loading |
| `components/popup/Settings.tsx` | Settings, Theme, Notifications |
| `content/ui-injector.ts` | Sign in Required, Generate New |

## Implementation Steps

### Step 1: Create Locale Files (1h)

```json
// public/_locales/en/messages.json
{
  "extName": {
    "message": "Ephemera - Temporary Email"
  },
  "extDescription": {
    "message": "Create disposable email addresses instantly. Protect your privacy and avoid spam."
  },
  "signIn": {
    "message": "Sign In"
  },
  "signUp": {
    "message": "Sign Up"
  },
  "email": {
    "message": "Email"
  },
  "password": {
    "message": "Password"
  },
  "loginError": {
    "message": "Invalid email or password"
  },
  "activeInboxes": {
    "message": "Active Inboxes"
  },
  "createNewInbox": {
    "message": "Create New Inbox"
  },
  "generateNew": {
    "message": "Generate New Email"
  },
  "copyAddress": {
    "message": "Copy Address"
  },
  "copied": {
    "message": "Copied!"
  },
  "viewMessages": {
    "message": "View Messages"
  },
  "openDashboard": {
    "message": "Open Dashboard"
  },
  "settings": {
    "message": "Settings"
  },
  "theme": {
    "message": "Theme"
  },
  "themeLight": {
    "message": "Light"
  },
  "themeDark": {
    "message": "Dark"
  },
  "themeSystem": {
    "message": "System"
  },
  "notifications": {
    "message": "Notifications"
  },
  "autoCopy": {
    "message": "Auto-copy new emails"
  },
  "logout": {
    "message": "Log Out"
  },
  "noInboxes": {
    "message": "No inboxes yet"
  },
  "noMessages": {
    "message": "No messages"
  },
  "back": {
    "message": "Back"
  },
  "loading": {
    "message": "Loading..."
  },
  "signInRequired": {
    "message": "Sign in Required"
  },
  "signInRequiredDesc": {
    "message": "Please sign in to your Ephemera account to use temporary emails."
  },
  "makePermanent": {
    "message": "Make Permanent"
  },
  "makeTemporary": {
    "message": "Switch to Temporary"
  },
  "extend10min": {
    "message": "Extend 10 minutes"
  },
  "deleteInbox": {
    "message": "Delete Inbox"
  },
  "confirmDelete": {
    "message": "Are you sure you want to delete this inbox?"
  },
  "usage": {
    "message": "Usage"
  },
  "expired": {
    "message": "Expired"
  }
}
```

```json
// public/_locales/vi/messages.json
{
  "extName": {
    "message": "Ephemera - Email Tạm Thời"
  },
  "extDescription": {
    "message": "Tạo địa chỉ email dùng một lần ngay lập tức. Bảo vệ quyền riêng tư và tránh spam."
  },
  "signIn": {
    "message": "Đăng nhập"
  },
  "signUp": {
    "message": "Đăng ký"
  },
  "email": {
    "message": "Email"
  },
  "password": {
    "message": "Mật khẩu"
  },
  "loginError": {
    "message": "Email hoặc mật khẩu không đúng"
  },
  "activeInboxes": {
    "message": "Hộp thư đang hoạt động"
  },
  "createNewInbox": {
    "message": "Tạo hộp thư mới"
  },
  "generateNew": {
    "message": "Tạo email mới"
  },
  "copyAddress": {
    "message": "Sao chép địa chỉ"
  },
  "copied": {
    "message": "Đã sao chép!"
  },
  "viewMessages": {
    "message": "Xem tin nhắn"
  },
  "openDashboard": {
    "message": "Mở bảng điều khiển"
  },
  "settings": {
    "message": "Cài đặt"
  },
  "theme": {
    "message": "Giao diện"
  },
  "themeLight": {
    "message": "Sáng"
  },
  "themeDark": {
    "message": "Tối"
  },
  "themeSystem": {
    "message": "Hệ thống"
  },
  "notifications": {
    "message": "Thông báo"
  },
  "autoCopy": {
    "message": "Tự động sao chép email mới"
  },
  "logout": {
    "message": "Đăng xuất"
  },
  "noInboxes": {
    "message": "Chưa có hộp thư nào"
  },
  "noMessages": {
    "message": "Không có tin nhắn"
  },
  "back": {
    "message": "Quay lại"
  },
  "loading": {
    "message": "Đang tải..."
  },
  "signInRequired": {
    "message": "Cần đăng nhập"
  },
  "signInRequiredDesc": {
    "message": "Vui lòng đăng nhập vào tài khoản Ephemera để sử dụng email tạm thời."
  },
  "makePermanent": {
    "message": "Chuyển sang vĩnh viễn"
  },
  "makeTemporary": {
    "message": "Chuyển sang tạm thời"
  },
  "extend10min": {
    "message": "Gia hạn 10 phút"
  },
  "deleteInbox": {
    "message": "Xóa hộp thư"
  },
  "confirmDelete": {
    "message": "Bạn có chắc muốn xóa hộp thư này?"
  },
  "usage": {
    "message": "Sử dụng"
  },
  "expired": {
    "message": "Đã hết hạn"
  }
}
```

### Step 2: Update i18n Helper (30min)

```typescript
// src/shared/i18n.ts
import browser from 'webextension-polyfill';

type MessageKey =
  | 'extName' | 'extDescription'
  | 'signIn' | 'signUp' | 'email' | 'password' | 'loginError'
  | 'activeInboxes' | 'createNewInbox' | 'generateNew'
  | 'copyAddress' | 'copied' | 'viewMessages' | 'openDashboard'
  | 'settings' | 'theme' | 'themeLight' | 'themeDark' | 'themeSystem'
  | 'notifications' | 'autoCopy' | 'logout'
  | 'noInboxes' | 'noMessages' | 'back' | 'loading'
  | 'signInRequired' | 'signInRequiredDesc'
  | 'makePermanent' | 'makeTemporary' | 'extend10min'
  | 'deleteInbox' | 'confirmDelete' | 'usage' | 'expired';

/**
 * Get localized message by key
 */
export function t(key: MessageKey, substitutions?: string[]): string {
  try {
    const message = browser.i18n.getMessage(key, substitutions);
    return message || key; // Fallback to key if not found
  } catch {
    return key;
  }
}

/**
 * Get current UI language
 */
export function getUILanguage(): string {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return 'en';
  }
}
```

### Step 3: Update Components (1.5h)

Example for Login component:

```tsx
// src/components/popup/Login.tsx
import { t } from '../../shared/i18n';

// Before:
<button>Sign In</button>

// After:
<button>{t('signIn')}</button>

// Before:
<input placeholder="Email" />

// After:
<input placeholder={t('email')} />
```

Update all components with t() calls:
- Login.tsx
- InboxList.tsx
- MessageList.tsx
- Settings.tsx
- CreateInboxModal.tsx
- ui-injector.ts

### Step 4: Update Manifest (15min)

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // ... rest of config
  },
});
```

## Todo List

- [ ] Create `public/_locales/en/messages.json`
- [ ] Create `public/_locales/vi/messages.json`
- [ ] Update `src/shared/i18n.ts` with typed helper
- [ ] Update `Login.tsx` with t() calls
- [ ] Update `InboxList.tsx` with t() calls
- [ ] Update `MessageList.tsx` with t() calls
- [ ] Update `Settings.tsx` with t() calls
- [ ] Update `CreateInboxModal.tsx` with t() calls
- [ ] Update `ui-injector.ts` with t() calls
- [ ] Update `wxt.config.ts` with default_locale
- [ ] Test with Chrome in Vietnamese locale
- [ ] Verify all strings translated

## Success Criteria

1. Extension displays in correct language based on browser locale
2. All UI strings use i18n API
3. Fallback to English works for missing translations
4. No hardcoded user-facing strings

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing translations | Low | Low | Fallback to English |
| Incorrect Vietnamese | Low | Medium | Native speaker review |
| Bundle size increase | Low | Low | JSON files are small |

## Security Considerations

- No sensitive data in locale files
- Validate message substitutions

## Next Steps

After completing Phase 03:
1. Consider adding more languages (zh, ja, ko)
2. Proceed to [Phase 04: Store Publishing](./phase-04-store-publishing.md)
