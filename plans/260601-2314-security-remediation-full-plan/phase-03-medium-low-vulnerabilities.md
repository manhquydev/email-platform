# Phase 03 — Medium + Low Vulnerabilities

## Context Links
- Findings: `research/security-audit-findings.md`
- Overview: `plan.md`
- Depends on: Phases 00-02 (credentials, encryption, auth flow established)

## Overview
- **Priority:** P2 — Week 3-4
- **Status:** pending
- **Effort:** ~1d
- **Description:** Remediate 14 MEDIUM + 8 LOW findings: real CAPTCHA, IDOR/access-control gaps, fail-closed token revocation, transport/TLS gaps, infra hardening (Redis auth, pinned image), dependency updates, CI fork-injection, timing/secret leakage, mobile storage.

## Key Insights
- Several items are "fail-open" defaults that should become "fail-closed" (token revocation, CAPTCHA).
- IDOR fixes follow one pattern: scope every mutation/read by authenticated identity ownership.
- CI `pull_request_target` change is sensitive — must scope secrets explicitly to avoid the same injection class it fixes.

## Requirements
**Functional**
- CAPTCHA validated against a real provider, not a static secret compare.
- All SCIM / WHMCS SSO operations ownership-checked.
- Token revocation denies on Redis failure (fail-closed).
- Redis requires auth; postgres image pinned by digest.
- CLI deps updated; CI not exploitable from forks.

**Non-functional**
- No behavior regression for legitimate users.
- Compile/typecheck clean per touched service.

## Architecture
- Provider-based CAPTCHA verification (hCaptcha/Turnstile) replacing static compare.
- Ownership predicate added to SCIM/WHMCS handlers using authenticated principal.
- Fail-closed branch in token-revocation on infra error.

## Related Code Files
**Modify**
- `services/api/src/routes/public.ts` (lines 8-10)
- `services/api/src/routes/scim.ts` (lines 97-135)
- `services/api/src/routes/admin/notification-templates.ts`
- `services/api/src/routes/admin/backup.ts` (path decode)
- `services/api/src/services/token-revocation.service.ts` (lines 78-93)
- `plugins/whmcs/.../ephemera.php` (line 541)
- `plugins/cpanel/whm/index.cgi`
- `services/mobile/app/message/[id].tsx` (lines 169-173)
- `services/api/src/imap/server.ts` (lines 62, 87)
- `services/api/src/config/redis.ts` (lines 6-9)
- `packages/cli/src/cli.ts` (deps)
- `k8s/database-deployment.yaml` (line 82)
- `services/api/src/utils/password.ts`, `services/api/src/.../constants.ts` (bcrypt rounds)
- `.github/workflows/security.yml` (lines 6-7)
- `packages/sdk-core/src/webhook-verifier.ts` (lines 33-36)
- `services/mobile/src/store/authStore.ts`

## Implementation Steps
1. **Real CAPTCHA** — replace `token === captchaSecret` with hCaptcha/Turnstile server-side verify call (`public.ts:8-10`). Provider TBD (Open Questions).
2. **SCIM IDOR** — add `WHERE userId = authenticatedUser.id` ownership check in SCIM PATCH/DELETE (`scim.ts:97-135`).
3. **Admin inline role checks** — consolidate `user?.role !== 'ADMIN'` to `app.requireAdmin` middleware (`notification-templates.ts`).
4. **backup.ts path check** — `decodeURIComponent(filename)` before path validation to defeat encoded traversal.
5. **Token revocation fail-closed** — on Redis connection error, deny the request instead of allowing (`token-revocation.service.ts:78-93`).
6. **WHMCS SSO IDOR** — validate `$_GET['email']` belongs to the authenticated WHMCS client (`ephemera.php:541`).
7. **CSRF in WHM forms** — add CSRF token to all WHM CGI forms (`index.cgi`).
8. **WebView email HTML sandbox** — add `originWhitelist={[]}` + sandbox props to WebView (`message/[id].tsx:169-173`).
9. **STARTTLS** — implement or remove STARTTLS advertisement in IMAP server (`server.ts:62,87`).
10. **Redis auth** — add password to Redis config (`redis.ts:6-9`); align with Phase 00 secret manager.
11. **Outdated deps** — update `packages/cli` inquirer/ora/chalk to latest (`cli.ts`).
12. **K8s postgres image** — pin `postgres:16-alpine` to a specific digest (`database-deployment.yaml:82`).
13. **bcrypt rounds** — unify to 12 across `password.ts` and `constants.ts`.
14. **CI fork injection** — change `security.yml` trigger from `pull_request` to `pull_request_target` with explicit, minimal secrets scoping (`:6-7`).
15. **Webhook verifier timing** — don't leak timestamp age in error message (`webhook-verifier.ts:33-36`); return generic verification failure.
16. **Mobile AsyncStorage** — verify TanStack Query persister excludes auth tokens from unencrypted AsyncStorage (`authStore.ts`); use secure storage if needed.

## Todo List
- [ ] 1. Real CAPTCHA provider verification
- [ ] 2. SCIM ownership check (PATCH/DELETE)
- [ ] 3. Consolidate admin role checks to `requireAdmin`
- [ ] 4. URL-decode before backup path validation
- [ ] 5. Token revocation fail-closed on Redis error
- [ ] 6. WHMCS SSO email ownership validation
- [ ] 7. CSRF tokens in WHM CGI forms
- [ ] 8. WebView sandbox for email HTML
- [ ] 9. Implement/remove STARTTLS (IMAP)
- [ ] 10. Redis password auth
- [ ] 11. Update CLI deps
- [ ] 12. Pin postgres image digest
- [ ] 13. Unify bcrypt rounds to 12
- [ ] 14. CI `pull_request_target` + scoped secrets
- [ ] 15. Remove timing/age leak in webhook verifier
- [ ] 16. Audit mobile token storage
- [ ] Typecheck affected services; run tests
- [ ] vbsec re-scan; triage residual findings

## Success Criteria
- CAPTCHA bypass with static secret no longer works.
- SCIM/WHMCS cross-account access blocked (test proves ownership enforcement).
- Token revocation denies on Redis outage (fail-closed test).
- Redis rejects unauthenticated connections; postgres image digest-pinned.
- `npm audit` clean for `packages/cli`; CI not runnable with secrets from a fork PR.
- vbsec re-scan: residual MEDIUM/LOW documented with rationale.

## Risk Assessment
- **Fail-closed token revocation can lock users out during Redis outage** → add monitoring/alerting; ensure Redis HA.
- **`pull_request_target` misuse re-introduces injection** → never checkout/run untrusted PR code with secrets; scope tightly; review carefully.
- **STARTTLS implementation complexity** → if not implementing now, remove the advertisement to avoid downgrade confusion.
- **bcrypt rounds change** affects login latency → 12 is standard; verify perf acceptable.

## Security Considerations
- Prefer fail-closed for all security gates (CAPTCHA, revocation).
- Ownership checks derive identity from authenticated session, never client input.
- Generic error messages for verification failures (no oracle leakage).

## Next Steps
- Final vbsec re-scan to confirm 0 CRITICAL / 0 HIGH and triaged MEDIUM/LOW.
- Update `docs/system-architecture.md` + `docs/code-standards.md` with new security utilities (SSRF guard, field encryptor) and conventions.
- Enable secret-scanning pre-commit + CI gate to prevent regression.
