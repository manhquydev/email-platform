---
title: "Post-login UI Redesign — Notion-inspired Design System"
description: ""
status: in-progress
priority: P2
branch: "chore/domain-manhquy-id-vn"
tags: []
blockedBy: []
blocks: []
created: "2026-07-11T04:23:52.010Z"
createdBy: "ck:plan"
source: skill
---

# Post-login UI Redesign — Notion-inspired Design System

## Overview

Visual-only redesign of the 5 live post-login page areas (`services/web`) to a Notion-inspired, light-first design system (both light+dark themes kept). Design-system-first phasing: Phase 1 builds shared tokens/primitives, Phases 2-6 apply them page-by-page in user-confirmed priority order. No data/API/business-logic changes — restyle existing behavior only. Confirmed dead-code modules (zero GitNexus consumers) get deleted per-phase as encountered, not bulk-removed upfront.

Brainstorm report: [post-login-ui-redesign-260711-1108-notion-inspired-design-system-report.md](../reports/post-login-ui-redesign-260711-1108-notion-inspired-design-system-report.md)

## Non-negotiable constraints (all phases)

- Keep TailwindCSS 3.4 (no framework swap, no CSS-in-JS, no headless UI lib addition)
- Keep react-router paths unchanged (`/app`, `/app/manager`, `/app/inbox/:inboxId`, `/my-domains`, `/settings`)
- Keep the `-modules` folder convention (page + `page-name-modules/` hooks+components split)
- Keep i18n (`react-i18next`, vi/en) — all new/changed UI text goes through existing translation keys
- Keep `ThemeContext` 3-mode theming (light/dark/system) — extend tokens, don't replace the mechanism
- Keep existing modal DOM/focus-trap mechanics as-is (no native `<dialog>` migration) — retoken CSS only, changing focus/DOM behavior is not visual-only work (red team finding #6)
- No changes to data hooks, API calls, or business logic — visual layer only
- Out of scope, flag only, do not fix: `/app*` route soft-guard gap, missing SPF/DKIM/DMARC UI in MyDomains, Settings "retention" tab pre-existing unreachable-tab bug (red team finding #14)
- Out of scope for this plan: `src/components/ConfirmationModal.tsx` deletion — it has live callers outside the 5-page scope (`Forwarding.tsx`, `Authenticator.tsx`, `Auth/PasskeyManager.tsx`, red team finding #1). Leave it untouched; the new consolidated `ui/ConfirmModal.tsx` is for redesigned-page usage only, not a forced migration of unrelated pages.
- Out of scope for this plan: deleting `nebula-glass.css`/`version-c-tokens.css`/`design-tokens.css`. They have ~2,316 class references across 172 files outside the 5-page scope (red team finding #2). Phase 1 ADDS new primitive/semantic tokens alongside the old files; old files stay until a separate full-app token migration is planned. "Zero nebula-*/v3-* references" success gates apply ONLY to the 5 in-scope page files, not `src/` as a whole.
- Dead-code deletion ordering: never delete a file before every one of ITS OWN dead consumers is deleted in the same step. Re-run `gitnexus_impact({target, direction: "upstream"})` immediately before each deletion — a file confirmed zero-consumer at plan-writing time may have shifted by execution time. Do not blanket-protect an entire folder as "do not touch" — audit per-file (red team finding #5).
- If a to-be-deleted dead-code file is found to render raw email HTML via `sandbox="allow-same-origin allow-scripts"` (an XSS-unsafe pattern) and the impact re-check reveals it unexpectedly has a live consumer: do NOT restyle it as-is. Flag it immediately — that sandbox pattern must never ship, dead or alive (red team finding #9).
- Before deleting any file: run `gitnexus_impact({target, direction: "upstream"})`, confirm `impactedCount: 0`, only then delete
- After each phase commit: run `gitnexus_detect_changes()` to confirm only expected files/symbols changed

## Phase commit discipline (red team finding #11)

Each phase = one commit (or a tight commit series) that leaves the app in a working, deployable state. Do not leave a phase half-done across a session boundary — restyle + delete-dead-code are coupled within a phase precisely so a partial phase doesn't strand deleted files with unmigrated consumers. If a phase is interrupted: either finish it before stopping, or `git reset`/revert back to the last complete phase boundary before starting anything else. Never start phase N+1 on top of an incomplete phase N.

## Red Team Review

### Session — 2026-07-11
**Findings:** 15 unique (from 30 raw findings across 4 reviewers, deduplicated) — 15 accepted, 0 rejected
**Severity breakdown:** 5 Critical, 6 High, 4 Medium
**Reviewers:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic (full tier, 4 reviewers for 6 phases)

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | `ConfirmationModal.tsx` deletion breaks live pages outside scope (Forwarding.tsx, Authenticator.tsx, PasskeyManager.tsx) | Critical | Accept | Plan.md constraints, Phase 1 |
| 2 | Token-file deletion breaks 172 out-of-scope files (~2,316 class refs) | Critical | Accept | Plan.md constraints, Phase 1 |
| 3 | `AppShell.tsx`/`MainLayout.tsx` (shared chrome, all 5 pages) unowned by any phase | Critical | Accept | Phase 1 |
| 4 | `EmailStream.tsx` mischaracterized as dead; confirmed live | Critical | Accept | Phase 2 |
| 5 | Cross-phase dead-code deletion ordering breaks `tsc -b` build | Critical | Accept | Plan.md constraints, Phase 3, Phase 4 |
| 6 | Native `<dialog>` Modal migration is functional scope creep, not visual-only | High | Accept | Plan.md constraints, Phase 1 |
| 7 | "Single Modal primitive" claim overstated (ComposeModal/TransferInboxModal untouched) | High | Accept | Phase 1 |
| 8 | Phase 2 virtualizer-swap language contradicts reality (EmailStream already uses tanstack-virtual) | High | Accept | Phase 2 |
| 9 | Dead-code-scheduled files contain XSS-unsafe `allow-scripts` sandbox pattern | High | Accept | Plan.md constraints, Phase 3, Phase 4 |
| 10 | Phase 6 Table migration risks regressing API-key secret masking | High | Accept | Phase 6 |
| 11 | No rollback/recovery story for an interrupted phase | High | Accept | Plan.md (Phase commit discipline) |
| 12 | Table primitive spec used interactive-grid ARIA for read-only data | Medium | Accept | Phase 6 |
| 13 | Table/Tabs primitives built in Phase 1 before any real consumer exists | Medium | Accept | Phase 1, Phase 6 |
| 14 | Settings "retention" tab pre-existing unreachable-tab bug | Medium | Accept | Plan.md constraints, Phase 6 |
| 15 | `EmailBody` sandboxed-iframe safety rigor overstated (no DOMPurify, depends on never adding `allow-scripts`) | Medium | Accept | Phase 2 |

Full reviewer reports: `plans/260711-1108-notion-inspired-post-login-redesign/reports/from-code-reviewer-to-planner-red-team-*.md`

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01 through phase-06 (after all 15 findings applied)
- Decision deltas checked: 15
- Reconciled stale references found and fixed during sweep (beyond the initial per-finding edits):
  - Phase 5: "delete-domain flow uses `ui/ConfirmModal.tsx`, not the deleted `ConfirmationModal.tsx`" — stale, since `ConfirmationModal.tsx` is no longer deleted. Corrected to: migrate only `MyDomains.tsx`'s own call site (it IS an in-scope page), leave the shared file for its other out-of-scope callers.
  - Phase 2 Overview: still said "standardize on `react-virtuoso`" after the Key Insights/Implementation Steps sections had already been corrected to keep `@tanstack/react-virtual`. Fixed for consistency.
  - Verified (fresh GitNexus check, not assumed): `MobileMessagesTab` (`mobile-layout-modules/mobile-messages-tab.tsx`) internally references `EmailStream` but is itself zero-consumer — Phase 3's deletion of `mobile-layout-modules/*` does not conflict with Phase 2's "EmailStream is live" finding. `EmailStream` stays live via `desktop-middle-pane.tsx` alone.
- Unresolved contradictions: 0

## Validation Log

### Session 1 — 2026-07-11
**Trigger:** Post-red-team validation gate (deep mode requires validation after red team review)
**Questions asked:** 4
**Verification pass:** Skipped per guard — `## Red Team Review` section already has full verification evidence (4 reviewers, file:line citations); no `[UNVERIFIED]` tags found in any phase file.

#### Questions & Answers

1. **[Assumption]** Accent color for the new design system (affects all 6 phases) — Phase 1 previously deferred this to an in-session `AskUserQuestion` during cook.
   - Options: Keep #3B82F6 (current brand blue) | Switch to #2EAADC (Notion ref accent) | Other
   - **Answer:** Keep #3B82F6 (current brand blue)
   - **Rationale:** Preserves existing brand recognition across logo/marketing assets not touched by this plan; still compatible with a Notion-light background.

2. **[Architecture]** Should old `nebula-*`/`v3-*` token files coexist with new tokens permanently, or is a follow-up migration plan expected?
   - Options: Temporary coexistence, follow-up plan later | Permanent coexistence, no follow-up planned
   - **Answer:** Temporary coexistence, follow-up plan later
   - **Rationale:** User wants the 172 out-of-scope files eventually migrated off old tokens via a separate future plan — this plan does not commit to that work, just doesn't block it.

3. **[Scope]** `AppShell.tsx`/`MainLayout.tsx` retoken (Phase 1) affects ALL authenticated pages, including 172 out-of-scope ones — accept the temporary "new chrome + old page content" look on out-of-scope pages?
   - Options: Accept, retoken as planned | Find a narrower scope, avoid touching AppShell
   - **Answer:** Accept, retoken as planned
   - **Rationale:** AppShell is unavoidably shared; retoken is CSS-only (no layout change), so out-of-scope pages stay visually coherent even if not fully redesigned.

4. **[Tradeoff]** Dead-code deletion: inline per-phase (current plan) or a dedicated cleanup phase before redesign work starts?
   - Options: Inline per-phase (current) | Separate Phase 0 cleanup first
   - **Answer:** Inline per-phase (current)
   - **Rationale:** Cross-phase deletion-ordering bugs were already fixed during red team review; a separate cleanup phase would add timeline without additional safety at this point.

#### Confirmed Decisions
- Accent color: #3B82F6 (unchanged from current brand) — Phase 1's "present options" step is now resolved, not deferred.
- Old-token migration: explicitly flagged as a future, separate plan — not part of this plan's scope or success criteria.
- AppShell retoken: proceeds as planned in Phase 1, no scope narrowing.
- Dead-code deletion: stays inline per-phase, no structural change to the 6-phase plan.

#### Action Items
- [x] Phase 1: remove the "present 2-3 accent-color options" step, replace with the confirmed #3B82F6 semantic-token mapping.
- [x] Plan.md: add a "Follow-up (not in this plan)" note for the future old-token migration/cleanup plan.

#### Impact on Phases
- Phase 1: accent-color decision step removed (already resolved), semantic tokens built directly against #3B82F6-derived palette.

### Whole-Plan Consistency Sweep (Validation Session 1)
- Files reread: plan.md, phase-01-design-system-foundation.md
- Decision deltas checked: 4
- Reconciled stale references: Phase 1 accent-color placeholder step removed and replaced with confirmed value
- Unresolved contradictions: 0

## Follow-up (not in this plan)

A separate future plan should migrate the ~172 out-of-scope files off `nebula-*`/`v3-*` tokens and delete the 3 legacy token files (`nebula-glass.css`, `version-c-tokens.css`, `design-tokens.css`). Not started, not scheduled — flagged here so it isn't forgotten.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Design System Foundation](./phase-01-design-system-foundation.md) | Completed |
| 2 | [Inbox Reading and Management](./phase-02-inbox-reading-and-management.md) | Pending |
| 3 | [Inbox Manager](./phase-03-inbox-manager.md) | Pending |
| 4 | [Focus Dashboard](./phase-04-focus-dashboard.md) | Pending |
| 5 | [My Domains](./phase-05-my-domains.md) | Pending |
| 6 | [Settings](./phase-06-settings.md) | Pending |

## Dependencies

<!-- Cross-plan dependencies -->
