## Code Review: Inbox Permanence Toggle Feature

### Scope
- **Files reviewed:**
  - `services/web/src/pages/InboxManager.tsx`
  - `services/web/src/components/split-pane/InboxSidebar.tsx`
  - `services/web/src/components/mobile/InboxActionSheet.tsx`
  - `services/web/src/components/InboxCard.tsx`
- **Focus:** Implementation of inbox permanence toggle, logic correctness, UI consistency, and type safety.

### Overall Assessment
The implementation is solid, following the established patterns of the application. The logic for toggling between permanent and temporary states is correctly handled across the state management and API layers. The UI updates are consistent across Desktop (Sidebar, Card) and Mobile (ActionSheet) views.

### Verification of Requirements
1.  **Proper prop drilling and type safety:** ✅
    - New props `onTogglePermanent` are correctly typed in all interfaces (`InboxSidebarItemProps`, `InboxCardProps`, etc.).
    - Props are passed down correctly from `InboxManager`.
    - Optional props are handled safely.

2.  **Consistency in UI labels:** ✅
    - Labels "Chuyển sang Vĩnh viễn" (Switch to Permanent) and "Chuyển sang Có hạn (24h)" (Switch to Limited) are consistent across all three UI components.
    - Icon usage (Clock for limiting, Archive/Infinite for making permanent) and color coding (Amber vs Purple) are consistent.

3.  **Correct conditional rendering of "Gia hạn" (Extend):** ✅
    - The "Extend" button is correctly hidden when an inbox is permanent (`!expiresAt`) using the condition `onExtend && inbox.expiresAt`.
    - This prevents users from trying to extend an inbox that doesn't expire.

4.  **Race conditions or state sync:** ✅
    - `InboxManager` uses functional state updates (`setInboxes(prev => ...)`) ensuring thread safety for the local state.
    - `activeInbox` is updated synchronously with the list, ensuring the detail view reflects the new status immediately.
    - The logic correctly handles the toggle based on the current `expiresAt` value.

5.  **Compliance with design standards:** ✅
    - Uses existing UI components (`GlassCard`, `BottomSheet`) and utility functions (`cn`).
    - Follows the "Nebula" design aesthetic with appropriate gradients and glassmorphism effects.

### Suggestions for Improvement (Low Priority)

1.  **DRY (Don't Repeat Yourself) - Icons:**
    - The SVG icons for "Toggle Permanent" (and others) are duplicated across `InboxSidebar.tsx`, `InboxActionSheet.tsx`, and `InboxCard.tsx`.
    - **Recommendation:** Extract these into small functional components (e.g., `IconPermanent`, `IconTemporary`) in `services/web/src/components/icons` to reduce code duplication and ensure visual consistency if icons change later.

2.  **DRY - String Literals:**
    - UI strings like "Chuyển sang Vĩnh viễn" are hardcoded in multiple files.
    - **Recommendation:** Move these to a constants file or a localization object (if i18n is planned) to maintain a single source of truth.

3.  **Client-side Date Calculation:**
    - The code uses `Date.now() + 24 * 60 * 60 * 1000` for the new expiration date.
    - **Recommendation:** While acceptable for now, relying on client clock can be risky if the user's device time is incorrect. Ideally, the API endpoint could accept a duration (e.g., `ttl: "24h"`) or a flag (`permanent: false`) and calculate the timestamp server-side.

### Conclusion
The changes are approved. The code is safe, functional, and integrates well with the existing codebase. No critical or high-priority issues were found.
