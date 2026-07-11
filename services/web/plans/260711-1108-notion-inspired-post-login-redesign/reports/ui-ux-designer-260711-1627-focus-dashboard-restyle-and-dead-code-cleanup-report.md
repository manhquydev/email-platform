# Phase 4: Focus Dashboard — Restyle + Dead-Code Cleanup

Plan: `services/web/plans/260711-1108-notion-inspired-post-login-redesign/phase-04-focus-dashboard.md`

## Restyle: `src/pages/FocusDashboard.tsx`

- Header, metric cards, chart containers, empty/loading states migrated from `nebula-*`/hardcoded `border-white/10`/`bg-surface/30`/`text-white`/`text-text-*` classes to Phase 1 `semantic-*` Tailwind tokens (`semantic-border`, `semantic-bg-elevated`, `semantic-bg-primary`, `semantic-text-main`, `semantic-text-secondary`, `semantic-accent-subtle`).
- Hero header: flat `bg-semantic-accent-subtle` panel (matches `InboxManager.tsx`'s Phase 3 header pattern) replacing the old `nebula-violet/nebula-cyan/nebula-pink` gradient.
- recharts theming: added `CHART_PALETTE.light`/`.dark` (grid/axis/line/categorical/tooltip colors derived from `primitives.css`/`semantic-tokens.css` hex values) and wired `useTheme()` (`resolvedTheme`) to select the active palette at render time. Passed explicit props to `CartesianGrid.stroke`, `XAxis.stroke`, `YAxis.stroke`, `Area.stroke`/gradient `stopColor`, `Cell.fill` (pie categorical), and `Tooltip.contentStyle`/`labelStyle` — className changes alone do not retheme recharts SVG elements, confirmed via source read.
- No state/logic/data-fetching changes — `useEffect`, `useMemo` hooks, `api` calls untouched.
- Loading state (`<Loading />` centered), empty states (`recentInboxes.length === 0`, `domainChartData.length === 0`), and populated state all verified by reading the conditional render paths — logic unchanged, only className/prop retokening applied.
- Zero `nebula-`/`v3-` classes remain (grep-verified).

## Dead-code deletion (51 files)

**Directories deleted (all files):**
1. `src/pages/dashboard-modules/` (12 files incl. `components/email-body.tsx` with unsafe `sandbox="allow-same-origin allow-scripts"`)
2. `src/pages/focus-dashboard-modules/` (7 files incl. `message-detail-modal.tsx`, same unsafe sandbox pattern)
3. `src/components/dashboard/` (9 files)
4. `src/components/quick-generate-card-modules/` (4 files)
5. `src/components/quick-actions-modules/` (4 files)
6. `src/components/message-detail-modules/` (5 files)
7. `src/components/sidebar-modules/` (3 files)

**Standalone files deleted:**
8. `src/components/QuickGenerateCard.tsx`
9. `src/components/QuickActions.tsx`
10. `src/components/MessageList.tsx`
11. `src/components/MessageDetail.tsx`
12. `src/components/SnoozePicker.tsx`
13. `src/components/Sidebar.tsx`
14. `src/hooks/useDashboardData.ts` (root `hooks/` dir — distinct from the deleted `pages/dashboard-modules/hooks/use-dashboard-data.ts`, both independently confirmed dead)

All 14 targets pre-verified present via `ls` before deletion, post-verified absent via `ls`-existence loop after.

## Verification

1. `npx tsc -b` — 0 errors, no output.
2. `npm run build` — succeeded (`5612 modules transformed`, PWA precache generated). Only warnings: pre-existing chunk-size warning (`index-CnHON9Kl.js` 1.6MB) and browserslist-db staleness notice, both unrelated to this change.
3. Grep sweep for deleted paths/symbols:
   - `dashboard-modules|focus-dashboard-modules|quick-generate-card-modules|quick-actions-modules|message-detail-modules|sidebar-modules|components/dashboard/` — 3 hits, all confirmed false positives on unrelated live dirs (`components/split-pane/inbox-sidebar-modules/`, `components/admin/admin-dashboard-modules/`).
   - Import-statement regex for `QuickGenerateCard|QuickActions|MessageList|MessageDetail|SnoozePicker|Sidebar|useDashboardData` from any relative path ending in those filenames — 0 matches.
   - Word-boundary grep for `MessageDetailPane`, `QuickActions`, `MessageList`/`MessageDetail`/`Sidebar`/`SnoozePicker`/`QuickGenerateCard` individually — all remaining hits traced to live, unrelated same-named symbols (`pages/inbox-viewer-modules/` `MessageDetailPane`, `components/admin/admin-backup-modules/` `QuickActions`, `components/inbox-viewer/`, `components/message-list-modules/`, `AppShell.tsx`'s own local sidebar markup, etc.) — none reference the deleted files.
   - `allow-same-origin allow-scripts` — 0 matches anywhere in `src/` (the two unsafe-sandbox dead files are gone).
4. `nebula-`/`v3-` grep on `FocusDashboard.tsx` — 0 matches.

Note: GitNexus MCP tools (`gitnexus_detect_changes`, etc.) are not in this agent's toolset — substituted with `tsc -b`/`build`/grep as an equivalent scope-verification gate, per the user's pre-verification already done via GitNexus before delegating.

## Docs updated

- `phase-04-focus-dashboard.md`: `status: completed`, success criteria checked off (one `[~]` for the substituted `gitnexus_detect_changes` gate, documented why).
- `plan.md`: Phase 4 row → Completed.

## Deviations

None from the phase spec. The GitNexus-unavailability substitution above is the only deviation from the literal instruction text, and it's a verification-method substitution, not a scope change — `tsc -b`+`build`+grep is at least as strict for "only expected files/symbols changed" in a pure-deletion+CSS-classname batch (no new symbols introduced besides `CHART_PALETTE`/`useTheme` import, both intentional).

## Unresolved questions

None.

Status: DONE
Summary: FocusDashboard.tsx restyled to Phase 1 semantic tokens with theme-aware recharts colors; 51 confirmed-dead files deleted across 7 dirs + 7 standalone files; tsc -b and npm run build both clean; zero dangling references to any deleted file/symbol.
