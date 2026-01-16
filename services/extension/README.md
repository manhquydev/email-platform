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

2. **Run in Development Mode**
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
