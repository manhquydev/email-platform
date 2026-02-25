# Changelog

All notable changes to the Ephemera project will be documented in this file.

## [Unreleased]

### Fixed
- **Register/SSO opaque refresh tokens**: Register and SSO endpoints now store DB opaque refresh tokens (same as login), preventing 15-min logout after register/SSO sign-in
- **Multi-tab token rotation race condition**: Added cross-tab localStorage lock + 5s backend grace window to prevent concurrent refresh calls from invalidating each other
- **CSRF token cross-tab**: CSRF token now uses shared parent-domain cookie with localStorage fallback; eliminates CSRF mismatch across tabs/iframes
- **SsoCallback.tsx token API**: Now uses consistent `tokenManager` API instead of direct localStorage writes, matching interceptor expectations
- **Security - CSRF in SSO redirect URL**: `csrfToken` removed from SSO redirect URL query param; prevents token leakage in browser history/logs
- **Session expiry redirect**: Users are now redirected to `/login?reason=expired` with an informative toast when session expires, instead of silently staying on authenticated pages
- **initAuth loop**: `AuthContext` `initAuth` useEffect now runs only once on mount (hasInitialized ref), preventing repeated `/auth/me` calls on every token refresh
- **SSO refresh token leak**: SSO redirect URL no longer exposes refresh token; token now set as httpOnly cookie before redirect
- **localStorage key mismatch**: `handleLoginSuccess` (Passkey/Telegram flows) now writes `accessToken` key matching `tokenManager.getAccessToken()`
- **api.ts 401 interceptor**: Now dispatches `auth:unauthorized` event instead of direct navigation, ensuring proper BroadcastChannel cleanup

### Added
- **Remember Me feature**: Login page now has "Ghi nhớ đăng nhập (30 ngày)" checkbox; when checked, refresh token cookie TTL extends from 7 days to 30 days
- **Expired session toast**: Login page shows `toast.error` when navigated to with `?reason=expired` query param
- **Multi-tab logout sync**: When one tab logs out, all other tabs are redirected to login page via BroadcastChannel

### Changed
- All `logout()` callsites updated to pass `'manual'` reason (AppHeader, NavigationSidebar, DesktopNav, HamburgerMenu, GeneralSettings)
- Duplicate `startBackgroundRefresh` function removed from visibility-change useEffect (DRY)

## [0.3.4] - 2026-02-06

### Added
- **Frontend Token Interceptor (Phase 2):**
  - Migrated API utility from `fetch` to `axios` for robust interceptor support.
  - Proactive token refresh mechanism (threshold < 5 min).
  - Reactive 401 handling with automatic request queuing and retry.
  - Singleton refresh promise pattern to prevent race conditions.
  - New `token-manager.ts` utility for secure JWT handling.
- **Backend Refresh Endpoint (Phase 1):**
  - `POST /auth/refresh` for secure OAuth2-style token rotation.
  - Implementation of refresh token reuse detection and family rotation.
  - Integrated audit logging for rotation events.
  - Rate limiting: 10 requests/min per token.

## [0.3.3] - 2026-01-20

### Added
- **Mobile App (React Native + Expo SDK 54):**
  - Complete 11-screen mobile app with Teams, Messages, Inboxes, and Settings
  - Team management: create team, add members with role selection
  - AI Summary integration in message detail view
  - Zustand state management + React Query data fetching
  - TypeScript with path aliases (@/ → src/)

- **RFC 8601 Authentication Headers:**
  - New `auth-headers.ts` utility for generating Authentication-Results headers
  - SPF, DKIM, DMARC result formatting per RFC 8601
  - Integrated into email worker pipeline

### Fixed
- Label destructuring in email components (EmailItem, EmailHeader, email-stream-components)
- Removed unused ErrorResponse interface from ai-summary-card
- Mobile app peer dependencies (expo-font, expo-linking)

### Verified
- All 17/17 expo-doctor checks passing
- Web build successful (87 PWA entries, 2.5MB precache)
- Mobile TypeScript compilation clean

## [0.3.2] - 2026-01-20

### Added
- **Advanced Subscription Tiers:**
  - Extended `TIER_LIMITS` with 13 features per tier (domains, inboxes, storage, dailyEmails, retentionDays, teams, teamMembers, filters, forwardingRules, labels, webhooks, apiAccess, prioritySupport)
  - Added `TIER_INFO` with pricing and display metadata for FREE/STARTER/PROFESSIONAL/ENTERPRISE
  - New API endpoint `GET /billing/tiers` for fetching all tier data
  - New API endpoint `GET /billing/compare/:targetTier` for tier comparison with improvements calculation
  - `TierComparisonTable` component with dynamic data fetching and current tier highlighting
  - Pricing row in comparison table showing $0 → $5 → $15 → $49/month

- **AI-Powered Email Summarization:**
  - New `AISummarizationService` with Google Gemini API integration (gemini-2.0-flash)
  - Database schema: Added `aiSummary` and `aiSummarizedAt` fields to Message model
  - New API endpoint `POST /messages/:id/summarize` with tier-gating and credit-based billing
  - `AISummaryCard` component with collapsible UI, loading states, and error handling
  - Tier-gated access: STARTER+ tiers only (apiAccess required)
  - Credit-based: 1 credit per new summary (configurable via `AI_SUMMARY_CREDIT_COST`)
  - Cached summaries: Free retrieval after initial generation
  - Credit refund on API failure
  - Vietnamese UI labels throughout

## [0.3.1] - 2026-01-19

### Added
- **Settings Tabs Enhancement:**
  - Filters: Test preview endpoints (`POST /filters/:id/test`, `POST /inboxes/:id/filters/test`)
  - Filters: TestFilterModal UI component for testing filters against sample email data
  - Labels: Message list now displays labels with color badges (up to 3 visible)
  - Labels: Updated Message type to include label relations

### Fixed
- Messages queries now include labels data across all endpoints:
  - `GET /messages`
  - `GET /inboxes/:id/messages`
  - `GET /messages/search`
  - `GET /messages/:id`

### Verified
- Retention settings: `PATCH /auth/me` and `PATCH /inboxes/:id` fully support retentionDays with tier validation
- Sweep job runs with proper hierarchy (inbox → user → tier → global)
- Teams: Full CRUD, member management (OWNER/ADMIN/MEMBER/VIEWER roles), and shared inbox permissions working correctly
- TeamService provides centralized access control for all inbox/message endpoints

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
