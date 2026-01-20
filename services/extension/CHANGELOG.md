# Changelog

All notable changes to the Ephemera Browser Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-20

### Added
- **Core Features**
  - User authentication with JWT tokens
  - Inbox management (create, view, delete)
  - Message viewing with HTML/text support
  - Push notifications for new messages
  - QR code generation for email sharing
  - Context menu for quick inbox creation
  - Side panel interface

- **Content Scripts**
  - Email field detection on websites
  - Auto-fill dropdown with Shadow DOM isolation
  - UI injection for seamless form filling

- **Accessibility**
  - WCAG 2.1 AA compliance
  - Full keyboard navigation
  - ARIA labels on all controls
  - Screen reader support
  - Loading skeletons for async operations
  - `prefers-reduced-motion` support

- **UI/UX**
  - Glassmorphism design with Material 3 aesthetics
  - Light, Dark, and System theme modes
  - Onboarding tour for new users
  - Error boundary for graceful error handling

- **Testing**
  - 183 unit tests across all modules
  - Component tests for all UI elements
  - Content script and background service worker tests

- **Documentation**
  - Privacy policy for Chrome Web Store
  - Permission justifications
  - Store listing description
  - README with setup instructions

### Technical Details
- **Framework:** WXT 0.19 + React 18 + TypeScript
- **Build Size:** 401 KB (production)
- **Manifest:** Chrome MV3, Firefox MV2 compatible
- **CSP:** Strict (`script-src 'self'`)

## [Unreleased]

### Planned
- Offline support with IndexedDB caching
- Cross-device sync
- Notification grouping
- Firefox Add-ons submission
- Safari extension support
