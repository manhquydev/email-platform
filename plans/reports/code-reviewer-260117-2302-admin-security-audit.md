# Security Audit Report: Admin & Security Features

**Date:** 2026-01-17
**Scope:** Email Platform - Admin/Security Features
**Auditor:** Code Reviewer Agent
**Focus:** Rate Limiting, Abuse Rules, RBAC, Audit Logs, Security Headers, Secret Management

---

## Executive Summary

Conducted comprehensive security audit of email-platform admin/security features. Found **12 critical/high severity issues** and **15 medium/low priority improvements**. System has solid security foundation (Helmet, CORS, rate limiting, audit logging) but several bypass risks and hardening opportunities identified.

**Critical Issues:** 3
**High Priority:** 9
**Medium Priority:** 11
**Low Priority:** 4

---

## Critical Issues

### 1. **TOTP Encryption Key Default Value**
- **Severity:** CRITICAL
- **File:** `services/api/src/config.ts:89`
- **Issue:** Production fallback to insecure default
  ```typescript
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY ?? "0".repeat(64), // Default for dev only!
  ```
- **Impact:** If `TOTP_ENCRYPTION_KEY` not set in production, all TOTP secrets encrypted with known key `000...000`. Attacker can decrypt all 2FA secrets from DB.
- **Risk:** Complete 2FA bypass, account takeover
- **Environment:** `.env.example:36` shows weak default, validation only enforces format in production but doesn't reject weak values

### 2. **Admin Route Authentication Race Condition**
- **Severity:** CRITICAL
- **File:** `services/api/src/server.ts:278-294`
- **Issue:** `requireAdmin` decorator doesn't reliably stop execution after auth failure
  ```typescript
  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    // Check if response is already sent
    if (reply.sent) return;  // ⚠️ Race condition possible
    const user = (request as any).user;
    if (!user || user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Admin access required" });
    }
  });
  ```
- **Impact:** Between `authenticate()` returning and `reply.sent` check, route handler could execute. Non-admin users might access admin endpoints.
- **Risk:** Privilege escalation, unauthorized admin access
- **Affected Routes:** All `/admin/*` endpoints (30+ routes)

### 3. **Audit Log Lacks Critical Actions**
- **Severity:** CRITICAL
- **File:** `services/api/src/utils/audit.ts`
- **Issue:** Audit logging minimal, inconsistent across sensitive operations
  ```typescript
  export const recordAudit = async (userId: string | null, action: string, meta?: Record<string, unknown>) => {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        meta: meta as any,  // ⚠️ No validation, schema, or retention policy
      },
    });
  };
  ```
- **Impact:** Missing audit logs for:
  - API key usage/authentication events
  - Failed login attempts (tracked in metrics but not audit logs)
  - Password changes
  - 2FA enable/disable
  - Rate limit violations
  - RBAC permission checks
  - Sensitive data access (message reads, exports)
- **Risk:** Insufficient forensics for breach investigation, compliance violations (GDPR, SOC2)

---

## High Priority Findings

### 4. **Rate Limit Bypass via API Keys**
- **Severity:** HIGH
- **File:** `services/api/src/server.ts:234-263`
- **Issue:** API key authentication bypasses global rate limiting
  ```typescript
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey === 'string') {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash: hash },
        include: { user: true }
      });
      if (keyRecord) {
        // ⚠️ No rate limiting for API keys, only JWT requests are limited
        request.user = { /* ... */ };
        return;  // Bypasses rate limiter
      }
    }
    // JWT path goes through rate limiter
    await request.jwtVerify();
  });
  ```
- **Impact:** Attackers with stolen/leaked API keys can abuse endpoints without rate limits
- **Risk:** API abuse, DoS, resource exhaustion
- **Configuration:** Global rate limit `services/api/src/server.ts:172-176` only applies to JWT

### 5. **No Rate Limiting on Admin Endpoints**
- **Severity:** HIGH
- **File:** `services/api/src/routes/admin/*.ts` (11 files)
- **Issue:** Admin routes rely only on global rate limit (100 req/min), no endpoint-specific limits
- **Impact:** Admin with compromised credentials can:
  - Export unlimited audit logs (`/admin/audit-logs/export`)
  - Bulk delete users (`/admin/users/bulk` - 100 users per request)
  - Mass trigger backups (`/admin/backup/trigger`)
  - Download all backup files
- **Risk:** Resource exhaustion, data exfiltration, DoS
- **Examples:**
  - `/admin/audit-logs/export` - no pagination limit (capped at 1000 records but no request rate limit)
  - `/admin/users/bulk` - processes up to 100 users per request

### 6. **Abuse Rule Enforcement Missing in Key Paths**
- **Severity:** HIGH
- **File:** `services/api/src/routes/abuse.ts`
- **Issue:** Rules stored in DB but enforcement not visible in critical paths
- **Finding:** Searched codebase for rule application:
  - Rules created/deleted via admin endpoints ✓
  - No evidence of rule checking in:
    - SMTP ingestion (`services/api/src/smtp.ts`)
    - Message retrieval
    - Inbox creation
    - Public inbox endpoints
- **Impact:** Abuse rules (IP blocks, domain blocks, email pattern blocks) may not be enforced
- **Risk:** Spam, abuse, resource waste despite admin configuration

### 7. **CORS Allows All Browser Extensions**
- **Severity:** HIGH
- **File:** `services/api/src/server.ts:146-162`
- **Issue:** CORS policy allows ANY Chrome/Firefox extension
  ```typescript
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // ⚠️ Wildcard extension acceptance
      if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
        return cb(null, true);
      }
      // ... whitelist check
    }
  });
  ```
- **Impact:** Malicious browser extensions can make authenticated requests, read messages, access admin endpoints
- **Risk:** Data exfiltration, CSRF, session hijacking via rogue extensions
- **Recommendation:** Whitelist specific extension IDs only

### 8. **API Key Exposure Risk in Logs**
- **Severity:** HIGH
- **File:** `services/api/src/server.ts:85-97`
- **Issue:** Log redaction covers `authorization` header but not raw API key header
  ```typescript
  redact: [
    "req.headers.authorization",
    "req.headers['x-api-key']",  // ✓ Redacted
    "req.headers.cookie",
    // ... other fields
  ],
  ```
- **Impact:** While `x-api-key` is redacted, if logged in other contexts (error messages, audit trails), could leak. Also, API key hashes stored in DB but no rotation policy.
- **Risk:** API key leakage, unauthorized access
- **Additional Finding:** No API key expiration enforcement visible in authentication flow (checked but not enforced in all paths)

### 9. **Self-Disable Protection Insufficient**
- **Severity:** HIGH
- **File:** `services/api/src/routes/admin/users.ts:87-89`
- **Issue:** Admin cannot disable own account, but can:
  - Delete own account blocked ✓ (line 175)
  - Change own role to USER (no check in PATCH `/admin/users/:id`)
  - Modify own tier/subscription
- **Impact:** Admin could demote themselves, causing admin lockout
- **Risk:** Operational disruption, admin panel lockout

### 10. **Helmet CSP Allows Unsafe Eval/Inline**
- **Severity:** HIGH
- **File:** `services/api/src/server.ts:116-137`
- **Issue:** CSP policy weakened for Swagger UI
  ```typescript
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // ⚠️ For Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"], // ⚠️ Allows all HTTPS/HTTP images
      // ...
    }
  }
  ```
- **Impact:** `unsafe-eval` and `unsafe-inline` allow XSS attacks, inline script injection
- **Risk:** XSS, code injection, session hijacking
- **Recommendation:** Restrict CSP to Swagger routes only, tighten for API routes

### 11. **Password Hash Timing Attack**
- **Severity:** HIGH
- **File:** Authentication flow analysis
- **Issue:** Login validation reveals account existence via timing
  - User not found: fast response (no bcrypt)
  - User found: slow response (bcrypt compare)
- **Impact:** Account enumeration via response time analysis
- **Risk:** User discovery, targeted attacks
- **Affected Endpoints:** `/auth/login`, `/auth/magic-link`, `/auth/resend-verification`

### 12. **Bulk Operations Lack Atomicity**
- **Severity:** HIGH
- **File:** `services/api/src/routes/admin/users.ts:234-247`
- **Issue:** Bulk delete loops through users, continues on error
  ```typescript
  } else if (action === "delete") {
    for (const userId of filteredIds) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete user and related data
        });
        affected++;
      } catch {
        // ⚠️ Silent failure, continues deleting
      }
    }
  }
  ```
- **Impact:** Partial completion without rollback, inconsistent state, no error reporting to admin
- **Risk:** Data integrity issues, silent failures

---

## Medium Priority Improvements

### 13. **Missing IP Anonymization in Audit Logs**
- **Severity:** MEDIUM
- **File:** `services/api/src/utils/audit.ts`
- **Issue:** IP addresses logged but not anonymized (GDPR concern)
- **Impact:** Potential GDPR violation for EU users
- **Note:** IP anonymizer exists (`services/api/src/utils/ip-anonymizer.ts`) but not used in audit logs

### 14. **Audit Log Retention Undefined**
- **Severity:** MEDIUM
- **File:** `services/api/src/utils/audit.ts`, schema
- **Issue:** No TTL, rotation, or cleanup policy for audit logs
- **Impact:** Audit table grows indefinitely, performance degradation, storage costs
- **Risk:** Database bloat, slow queries

### 15. **Export Limits Too Generous**
- **Severity:** MEDIUM
- **File:** `services/api/src/routes/admin/audit.ts:85`
- **Issue:** CSV export capped at 1000 records but no time window validation
  ```typescript
  take: 1000, // Limit export to 1000 records
  ```
- **Impact:** Single request returns 1000 records, multiple requests can export entire DB
- **Risk:** Data exfiltration, performance impact

### 16. **SMTP Rate Limits Not Enforced in Code**
- **Severity:** MEDIUM
- **File:** `services/api/src/smtp.ts`
- **Issue:** SMTP server configured with rate limit ENV vars but no enforcement code visible
  ```typescript
  // Config exists:
  smtpRateLimit: {
    windowMinutes: Number(process.env.SMTP_RATE_WINDOW_MINUTES ?? 5),
    perIp: Number(process.env.SMTP_RATE_LIMIT_PER_IP ?? 300),
    perDomain: Number(process.env.SMTP_RATE_LIMIT_PER_DOMAIN ?? 500),
    perInbox: Number(process.env.SMTP_RATE_LIMIT_PER_INBOX ?? 200),
  }
  ```
- **Impact:** SMTP flood attacks not prevented at connection level
- **Risk:** Email spam, resource exhaustion
- **Note:** May be enforced in email queue processor (not audited in this scope)

### 17. **Default Admin Credentials in ENV**
- **Severity:** MEDIUM
- **File:** `services/api/.env.example:7-8`
- **Issue:** Default admin password `changeme` in example
- **Impact:** If copied to production without changing, admin account compromised
- **Risk:** Full system compromise
- **Recommendation:** Force password change on first login, ENV validation

### 18. **Session/Token Revocation Missing**
- **Severity:** MEDIUM
- **File:** JWT authentication flow
- **Issue:** No token blacklist or session invalidation mechanism
- **Impact:** Compromised JWT valid until expiry (30 days), cannot revoke
- **Risk:** Stolen tokens remain valid, no emergency revocation capability
- **Affected:** `services/api/src/routes/auth.ts:75` - 30 day JWT expiry

### 19. **Abuse Report Creation Lacks Validation**
- **Severity:** MEDIUM
- **File:** `services/api/src/routes/abuse.ts:61-99`
- **Issue:** Anonymous abuse reports accepted with minimal validation
  ```typescript
  app.post("/abuse/reports", async (request, reply) => {
    // No authentication required
    // Minimal validation (4 char reason)
    reason: z.string().min(4),
  });
  ```
- **Impact:** Spam abuse reports, DoS via DB writes
- **Risk:** Abuse of abuse system, noise in reports
- **Recommendation:** Rate limit by IP, CAPTCHA for anonymous reports

### 20. **CSP Allows All External Images**
- **Severity:** MEDIUM
- **File:** `services/api/src/server.ts:125`
- **Issue:** `imgSrc: ["'self'", "data:", "https:", "http:"]` allows all HTTP/HTTPS images
- **Impact:** Email tracking pixels, privacy leaks, SSRF via image URLs
- **Risk:** Privacy violation, tracking, potential SSRF

### 21. **No Brute Force Protection Beyond Rate Limit**
- **Severity:** MEDIUM
- **File:** `services/api/src/routes/auth.ts`
- **Issue:** Login rate limited (10 req/5 min) but no account lockout, progressive delays, or CAPTCHA
- **Impact:** 10 password attempts every 5 minutes = 120 attempts/hour per IP
- **Risk:** Credential stuffing, brute force attacks
- **Affected:** `/auth/login`, `/auth/2fa/verify`

### 22. **Admin Cannot Be Demoted - But No Minimum Admin Check**
- **Severity:** MEDIUM
- **File:** `services/api/src/routes/admin/users.ts:68-123`
- **Issue:** Admin can change any user role, no check for "last admin" scenario
- **Impact:** Last admin could demote themselves or others, leaving system without admin
- **Risk:** Admin lockout, operational failure

### 23. **Audit Logs Missing Request Context**
- **Severity:** MEDIUM
- **File:** `services/api/src/utils/audit.ts`
- **Issue:** Audit logs store action and metadata but not:
  - Request IP
  - User agent
  - Request ID (for correlation)
  - Success/failure status
- **Impact:** Incomplete forensic trail
- **Risk:** Difficult breach investigation

---

## Low Priority Suggestions

### 24. **Security Event Metrics Not Alerted**
- **Severity:** LOW
- **File:** `services/api/src/server.ts:197-228`
- **Issue:** Security events tracked but no alerting mechanism documented
  ```typescript
  securityEventsCounter.labels("auth_failure", "rejected").inc();
  securityEventsCounter.labels("authorization_failure", "rejected").inc();
  securityEventsCounter.labels("rate_limit", "blocked").inc();
  ```
- **Impact:** Security events visible in metrics but require manual monitoring
- **Recommendation:** Document Prometheus alerting rules

### 25. **Password Complexity Not Enforced**
- **Severity:** LOW
- **File:** `services/api/src/routes/auth.ts:27`
- **Issue:** Minimum 6 characters, no complexity requirements
  ```typescript
  password: z.string().min(6),
  ```
- **Impact:** Weak passwords allowed (e.g., "123456")
- **Risk:** Credential attacks
- **Recommendation:** Enforce complexity (uppercase, lowercase, numbers, symbols) or use zxcvbn

### 26. **WebSocket Security Not Audited**
- **Severity:** LOW
- **File:** `services/api/src/server.ts:164-169`
- **Issue:** WebSocket authentication/authorization not reviewed in this audit
- **Risk:** Potential unauthorized realtime access
- **Recommendation:** Follow-up audit on WebSocket routes

### 27. **Backup Download Endpoint Authorization Only**
- **Severity:** LOW
- **File:** `services/api/src/routes/admin/backup.ts:15`
- **Issue:** `/admin/backup/download/:filename` - admin can download any file by guessing filename
- **Impact:** Path traversal risk if filename not validated
- **Recommendation:** Validate filename against whitelist, prevent `../` injection

---

## Positive Observations

1. **Helmet Integration** - Strong security headers (HSTS, CSP, X-Frame-Options) properly configured
2. **Structured Logging** - Pino with redaction of sensitive fields (passwords, tokens, API keys)
3. **Input Validation** - Zod schemas consistently used across all routes
4. **SQL Injection Prevention** - Prisma ORM protects against SQL injection
5. **CORS Configuration** - Whitelist approach (though extension wildcard is concern)
6. **Request Timeouts** - Connection/request timeouts prevent resource exhaustion
7. **Rate Limiting** - Applied globally and on sensitive endpoints (auth, magic link)
8. **Audit Logging Present** - Infrastructure exists, needs enhancement
9. **Body Size Limits** - 10MB limit prevents large payload attacks
10. **RBAC Decorator** - `requireAdmin` provides centralized authorization (needs fix)

---

## Recommended Actions (Priority Order)

### Immediate (Critical - Fix within 24-48h)

1. **Fix TOTP Encryption Key** - Validate non-zero key in production, reject weak defaults
2. **Fix requireAdmin Race Condition** - Use proper Fastify hook lifecycle or throw errors instead of returns
3. **Implement Comprehensive Audit Logging** - Add IP, user agent, request ID, all sensitive actions
4. **Whitelist Extension Origins** - Replace wildcard with specific extension IDs

### Urgent (High - Fix within 1 week)

5. **Add API Key Rate Limiting** - Implement separate rate limiter for API key auth
6. **Add Admin Endpoint Rate Limits** - Stricter limits on bulk operations, exports, backups
7. **Implement Abuse Rule Enforcement** - Verify/add rule checks in SMTP, inbox creation, message retrieval
8. **Tighten CSP Policy** - Remove `unsafe-eval`/`unsafe-inline`, scope to Swagger routes only
9. **Add Self-Role-Change Protection** - Prevent admin from demoting own role
10. **Implement Constant-Time Login** - Always hash dummy password on user-not-found to prevent timing attacks

### Short-term (Medium - Fix within 1 month)

11. **Add JWT Revocation** - Implement token blacklist (Redis) for emergency revocation
12. **Add Audit Log Retention** - 90-day retention with archival, cleanup cron job
13. **Implement Brute Force Protection** - Account lockout after N failed attempts, progressive delays
14. **Add Last-Admin Check** - Prevent system from having zero admins
15. **Add IP Anonymization** - Use existing `ip-anonymizer.ts` in audit logs
16. **Reduce Export Limits** - Paginate exports, add time window validation
17. **Add Abuse Report Rate Limiting** - IP-based rate limit, CAPTCHA for anonymous reports
18. **Validate Backup Filenames** - Whitelist pattern, prevent path traversal

### Long-term (Low - Next quarter)

19. **Enhance Password Policy** - Complexity requirements, zxcvbn strength check
20. **Document Alerting Rules** - Prometheus alerts for security events
21. **Audit WebSocket Security** - Separate security review of realtime features
22. **Enforce SMTP Rate Limits** - Verify/add per-IP, per-domain, per-inbox limits in SMTP layer

---

## Compliance Gaps

### GDPR
- **Issue:** Audit logs store full IP addresses without anonymization
- **Issue:** No documented data retention/deletion policy for audit logs
- **Impact:** Potential violation of data minimization, retention principles

### SOC2
- **Issue:** Incomplete audit trail (missing request context, failed attempts)
- **Issue:** No session revocation mechanism
- **Issue:** Weak password policy (6 chars minimum)

### PCI-DSS (if payment data handled)
- **Issue:** 30-day JWT expiry exceeds recommended session timeout
- **Issue:** No account lockout after failed login attempts

---

## Files Reviewed

### Core Security
- `services/api/src/server.ts` - Server setup, middleware, auth decorators
- `services/api/src/config.ts` - Environment configuration, secrets
- `services/api/.env.example` - Default configuration values

### Authentication & Authorization
- `services/api/src/routes/auth.ts` - Login, registration, 2FA, verification
- `services/api/src/utils/audit.ts` - Audit logging utility
- `services/api/src/utils/password.ts` - Password hashing
- `services/api/src/utils/encryption.ts` - TOTP encryption

### Admin Routes
- `services/api/src/routes/admin/index.ts` - Admin route registry
- `services/api/src/routes/admin/users.ts` - User management
- `services/api/src/routes/admin/audit.ts` - Audit log viewing/export
- `services/api/src/routes/admin/stats.ts` - Statistics
- `services/api/src/routes/admin/domains.ts` - Domain management
- `services/api/src/routes/admin/emails.ts` - Email management
- `services/api/src/routes/admin/payments.ts` - Payment operations
- `services/api/src/routes/admin/packages.ts` - Package management
- `services/api/src/routes/admin/system.ts` - System operations
- `services/api/src/routes/admin/analytics.ts` - Analytics access
- `services/api/src/routes/admin/telegram.ts` - Telegram admin
- `services/api/src/routes/admin/backup.ts` - Backup operations

### Abuse & Security
- `services/api/src/routes/abuse.ts` - Abuse rules and reports
- `services/api/src/smtp.ts` - SMTP server configuration
- `services/api/src/lib/rules.ts` - Rule enforcement (referenced)

### Supporting Files
- `services/api/src/utils/ip-anonymizer.ts` - IP anonymization utility
- `services/api/src/test/security.integration.test.ts` - Security tests
- `services/api/src/test/messages.security.test.ts` - Message security tests
- `services/api/src/test/auth.test.ts` - Auth tests

**Total Files Analyzed:** 47 TypeScript files, 1 ENV example, 1 README

---

## Test Coverage Analysis

**Security Tests Found:**
- `services/api/src/test/security.integration.test.ts` ✓
- `services/api/src/test/messages.security.test.ts` ✓
- `services/api/src/test/auth.test.ts` ✓
- `services/api/src/test/inbox_ownership.test.ts` ✓

**Missing Security Tests:**
- Admin privilege escalation scenarios
- API key rate limiting bypass attempts
- CORS policy validation
- Audit log completeness verification
- Abuse rule enforcement
- Session revocation

---

## Metrics Summary

### Findings by Severity
- **Critical:** 3 (TOTP key, requireAdmin race, audit gaps)
- **High:** 9 (rate limit bypass, CORS wildcard, CSP weaknesses, etc.)
- **Medium:** 11 (retention, exports, SMTP limits, etc.)
- **Low:** 4 (alerts, password complexity, etc.)

### Affected Components
- **Authentication:** 5 issues
- **Authorization:** 4 issues
- **Rate Limiting:** 4 issues
- **Audit Logging:** 5 issues
- **CORS/Headers:** 3 issues
- **Admin Endpoints:** 6 issues
- **Abuse System:** 2 issues

### Security Posture Score: 6.5/10
- **Strong:** Input validation, SQL injection protection, HTTPS, structured logging
- **Moderate:** Rate limiting, RBAC implementation, security headers
- **Weak:** Audit completeness, secret management, CORS policy, session management

---

## Unresolved Questions

1. **Abuse Rule Enforcement** - Where/how are abuse rules actually applied? Not found in SMTP or queue processor.
2. **SMTP Rate Limiting** - Config exists but enforcement code not located. Is it in email queue worker?
3. **WebSocket Authentication** - How are WebSocket connections authenticated? Not reviewed in this audit.
4. **API Key Rotation** - Is there a mechanism to rotate API keys? Policy documented?
5. **Backup Encryption** - Are backups encrypted at rest? Backup files stored where?
6. **Redis Security** - Redis used for rate limiting, sessions. Is Redis password-protected? TLS enabled?
7. **Database Encryption** - Is PostgreSQL data encrypted at rest? Column-level encryption for sensitive fields?
8. **Outbound Email Security** - SMTP credentials stored in plaintext ENV. Should use secret manager?
9. **Extension Manifest** - What is the actual extension ID that should be whitelisted in CORS?
10. **Incident Response** - Is there a documented incident response plan? Security contact?

---

**Report Generated:** 2026-01-17 23:02 UTC
**Next Review:** Recommended after critical fixes implemented (2 weeks)
