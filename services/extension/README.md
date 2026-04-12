# Ephemera Browser Extension

A modernized, multi-browser extension for the Ephemera Temporary Email service. Built with **WXT** (Web Extension Toolbox) for cross-browser compatibility and high-performance development.

## 🚀 Key Features

- **Multi-browser Support**: Optimized for Chrome (MV3), Firefox (MV2), and Safari.
- **Side Panel Interface**: Persistent productivity interface for managing digital identities while browsing.
- **Contextual Intelligence**: Automatically detects email fields on any website and provides a Shadow DOM-isolated dropdown for instant filling.
- **Glassmorphism & Material 3 UI**: Modern 2026 aesthetics with full support for Light, Dark, and System theme modes.
- **Anonymous Mode**: Create temporary inboxes without an account using privacy-safe device identifiers.
- **Real-time Synchronization**: Instant data sync between background processes, popups, and content scripts via `browser.storage`.
- **Privacy-focused Analytics**: Lightweight usage tracking to improve features without compromising user data.

## 🛠️ Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Web Extension Toolbox)
- **UI Library**: React 18 with TailwindCSS
- **Icons**: Lucide React
- **Polyfills**: `webextension-polyfill` for unified `browser.*` namespace
- **Style Isolation**: Shadow DOM for all injected UI components

## 📦 Development Setup

1. **Install Dependencies**
   ```bash
   cd services/extension
   npm install
   ```

2. **Configure Environment (Optional)**

   For local development with a different API endpoint, create `.env`:
   ```bash
   # .env (optional - defaults to production API)
   VITE_API_URL=http://localhost:3001
   VITE_WEB_URL=http://localhost:3000
   ```

   The extension uses these environment variables in `src/shared/config.ts`.

3. **Run in Development Mode**
   ```bash
   # Chrome
   npm run dev

   # Firefox
   npm run dev:firefox
   ```

## 🏗️ Production Builds

Generate distribution-ready packages for any target browser:

```bash
# Build for Chrome (Manifest V3)
npm run build

# Build for Firefox
npm run build:firefox

# Build for Safari
npm run build:safari
```

Packages are output to the `.output/` directory, organized by target.

### Generated Artifact Policy

- `.output/` and `.artifacts/` are generated build outputs and should not be committed.
- Use `npm run zip` (plus browser variants) to regenerate release packages when needed.

### ZIP-based Distribution (No Store Push)

This project supports packaging and sharing extension builds as ZIP files:

```bash
# Generate Chrome ZIP package
npm run zip
```

Output example:
- `.output/ephemera-extension-0.1.0-chrome.zip`

For local browser usage:
1. Extract the ZIP file.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

This workflow avoids publishing to Chrome Web Store when internal/team usage is preferred.

## 🔒 Permissions

- `storage`: Unified state management and theme persistence.
- `alarms`: Reliable background polling and countdown timers.
- `notifications`: Native alerts for incoming emails.
- `sidePanel`: Persistent sidebar productivity interface.
- `scripting` & `activeTab`: Dynamic UI injection and field detection.
- `contextMenus`: Contextual actions for quick inbox generation.

## 📡 Backend Integration

The extension integrates with the Ephemera API (`https://api.manhquy.click`).
- **Standard Auth**: Email/Password and 2FA support.
- **Anonymous Auth**: Session-less inbox creation via `deviceId`.
- **Push Service**: Secure subscription to incoming message events.

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run with coverage report
npm run test:coverage

# Run E2E tests (requires built extension)
npm run test:e2e
```

**Test Coverage:** 183 tests covering shared modules, components, and content scripts.

## 🔧 Troubleshooting

### Extension not loading
1. Ensure you're on Chrome 88+ (MV3 requirement)
2. Check `chrome://extensions` for error messages
3. Verify API endpoint is reachable

### Push notifications not working
1. Check notification permissions in browser settings
2. Verify service worker is active in `chrome://serviceworker-internals`
3. Ensure user is authenticated

### Content script not injecting
1. Check if site is in CSP blocklist
2. Verify `activeTab` permission is granted
3. Try refreshing the page after extension install

### Login issues
1. Clear extension storage: Settings → Sign Out
2. Check network tab for API errors
3. Verify API endpoint in `src/shared/config.ts`

## 📋 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | User authentication |
| `/auth/me` | GET | Get current user |
| `/dashboard` | GET | Fetch inboxes and stats |
| `/inboxes` | POST | Create new inbox |
| `/inboxes/:id` | PATCH/DELETE | Update/delete inbox |
| `/inboxes/:id/messages` | GET | Fetch messages |
| `/push/subscribe` | POST | Register push subscription |

## 📄 License

Private - Ephemera © 2026
