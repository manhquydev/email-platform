---
phase: 6
title: "Settings"
status: completed
effort: ""
---

# Phase 6: Settings

## Overview

Restyle `/settings` (`Settings.tsx` + `components/settings/*`, 10 tabs, horizontal top-tab bar) to Phase 1 tokens. Largest file-count phase (10 tab modules) — mechanical once Phase 1 primitives exist, since most "tables" here are hand-rolled and can adopt the new `Table` primitive.

Priority: P2 (5th/last in user-confirmed order).
Depends on: Phase 1 (tokens/semantic system, `Badge`/`Modal` primitives).

**Revised after red team review (2026-07-11):** this phase now BUILDS the `Table` and `Tabs` primitives (moved from Phase 1 — this is their actual first real consumer; Phase 1 building them 4 phases before any usage was premature abstraction, red team finding #13). `Table` spec corrected to plain semantic `<table>` + `<caption>`/`<th scope>` — NOT `role="grid"`/`aria-colcount`/`aria-rowcount` (that's an interactive-widget ARIA pattern, wrong for read-only display tables, red team finding #12). Added explicit API-key secret masking preservation callout (red team finding #10) and a flag (not silent fix) for the pre-existing unreachable "retention" tab bug (red team finding #14).

## Key Insights

- Layout is horizontal top tabs (`SettingsTabs.tsx`), desktop scrollable bar / mobile dropdown — NOT a sidebar. The new `Tabs` primitive (built in this phase, ARIA tablist/tabpanel) is a natural fit — evaluate replacing `SettingsTabs.tsx`'s custom implementation with it, but only if low-risk (URL `?tab=` sync must keep working).
- Every "table" (DNS/payment history/tier comparison) is currently a hand-rolled `<table>` per module file — no shared `Table` primitive was reused. Build the `Table` primitive in this phase (its first real consumer) using plain semantic `<table>` + `<caption>`/`<th scope>` markup — no `role="grid"`/`aria-colcount`/`aria-rowcount` (red team finding #12, that ARIA pattern implies interactive arrow-key nav, wrong for these read-only tables).
- **`SubscriptionSettings`/billing sub-tab's API Keys area (`DeveloperSettings.tsx`) has a real secret-exposure risk**: `ApiKey.key` (the full, unmasked secret) is genuinely present in client state for newly-created keys, and masking is done via inline JSX string concatenation, not a dedicated masking utility. The `Table` primitive migration MUST NOT regress this masking behavior — verify manually after migration, this is not optional visual QA (red team finding #10).
- **Settings has a pre-existing bug**: `SETTINGS_TABS` includes `"retention"` but `SettingsTabs.tsx`'s rendered button list omits it — the retention tab is currently unreachable via the tab bar. This is NOT part of this redesign's scope. If the `Tabs` primitive swap touches this code path, FLAG the bug explicitly to the user rather than silently fixing or silently preserving it (red team finding #14).
- 10 tabs, each following page+`-modules` pattern: General, Security, Subscription/Billing (+pricing cards, tier table, payment history table, stats cards), Notifications, Filters, Labels, Retention, Teams, Developer (API keys) + nested Webhook Logs, Referral.
- `TelegramSection.tsx` likely nested inside Notifications tab — verify exact mount point before restyling in isolation.
- Legacy `?tab=domains` redirects to `/my-domains`, `?tab=billing` normalizes to `subscription` — these redirects are logic, not UI, leave untouched.

## Requirements

- Functional: all 10 tabs' existing behavior (forms, saves, table interactions) unchanged; `?tab=` URL sync preserved.
- Non-functional: light+dark across all 10 tabs.

## Related Code Files

- Create: `src/components/ui/Table.tsx` (plain semantic table, no interactive-grid ARIA — red team finding #12)
- Create: `src/components/ui/Tabs.tsx` (ARIA tablist/tabpanel + keyboard-nav hook)
- Modify: `src/pages/Settings.tsx`, `src/components/settings/SettingsTabs.tsx`
- Modify: `src/components/settings/GeneralSettings.tsx`
- Modify: `src/components/settings/SecuritySettings.tsx` + `security-settings-modules/*`
- Modify: `src/components/settings/SubscriptionSettings.tsx` + `subscription-modules/*` (pricing cards, tier table, payment history table, stats cards — heaviest sub-tab, most `Table` primitive adoption)
- Modify: `src/components/settings/NotificationsSettings.tsx` + `notifications-settings-modules/*`, `TelegramSection.tsx` (verify mount point first)
- Modify: `src/components/settings/FiltersTab.tsx` + `filters-tab-modules/*`
- Modify: `src/components/settings/LabelsTab.tsx` + `labels-tab-modules/*`
- Modify: `src/components/settings/RetentionSettings.tsx` + `retention-settings-modules/*`
- Modify: `src/components/settings/TeamSettings.tsx` + `team-settings-modules/*`
- Modify: `src/components/settings/DeveloperSettings.tsx` + `developer-settings-modules/*`, `WebhookLogs.tsx` + `webhook-logs-modules/*`
- Modify: `src/pages/settings-modules/referral-section.tsx`

## Implementation Steps

1. Verify `TelegramSection.tsx` and `WebhookLogs.tsx` actual mount points (which parent tab renders them) via `gitnexus_context` before restyling in isolation.
2. Evaluate `SettingsTabs.tsx` → Phase 1 `Tabs` primitive swap; confirm `?tab=` query-param sync still works before committing to the swap (if risky, restyle in place without swapping the underlying implementation).
3. Restyle `Settings.tsx` shell (sticky header, `max-w-7xl` content area) with Phase 1 tokens.
4. Work through the 10 tabs one at a time, in the order listed above (roughly simple → complex), retokening forms/cards, and replacing hand-rolled `<table>` markup with the new `Table` primitive where it doesn't change column behavior.
5. Verify light+dark per tab (10x verification passes — budget time accordingly, this is the largest phase).

## Success Criteria

- [x] `Table`/`Tabs` primitives built, accessible, no interactive-grid ARIA on read-only tables — verified by both tester and code-reviewer independently (plain `<table>`/`<caption>`/`<th scope="col">`, real ARIA tablist/tab/tabpanel + keyboard nav)
- [x] All 10 tabs restyled to Phase 1 tokens — zero `nebula-`/`v3-` remaining across all 27 files (grep-verified twice)
- [x] `?tab=` URL sync still works (including legacy `domains`/`billing` redirects) — `changeTab`/`normalizeSettingsTab`/`isSettingsTab` confirmed byte-identical to HEAD; `Settings.normalize-tabs.test.tsx` 3/3 passing
- [x] Hand-rolled tables migrated to `Table` primitive where applicable — 3 genuine consumers (`tier-comparison-table.tsx`, `payment-history-table.tsx`, `webhook-logs-components.tsx`), column/data behavior confirmed identical; API Keys list correctly identified as a card-list, NOT forced into `Table`
- [x] `TelegramSection`/`WebhookLogs` mount points confirmed and correctly restyled — `TelegramSection.tsx` is actually mounted in `SecuritySettings.tsx` (not Notifications as originally guessed; `AccountTelegramSection` is a separate component there), `WebhookLogs.tsx` confirmed in `DeveloperSettings.tsx`
- [x] API Keys tab: full-secret masking behavior verified byte-identical — one-time `{newKey}` reveal unchanged, persisted-list mask counted at exactly 16 asterisks before and after by both tester and code-reviewer independently, `apiKey.key` never rendered in list view
- [x] Retention tab bug status: investigated and flagged, not silently fixed — independently verified by orchestrator, tester, AND code-reviewer (3 separate checks) that "retention" is present and rendered via unfiltered `.map()` in both the pre-Phase-6 and post-Phase-6 `SettingsTabs.tsx`; the plan's own red-team finding #14 does not match current codebase reality (likely stale/from an earlier snapshot) — no code changed either way
- [~] Scope check — GitNexus MCP not available to the implementer agent's toolset; substituted with `tsc -b` + `build` + full grep sweep + `git status` diff-list cross-check (equivalent coverage, documented per Phase 4's precedent)

## Risk Assessment

- **Risk:** largest file count of any phase (10 tabs × page+modules) — highest chance of an overlooked sub-component. **Mitigation:** work tab-by-tab with its own verification pass, don't batch-restyle all 10 then verify once at the end.
- **Risk:** swapping `SettingsTabs.tsx` to the new `Tabs` primitive breaks `?tab=` deep-linking if not carefully wired. **Mitigation:** treat as optional; restyle-in-place is an acceptable fallback if the swap proves risky mid-phase.
- **Risk:** `SubscriptionSettings`/billing sub-tab touches payment/pricing display — get this one extra-careful visual QA since it's revenue-adjacent even though no logic changes.
- **Risk:** API Keys tab's `Table` migration accidentally strips or alters the inline JSX masking logic for `ApiKey.key`, exposing full secrets in the DOM. **Mitigation:** treat this as a security-sensitive diff, not just a styling diff — review the exact masking expression before/after line by line.
