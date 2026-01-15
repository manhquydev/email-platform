# Plan: Browser Extension Feature Completion

This plan outlines the implementation of missing features in the Ephemera Browser Extension: 2FA/TOTP support, Anonymous Mode, and Rate Limiting.

## 1. 2FA/TOTP Support
Enable users with 2FA to log in via the extension.

### Backend
-   Existing `/auth/login` already returns `requires2FA: true` and `tempToken`.
-   Existing `/auth/2fa/verify` handles TOTP verification.

### Frontend (`services/extension/src/popup/components/Login.tsx`)
-   Update `handleSubmit` to catch `requires2FA` response.
-   Add a conditional state to show the TOTP input field (similar to `services/web/src/pages/Login.tsx`).
-   Implement `handleVerify2FA` to call the backend verification endpoint.

## 2. Anonymous Mode
Allow creating temporary inboxes without a user account.

### Backend (`services/api/src/routes/extension.ts`)
-   Implement `POST /extension/anonymous-inbox`.
-   Use a "Device ID" (passed in header) to track and rate limit anonymous users.
-   Create inboxes with `ownerId: null` and `expiresAt: now + 24h`.
-   Generate a short-lived JWT scoped only to that specific inbox.

### Frontend (`services/extension/src/popup/components/Login.tsx`)
-   Add "Create Anonymous Inbox" button.
-   Store anonymous tokens in `chrome.storage.local`.
-   Modify `api.ts` to handle anonymous token injection.

## 3. Rate Limiting & Tier Indicators
Prevent abuse and provide user feedback on limits.

### Backend (`services/api/src/routes/extension.ts`)
-   Configure `@fastify/rate-limit` for `/extension/*`.
-   Authenticated: 50 requests/hour.
-   Anonymous: 10 requests/hour.

### Frontend (`services/extension/src/popup/components/InboxList.tsx`)
-   Add a usage bar/text (e.g., "Usage: 3/5 inboxes") based on `stats.totalInboxes` and `user.tier` from the dashboard API.

## Critical Files
-   `services/api/src/routes/extension.ts`
-   `services/extension/src/popup/components/Login.tsx`
-   `services/extension/src/popup/components/InboxList.tsx`
-   `services/extension/src/shared/api.ts`
-   `services/extension/src/shared/storage.ts`
