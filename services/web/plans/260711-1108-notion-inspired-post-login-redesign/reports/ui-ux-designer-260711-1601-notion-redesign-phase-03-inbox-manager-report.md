# Phase 3: Inbox Manager — Delete Dead Code + Restyle Report

Date: 2026-07-11
Scope: `services/web/src` — `/app/manager` restyle + confirmed-dead file deletion (Phase 3 of Notion-inspired post-login redesign plan).

## Files Deleted (13 files + 2 dirs)

1. `src/components/inbox-manager/desktop-inbox-layout.tsx`
2. `src/components/inbox-manager/mobile-inbox-layout.tsx`
3. `src/components/inbox-manager/mobile-layout-modules/` (dir — `index.ts`, `mobile-empty-states.tsx`, `mobile-inboxes-tab.tsx`, `mobile-messages-tab.tsx`)
4. `src/components/inbox-manager/inbox-manager-modals.tsx` (contained the unsafe `sandbox="allow-same-origin allow-scripts"` pattern — confirmed dead, deleted with no further action needed)
5. `src/components/inbox-manager/desktop-layout-modules/desktop-left-pane.tsx`
6. `src/components/inbox-manager/desktop-layout-modules/desktop-manager-workspace-pane.tsx` + `desktop-manager-workspace-pane.test.tsx`
7. `src/components/split-pane/SplitPaneLayout.tsx`
8. `src/components/inbox-manager/hooks/use-inbox-manager-actions.ts`
9. `src/components/inbox-manager/hooks/use-inbox-data.ts`
10. `src/components/inbox-manager/hooks/use-inbox-actions.ts`
11. `src/components/MobileNavigation.tsx`
12. `src/components/mobile-navigation-modules/` (dir — `index.ts`, `mobile-navigation-components.tsx`, `mobile-navigation-hooks.ts`, `mobile-navigation-types.ts`)

All 13 confirmed present before delete, all removed. `src/components/Sidebar.tsx`, `src/components/sidebar-modules/*`, `src/components/dashboard/*` left untouched per instructions (deferred cleanup item, not this phase).

## Barrel Files Edited (4)

- `src/components/inbox-manager/index.ts` — removed `DesktopInboxLayout`/`MobileInboxLayout`/`InboxManagerModals` re-exports, kept `export * from './hooks'`.
- `src/components/inbox-manager/desktop-layout-modules/index.ts` — removed `LeftPane`/`ManagerWorkspacePane` re-exports, kept `MiddlePane`/`EmptySearchState` (Phase 2, live).
- `src/components/inbox-manager/hooks/index.ts` — removed `useInboxData`/`useInboxActions`/`useInboxManagerActions` re-exports, kept `useInboxFilters`/`useFilteredInboxes`/`useInboxSearch`/`useInboxManagerData`.
- `src/components/split-pane/index.ts` — removed `SplitPaneLayout` export, kept `ResizeHandle`/`InboxSidebar`/`InboxSidebarItem`.

## Restyle Changes

- `src/pages/InboxManager.tsx` — full semantic-token retoken of hero banner, scope filter chips, search/domain-select/create/refresh row, page-size toggle, card list (email row, action buttons, share badge → `Badge` component), pagination bar, recently-opened sidebar. All `nebula-*`/`bg-white/[..]`/`border-white/*`/`text-white`/`text-text-secondary`/`rose-*`/`cyan-*` literals replaced with `semantic-*` tokens. Zero logic/handler/state changes — same `useCallback`/`useEffect` graph, same API calls, same `window.confirm` delete flow (native browser dialog, out of CSS scope). Only remaining `text-white` is intentional (white label text on the `semantic-accent` primary button, matching the `Button` primitive's own pattern).
- `src/components/CreateInboxModal.tsx` — retoken of sticky header/footer chrome (`border-nebula-border/60 bg-nebula-surface/95` → `border-semantic-border bg-semantic-bg-elevated/95`). No confirm-dialog markup exists in this file or its hook (`handleRequestClose` just calls `onClose()` directly, no window.confirm/custom dialog) — the phase spec's optional "switch to `ui/ConfirmModal.tsx`" step doesn't apply here.
- `src/components/create-inbox-modal-modules/create-inbox-modal-components.tsx` (deviation, see below) — retoken of `ModalHeader`, `EmailPreview`, `NoDomainState`, `DomainSelect`, `TTLSelect` (all nebula-*/text-text-secondary/text-text-tertiary/amber-300 → semantic-*). `LocalPartInput`/`ModalFooter` already used the retokened `Button`/`Input` primitives, untouched.

## Deviation from stated file list (justified)

Phase spec / task listed only `CreateInboxModal.tsx` as the modal file to restyle. That file is a thin wrapper (`GlassCard` shell + header/footer chrome); the actual visible form content — domain select, TTL select, email preview, empty-domain state — lives in its `-modules` file `create-inbox-modal-modules/create-inbox-modal-components.tsx`, which held the majority of the `nebula-*` classes. Retokening only the wrapper would have left the modal's real content unstyled, defeating the restyle goal. Extended scope to this one sibling `-modules` file — CSS/className only, no prop/behavior/type changes, consistent with the plan's "keep the -modules folder convention" constraint (this file is CreateInboxModal's own module, not a foreign one).

## Verification

- `npx tsc -b` — **0 errors** (both before touching restyle, right after deletions, and after all edits).
- `npm run build` — **succeeded** (25.08s, PWA precache generated). Pre-existing chunk-size warnings (`index-*.js` 1.6MB, `AdminNotificationPage` 530KB) unrelated to this change.
- Grep for all 11 deleted symbol/path names (`DesktopInboxLayout`, `MobileInboxLayout`, `InboxManagerModals`, `LeftPane`, `ManagerWorkspacePane`, `SplitPaneLayout`, `useInboxData`, `useInboxActions`, `useInboxManagerActions`, `MobileNavigation`, plus path fragments) across `src/` — **zero matches**.
- Grep `nebula-|v3-` in `InboxManager.tsx` and `CreateInboxModal.tsx` — **zero matches**.
- `git status` confirms exactly the 13 files + 2 dirs deleted, 4 barrel files + `InboxManager.tsx` + `CreateInboxModal.tsx` + `create-inbox-modal-components.tsx` modified — no unexpected file touched.
- Not run (no local dev server in this pass): light/dark visual check in browser, manual click-through of filter/search/create/open/copy/delete/share/pagination, mobile-viewport screenshot. Code-level review confirms all Tailwind responsive classes (`sm:`/`lg:`/`xl:`) preserved unchanged from original; only color/border/bg utility values were swapped for their semantic-token equivalents, so responsive behavior is unaffected by construction.

## Deviations Summary

1. Restyled `create-inbox-modal-components.tsx` in addition to `CreateInboxModal.tsx` (justified above — same modal, its own `-modules` file, CSS-only).
2. Reverted an unintentional first-pass copy edit ("Inbox Manager 2.0" → "Inbox Manager") back to original text — restyle is chrome/spacing/color only per task scope, not copy.

Status: DONE
Summary: deleted all 13 confirmed-dead inbox-manager/split-pane/mobile-nav files + fixed 4 barrel exports, retokened InboxManager.tsx + CreateInboxModal.tsx (+ its create-inbox-modal-components.tsx module) to semantic-* tokens with zero logic changes; tsc -b and npm run build both pass clean, zero dangling references to deleted symbols.
