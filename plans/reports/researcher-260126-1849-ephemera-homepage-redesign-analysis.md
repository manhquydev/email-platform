# Ephemera Homepage Redesign & Ephemeral Inbox Integration Analysis

## 1. Current Architecture
- **Landing Page**: `services/web/src/pages/LandingPage.tsx`
  - Composed of modular sections in `services/web/src/pages/landing-page-modules/`
  - Uses `LazyLanding3DScene` for background visuals
  - Redirects logged-in users to `/app`
- **Ephemeral Inbox**: `services/web/src/pages/EphemeralInbox.tsx`
  - Standalone page (`/e/:token`)
  - Logic: creation, polling (10s), extension, message list
  - Components: `EphemeralHeader`, `EphemeralMessageList`
- **Service Layer**: `services/web/src/services/ephemeralService.ts`
  - Handles API: `create`, `get`, `extend`, `getMessages`

## 2. Redesign Strategy: "Instant Inbox" on Hero
The goal is to move the "Zero Friction" value prop from a separate page directly to the Hero section.

### A. Logic Refactoring (The `useEphemeralInbox` Hook)
The logic currently trapped inside `EphemeralInbox.tsx` must be extracted to a reusable hook `services/web/src/hooks/useEphemeralInbox.ts` to be used by both the Landing Page and the standalone page.
- **State**: `inbox`, `messages`, `loading`, `error`
- **Actions**: `createInbox`, `refreshMessages`, `extendInbox`
- **Effects**: Polling interval management

### B. UI Components
1. **New Component**: `HeroInboxWidget` (in `landing-page-modules/components/`)
   - **State 1 (No Inbox)**: "Generate Random Email" button (CTA) with glassmorphism glow.
   - **State 2 (Active)**: Displays Address (copyable) + Live Message Stream (mini-view).
   - **Styling**: Must use `nebula-*` tokens (e.g., `bg-nebula-surface`, `shadow-nebula-glow`).
2. **Modify**: `HeroSection.tsx`
   - Replace generic "Get Started" buttons with `HeroInboxWidget`.
   - Ensure z-index places it above the 3D scene.

### C. Routing & Persistence
- **Challenge**: If a user creates an inbox on Home, how do they keep it?
- **Solution**:
  - Store `ephemeral_token` in `localStorage`.
  - On Page Load: Check `localStorage`. If valid token exists, show Active State in Hero immediately.
  - "View Full Inbox" button redirects to `/e/:token`.

## 3. Implementation Plan

### Files to Create
- `services/web/src/hooks/useEphemeralInbox.ts` (Refactored logic)
- `services/web/src/pages/landing-page-modules/components/HeroInboxWidget.tsx`

### Files to Modify
- `services/web/src/pages/EphemeralInbox.tsx` (Adopt new hook)
- `services/web/src/pages/landing-page-modules/HeroSection.tsx` (Integrate Widget)
- `services/web/src/pages/LandingPage.tsx` (Layout adjustments)

## 4. Unresolved Questions
- **Mobile UX**: Does the 3D scene interfere with the input/buttons on mobile? (Need to test `touch-action`).
- **SEO**: Should the Hero Inbox be server-side rendered or client-only? (Client-only is acceptable for ephemeral tools).
