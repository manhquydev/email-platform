# Security Audit Executive Summary

**Project:** email-platform | **Date:** 2026-06-01  
**Scope:** 6 vulnerability classes | **Total Issues Found:** 7 files

---

## Critical Vulnerabilities

### 1. Command Injection (CWE-78) — CRITICAL

**Files:** `postfix-sync.ts`, `backup.ts`  
**Risk:** Full system compromise via `exec()` with shell templates  
**Root cause:** Using template strings + `exec()` instead of `execFile()` with args array

**Fix:**
- Replace `exec()` with `execFile()` (no shell interpretation)
- Validate container names with regex `/^[a-zA-Z0-9_.-]+$/`
- Use `docker cp` for file writes instead of `echo` through `sh -c`

**Effort:** 30 min per file

---

### 2. Server-Side Request Forgery (CWE-918) — HIGH

**File:** `webhook-destination.ts`  
**Risk:** Access internal networks (Redis, PostgreSQL, AWS metadata, localhost services)  
**Root cause:** No URL validation before `fetch()`

**Fix:**
- Create `ssrf-safe-fetch()` wrapper with:
  - Enforce HTTPS for external webhooks
  - Resolve hostname → validate IP not in RFC-1918 (10.x, 172.16-31.x, 192.168.x) or link-local (169.254.x)
  - Whitelist ports: 80, 443, 8080, 8443
  - Require FQDN pattern (must have TLD)

**Effort:** 20 min

---

### 3. Broken Access Control (CWE-639) — HIGH

**Files:** `backup.ts`, `tenant-context.ts`  
**Risk:** Users can impersonate other organizations; inconsistent role enforcement

**Root causes:**
- `X-Tenant-ID` header accepted without auth check
- Inline role checks instead of centralized middleware
- No ownership validation for cross-org requests

**Fix:**
- Create `createRequireAdminRole()` centralized middleware
- Validate X-Tenant-ID only for SUPER_ADMIN, fallback to user.organizationId
- Add `validateOrgOwnership()` check before multi-org operations

**Effort:** 40 min

---

### 4. TOCTOU Race Condition (CWE-367) — HIGH

**File:** `quota-service.ts`  
**Risk:** Quota bypass via concurrent uploads (two requests both pass check, both write)  
**Root cause:** Two separate DB operations: `findUnique()` then `update()`

**Fix:**
- Use Prisma `$transaction()` with `Serializable` isolation
- Atomic conditional update: `updateMany()` with WHERE clause checking quota
- Single transaction ensures atomicity

**Effort:** 15 min

---

### 5. Path Traversal (CWE-22) — HIGH

**Files:** `maildirSync.ts`, `backup.ts`  
**Risk:** Read/delete arbitrary files outside backup directory

**Root causes:**
- `maildirSync.ts`: No validation on domain/localPart inputs
- `backup.ts`: Weak check (only looks for `..` and `/`, doesn't use `path.resolve()`)

**Fix:**
- Create `validatePathWithin(basePath, userPath)` utility
- Use `path.resolve()` + `.startsWith()` prefix check
- Validate email components with regex `/^[a-zA-Z0-9._-]+$/`

**Effort:** 20 min

---

### 6. XSS Prevention (CWE-79) — MEDIUM

**File:** `webhook-destination.ts`  
**Risk:** Email content (from, subject, htmlBody) included in webhook payload unfiltered

**Fix:**
- Create `html-sanitizer.ts` with DOMPurify
- Sanitize HTML bodies (remove script/event handlers)
- Escape email headers (From, Subject) to text-only

**Effort:** 15 min

---

## Compliance Mapping

| NIST Control | Issue | Remediation |
|--------------|-------|-------------|
| SI-10 | Command Injection | execFile + validation |
| SC-7(11) | SSRF | ssrf-safe-fetch wrapper |
| CM-5(6) | Race Condition | Prisma Serializable transaction |
| AC-2(7) | Broken Access Control | Centralized middleware + ownership check |
| SI-10(1) | Path Traversal | path.resolve() + validatePathWithin |
| SI-10(3) | XSS | DOMPurify sanitization |

---

## Implementation Plan

**Total effort:** ~2.5 hours (all 6 issues)

1. **Phase 1 (30 min):** Create utility files
   - `ssrf-safe-fetch.ts`
   - `path-validation.ts`
   - `html-sanitizer.ts`

2. **Phase 2 (1 hour):** Fix postfix-sync.ts + backup.ts (command injection)
   - Replace exec() calls
   - Add container name validation

3. **Phase 3 (30 min):** Fix webhook-destination.ts
   - Use ssrf-safe-fetch
   - Add HTML sanitization

4. **Phase 4 (30 min):** Fix quota-service.ts
   - Implement atomic transaction

5. **Phase 5 (30 min):** Fix access control
   - Create middleware
   - Update routes
   - Secure tenant context

6. **Phase 6 (20 min):** Fix path traversal
   - Add validation to maildirSync.ts + backup.ts

**Testing & QA:** 1 hour (unit tests, integration tests, regression)

---

## Key Implementation Notes

- **No breaking changes:** All fixes maintain API compatibility
- **Backward compatible:** Admin role bridge in RBAC middleware preserved
- **Testing:** Existing test suite validates no regression
- **Dependencies:** DOMPurify already in package.json (verify with `npm list`)

---

## Full Details

See **`security-audit-findings.md`** for:
- Detailed code before/after examples
- Architecture diagrams
- Testing strategy
- OWASP Top 10 mapping
- References (NIST, CWE, OWASP)

