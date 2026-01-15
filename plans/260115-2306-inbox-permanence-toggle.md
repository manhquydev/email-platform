# Implementation Plan: Inbox Permanence Toggle

This plan outlines the steps to add the ability for users to toggle their inboxes between "Temporary" (Có hạn) and "Permanent" (Vĩnh viễn) on the App Manager page.

## Context
- **Backend**: API already supports `expiresAt: null` in `PATCH /inboxes/:id`.
- **Frontend**: "Vĩnh viễn" is the established term for permanent inboxes.
- **Requirement**: Add UI controls to toggle this state.

## Phase 1: Shared Logic and UI Components
- Add `onTogglePermanent` prop to `InboxSidebarItem` and `InboxActionSheet`.
- Update `InboxSidebarItem` context menu:
    - If `expiresAt` is `null`: Show "Chuyển sang Có hạn (24h)".
    - If `expiresAt` is NOT `null`: Show "Chuyển sang Vĩnh viễn".
    - Hide "Gia hạn +10 phút" if already permanent.
- Update `InboxActionSheet` (Mobile):
    - Add "Chuyển thành vĩnh viễn" or "Chuyển thành có hạn" action item.
- Update `InboxCard` (Dashboard Grid):
    - Add similar toggle logic if it's used in the app manager or related pages.

## Phase 2: InboxManager Integration
- Implement `handleTogglePermanent` in `InboxManager.tsx`.
    - To Permanent: Call `PATCH /inboxes/:id` with `{ expiresAt: null }`.
    - To Temporary: Call `PATCH /inboxes/:id` with `{ expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }`.
- Pass the handler down to `InboxSidebar` -> `InboxSidebarItem`.

## Phase 3: Validation and Polish
- Ensure `TTLProgressBar` correctly displays the updated state immediately.
- Test both desktop (context menu) and mobile (action sheet) flows.

## Critical Files
- `services/web/src/pages/InboxManager.tsx`
- `services/web/src/components/split-pane/InboxSidebar.tsx`
- `services/web/src/components/mobile/InboxActionSheet.tsx`
- `services/web/src/components/InboxCard.tsx`
