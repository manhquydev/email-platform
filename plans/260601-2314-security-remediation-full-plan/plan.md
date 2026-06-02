---
title: "Security Remediation Full Plan"
description: "Fix 81 security vulnerabilities found in vbsec scan 2026-06-01"
status: code-complete
priority: P0
effort: 5d
branch: fix/security-audit-remediation
tags: [security, critical, remediation, owasp]
created: 2026-06-01
updated: 2026-06-02
---

# Security Remediation Full Plan

Remediate 81 vulnerabilities (17 CRITICAL, 42 HIGH, 14 MEDIUM, 8 LOW) from vbsec scan `2026-06-01`. Stack: TypeScript, Fastify, Prisma, PostgreSQL, React, Docker, Kubernetes, Python scripts.

## Implementation Status (2026-06-02)
- **Code/config remediation: COMPLETE** across Phases 01–03 + the code-side of Phase 00. All four
  services typecheck clean; web suite 224 pass (10 pre-existing EmailStream styling failures,
  unrelated) + extension 271 pass; api tests need Redis/Postgres (CI). Code review: no critical
  issues; flagged findings (incl. an SSO redirect-route bug) fixed.
- **Pending = operational only (Phase 00):** live credential rotation + git-history rewrite +
  K8s secret delivery + running the field-encryption back-fill. See
  `reports/phase-00-credential-rotation-ops-runbook.md`. Working tree is secret-free
  (`grep -r "Manhquy203" .` is clean).
- **Plan-vs-reality corrections applied:** 02-D encrypts 3 plaintext fields (DKIM/TOTP already
  encrypted); 03-14 did NOT switch CI to `pull_request_target` (would have *introduced* the vuln —
  pinned trivy + least-priv permissions instead); 03-16 mobile tokens already in SecureStore (no
  change); 02-I gated 8 debug globals across 7 files; magic-link/telegram 30d-no-jti tokens also
  fixed (bonus). Residual same-class items flagged: `/auth/sso` provider exchange still passes a
  short-lived access token in the URL (auth.ts), and `localStorage 'user'` PII (non-token).

## Source Reports
- Best practices: `research/security-best-practices-remediation-report.md`
- Findings: `research/security-audit-findings.md`
- Executive summary: `research/executive-summary.md`
- Scan: `../../vbsec-reports/vbsec-security-scan-2026-06-01-full-repo.md`

## Phases

| Phase | Title | Severity Scope | Status | Effort |
|-------|-------|----------------|--------|--------|
| [00](./phase-00-emergency-credential-rotation.md) | Emergency Credential Rotation | Exposed secrets (ops, no code) | code done · ops pending | 24h |
| [01](./phase-01-critical-code-fixes.md) | Critical Code Fixes | 17 CRITICAL (C-01..C-08) | done | 1.5d |
| [02](./phase-02-high-vulnerabilities.md) | High Vulnerabilities | 42 HIGH | done | 2d |
| [03](./phase-03-medium-low-vulnerabilities.md) | Medium + Low Vulnerabilities | 14 MEDIUM + 8 LOW | done | 1d |

## Execution Order (CRITICAL)
1. **Phase 00 first, immediately** — rotate live credentials before any code work. Exposed secrets remain valid until rotated; code fixes do not invalidate leaked credentials.
2. Phase 01 — close active exploitation paths (command injection, token leak, XSS).
3. Phase 02 — defense-in-depth and access-control hardening.
4. Phase 03 — remaining medium/low cleanup.

## Key Dependencies
- Phase 00 git history rewrite requires **team coordination** (breaks existing clones / force-push).
- Phase 01-B (`alias.service.ts`) and Phase 02-D (field encryption) both depend on a confirmed `ALIAS_ENCRYPTION_KEY` / encryption-key strategy from Phase 00 rotation.
- Phase 01-F (token-manager refresh flow) must land before Phase 02-H (SSE token in URL) since both touch auth token transport.
- Phase 02-D encryption migration must run after Phase 00 key rotation finalizes keys.

## Cross-Cutting Conventions
- No plan-reference labels (F1, C-08, phase numbers) in code comments, commit messages, or migration filenames. Explain the *why* (invariant/risk), not the origin.
- Conventional commits, no AI references.
- After each sub-task: run compile/typecheck for the touched service; do not commit with failing type checks.
- Run `gitnexus_impact` before editing shared symbols (auth, encryption utils, middleware).

## Success Criteria (overall)
- The leaked admin password no longer appears in the working tree (✅ verified — `grep` clean).
  Git-history purge of it remains an operational step (see ops runbook).
- No hardcoded secrets in any script or config (✅ working tree; verified by re-grep).
- vbsec re-scan reports 0 CRITICAL, 0 HIGH; MEDIUM/LOW triaged with documented rationale.
- All existing tests pass; new tests cover command-injection guards, SSRF guard, atomic quota, field encryption round-trip.

## Open Questions
- Confirm secret-management target for K8s: Sealed Secrets vs External Secrets Operator (Phase 00 task 6).
- Confirm whether git history can be force-pushed or a fresh clean repo is required (Phase 00 task 8).
- CAPTCHA provider choice: hCaptcha vs Cloudflare Turnstile (Phase 03 task 1).
