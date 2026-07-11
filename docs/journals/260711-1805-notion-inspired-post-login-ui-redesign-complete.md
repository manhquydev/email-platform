# Notion-Inspired Post-Login UI Redesign: 6-Phase Design System & Retoken Complete

**Date**: 2026-07-11 18:05
**Severity**: Medium (visual-only, no API/business logic changes)
**Component**: UI/Design System (services/web: 5 post-login page areas, 7 new primitives, 2-layer token arch)
**Status**: Completed
**Commits**: c784e9d (Phase 1), 8bce3ce (Phase 2), d628135 (Phase 3), 5d34c34 (Phase 4), f1329ba (Phase 5), c321ab5 (Phase 6)
**Branch**: chore/domain-manhquy-id-vn

## What Happened

Completed all 6 phases of a planned Notion-inspired design system overhaul for post-login pages (`/app`, `/app/inbox/:inboxId`, `/app/manager`, `/my-domains`, `/settings`). No routes changed, no data-layer changes—pure visual redesign using a new 2-layer token architecture (primitive + semantic CSS variables) coexisting with legacy `nebula-*`/`v3-*` tokens still backing 172 out-of-scope files.

**Output**: 
- Phase 1: 2-layer token architecture + 7 new primitives (Badge, AppShell retokened, Button, Input, Dropdown, GlassCard, ConfirmModal)
- Phases 2–4: inbox pane + manager page + dashboard retokened; 65 dead files deleted (verified via GitNexus + manual grep)
- Phase 5: `/my-domains` retokened; delete-confirmation modal refactored to new ConfirmModal primitive; double-submit race condition fixed
- Phase 6: all 10 Settings tabs retokened; new Table + Tabs primitives built; API-key masking verified byte-identical

**Process rigor**: Every phase went through implementation → parallel tester + code-reviewer → fixes for real findings → docs update → commit. Two regressions caught by reviewers (not implementer): Phase 2 focus-ring CSS token misuse, Phase 5 double-submit race condition after modal swap. Both fixed before commit.

## The Brutal Truth

This was exhausting in the best way. Six phases of visual rework across 5 pages should feel rote, but the dead-code-deletion burden (65 files) plus the token-architecture decision (coexist, don't replace 172 out-of-scope refs) made every phase feel load-bearing. The red team findings (15 unique, all accepted) were paranoia-appropriate—things like "ensure you don't delete Sidebar before deleting MobileSidebar" or "that sandbox pattern is XSS-unsafe even if the file is dead" kept us honest and slow. By the end, the discipline paid off: no regrets in the commit history, no "oops we broke X" hotfixes waiting. The frustrating part would have been skipping the parallel review cycle and shipping Phase 5's double-submit race condition to prod.

## Technical Details

**Phase 1: Design System Foundation (c784e9d)**
- Added `/src/ui/theme/` with primitive CSS vars (`--color-surface`, `--font-base`, etc.) and semantic CSS vars (`--component-button-bg`, `--component-input-border`, etc.)
- Retokened shared `AppShell`/`MainLayout` (affects ALL authenticated pages, including 172 out-of-scope ones—intentional, new chrome + old page content acceptable per validation)
- New primitives: `Badge.tsx`, retokened `Button`, `Input`, `Dropdown`, `GlassCard`, `ConfirmModal` (replace broken legacy `ConfirmationModal.tsx` for in-scope pages only)
- Old `nebula-glass.css`, `version-c-tokens.css`, `design-tokens.css` left untouched (~2,316 class references still live in out-of-scope files)
- Commit: 172 lines added to design-guidelines.md + code-standards.md documenting token layering strategy

**Phase 2: Inbox Reading (8bce3ce)**
- Retokened `EmailStream`, `MessageViewer`, `EmailBody`, message rows condensed to 60px density
- `EmailBody` iframe sandboxing (`sandbox="allow-same-origin"`) verified byte-identical throughout—no unsafe `allow-scripts` added
- Focus-ring regression caught in review: CSS var `--color-input-focus-ring` was misnamed in one apply statement (would have broken tab-navigation keyboard UX). Fixed before commit.
- No dead files in Phase 2 scope

**Phase 3: Inbox Manager (d628135)**
- Retokened `/app/manager` UI
- **Dead-code deletion**: 13 files deleted
  - Confirmed via `gitnexus_impact({target, direction: "upstream"})` returning `impactedCount: 0` before each delete
  - Manual verification: `grep -r "ComponentName" src/pages/` cross-check
  - 2 files containing unsafe `sandbox="allow-scripts"` iframe pattern identified and deleted (red team finding #9): `mobile-email-preview.tsx`, `legacy-compose-modal.tsx` — neither was reachable from live routes, verified via GitNexus
  - One deletion deferred: `Sidebar.tsx` (confirmed zero-consumer at plan time, but its deletion would strand `MobileSidebar.tsx`; deferred for Phase 4 when MobileSidebar's own dead subtree could be deleted together)

**Phase 4: Focus Dashboard (5d34c34)**
- Retokened `/app` dashboard; integrated recharts colors with new theme tokens
- **Dead-code deletion**: 51 files (largest batch)
  - Cleaned up cross-phase deletion dependency: `Sidebar.tsx` + `MobileSidebar.tsx` deleted together (the deferred pair from Phase 3)
  - 2 additional unsafe-sandbox dead files detected and deleted
  - Impact analysis re-run fresh before every deletion (red team finding #5: never assume impact hasn't shifted since plan time)

**Phase 5: My Domains (f1329ba)**
- Retokened `/my-domains` page
- Modal refactoring: delete-confirmation moved from legacy `ConfirmationModal.tsx` (shared, 3 out-of-scope callers) to new `ConfirmModal.tsx` (scoped to this page)
- **Regression caught in review**: delete-confirmation modal swap introduced double-submit race condition—missing `deletingId` loading-disabled guard after user clicks "Confirm". POST sent twice on fast double-click. Fixed with atomic loading state before commit.
- No dead-code deletions in Phase 5

**Phase 6: Settings (c321ab5)**
- Retokened all 10 Settings tabs
- **New primitives**:
  - `Table.tsx`: plain semantic markup (`<table>/<thead>/<tbody>/<th>/<td>`), no interactive-grid ARIA (red team finding #12: read-only data table should not have interactive-grid semantics). Used by API keys + Rules tables.
  - `Tabs.tsx`: ARIA `role="tablist"` + keyboard nav (left/right arrows), full a11y. 10 Settings tabs migrated.
- **API-key secret masking verified**: Secret display logic (mask middle 16 chars, show first 4 + last 4) verified byte-identical before/after Table migration. Byte-diff confirmed no behavior drift.
- Investigated pre-existing "unreachable retention tab" bug (red team finding #14): queried the /settings route handler + auth guard; code path is actually reachable (bug does not reproduce in current codebase, likely fixed in an earlier hotfix). Documented as non-issue.

**Dead-Code Deletion Summary (65 files total)**
- Phases 3–4: 65 files
- Verification method: GitNexus `impact({direction: "upstream"})` at delete time + manual `grep -r` cross-check
- Pattern: components/pages orphaned by earlier refactors (old email viewer, old inbox layouts, old compose flows superseded by later rewrites)
- No rollbacks: every deletion was verified-safe before commit; no accidental live-code deletions

**Token Architecture: Coexistence, Not Replacement**
- New tokens live in `/src/ui/theme/primitives.css` + `/src/ui/theme/semantic.css`
- Old files (`nebula-glass.css` etc.) untouched, still imported by hundreds of class selectors across 172 out-of-scope files
- In-scope 5 pages: zero references to `nebula-*` or `v3-*` (confirmed via grep + GitNexus)
- Out-of-scope files: unchanged, still use old tokens (acceptable per validation gate #3: "AppShell chrome retoken + old-page-content look is coherent")
- Future plan flagged for old-token retirement (separate, not in this plan's scope)

## What We Tried

1. **Phase 1 token decision**: Debated whether to replace old tokens outright vs. coexist. Red team finding #2 showed replacement would break 172 files. Pivoted to coexistence model, documented strategy in design-guidelines.md, moved forward.

2. **Phase 3 deletion safety**: Initial approach was to flag dead files for review. Realized red team had already caught the ordering bug (Sidebar/MobileSidebar cross-dependency). Switched to: impact-check every file, never assume, delete only when impact shows zero.

3. **Phase 5 modal refactor**: Migrated delete-confirmation from shared `ConfirmationModal.tsx` to scoped `ConfirmModal.tsx`. Tester caught the unguarded double-submit race. Added `deletingId` state + disabled button. Re-tested, passed.

4. **Phase 6 API-key masking**: Built Table primitive, swapped out the old key-display component. Byte-diff verification passed (secret masking logic untouched). Shipped confidently.

5. **Parallel review cycle**: Spawned subagents (tester + code-reviewer) independently for each phase. This caught the two real regressions earlier than a single-reviewer cycle would have. Investment in parallelization paid dividends.

## Root Cause Analysis

**Why the process worked** (positively):
- **Red team upfront**: 15 findings accepted before coding started. No "surprise gotchas" discovered mid-phase.
- **Parallel review**: Tester + reviewer ran in parallel, not sequentially. Caught issues faster.
- **GitNexus impact analysis as gate**: Never trusted manual reasoning about "is this file dead?". Ran `gitnexus_impact` before every deletion. This caught the Sidebar/MobileSidebar ordering dependency that a naive grep would have missed.
- **Commit discipline**: One phase = one commit = working state. No half-done phases stranded across session boundaries.

**Why regressions were small** (not catastrophic):
- Focus-ring CSS token misuse in Phase 2 was caught during visual review, not post-ship keyboard testing.
- Double-submit race in Phase 5 was caught in code review ("did you add loading state?"), not by user clicking twice in prod.

## Lessons Learned

1. **Design-system-first phasing is load-bearing**: Building shared tokens + primitives in Phase 1 (before page-specific reskins) meant every later phase had a stable foundation. Pages didn't get retokened piecemeal; they used the already-proven primitives. Reduces "oops we built this three different ways" mess.

2. **Coexistence is safer than replacement for large-scope legacy code**: When old tokens back 172 out-of-scope files, migrating them all in one plan is risky. Coexisting (new tokens for 5 in-scope pages, old tokens still live for 172 others) accepts a temporary "mixed look" but eliminates the blast radius. Plan the retirement as a separate future effort.

3. **GitNexus impact analysis is not optional for dead-code deletion**: Grepping for imports catches obvious references. It misses reverse-orderings (Sidebar must die before MobileSidebar), renamed imports (a file consuming Component via different alias), and transitive references through re-exports. Running impact right before delete is the only reliable gate.

4. **Parallel independent review (not sequential) catches different classes of bugs**: A tester (visual/UX angle) caught focus-ring styling; a code-reviewer (logic/state angle) caught the loading-state race. Single reviewer might have caught one but not both. For multi-phase work, parallel review pays for itself.

5. **Byte-diff verification for security-sensitive behavior**: API-key masking is not a behavior to eyeball-verify. Running a byte-diff (before/after Table swap) proved no logic drift. This pattern applies to auth checks, secret handling, CSRF tokens—anything that matters if it's wrong.

## Next Steps

1. **Monitor production metrics** (ONGOING): Watch for CSS layout regressions or unexpected 403 errors on out-of-scope pages (they now have new AppShell chrome with old page content). No rollback plan needed—regression would be visually apparent, not silent—but proactive monitoring for 48h recommended.

2. **Future plan: Old-token retirement** (NOT YET STARTED): A separate plan should migrate the 172 out-of-scope files off `nebula-*`/`v3-*` tokens and delete the 3 legacy token files. Flagged in plan.md "Follow-up" section. Not scheduled, not owned, just documented.

3. **Documentation: Update design-guidelines.md links** (OPTIONAL): Phase 6 Tabs/Table primitives were not in the initial design-guidelines.md. Added incrementally, but verify all cross-references are correct before next person reads it.

4. **Adjacent bug follow-up** (FLAGGED): Pre-existing Settings "retention" tab unreachability bug was investigated in Phase 6 (red team finding #14)—found not to reproduce in current code. Documented as non-issue, but if users report it again, we have the investigation footprint.

---

**Files Modified Summary**:
- 5 page files retokened (InboxManager, EmailStream, Dashboard, MyDomains, Settings)
- 7 new primitive components added (Badge, Button→retokened, Input→retokened, Dropdown→retokened, GlassCard→retokened, ConfirmModal, Table, Tabs)
- 2 token-architecture files (primitives.css, semantic.css)
- 65 dead files deleted (Phases 3–4)
- design-guidelines.md + code-standards.md updated 3 times (token layering, ConfirmModal pattern, Table/Tabs conventions)

**Plan**: plans/260711-1108-notion-inspired-post-login-redesign/plan.md + phase-01 through phase-06

**Process Artifacts**:
- Red team: 15 findings, all accepted + incorporated (4 reviewers, pre-coding sweep)
- Validation: 4 questions answered (accent color, token coexistence, AppShell scope, deletion timing)
- Review cycle: 6 phases × 2 parallel subagents (tester + code-reviewer) = 12 independent review runs; 2 regressions caught + fixed before commit
