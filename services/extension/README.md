# Ephemera Browser Extension

A Chrome Extension (Manifest V3) for Ephemera Temporary Email service.

## Features
- **Quick Inbox Creation**: Generate a disposable email in one click.
- **Auto-fill**: Automatically detect email fields on websites and fill them with your disposable email via a custom dropdown.
- **Inbox Management**: View, extend (+10m), or delete inboxes directly from the popup.
- **Permanence Toggle**: Switch inboxes between Temporary and Permanent states.
- **Real-time Sync**: Automatic data synchronization between popup, background, and content scripts.
- **Live Countdown**: Ticking timers for temporary inboxes to track expiration.
- **Message Preview**: Read and manage emails directly in the popup.
- **Real-time Notifications**: Receive native notifications for new incoming emails with unread badges.
- **Customizable Settings**: Toggle Auto-copy to clipboard and notification preferences.

## Development Setup

1. **Install Dependencies**
   ```bash
   cd services/extension
   npm install
   ```

2. **Development Mode (Hot Reload)**
   ```bash
   npm run dev
   ```
   This will output a `dist` directory.

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `services/extension/dist` folder

## Building for Production

```bash
npm run build
```
This generates a production-ready build in `dist`.

## Architecture
- **Manifest V3**: Uses Service Workers (`src/background`) instead of background pages.
- **React 19**: Popup UI (`src/popup`) built with React and TailwindCSS.
- **CRXJS**: Vite plugin for seamless extension development.
- **Content Script**: (`src/content`) Handles DOM interaction for auto-fill.

## Permissions
- `storage`: For saving auth token and state.
- `alarms`: For periodic polling (fallback).
- `notifications`: For showing native notifications.
- `activeTab` & `scripting`: For auto-fill functionality.
- `clipboardWrite`: To copy email addresses.

## backend Integration
The extension communicates with the Ephemera API (`api.manhquy.click`).
Specific endpoints used:
- `/auth/login`, `/auth/me`
- `/extension/quick-inbox`
- `/extension/dashboard`
- `/push/subscribe`
