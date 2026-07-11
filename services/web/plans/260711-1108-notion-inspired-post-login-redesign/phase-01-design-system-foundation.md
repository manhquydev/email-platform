---
phase: 1
title: "Design System Foundation"
status: completed
effort: ""
---

# Phase 1: Design System Foundation

## Overview

Foundational phase — blocks all others. Add a clean 2-layer token architecture (primitives → semantic) ALONGSIDE the existing `nebula-*`/`v3-*` tokens (do not delete old token files — they're consumed by ~2,316 class refs across 172 files outside this plan's 5-page scope, red team finding #2), reskin to Notion-inspired light-first palette (both light+dark), restyle the shared `AppShell`/`MainLayout` chrome, and build 2 of the 4 missing UI primitives (Badge, Modal — Table and Tabs move to Phase 6, their actual first real consumer, red team finding #13).

**Revised after red team review (2026-07-11):** original scope included deleting old token files and `ConfirmationModal.tsx`, and a native `<dialog>` Modal migration — all removed as out-of-scope/unsafe. See `plan.md` Red Team Review section for full rationale.

Priority: P1 (hard blocker for Phases 2-6).
Depends on: none.

Research basis: `researcher-260711-1122-design-tokens-email-ux-report.md` (design-token architecture + primitive patterns).

## Key Insights

- Current state: 3 token files (`nebula-glass.css`, `version-c-tokens.css`, `design-tokens.css`) with overlapping/duplicate color definitions (`nebula.cyan`/`nebula.pink` both aliased to same blue). Root cause of future maintenance pain — fix now, not later.
- `ThemeContext.tsx` toggles BOTH `document.documentElement.classList` (`dark`) AND a `data-theme` attribute, and Tailwind is configured `darkMode: 'class'`. New tokens must respect the `.dark` class selector (not `[data-theme]`) to stay wired to Tailwind's existing dark-mode mechanism — don't introduce a second theming trigger.
- Recommended architecture (2 layers, not 3):
  - **Primitives** (`primitives.css`): raw values only, ~15-20 core colors, no theme awareness. `--color-neutral-50`, `--color-blue-500`, etc.
  - **Semantic** (`semantic-tokens.css`): purpose-named, references primitives, theme-aware via `.dark` override block. `--semantic-bg-primary`, `--semantic-text-main`, `--semantic-accent`, `--semantic-border`.
  - No component-layer CSS vars — component-specific styling happens via Tailwind classes/`@apply`, referencing only semantic tokens.
- Accent color confirmed via Validation Session 1 (see `plan.md`): keep `#3B82F6` (current brand blue), not the Notion reference's `#2EAADC` — preserves brand recognition. <!-- Updated: Validation Session 1 - accent color decided -->
- Primitive patterns (no headless lib, matches existing hand-rolled convention):
  - **Modal** (this phase): keep the EXISTING `ui/ConfirmModal.tsx` DOM/focus-trap mechanics unchanged — no native `<dialog>` migration (that changes focus/DOM behavior, which is functional work, not visual restyle — red team finding #6). Only retoken its CSS.
  - **Badge** (this phase): plain `<span>` + Tailwind variant classes, no JS.
  - **Table** (deferred to Phase 6): plain semantic `<table>` + `<caption>`/`<th scope>` — NOT `role="grid"`/`aria-colcount`/`aria-rowcount` (that's an interactive-widget ARIA pattern implying arrow-key nav, wrong for read-only display tables — red team finding #12).
  - **Tabs** (deferred to Phase 6): native ARIA `tablist`/`tabpanel` roles + a small custom keyboard-nav hook (matches existing `useKeyboardShortcuts.ts` pattern) — built in Phase 6 where `SettingsTabs.tsx` is its first real consumer.

## Requirements

- Functional: `ThemeContext` 3-mode (light/dark/system) keeps working exactly as before — only token VALUES change, not the switching mechanism.
- Non-functional: no new runtime dependencies (no Radix, no Panda, no CSS-in-JS).

## Related Code Files

- Create: `src/styles/primitives.css` (raw token values)
- Create: `src/styles/semantic-tokens.css` (semantic tokens, light + `.dark` override block)
- Modify: `tailwind.config.js` (ADD semantic token mappings alongside existing `nebula.*`/`v3.*` namespaces — do NOT remove old namespaces, they have out-of-scope consumers)
- Do NOT delete: `src/styles/nebula-glass.css`, `src/styles/version-c-tokens.css`, `src/styles/design-tokens.css` — out of scope for this plan (red team finding #2), revisit in a separate full-app token migration
- Create: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/ConfirmModal.tsx` — retoken CSS only, keep existing DOM/focus-trap mechanics (no native `<dialog>` migration, red team finding #6). This becomes the canonical primitive for confirm-dialog usage in REDESIGNED pages only — it does not unify `ComposeModal`/`TransferInboxModal`'s separate `useModalAccessibility` mechanism (that's a broader modal-system consolidation, explicitly out of scope, red team finding #7).
- Do NOT delete: `src/components/ConfirmationModal.tsx` — has live callers outside scope (`Forwarding.tsx`, `Authenticator.tsx`, `Auth/PasskeyManager.tsx`, red team finding #1). Leave untouched.
- Modify: `src/layouts/AppShell.tsx`, `src/layouts/MainLayout.tsx` — shared chrome wrapping all 5 in-scope pages, hardcodes `nebula-violet` classes; must be retokened here since no later phase owns it (red team finding #3)
- Modify: `src/components/ui/GlassCard.tsx` (retarget to new tokens — 4 `GlassCard` symbols exist in different files per GitNexus, confirm which is the shared `ui/` one vs page-local copies before editing)
- Modify: `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Dropdown.tsx` (retoken only, no API change)

Table and Tabs primitives moved to Phase 6 (see that phase's Related Code Files) — Phase 5 explicitly has no use for Table, and Phase 6 (`SettingsTabs.tsx`) is the first real consumer of both (red team finding #13).

## Implementation Steps

1. Build `primitives.css`: raw hex values for the NEW palette anchored on the confirmed `#3B82F6` accent, ~15-20 core values. Does not touch/replace existing `nebula-*`/`v3-*` values.
2. Build `semantic-tokens.css`: map purpose-named tokens to primitives, light values as `:root`, dark values inside `.dark { }` block (NOT `[data-theme]`, to match existing Tailwind `darkMode:'class'` wiring).
3. Update `tailwind.config.js` `theme.extend` to ADD semantic token CSS vars alongside existing `nebula.*`/`v3.*` entries (additive change, not a replacement).
4. Build `Badge.tsx` primitive per pattern above.
5. Retoken `ui/ConfirmModal.tsx` CSS only — do not touch its DOM structure or focus-trap logic.
6. Retoken `AppShell.tsx`, `MainLayout.tsx`, `Button`, `Input`, `Dropdown`, `GlassCard` to semantic tokens — no prop/behavior changes.
7. Grep the 5 in-scope page files + their `-modules`/component trees (not all of `src/`) for `nebula-`/`v3-` usage as each phase migrates — full-`src/` zero-reference is explicitly NOT a Phase 1 gate.
8. Verify in dev server: toggle light/dark/system, confirm both themes render correctly on the retoken components (AppShell, ConfirmModal, Badge, Button, Input, Dropdown, GlassCard) with no FOUC/flash.

## Success Criteria

- [x] `primitives.css` + `semantic-tokens.css` created; old 3 token files untouched and still functional for out-of-scope pages
- [x] `Badge` primitive exists, accessible
- [x] `ConfirmModal.tsx` retokened, DOM/focus-trap mechanics unchanged; `ConfirmationModal.tsx` untouched (out of scope)
- [x] `AppShell.tsx`/`MainLayout.tsx` retokened — no more hardcoded `nebula-violet` classes (`MainLayout.tsx` needed no changes: pure auth-guard route wrapper, zero color classNames, verified by reading the file)
- [~] Light/dark/system theme switching — structurally verified (`.dark` class selector matches `ThemeContext.tsx`'s actual `classList` toggle mechanism) + live dev-server visual check of `/login` (GlassCard consumer) confirmed correct dark-theme rendering. Full authenticated in-app `AppShell` toggle check deferred — no test credentials available this session; optional manual follow-up, not a blocker.
- [x] `gitnexus_detect_changes()` scope check — GitNexus tool errored (ENOBUFS on full-repo diff, unrelated pre-existing working-tree state); verified equivalently via scoped `git status`: exactly the 11 expected files touched (8 modified + 3 new), nothing stray.

## Decision Log

- **GlassCard.tsx blast radius (2026-07-11):** Code review found `GlassCard.tsx` is imported by 41 files, including out-of-scope public pages (`Login.tsx`, `Register.tsx`, `Sales.tsx`, `Support.tsx`, `AnonymousLogin/Register.tsx`, `MagicLinkVerify.tsx`, several admin pages) never covered by this plan's risk assessment or Validation Session 1. User was asked and explicitly approved accepting the retoken as-is, same tradeoff class already approved for `AppShell`/`MainLayout` (CSS-only, old tokens still coexist, out-of-scope pages get incidental new styling but nothing breaks). Applies precedent to any future phase touching other wide-fan-out shared primitives.
- **Hygiene fixes applied post-review:** an unrelated `eslint-formatter-compact` devDependency line (already present in lockfile, never in `package.json`) was dropped from the Phase 1 diff — out of scope for a visual-only phase. `public/version.json` (build-timestamp artifact regenerated by `npm run build`/`npm run dev`) excluded from the commit.

## Risk Assessment

- **Risk:** additive token system (new alongside old) means two systems coexist longer-term — acceptable trade-off given the alternative (172-file out-of-scope breakage) is far worse. **Mitigation:** document the coexistence clearly in `plan.md`, treat old-token removal as a separate future plan once all consuming pages are eventually migrated.
- **Risk:** `GlassCard` name collision across 4 files (only `components/ui/GlassCard.tsx` is the shared primitive; others are page-local copies) — editing the wrong one has no effect. **Mitigation:** use `gitnexus_context` with `file_path` disambiguation before editing.
- **Risk:** `AppShell.tsx`/`MainLayout.tsx` are high-blast-radius shared files (wrap every authenticated route, not just the 5 in-scope pages) — a mistake here affects out-of-scope pages too. **Mitigation:** retoken only, no structural changes; verify out-of-scope pages (e.g. `/plans`, `/admin`) still render acceptably after this phase even though they're not being redesigned.

## Next Steps

Unblocks Phase 2 (Inbox Reading and Management) and all subsequent phases.
