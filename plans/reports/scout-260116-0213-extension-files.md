# Browser Extension Codebase Analysis

## Overview
The browser extension (Ephemera) is located in `services/extension`. It's a Manifest V3 extension built with React, Vite, and Tailwind CSS.

## Manifest Configuration (`manifest.json`)
- **Version**: 3
- **Entry Points**:
  - **Popup**: `src/popup/index.html`
  - **Background (Service Worker)**: `src/background/index.ts`
  - **Content Script**: `src/content/index.ts`
- **Permissions**: `storage`, `alarms`, `clipboardWrite`, `activeTab`, `notifications`.
- **Host Permissions**: `https://api.manhquy.click/*`

## File Structure
```text
services/extension/
├── src/
│   ├── background/        # Service worker logic
│   │   ├── index.ts       # Main background entry, alarms, message listeners
│   │   └── push-handler.ts # Push notification logic
│   ├── content/           # Injected scripts
│   │   ├── index.ts       # Content script entry
│   │   ├── field-detector.ts # Logic to find email inputs
│   │   └── ui-injector.ts  # DOM injection for Ephemera icons/dropdowns
│   ├── popup/             # Extension popup UI (React)
│   │   ├── App.tsx        # Main UI container and routing
│   │   ├── main.tsx       # React mounting point
│   │   └── components/    # UI components (InboxList, Login, MessageList, Settings)
│   ├── shared/            # Common logic across background/content/popup
│   │   ├── api.ts         # ApiClient using fetch
│   │   ├── storage.ts     # Wrapper for chrome.storage.local
│   │   ├── config.ts      # API and Web URLs
│   │   └── types.ts       # Shared TypeScript interfaces
│   └── utils/             # Helper functions (cn utility)
├── public/                # Static assets (icons)
├── manifest.json          # Extension configuration
└── vite.config.ts         # Build configuration using @crxjs/vite-plugin
```

## Core Functionality & Components

### 1. API Communication (`src/shared/api.ts`)
- Uses a central `ApiClient` class.
- Handles Bearer token authentication from `storage`.
- Communicates with `https://api.manhquy.click`.
- Key endpoints: `/extension/dashboard`, `/extension/quick-inbox`, `/extension/anonymous-inbox`.

### 2. UI Injection (`src/content/`)
- **Detection**: `field-detector.ts` uses selectors like `input[type="email"]` and fuzzy name matching to find email fields.
- **Injection**: `ui-injector.ts` adds a small icon inside detected inputs using a Shadow DOM for style isolation.
- **Dropdown**: Provides a UI to select existing inboxes or generate new ones directly in the page.

### 3. Background Services (`src/background/index.ts`)
- **Polling**: Sets up an alarm (`poll_messages`) to check for new emails every minute as a fallback.
- **Push**: Implements Web Push (VAPID) to show real-time notifications.
- **Messaging**: Acts as a bridge for the content script to perform authenticated actions (like creating inboxes).

### 4. Popup UI (`src/popup/`)
- Functional React app for managing inboxes, viewing messages, and settings.
- State managed locally with React hooks, persisted via the `shared/storage` wrapper.

## Communication Flow
- **Popup/Content -> Background**: Uses `chrome.runtime.sendMessage`.
- **Background -> Content**: Uses `chrome.runtime.sendMessage` (e.g., `INBOXES_UPDATED`).
- **Shared Storage**: All parts use `chrome.storage.local` via `shared/storage.ts` to share auth state and inbox data.

## Unresolved Questions
- How are push notifications triggered on the server side?
- Is there any plan for Safari or Firefox support (currently Chrome-centric via `manifest_version: 3`)?
