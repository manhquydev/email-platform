---
phase: 5
title: "My Domains"
status: completed
effort: ""
---

# Phase 5: My Domains

## Overview

Restyle `/my-domains` (`MyDomains.tsx` + `my-domains-modules/*`) to Phase 1 tokens. Domain cards, add-domain modal, DNS config card — visual only, no new record types (SPF/DKIM/DMARC addition is explicitly out of scope, separate feature ask).

Priority: P2 (4th in user-confirmed order).
Depends on: Phase 1 (tokens/primitives, especially the consolidated Modal primitive).

## Key Insights

- Domains render as a vertical card stack (`grid gap-4`), not a `<table>` — Phase 1's new `Table` primitive is NOT needed here; `Badge` primitive (for verified/pending status) likely IS useful.
- Uses raw `--nebula-void`/`.btn-nebula` classes directly in `MyDomains.tsx` — needs explicit migration to new semantic tokens, not just relying on a global CSS var rename (some classes are hardcoded, not var-referencing).
- Delete confirmation currently uses `src/components/ConfirmationModal.tsx`. Per red team review, this shared file is NOT being deleted (it has other out-of-scope callers: `Forwarding.tsx`, `Authenticator.tsx`, `Auth/PasskeyManager.tsx`). Since `MyDomains.tsx` IS in this plan's scope, migrate only ITS OWN call site from `ConfirmationModal.tsx` to the consolidated `ui/ConfirmModal.tsx` as part of this page's restyle — leave the shared `ConfirmationModal.tsx` file itself in place for its remaining out-of-scope callers.
- DNS records shown: MX, A, TXT (verification token) only — no SPF/DKIM/DMARC UI exists. Do not add; flag as separate scope if user wants it later.

## Requirements

- Functional: add/verify/toggle-public/delete domain, DNS record copy-to-clipboard — unchanged.
- Non-functional: light+dark.

## Related Code Files

- Modify: `src/pages/MyDomains.tsx`
- Modify: `src/pages/my-domains-modules/my-domains-components.tsx` (`AddDomainModal`, `DNSConfigCard`, `DomainCard`, `DomainsEmptyState`)
- Verify migrated: any `ConfirmationModal` call site in this page → `ui/ConfirmModal.tsx`
- Do NOT modify: `src/pages/my-domains-modules/use-my-domains-data.ts` (data hook, no UI, out of scope)

## Implementation Steps

1. Grep `MyDomains.tsx` + `my-domains-components.tsx` for hardcoded `--nebula-*`/`.btn-nebula`/raw hex classes; replace with Phase 1 semantic token classes.
2. Restyle `DomainCard` status badges using the new `Badge` primitive.
3. Restyle `AddDomainModal`'s 2-step flow (domain entry → DNS records table) with new tokens; keep the hand-rolled `<table>` markup as-is — the shared `Table` primitive doesn't exist yet at this point in the sequence (built in Phase 6, red team finding #13), and this page runs before Phase 6.
4. Migrate `MyDomains.tsx`'s delete-domain confirmation from `ConfirmationModal.tsx` to `ui/ConfirmModal.tsx` (this page's own call site only — the shared file stays for its other out-of-scope callers).
5. Verify light+dark, empty state (no domains), pending-verification state, verified state.

## Success Criteria

- [x] No raw `--nebula-*`/hardcoded classes remain in this page's files (grep-verified; also swept raw Tailwind palette classes — `zinc-*`/`cyan-*`/`emerald-*`/`amber-*`/`rose-*` — since those don't respond to theme toggling either, same reasoning as the token-only rule)
- [x] Status badges use new `Badge` primitive (`variant="success"|"warning"|"info"`, matches real prop signature)
- [x] Delete confirmation uses consolidated `ConfirmModal` — migrated `MyDomains.tsx`'s own call site only; `ConfirmationModal.tsx` itself confirmed untouched (zero diff), still serves its 3 other live callers
- [~] Light+dark — structurally verified (all classes are theme-aware `semantic-*` tokens); live dev-server visual pass not performed this session
- [x] Scope check — confirmed via `git status`: exactly the 2 expected files touched

## Fix Applied Post-Review

- **Double-submit race condition** (both tester and code-reviewer independently caught this, score blocked at 6/10 until fixed): the old `ConfirmationModal.tsx` had an `isLoading` prop that disabled its buttons during the async delete call; `ui/ConfirmModal.tsx` has no such prop, so a rapid double-click on "Xóa" could fire two concurrent `DELETE` requests (the second likely 404s, surfacing a spurious error toast on an otherwise-successful delete). Fixed with the minimal, scope-respecting guard the reviewer recommended: `onConfirm={() => { if (!deletingId) confirmDelete(); }}` in `MyDomains.tsx`, reusing existing `deletingId` state — does not touch the out-of-scope `use-my-domains-data.ts` hook. Verified: `tsc -b` clean, `npm run build` clean, full test suite re-run shows baseline unchanged (228 pass / 8 pre-existing fail / 18 skip).

## Risk Assessment

- **Risk:** `MyDomains.tsx` has more hardcoded (non-token-referencing) classes than other pages, per scout finding — higher chance of missed spots during retoken. **Mitigation:** explicit grep-and-replace pass (step 1), not just visual spot-check.

## Next Steps

Flag to user post-phase: SPF/DKIM/DMARC UI addition is a real gap vs. README claims, but is a feature addition, not a redesign task — separate brainstorm/plan if wanted.
