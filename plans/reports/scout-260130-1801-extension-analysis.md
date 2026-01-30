# Extension Codebase Analysis

## 1. Architecture & Structure
**Framework**: [WXT](https://wxt.dev/) (Web Extension Tools) with React 18, TypeScript, and Vite.
**Styling**: Tailwind CSS + clsx/tailwind-merge.
**State Management**: React Context / Local State (Zustand listed in package.json but usage not heavy in sampled files).

### Key Directories (`services/extension/src`)
- **`entrypoints/`**: Entry points for different extension targets.
  - `popup/`: Main UI (Login, Dashboard, Inbox, Settings).
  - `sidepanel/`: Side panel view implementation.
  - `content.ts`: Main content script entry.
  - `background.ts`: Service worker entry.
- **`components/`**: React components.
  - `popup/`: Specific to the popup view (InboxList, MessageList).
  - `shared/`: Reusable components (SearchInput, GlobalSearchResults, Modals).
- **`shared/`**: Core logic shared across entry points.
  - `api.ts`: Centralized API client.
  - `i18n.ts`: Wrapper for `browser.i18n`.
  - `storage.ts`: Storage adapters.
- **`content/`**: DOM interaction logic.
  - `field-detector.ts`: Heuristics for identifying email input fields.
  - `ui-injector.ts`: Logic to inject the autofill icon/dropdown.
- **`background/`**: Service worker logic.
  - `push-handler.ts`: Handling push notifications and badge updates.

## 2. i18n Implementation Status
- **Mechanism**: Native `browser.i18n` API wrapped in `src/shared/i18n.ts`.
- **Languages**: `en` (default), `vi`, `es`, `fr` detected in `public/_locales`.
- **Status**:
  - `vi/messages.json` exists and contains core keys (Sign In, Dashboard, etc.).
  - RTL support logic exists in `i18n.ts`.
  - **Gap**: Need to ensure all keys used in `t('key')` calls across the app exist in all locale files.

## 3. Frontend Components (Popup/Sidepanel)
- **Navigation**: Simple state-based routing (`currentView`: home | inbox | settings).
- **Theme**: Dark mode support via Tailwind `dark` class and system preference detection.
- **Features**:
  - **Dashboard**: Lists active inboxes with unread counts.
  - **Global Search**: Search across all messages (`useGlobalSearch` hook).
  - **Onboarding**: `OnboardingTour` component for first-time users.
  - **Context Menu Integration**: `background.ts` dynamically updates context menus based on active inboxes.

## 4. Backend API Integration
- **Client**: `ApiClient` class in `src/shared/api.ts`.
- **Base URL**: `https://api.manhquy.click` (Hardcoded in `config.ts`).
- **Auth**:
  - JWT-based (Access + Refresh tokens).
  - Supports 2FA flow.
  - "Anonymous" inbox creation supported (`createAnonymousInbox`).
- **Endpoints Implemented**:
  - Auth (`/auth/login`, `/auth/refresh`, `/auth/me`).
  - Inboxes (`/extension/dashboard`, `/extension/quick-inbox`, `/inboxes/:id`).
  - Messages (`/inboxes/:id/messages`, `/messages/search`).
  - Push (`/push/vapid-key`, `/push/subscribe`).

## 5. Key Functionality & Heuristics
- **Field Detection**: `src/content/field-detector.ts` uses robust heuristics:
  - Selectors (`input[type="email"]`, names like `user_email`).
  - Context keywords (labels, placeholders, aria-labels).
  - **Vietnamese Support**: Explicitly checks for "địa chỉ email", "tên đăng nhập".
- **Push Notifications**:
  - Service worker listens for push events.
  - Extracts OTP codes via Regex (`/\b\d{4,8}\b/`) and saves to session storage.
  - Updates extension badge.

## 6. Observations & Gaps
- **Configuration**: API URL is hardcoded in `src/shared/config.ts`.
- **Clipboard**: `background.ts` notes potential cross-browser issues with clipboard access from shortcuts.
- **TODOs**: No `TODO` comments found in the sampled source code, suggesting a relatively clean or mature codebase for this phase.

## Unresolved Questions
- Are there any missing translation keys in `vi` vs `en`?
- Is the "Anonymous" login flow fully connected in the UI?
