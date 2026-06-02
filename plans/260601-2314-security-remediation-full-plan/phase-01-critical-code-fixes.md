# Phase 01 — Critical Code Fixes

## Context Links
- Best practices: `research/security-best-practices-remediation-report.md` (§1, §4, §5)
- Findings: `research/security-audit-findings.md`
- Overview: `plan.md`
- Depends on: Phase 00 (rotated credentials + encryption keys must exist)

## Overview
- **Priority:** P0 — Week 1
- **Status:** pending
- **Effort:** ~1.5d
- **Description:** Code fixes for the 17 CRITICAL findings (C-01..C-08): hardcoded secrets, command injection, token-in-URL, JWT in localStorage, XSS.

## Key Insights
- Command injection (backup.ts, postfix-sync.ts) is directly exploitable from authenticated/admin paths → highest priority within the phase.
- httpOnly cookie helper (`setAuthCookies`) already exists and is used by `/auth/login`; reuse it for SSO and refresh flow.
- Removing the `alias.service.ts` dev-key fallback may break local dev without the env var — document the required env var.

## Requirements
**Functional**
- No hardcoded secrets in scripts; missing env var → hard fail at startup.
- No shell string interpolation of untrusted input; use `execFile` with arg arrays + allowlist validation.
- Auth tokens never appear in URLs or `localStorage`.
- User-controlled strings never injected via `innerHTML`.

**Non-functional**
- Compile/typecheck clean per touched service after each sub-task.
- Behavior preserved for legitimate flows (login, SSO, backup, postfix sync).

## Architecture
- Secret resolution centralized via env vars (Python `os.environ`, TS `process.env`) with fail-fast guards.
- Container ops use `execFile('docker', [...])` + `docker cp` for file content (no `sh -c` with interpolation).
- Auth transport: access token in memory, refresh token in httpOnly cookie, CSRF via double-submit; token refresh on 401.

## Related Code Files
**Modify**
- `scripts/deploy_ssh.py` + 28 other Python scripts in `scripts/`
- `services/api/scripts/debug_inbox_query.js`, `services/api/scripts/reset-pass.js`, `services/api/scripts/migrate_test_db.ts`
- `services/api/src/services/alias.service.ts` (line 37)
- `services/api/src/utils/postfix-sync.ts` (lines 20, 97-100)
- `services/api/src/routes/admin/backup.ts` (lines 199-209)
- `services/api/src/routes/sso.ts` (lines 54-55, 101)
- `services/web/src/utils/token-manager.ts` (lines 35, 40)
- `services/web/src/context/AuthContext.tsx` (line 30)
- `services/extension/src/content/ui-injector.ts` (lines 472-475)

## Implementation Steps (order: D → C → E → F → G → A → B)

### D) Command injection — `admin/backup.ts:199-209`
1. Validate `containerName` (sourced from `docker ps`) against `/^[a-zA-Z0-9_.-]+$/`; reject otherwise.
2. Replace template-string `execAsync` with `execFile('docker', ['exec', validatedName, 'pg_dump', ...])`.
3. Validate `backupFile`: `path.resolve(backupFile).startsWith(allowedBackupDir)`; reject traversal.

### C) Command injection — `postfix-sync.ts:97-100, :20`
1. Validate `POSTFIX_CONTAINER` at startup with `/^[a-zA-Z0-9_.-]+$/`.
2. Replace `docker exec ${C} sh -c 'echo "${content}"...'` with `docker cp` of a temp file:
   `await execFile('docker', ['cp', tmpPath, `${containerName}:/app/shared/relay_domains`])`.
3. Remove temp file in `finally`.

### E) SSO tokens in URL — `sso.ts:54-55, :101`
1. Replace `redirect(.../auth/callback?token=...&refreshToken=...)` with `setAuthCookies(reply, request, refreshToken, csrfToken)`.
2. Redirect to `${appConfig.webUrl}/auth/callback?success=true` (no tokens in URL).
3. (Recommended) add OAuth `state` cookie validation per best-practices §5.

### F) JWT in localStorage — `token-manager.ts:35,40` + `AuthContext.tsx:30`
1. Store `accessToken` in memory (module variable or Zustand), not `localStorage`.
2. `refreshToken` stays httpOnly cookie (server-set); client never reads it.
3. CSRF token read from cookie or memory, not `localStorage`.
4. Implement refresh flow: on API 401 → POST `/auth/refresh` with `credentials: 'include'` + `X-CSRF-Token` → store new accessToken in memory.

### G) XSS in extension — `ui-injector.ts:472-475`
1. Replace `element.innerHTML = \`<span class="email">${emailAddress}</span>\`` with:
   create span, `span.textContent = emailAddress; span.className = 'email'; element.appendChild(span)`.

### A) Hardcoded secrets in 29 Python scripts (+ JS/TS scripts)
1. Replace `PASSWORD = "<REDACTED-OLD-SECRET>"` → `PASSWORD = os.environ["DEPLOY_PASSWORD"]`.
2. Replace PAT-in-URL → `os.environ["GITHUB_PAT"]` (or Actions secret).
3. Replace `postgres:postgres` fallback → raise `ValueError` if env var missing.
4. Replace debug scripts' hardcoded URLs → env vars or CLI args.

### B) Fallback hardcoded key — `alias.service.ts:37`
1. Remove `'dev-only-key-do-not-use-in-prod!'` fallback.
2. `const key = process.env.ALIAS_ENCRYPTION_KEY; if (!key) throw new Error('ALIAS_ENCRYPTION_KEY env var required');`
3. Document the env var in `.env.production.template`.

## Todo List
- [ ] D: validate container name + `execFile` pg_dump + backup path check (`backup.ts`)
- [ ] C: validate `POSTFIX_CONTAINER` + `docker cp` temp file (`postfix-sync.ts`)
- [ ] E: SSO `setAuthCookies` + token-free redirect (`sso.ts`)
- [ ] F: access token in memory + refresh-on-401 flow (`token-manager.ts`, `AuthContext.tsx`)
- [ ] G: `textContent` instead of `innerHTML` (`ui-injector.ts`)
- [ ] A: env-var secrets across 29 Python scripts + JS/TS scripts
- [ ] B: remove alias dev-key fallback, fail-fast (`alias.service.ts`)
- [ ] Typecheck `services/api`, `services/web`, `services/extension`
- [ ] Run existing tests for auth + backup + postfix paths

## Success Criteria
- No hardcoded secret remains in scripts (`grep` clean).
- `docker exec`/`pg_dump` calls use arg arrays + validated names (no `sh -c` interpolation).
- SSO + login flows set httpOnly cookies; no token in URL or localStorage (verified in browser devtools).
- Extension renders email via `textContent` (XSS payload not executed).
- Typecheck + tests green.

## Risk Assessment
- **Refresh-flow change can break session continuity** → add tests for 401→refresh→retry; verify SSO callback completes.
- **Removing alias dev-key fallback breaks local dev** → document env var; provide local `.env` guidance.
- **`docker cp` path differences across environments** → confirm container target path; test on staging.

## Security Considerations
- Allowlist regex `/^[a-zA-Z0-9_.-]+$/` for all container/identifier inputs to shell.
- `execFile` (not `exec`) everywhere user/derived input reaches a process.
- Access token in memory only; refresh token httpOnly + Secure + SameSite per existing `setAuthCookies`.

## Next Steps
- Phase 02 builds on the encryption key/util established here (field encryptor extends alias pattern).
- Phase 02-H (SSE token) depends on the refresh flow landed in F.
