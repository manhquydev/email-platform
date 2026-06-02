# Phase 02 — High Vulnerabilities

## Context Links
- Best practices: `research/security-best-practices-remediation-report.md` (§6 encryption)
- Findings: `research/security-audit-findings.md`
- Overview: `plan.md`
- Depends on: Phase 00 (encryption keys), Phase 01-F (refresh flow for H)

## Overview
- **Priority:** P1 — Week 2
- **Status:** pending
- **Effort:** ~2d
- **Description:** Remediate the 42 HIGH findings: SSRF, path traversal, quota race, at-rest encryption, brute-force protection, CORS, file upload, token transport, debug surface, verbose errors, broken access control, plugin injection/XSS, CLI hardening, magic-link revocation, admin rate limiting.

## Key Insights
- SSRF guard and field encryptor are reusable utilities → build once, apply across call sites (DRY).
- Quota race fix is a single atomic conditional `updateMany` — small change, removes TOCTOU.
- Several findings are broken access control (X-Tenant-ID, SCIM) — derive tenant/identity from authenticated session, never from client-supplied headers.

## Requirements
**Functional**
- Outbound webhook calls blocked for internal IPs / non-HTTPS.
- Maildir path operations confined to allowed base.
- Quota enforcement atomic (no overshoot under concurrency).
- DKIM keys, TOTP secrets, webhook secrets encrypted at rest.
- SMTP/IMAP auth rate-limited; admin write endpoints rate-limited.
- File uploads MIME/magic-byte validated + size capped.
- No bearer token in SSE URL; CORS not wildcard for authed SSE.
- No debug objects on `window` in prod; no verbose error leakage.

**Non-functional**
- Encryption migration idempotent; round-trip verified by tests.
- Compile/typecheck clean per touched service.

## Architecture
- `ssrf-safe-fetch.ts`: URL parse → HTTPS-only → DNS resolve → block private ranges → fetch.
- `field-encryptor.ts`: AES-256-GCM (extend `encryption.ts`/alias pattern); encrypt-on-write, decrypt-on-read at service boundary.
- Redis-backed sliding-window limiter shared by SMTP/IMAP auth and admin endpoints.

## Related Code Files
**Create**
- `services/api/src/utils/ssrf-safe-fetch.ts`
- `services/api/src/utils/field-encryptor.ts`

**Modify**
- `services/api/src/services/forwarding/destinations/webhook-destination.ts` (line 54)
- `services/api/src/services/maildirSync.ts` (lines 33-34)
- `services/api/src/services/quota-service.ts` (lines 6-30)
- `services/api/prisma/schema.prisma` (field annotations)
- `services/api/src/smtp/submission-server.ts` (lines 50-68)
- `services/api/src/imap/handlers/auth-handler.ts` (lines 6-27)
- `services/api/src/routes/admin/monitoring.ts` (line 16)
- `services/api/src/routes/upload.ts` (lines 33-47)
- `services/web/src/hooks/useRealtime.ts` (line 93), `services/mobile/src/hooks/useSSE.ts` (line 87)
- `services/extension` (3 files exposing debug objects)
- `services/api/src/routes/admin/backup.ts` (line 217), `services/api/scripts/check-users.js`, `services/api/src/workers/outbound-email-worker.ts` (line 51)
- `services/api/src/middleware/tenant-context.ts` (lines 33-47)
- `plugins/cpanel/whm/index.cgi`, `tenants.cgi`, `settings.cgi`
- `plugins/directadmin/hooks/user_create.sh` (line 13), `user_delete.sh` (line 11)
- `packages/cli/src/cli.ts` (lines 60-62), `packages/cli/src/config.ts` (lines 13-27)
- `services/api/src/routes/magic-link.ts` (line 120)
- `services/api/src/routes/admin/migration.ts` (lines 10-23)

## Implementation Steps

### A) SSRF — `webhook-destination.ts:54`
1. Create `ssrf-safe-fetch.ts`:
   ```typescript
   import { resolve4 } from 'dns/promises';
   const BLOCKED_RANGES = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^127\./, /^169\.254\./];
   export async function ssrfSafeFetch(url: string, opts?: RequestInit) {
     const parsed = new URL(url);
     if (parsed.protocol !== 'https:') throw new Error('Only HTTPS URLs allowed');
     const ips = await resolve4(parsed.hostname);
     if (ips.some(ip => BLOCKED_RANGES.some(r => r.test(ip)))) throw new Error('SSRF blocked: internal IP');
     return fetch(url, opts);
   }
   ```
2. Replace `fetch(webhookUrl, ...)` → `ssrfSafeFetch(webhookUrl, ...)`.
3. Validate URL at rule-creation endpoint too.

### B) Path traversal — `maildirSync.ts:33-34`
1. `const allowedBase = path.resolve(process.env.MAILDIR_BASE || '/var/mail');`
2. `const resolved = path.resolve(getMaildirPath(input)); if (!resolved.startsWith(allowedBase)) throw new Error('Path traversal detected');`

### C) Atomic quota — `quota-service.ts:6-30`
1. Replace read-then-write with conditional atomic update:
   ```typescript
   const updated = await prisma.organization.updateMany({
     where: { id: orgId, storageUsed: { lte: storageLimit - delta } },
     data: { storageUsed: { increment: delta } },
   });
   if (updated.count === 0) throw new QuotaExceededError();
   ```

### D) Encrypt sensitive DB fields
1. Create `field-encryptor.ts` (AES-256-GCM, extend `encryption.ts`).
2. Encrypt on write / decrypt on read for: `DomainDkim.privateKey`, `AuthenticatorAccount.secret`, `Webhook.secret`, `ForwardingRule.webhookSecret`, `HostingProvider.webhookSecret`.
3. Add `@db.Text` annotations in `schema.prisma` where needed.
4. Write a Prisma migration script to re-encrypt existing plaintext rows (run after Phase 00 key finalization).

### E) SMTP/IMAP brute-force protection
1. Redis sliding-window limiter: max 5 AUTH failures/IP/15min, exponential backoff, IP block after 20 failures.
2. Apply in `submission-server.ts:50-68` and `auth-handler.ts:6-27`.

### F) CORS — `admin/monitoring.ts:16`
1. Replace `Access-Control-Allow-Origin: *` with explicit origin from allowlist.

### G) File upload — `upload.ts:33-47`
1. Validate Content-Type header AND magic bytes (`file-type` package).
2. Allowlist: image/jpeg, image/png, application/pdf, etc.
3. Enforce max size limit.

### H) SSE bearer token in URL — `useRealtime.ts:93`, `useSSE.ts:87`
1. Move auth token from `?token=` to header or httpOnly cookie.
2. If EventSource forces query param, issue a short-lived one-time SSE token.

### I) Debug APIs on `window` — extension (3 files)
1. Remove `window.sessionCapture`, `window.bypassController` from prod builds.
2. Gate with `if (process.env.NODE_ENV === 'development')` or remove entirely.

### J) Verbose errors
1. Remove `err.message` from HTTP responses in `backup.ts:217`.
2. Remove/secure `check-users.js` (dumps passwordHash, twoFactorSecret).
3. Sanitize `bounceMessage` in `outbound-email-worker.ts:51` (don't leak `err.message`).

### K) X-Tenant-ID without auth — `tenant-context.ts:33-47`
1. Require auth before trusting `X-Tenant-ID`; preferably derive tenant from authenticated session and ignore client header.

### L) XSS in WHM CGIs
1. Escape API-returned data before HTML output (`HTML::Entities::encode_entities()`) in `index.cgi`, `tenants.cgi`, `settings.cgi`.

### M) Command injection — DirectAdmin hooks
1. Validate `$USERNAME`/`$DOMAIN`/`$EMAIL` with `[[ "$VAR" =~ ^[a-zA-Z0-9._-]+$ ]]` before PHP CLI use (`user_create.sh:13`, `user_delete.sh:11`).

### N) CLI hardening — `packages/cli`
1. Validate `--base-url`: enforce `https://`, check allowlist of known API domains (`cli.ts:60-62`).
2. Store API key in system keychain (`keytar`) instead of plaintext `~/.config/ephemera-cli/config.json` (`config.ts:13-27`).

### O) Magic-link JWT revocation — `magic-link.ts:120`
1. Add revocation set (Redis) / table; one-time use — revoke on first use; check revocation on every use.

### P) Admin endpoint rate limiting
1. `POST /admin/backup/trigger`: max 3/hour/admin (`backup.ts:176-215`).
2. `POST /admin/migration/imap-sync`: rate limit (`migration.ts:10-23`).

## Todo List
- [ ] A: `ssrf-safe-fetch.ts` + apply to webhook + creation-time validation
- [ ] B: maildir path confinement
- [ ] C: atomic quota `updateMany`
- [ ] D: `field-encryptor.ts` + encrypt DKIM/TOTP/webhook secrets + migration
- [ ] E: SMTP + IMAP brute-force limiter
- [ ] F: CORS allowlist for monitoring SSE
- [ ] G: upload MIME/magic-byte + size validation
- [ ] H: remove SSE token from URL
- [ ] I: strip debug objects from prod extension
- [ ] J: remove verbose error leakage (3 spots)
- [ ] K: auth-gate / remove X-Tenant-ID trust
- [ ] L: escape output in WHM CGIs
- [ ] M: validate vars in DirectAdmin hooks
- [ ] N: CLI base-url validation + keychain storage
- [ ] O: magic-link one-time-use + revocation
- [ ] P: rate limit admin backup + migration endpoints
- [ ] Typecheck `services/api`, `services/web`, `services/mobile`, `packages/cli`
- [ ] Tests: SSRF guard, atomic quota, encryption round-trip, rate limiter

## Success Criteria
- SSRF guard rejects internal IPs / http in tests; webhook uses it.
- Quota cannot overshoot under concurrent writes (test proves it).
- Encrypted fields stored as `iv:tag:ciphertext`; decrypt round-trips; migration leaves no plaintext.
- Auth brute-force throttled; admin write endpoints throttled.
- No token in SSE URL; CORS not wildcard for authed SSE.
- No debug object on `window` in prod bundle; no `err.message` in responses.
- Typecheck + tests green.

## Risk Assessment
- **Encryption migration on live data** → back up DB first; idempotent script; dual-key read during rotation (best-practices §6).
- **SSRF DNS resolution latency / IPv6 bypass** → add timeout; consider `resolve6` + block IPv6 private ranges.
- **Rate limiter false positives (shared NAT IPs)** → tune thresholds; log + monitor before hard blocks.
- **Removing X-Tenant-ID may break internal callers** → audit callers via `gitnexus_impact` before change.

## Security Considerations
- Validate URLs at both creation and use time (defense in depth).
- Fail-closed on encryption/decryption errors (do not silently store plaintext).
- Least-privilege CORS; explicit origin allowlist only.

## Next Steps
- Phase 03 finishes residual MEDIUM/LOW (CAPTCHA, SCIM IDOR, token-revocation fail-closed, deps, CI hardening).
- Encryption util reused by any future secret-bearing model.
