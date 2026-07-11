---
phase: 3
title: "Inbox Manager"
status: completed
effort: ""
---

# Phase 3: Inbox Manager

## Overview

Restyle `/app/manager` (inbox list — the real "Hộp thư" page) to the new tokens/primitives from Phase 1. Delete confirmed-dead layout variants living under `components/inbox-manager/` and other orphaned nav/card components that would otherwise confuse this redesign.

Priority: P2 (2nd in user-confirmed order, after inbox reading).
Depends on: Phase 1 (tokens/primitives).

**Revised after red team review (2026-07-11):** added `desktop-left-pane.tsx`/`desktop-manager-workspace-pane.tsx`(+test file)/`SplitPaneLayout.tsx` to this phase's delete list (previously unowned by any phase). Removed `QuickGenerateCard` from this phase's delete list — moved to Phase 4, same phase as its only consumer `welcome-state.tsx` (deleting it here first would break `tsc -b` since the consumer isn't gone yet). Un-blanket-protected `inbox-manager/hooks/` — 3 of its 5 files have zero consumers and are now delete candidates here, not exempted (red team findings #1/#5 sub-items).

## Key Insights (from scout + GitNexus)

- `InboxManager.tsx` is a single-file page — does NOT use `desktop-inbox-layout.tsx`/`mobile-inbox-layout.tsx` from `components/inbox-manager/`. It renders its own card list + filter bar + `CreateInboxModal` inline.
- `components/inbox-manager/hooks/use-inbox-manager-data.ts` and `use-inbox-search.ts` ARE live — but consumed by `InboxWorkspace.tsx` (Phase 2), not `InboxManager.tsx`. Do not modify their return shape/behavior, only touch UI that consumes them if any.
- `components/inbox-manager/desktop-layout-modules/desktop-middle-pane.tsx` IS live (used by InboxWorkspace) — do not delete, but do NOT restyle it here; it belongs to Phase 2.
- GitNexus-confirmed zero-consumer (safe to delete this phase): `DesktopInboxLayout` (`desktop-inbox-layout.tsx`), `MobileInboxLayout` (`mobile-inbox-layout.tsx`), `mobile-layout-modules/*`, `inbox-manager-modals.tsx`, `QuickGenerateCard`, `QuickActions`, `Sidebar` (+`sidebar-modules/*`), `MobileNavigation` (+`mobile-navigation-modules/*`).
- Re-run `gitnexus_impact` on each target immediately before deleting (repo state may have shifted since this plan was written).

## Requirements

- Functional: page behavior unchanged (filter, search, create inbox, open/copy/delete/share, pagination, recently-opened sidebar) — restyle only.
- Non-functional: both light+dark themed via Phase 1 tokens; mobile responsive (existing Tailwind breakpoint classes, no new component split needed since `InboxManager.tsx` already uses responsive classes not separate mobile component).

## Related Code Files

- Modify: `src/pages/InboxManager.tsx`
- Modify: `src/components/CreateInboxModal.tsx` (or wherever create-inbox modal lives — verify exact path at execution time)
- Delete (after impact re-check): `src/components/inbox-manager/desktop-inbox-layout.tsx`
- Delete (after impact re-check): `src/components/inbox-manager/mobile-inbox-layout.tsx`
- Delete (after impact re-check): `src/components/inbox-manager/mobile-layout-modules/*`
- Delete (after impact re-check): `src/components/inbox-manager/inbox-manager-modals.tsx` — **before deleting, verify it does not have a live consumer; it renders raw email HTML via `sandbox="allow-same-origin allow-scripts"` (unsafe pattern) — if impact-check reveals it's unexpectedly live, do NOT restyle as-is, flag immediately (red team finding #9)**
- Delete (after impact re-check): `src/components/inbox-manager/desktop-layout-modules/desktop-left-pane.tsx` (`LeftPane`) and `desktop-manager-workspace-pane.tsx` (`ManagerWorkspacePane`), including their dedicated test file — exclusively consumed by the doomed `desktop-inbox-layout.tsx` (red team finding #5)
- Delete (after impact re-check): `src/components/split-pane/SplitPaneLayout.tsx` (unused 3-pane pattern, previously unowned — red team finding #5)
- Delete (after impact re-check, per-file, NOT blanket): `src/components/inbox-manager/hooks/use-inbox-manager-actions.ts`, `use-inbox-data.ts`, `use-inbox-actions.ts` — confirmed zero-consumer by red team review despite this phase's original blanket "do not touch" on the whole hooks folder (red team finding #5)
- Delete (after impact re-check): `src/components/Sidebar.tsx`, `src/components/sidebar-modules/*`
- Delete (after impact re-check): `src/components/MobileNavigation.tsx`, `src/components/mobile-navigation-modules/*`
- Do NOT delete yet (moved to Phase 4 — its only consumer `welcome-state.tsx` isn't deleted until then, red team finding #1): `src/components/QuickGenerateCard*`, `src/components/QuickActions*`
- Do NOT touch: `src/components/inbox-manager/hooks/use-inbox-manager-data.ts`, `use-inbox-search.ts`, `src/components/inbox-manager/desktop-layout-modules/desktop-middle-pane.tsx` (Phase 2 territory, confirmed live)

## Implementation Steps

1. Re-run `gitnexus_impact` on each delete candidate above; abort deletion for any with `impactedCount > 0` and investigate.
2. Delete confirmed-dead files; run `gitnexus_detect_changes()` to confirm no unexpected symbol impact.
3. Apply Phase 1 tokens to `InboxManager.tsx`: card list styling, filter bar, pagination tabs, recently-opened sidebar.
4. Replace any hand-rolled confirm/modal usage with the Phase 1 consolidated `Modal`/`ConfirmModal` primitive.
5. Verify light+dark in dev server (empty state, populated state, loading state).
6. Verify mobile breakpoint rendering (no separate mobile component exists here — same file, responsive classes).

## Success Criteria

- [~] Dead files deleted: 13 of 15 originally listed (`Sidebar.tsx`/`sidebar-modules/*` deliberately deferred — see Decision Log). All 13 verified zero-consumer independently (GitNexus + repo-wide grep + `tsc -b`), no breakage.
- [x] `/app/manager` visually matches Phase 1 token system (structurally verified — `semantic-*` tokens only, zero `nebula-`/`v3-` remaining)
- [x] Filter/search/create/open/copy/delete/share/pagination all functionally unchanged (diff-verified: zero handler/state/prop changes; note — `InboxManager.search.test.tsx`/`InboxManager.management.test.tsx` are pre-existing `describe.skip`'d, so this claim has no automated regression net, only diff review)
- [~] Mobile viewport — structurally verified (existing responsive Tailwind classes untouched); live dev-server check not performed this session
- [x] No new console errors/warnings — `tsc -b` and `eslint` both clean on all touched files

## Decision Log

- **`Sidebar.tsx`/`sidebar-modules/*` deletion deferred, not done.** Its only importer, `src/components/dashboard/MobileSidebar.tsx`, is itself dead but belongs to an entirely separate unplanned dead folder (`src/components/dashboard/*`). Deleting `Sidebar.tsx` now would strand a dangling import in `MobileSidebar.tsx` and break `tsc -b`. **Resolved by existing plan structure**: Phase 4's doc (`phase-04-focus-dashboard.md` line 37) already lists `src/components/dashboard/MessageListPane.tsx`, `MessageDetailPane.tsx`, `MobileSidebar.tsx` for deletion — once Phase 4 removes `MobileSidebar.tsx`, `Sidebar.tsx` becomes a valid delete candidate (either as part of Phase 4 or a quick follow-up after it).
- **Security note carried forward, not new**: code review flagged that `pages/dashboard-modules/components/email-body.tsx` and `pages/focus-dashboard-modules/message-detail-modal.tsx` both contain the same unsafe `sandbox="allow-same-origin allow-scripts"` pattern as the file deleted in this phase. Verified both are dead code (zero live consumers, confirmed via grep — `FocusDashboard.tsx` does not import from `focus-dashboard-modules/`, nothing imports `pages/dashboard-modules/` externally), so this is inert, not an active vulnerability. Already explicitly owned by Phase 4 (`phase-04-focus-dashboard.md` line 37, red team finding #9 caveat already present) — no new action needed, just confirming the plan already covers it correctly.

## Risk Assessment

- **Risk:** deleting `inbox-manager/` files that look dead but have a dynamic import or string-based reference GitNexus can't trace. **Mitigation:** grep for the exact export name across the repo as a second check before deleting, not just GitNexus.
- **Risk:** confusing this phase's `InboxManager.tsx` restyle with Phase 2's `InboxWorkspace.tsx` (both touch "inbox" naming, different files). **Mitigation:** this phase touches ONLY `/app/manager` route file; `/app/inbox/:id` is Phase 2, already done by the time this runs.
