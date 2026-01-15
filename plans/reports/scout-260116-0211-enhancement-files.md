# Scout Report: Enhancement Files (2026-01-16)

This report identifies the core files related to outbound email, team management, push notifications, and their integration points in the Settings and Dashboard components.

## 1. Outbound Email Sending

- **Service**: `D:/project/Clone/email-platform/services/api/src/services/outbound.ts`
  - Handles SMTP and Google API (Gmail) fallback.
  - Implements `sendEmail`, `sendVerificationEmail`, `sendWelcomeEmail`, etc.
- **Routes**: `D:/project/Clone/email-platform/services/api/src/routes/outbound.ts`
  - Endpoint: `POST /messages/outbound`
  - Handles credit deduction, domain ownership validation, and attachment processing.
- **Schema**: `D:/project/Clone/email-platform/services/api/prisma/schema.prisma`
  - `OutboundMessage`: Tracks status (QUEUED, SENT, DELIVERED, etc.) and ESP details.
  - `DomainDkim`: Stores DKIM keys for signing.
  - `BounceSuppressionList`: Manages invalid/complaining addresses.

## 2. Team Management

- **Routes**: `D:/project/Clone/email-platform/services/api/src/routes/teams.ts`
  - Handles team CRUD and membership.
- **Schema**: `D:/project/Clone/email-platform/services/api/prisma/schema.prisma`
  - `Team`: Core team model.
  - `TeamMember`: Junction for User/Team with roles (OWNER, ADMIN, MEMBER, VIEWER).
  - `TeamInbox`: Junction for Team/Inbox for shared access.
- **Frontend Component**: `D:/project/Clone/email-platform/services/web/src/components/settings/TeamSettings.tsx`
  - UI for managing team members and shared inboxes.

## 3. Push Notifications

- **Backend Routes**: `D:/project/Clone/email-platform/services/api/src/routes/push.ts`
  - Subscription management endpoints.
- **Backend Service**: `D:/project/Clone/email-platform/services/api/src/services/push-notification.ts`
  - Logic for sending VAPID-signed push messages.
- **Frontend Service Workers**:
  - `D:/project/Clone/email-platform/services/web/public/sw.js`
  - `D:/project/Clone/email-platform/services/web/public/push-sw.js`
- **Frontend Hooks/Utils**:
  - `D:/project/Clone/email-platform/services/web/src/hooks/usePushNotifications.ts`
  - `D:/project/Clone/email-platform/services/web/src/utils/push-subscription.ts`
- **Schema**: `D:/project/Clone/email-platform/services/api/prisma/schema.prisma`
  - `PushSubscription`: Stores endpoint, p256dh, and auth keys.

## 4. Frontend Settings & Dashboard

- **Settings Page**: `D:/project/Clone/email-platform/services/web/src/pages/Settings.tsx`
  - Main settings container.
- **Settings Tabs**: `D:/project/Clone/email-platform/services/web/src/components/settings/SettingsTabs.tsx`
  - Logic for switching between General, Security, Team, Notifications, etc.
- **Dashboard Page**: `D:/project/Clone/email-platform/services/web/src/pages/Dashboard.tsx`
  - Main app interface for inbox management and reading.
- **Dashboard Sub-components**:
  - `D:/project/Clone/email-platform/services/web/src/components/dashboard/MessageListPane.tsx`
  - `D:/project/Clone/email-platform/services/web/src/components/dashboard/MessageDetailPane.tsx`

## Unresolved Questions

- None. The core files for all requested features have been located and mapped to their respective roles in the system.
