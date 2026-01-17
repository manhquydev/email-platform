# Changelog

All notable changes to the Ephemera project will be documented in this file.

## [0.3.0] - 2026-01-17

### Added
- **Power User Features:**
  - Enhanced Forwarding Rules Engine with multi-destination support (Email, Telegram, Discord, Webhook)
  - Advanced condition builder with regex, OTP detection, header matching
  - OTP Auto-Extractor with confidence scoring and caching
  - Webhook Notifications (MailHook) with retry logic and signature verification
  - DKIM signing for outbound emails with key rotation
  - Reply/Forward from inbox address with proper threading
- **Frontend:**
  - DestinationSelector component for multi-destination forwarding
  - ForwardingConditionBuilder with advanced operators
  - Enhanced Forwarding page with rule priority management
- **Testing:**
  - 49 unit tests for Power User Features
  - Code review and cleanup

### Fixed
- Missing `extractedOtp` database migration
- Type casting issues in forwarding routes
- Excessive logging in production

## [0.2.0] - 2026-01-16

### Added
- Browser Extension: Side Panel API integration for persistent inbox management.
- Browser Extension: WXT framework migration for multi-browser support.
- Browser Extension: Strict CSP policy and hardened ApiClient.
- Browser Extension: Unit & E2E testing (79 tests)
- Browser Extension: i18n localization (EN/VI)
- Browser Extension: Chrome Web Store submission preparation

### Fixed
- Browser Extension: Chrome Extension Service Worker reliability improvements.
- Browser Extension: Catch block typing and error handling verification.

## [0.1.0] - 2026-01-05

### Added
- Initial release of the core platform.
- SMTP ingest server with multi-domain support.
- Fastify-based REST API.
- React-based Web Dashboard.
- Docker Compose orchestration.
- Basic attachment support and message persistence.
