---
phase: 4
title: "Focus Dashboard"
status: completed
effort: ""
---

# Phase 4: Focus Dashboard

## Overview

Restyle `/app` (`FocusDashboard.tsx` — metrics/overview landing, self-contained with recharts) to Phase 1 tokens. Delete the large orphaned `dashboard-modules/`, `focus-dashboard-modules/`, `components/dashboard/*` folders once each file is individually confirmed zero-consumer.

Priority: P2 (3rd in user-confirmed order).
Depends on: Phase 1 (tokens/primitives), Phase 3 (deletes the rest of the `inbox-manager`/nav dead-code chain first).

**Revised after red team review (2026-07-11):** added `QuickGenerateCard`/`QuickActions` to this phase's delete list — moved from Phase 3, because their only (dead) consumer `welcome-state.tsx` is deleted in THIS phase; deleting `QuickGenerateCard` earlier (Phase 3) while `welcome-state.tsx` still imports it would break `tsc -b` between phase commits (red team finding #5).

## Key Insights

- `FocusDashboard.tsx` is self-contained: own state, own `recharts` charts, does NOT import from `dashboard-modules/` or `focus-dashboard-modules/` (confirmed by scout).
- `WelcomeState` (`focus-dashboard-modules/welcome-state.tsx`) GitNexus-confirmed zero-consumer — safe to delete.
- Other `dashboard-modules/hooks/*` and `focus-dashboard-modules/hooks/*` files appeared as loosely-related nodes in a broad GitNexus downstream traversal from `FocusDashboard` — this is NOT confirmation they're live; likely fuzzy name-similarity matches (e.g. `useDashboardData` exists in BOTH `src/hooks/useDashboardData.ts` (possibly live, shared) AND `src/pages/dashboard-modules/hooks/use-dashboard-data.ts` (likely dead orphan) — same-ish name, different files. **Do not assume dead without a fresh per-file `gitnexus_impact` upstream check** — the two `useDashboardData` files are easy to confuse.
- `components/dashboard/*` (`MessageListPane`, `MessageDetailPane`, `MobileSidebar`) — scout found zero consumers; `MobileSidebar` depends on the already-confirmed-dead `Sidebar`/`sidebar-modules` chain.

## Requirements

- Functional: dashboard metrics/charts/overview content unchanged, restyle only.
- Non-functional: light+dark both themed.

## Related Code Files

- Modify: `src/pages/FocusDashboard.tsx`
- Delete (after fresh impact re-check, one file at a time): `src/pages/dashboard-modules/*` (all files, including `use-dashboard-data.ts`, `use-message-actions.ts`, `message-detail-pane.tsx`, `otp-highlight.tsx`)
- Delete (after fresh impact re-check): `src/pages/focus-dashboard-modules/*` (`welcome-state.tsx` confirmed; `use-focus-dashboard-data.ts`, `use-focus-inbox-actions.ts`, `use-focus-message-actions.ts` need individual re-check)
- Delete (together with `welcome-state.tsx`, after fresh impact re-check — moved from Phase 3, red team finding #5): `src/components/QuickGenerateCard*`, `src/components/QuickActions*`
- Delete (after fresh impact re-check): `src/components/dashboard/MessageListPane.tsx`, `MessageDetailPane.tsx`, `MobileSidebar.tsx` — **`MessageDetailPane`/dashboard-modules' `message-detail-modal.tsx` and `dashboard-modules/components/email-body.tsx` render raw email HTML via `sandbox="allow-same-origin allow-scripts"` (unsafe pattern) — if impact-check reveals any unexpectedly live, do NOT restyle as-is, flag immediately (red team finding #9)**
- Delete (after fresh impact re-check): `src/components/MessageList.tsx`, `src/components/MessageDetail.tsx` (dashboard-variant, distinct from `email-viewer`'s live components — confirm not imported anywhere before deleting)
- Do NOT confuse with: `src/hooks/useDashboardData.ts` (root `hooks/` dir, appeared as a distinct symbol in impact results — verify independently whether this one is actually live before touching)

## Implementation Steps

1. For each file listed above, run `gitnexus_impact({target, direction: "upstream"})` individually — do not batch-assume based on folder name alone.
2. Delete confirmed-zero-consumer files; run `gitnexus_detect_changes()` after each batch.
3. Restyle `FocusDashboard.tsx`: header, metric cards, chart containers, empty/loading states — Phase 1 tokens.
4. Verify recharts theming (chart colors/gridlines) matches new palette in both light+dark — recharts needs explicit color props, doesn't auto-inherit CSS vars.
5. Verify light+dark, loading state, empty state (new user, zero inboxes), populated state.

## Success Criteria

- [x] Every deleted file individually impact-checked (not folder-batch-assumed) — pre-verified via GitNexus per-file impact checks + repo-wide grep before execution; all 51 files confirmed zero-consumer
- [x] `/app` visually matches Phase 1 tokens, both themes — `FocusDashboard.tsx` fully migrated to `semantic-*` Tailwind classes, zero `nebula-`/`v3-` remaining (grep-verified)
- [x] Chart colors explicitly retokened (recharts requires manual color props) — `CHART_PALETTE.light`/`.dark` with `useTheme()`-driven selection, explicit stroke/fill/tooltip props for Area/Pie/CartesianGrid/XAxis/YAxis/Tooltip
- [~] `gitnexus_detect_changes()` shows only expected files touched — GitNexus MCP tools not available in this agent's toolset; verified equivalently via `npx tsc -b` (0 errors), `npm run build` (success), and targeted grep for all deleted symbol/path names (zero dangling references, false positives disambiguated)
- [x] `src/hooks/useDashboardData.ts` (root hooks dir) status resolved and documented — confirmed dead (zero references anywhere in `src/` after deletion, `tsc -b`/build both clean), deleted together with the unrelated `pages/dashboard-modules/hooks/use-dashboard-data.ts`

## Execution Notes (2026-07-11)

- Deleted 51 files total across 7 directories + 7 standalone files (see delegation report for full list).
- `MessageDetailPane`/`message-detail-modal.tsx`/`email-body.tsx` (unsafe `sandbox="allow-same-origin allow-scripts"` pattern) confirmed dead and deleted — no live-consumer surprise, no restyle-as-is scenario triggered. Independently confirmed by code review: all three red-team-flagged instances of this pattern (the third was already removed in Phase 3's `inbox-manager-modals.tsx`) are now fully gone from `src/`.
- **Resolves Phase 3's deferred `Sidebar.tsx` deletion**: `Sidebar.tsx`'s only consumer, `components/dashboard/MobileSidebar.tsx`, is deleted in this same batch, so both are removed together (no version where one exists without the other — verified by tester and code-reviewer independently).
- Independent tester + code-reviewer validation (post-implementation): build clean, 0 new test failures beyond Phase 3's pre-existing 8, zero dangling references across a sampled+full grep sweep, all known name-collision traps (`MessageDetailPane`/`MessageListPane` twins in `inbox-viewer-modules`, `QuickActions`/`QuickActionsCard` twins in admin modules, `sidebar-modules` substring twin in `split-pane/inbox-sidebar-modules`) correctly avoided. Score 9/10, no critical/high findings.
- `tsc -b`: 0 errors. `npm run build`: succeeded (chunk-size warnings only, pre-existing/unrelated).

## Risk Assessment

- **Risk:** two same-named `useDashboardData` symbols in different files causes a wrong-file edit or wrong-file deletion. **Mitigation:** always pass `file_path` to `gitnexus_context`/target disambiguation, never rely on name alone.
- **Risk:** `recharts` chart colors are prop-driven, not CSS-var-driven — easy to forget when retokening, resulting in charts that visually clash with the new palette. **Mitigation:** explicit checklist item in step 4.
