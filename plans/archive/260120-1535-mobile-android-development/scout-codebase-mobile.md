# Scout Report: Mobile Development Codebase
Date: 2026-01-20
Status: Complete

## 1. Mobile Application (`services/mobile`)
The primary React Native/Expo application.

### Core Architecture
- **API Client**: `src/api/`
  - `client.ts`: Base Axios instance with interceptors
  - `auth.ts`, `inboxes.ts`, `messages.ts`, `teams.ts`: Feature-specific API methods
  - `push.ts`: Push notification registration and management
- **State Management**: `src/store/`
  - `authStore.ts`: User session and token management
  - `notificationStore.ts`: Push notification state
  - `themeStore.ts`: UI theme preferences
- **Hooks**: `src/hooks/`
  - `useAuth.ts`, `useNotifications.ts`, `useTheme.ts`: Core feature hooks
  - `useOfflineSync.ts`, `useOptimisticUpdates.ts`: Data consistency strategies
  - `useSSE.ts`: Real-time updates via Server-Sent Events

### UI & Navigation
- **Screens (`app/`)**: Expo Router file-based routing
  - `(auth)/`: `login.tsx`, `register.tsx`
  - `(tabs)/`: `inboxes.tsx`, `settings.tsx`, `teams.tsx` (Main tab bar)
  - `inbox/[id].tsx`, `message/[id].tsx`: Detail views
- **Components (`src/components/`)**:
  - `MessageItem.tsx`, `AISummaryCard.tsx`, `EmptyState.tsx`
- **Theme (`src/theme/`)**: `colors.ts` (Design tokens)

### Configuration
- `package.json`: Dependencies (Expo ~54, React Native 0.81, Zustand, React Query)
- `app.json`: Expo configuration
- `.env.example`: Required mobile environment variables

## 2. Web Mobile Components (`services/web`)
Reference implementations for mobile-responsive web UI.

- `src/components/mobile/`:
  - `SwipeableInboxCard.tsx`, `SwipeableMessageItem.tsx`: Gesture interactions
  - `PullToRefresh.tsx`: Mobile pattern implementation
  - `BottomSheet.tsx`, `InboxActionSheet.tsx`: Modal/Overlay patterns

## 3. Backend API (`services/api`)
Endpoints and services directly consumed by mobile.

### Key Routes (`src/routes/`)
- `auth.ts`, `authenticator.ts`: Authentication flows
- `inboxes.ts`, `messages.ts`: Core data fetching
- `push.ts`: Mobile push notification management
- `realtime-sse.ts`: Real-time event stream
- `mobile.ts` (if exists) or shared routes

### Critical Services (`src/services/`)
- `push-notification.ts`: Handling FCM/APNs logic
- `realtime-events.ts`: Event dispatching system
- `visibility-engine.ts`: Data access control

### Data Model
- `prisma/schema.prisma`:
  - `PushSubscription` (likely): Storing device tokens
  - `User`, `Inbox`, `Message`: Core entities

## 4. Unresolved Questions
1. Does the current `useSSE.ts` implementation support background connection maintenance on mobile?
2. Are there specific mobile-only API endpoints, or does it consume the standard Web API?
3. Is Biometric authentication fully implemented in `src/utils/biometrics.ts`?
