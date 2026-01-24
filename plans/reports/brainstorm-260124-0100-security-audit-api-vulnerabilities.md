# Security Audit Brainstorm Report

**Date:** 2026-01-24
**Project:** Ephemera Email Platform
**Focus:** Backend API Vulnerabilities & OWASP Compliance

---

## 1. Problem Statement

Rà soát lỗ hổng bảo mật toàn diện cho backend API, focus vào:
- Authentication/Authorization vulnerabilities
- Input validation/Injection attacks
- Rate limiting/DoS protection
- API exploitation via Postman (data theft, manipulation)

**Context:** Project đã được audit trước đây nhưng code đã thay đổi nhiều.

---

## 2. Current Security Posture

### ✅ Implemented Controls

| Control | Implementation | Quality |
|---------|---------------|---------|
| JWT Auth | `@fastify/jwt` + API Key dual auth | ⭐⭐⭐⭐ |
| Password | bcrypt + complexity rules (8+ chars, upper/lower/number) | ⭐⭐⭐⭐ |
| 2FA | TOTP (otplib) + backup codes + WebAuthn | ⭐⭐⭐⭐⭐ |
| Rate Limiting | `@fastify/rate-limit` per-route config | ⭐⭐⭐ |
| Account Lockout | 5 fails → 15min lock | ⭐⭐⭐⭐ |
| Input Validation | Zod schemas on most endpoints | ⭐⭐⭐⭐ |
| Authorization | Owner/Admin/Team role checks | ⭐⭐⭐ |
| Audit Logging | recordAudit() for major actions | ⭐⭐⭐⭐ |
| Security Headers | Helmet (CSP, HSTS, X-Frame-Options) | ⭐⭐⭐⭐ |
| CORS | Whitelist-based + extension filtering | ⭐⭐⭐⭐ |
| Log Redaction | Sensitive fields redacted | ⭐⭐⭐⭐ |

---

## 3. Critical Vulnerabilities Identified

### 3.1 🔴 CRITICAL: Broken Object Level Authorization (BOLA)

**Location:** `services/api/src/routes/messages.ts:242-274`

```typescript
// /messages/search/fuzzy - NO ownership check!
app.get("/messages/search/fuzzy", { preHandler: app.authenticate }, async (request, reply) => {
  // ...
  const messages = await prisma.$queryRaw`
    SELECT m.*, ...
    FROM "Message" m
    WHERE m."deletedAt" IS NULL
    AND (similarity(m.subject, ${q}) > ${threshold}...)
  `;
  // Missing: WHERE m.inboxId IN (user's accessible inboxes)
```

**Impact:** Any authenticated user can search ALL messages in database.
**CVSS:** 8.1 (High)
**Exploit:** `GET /messages/search/fuzzy?q=password&limit=100`

---

### 3.2 🟠 HIGH: IDOR Vulnerabilities

| Endpoint | File | Issue |
|----------|------|-------|
| `GET /attachments/:id/download` | messages.ts:437 | Loads attachment before ownership check |
| `DELETE /api-keys/:id` | api-keys.ts:71 | Missing `enforceApiAccess` preHandler |
| `POST /inboxes/bulk` | inboxes.ts:324 | Partial failure leaks valid IDs |

---

### 3.3 🟠 HIGH: JWT Security Gaps

1. **No Token Revocation:** Stolen tokens valid until expiry
2. **Temp Token Exposure:** `pending2FA` claim could be forged
3. **No Refresh Token Rotation:** Refresh tokens reusable

---

### 3.4 🟡 MEDIUM: Rate Limiting Weaknesses

```typescript
// server.ts:218
allowList: ["127.0.0.1", "::1"],  // Localhost bypass
```

- Internal network access → bypass all rate limits
- Per-IP not per-user → shared IP environments vulnerable
- 2FA brute force: 5 attempts/5min may be insufficient

---

### 3.5 🟡 MEDIUM: Injection Risks

| Type | Location | Risk |
|------|----------|------|
| SQL | `/messages/search/fuzzy` | Parameterized but needs audit |
| Path Traversal | `storageService.getReadStream()` | StorageKey validation needed |
| Email Header | Reply/Forward functions | User input in headers |

---

### 3.6 🟡 MEDIUM: Business Logic Flaws

1. **Domain Takeover:** Public domain allows any user to create inboxes
2. **Inbox Claim Race:** Soft-deleted inbox can be reclaimed by different user
3. **Bulk Operations:** No transactions, inconsistent states possible

---

## 4. Postman Exploitation Vectors

| Attack | Endpoint | Payload | Impact |
|--------|----------|---------|--------|
| Data Exfiltration | `GET /messages/search/fuzzy` | `?q=credit+card` | Access all messages |
| Privilege Escalation | `PATCH /inboxes/:id` | `{ownerEmail:"attacker@"}` | Steal inboxes |
| Account Enum | `POST /auth/forgot-password` | Various emails | User enumeration (mitigated) |
| Mass Delete | `DELETE /inboxes/bulk` | `{ids:[...]}` | Data destruction |
| API Key Abuse | Any endpoint | Stolen key | Full account access |

---

## 5. OWASP API Security Top 10 Mapping

| # | Vulnerability | Status | Priority |
|---|--------------|--------|----------|
| API1 | Broken Object Level Auth | 🔴 VULNERABLE | P0 |
| API2 | Broken Authentication | 🟡 PARTIAL | P1 |
| API3 | Excessive Data Exposure | 🟡 NEEDS REVIEW | P2 |
| API4 | Lack of Resources & Rate Limiting | 🟡 PARTIAL | P1 |
| API5 | Broken Function Level Auth | 🟡 PARTIAL | P1 |
| API6 | Mass Assignment | 🟢 OK (Zod) | P3 |
| API7 | Security Misconfiguration | 🟡 PARTIAL | P2 |
| API8 | Injection | 🟡 NEEDS AUDIT | P1 |
| API9 | Improper Asset Management | 🟡 NO VERSIONING | P3 |
| API10 | Insufficient Logging | 🟢 OK | P3 |

---

## 6. Recommended Solution Approach

### Phase 1: Critical Fixes (1-2 days)
- Fix fuzzy search BOLA vulnerability
- Audit all raw SQL queries
- Add ownership checks to attachment/api-key endpoints

### Phase 2: OWASP Compliance (3-5 days)
- Systematic BOLA review across all endpoints
- Implement JWT revocation mechanism
- Enhance rate limiting (per-user, stricter 2FA)
- SSRF protection for webhook URLs

### Phase 3: Penetration Testing Prep (2-3 days)
- Automated scanning (OWASP ZAP, Nuclei)
- Security test cases documentation
- Postman security testing collection

---

## 7. Risk Assessment

| Risk Level | Count | Examples |
|------------|-------|----------|
| 🔴 Critical | 1 | Fuzzy search BOLA |
| 🟠 High | 3 | IDOR, JWT gaps, API key scope |
| 🟡 Medium | 5 | Rate limit bypass, injection risks |
| 🟢 Low | 2 | Logging gaps, asset management |

**Overall Security Score:** 6.5/10 (Needs Improvement)

---

## 8. Success Criteria

- [ ] All BOLA vulnerabilities fixed
- [ ] OWASP API Top 10 compliance achieved
- [ ] Zero critical/high findings in security scan
- [ ] Penetration test passed
- [ ] Security documentation updated

---

## 9. Next Steps

1. Create detailed implementation plan with phases
2. Prioritize fixes by severity
3. Implement and test each fix
4. Run automated security scans
5. Document all changes

---

## Unresolved Questions

1. **Token Blacklist Storage:** Redis vs Database for revoked tokens?
2. **Rate Limit Strategy:** Per-user requires JWT decode on every request - performance impact?
3. **Webhook URL Validation:** Allow internal IPs for dev environments?
4. **API Versioning:** Introduce now or defer to v2?
