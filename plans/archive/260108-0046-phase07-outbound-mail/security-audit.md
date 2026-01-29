# Security Audit & Production Hardening Checklist

## 1. Authentication & Authorization

### JWT Security
- [ ] JWT_SECRET is ≥32 random characters
- [ ] JWT expiry is reasonable (default: 24h)
- [ ] Refresh token rotation implemented
- [ ] Token revocation on password change
- [ ] No sensitive data in JWT payload

### Password Security
- [ ] bcrypt with cost factor ≥12
- [ ] Minimum password length enforced (≥8)
- [ ] Password complexity rules optional
- [ ] Failed login rate limiting
- [ ] Account lockout after N failures

### 2FA/MFA
- [ ] TOTP_ENCRYPTION_KEY is 64 hex chars
- [ ] Backup codes hashed, single-use
- [ ] 2FA bypass impossible without codes
- [ ] Session invalidation on 2FA disable

### API Keys
- [ ] Keys hashed (SHA-256) before storage
- [ ] Only prefix shown in UI
- [ ] Scoped permissions (future)
- [ ] Key rotation supported
- [ ] Last-used tracking enabled

### Session Management
- [ ] Session timeout configured
- [ ] Concurrent session limits (future)
- [ ] Session invalidation on logout
- [ ] Secure session cookies (HttpOnly, Secure, SameSite)

## 2. Email Security

### DKIM (Phase 07)
- [ ] Private keys encrypted at rest
- [ ] Key size ≥2048 bits
- [ ] Key rotation procedure documented
- [ ] DNS TXT record helper available

### SPF/DMARC Validation (Inbound)
- [ ] Rspamd configured for SPF checks
- [ ] DMARC policy enforcement
- [ ] Reject/quarantine failures (configurable)

### Bounce Handling
- [ ] Hard bounces suppress future sends
- [ ] Complaint handling implemented
- [ ] No enumeration via bounce responses
- [ ] Rate limit on bounce processing

### Attachment Security
- [ ] ClamAV integration enabled
- [ ] MIME type allowlist enforced
- [ ] Extension allowlist enforced
- [ ] Size limit: MAX_ATTACHMENT_BYTES
- [ ] Content-Disposition: attachment for downloads
- [ ] No inline execution of attachments

## 3. Data Protection

### Database
- [ ] Soft-delete for audit trail
- [ ] deletedAt indexed for retention sweeps
- [ ] Sensitive fields encrypted (2FA secrets)
- [ ] Connection pooling limits configured
- [ ] Read replica for analytics (future)

### Backups
- [ ] Daily automated pg_dump
- [ ] Backups encrypted before upload
- [ ] Backup retention policy (30 days)
- [ ] Restore tested quarterly
- [ ] Point-in-time recovery enabled

### Secret Management
- [ ] No secrets in code/git
- [ ] .env not committed
- [ ] Docker secrets for production
- [ ] Secret rotation documented
- [ ] Vault integration (future)

### PII Handling
- [ ] User data export endpoint (GDPR)
- [ ] Account deletion endpoint
- [ ] Retention sweep removes expired data
- [ ] Logs don't contain full email content
- [ ] sourceIp not exposed to public endpoints

## 4. API Security

### Input Validation
- [ ] Zod schemas for all routes
- [ ] Email format validation
- [ ] UUID format validation
- [ ] Query param limits (pagination)
- [ ] Request body size limit

### Output Sanitization
- [ ] No internal IDs in public responses
- [ ] No stack traces in production errors
- [ ] HTML sanitized before display (XSS)
- [ ] JSON.stringify with replacer for logs

### CORS Configuration
```typescript
// Recommended config
app.register(cors, {
  origin: appConfig.webUrl, // Specific origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
});
```

### Security Headers
```typescript
// Helmet configuration
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});
```

### Rate Limiting
| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 5 | 1 min |
| API general | 100 | 1 min |
| Public inbox | 30 | 1 min |
| SMTP per-IP | 300 | 5 min |

### CAPTCHA
- [ ] Turnstile/reCAPTCHA on public inbox creation
- [ ] Token validation server-side
- [ ] Token reuse prevention
- [ ] Bypass for authenticated users

## 5. Infrastructure

### Docker Security
- [ ] Non-root user in containers
- [ ] Read-only file systems where possible
- [ ] No privileged containers
- [ ] Image scanning (Trivy/Snyk)
- [ ] Base image updates tracked

### Reverse Proxy (Caddy)
- [ ] TLS 1.2+ only
- [ ] HSTS enabled
- [ ] Certificate auto-renewal working
- [ ] Rate limiting at proxy level
- [ ] Request size limits

### Database (PostgreSQL)
- [ ] Least privilege roles
- [ ] Connection limits per user
- [ ] SSL connections required
- [ ] pg_hba.conf restricts access
- [ ] Audit logging enabled

### Redis
- [ ] ACL configured (not just AUTH)
- [ ] Password rotation procedure
- [ ] TLS enabled (production)
- [ ] maxmemory-policy set
- [ ] Persistence configured

## 6. Security Testing

### Static Analysis
```bash
# npm audit
npm audit --production

# ESLint security plugin
npm install eslint-plugin-security --save-dev
```

### Dependency Scanning
```bash
# Snyk
snyk test

# GitHub Dependabot enabled
```

### Penetration Testing Scenarios
1. SQL injection attempts via search params
2. XSS via email subject/body
3. IDOR on message/attachment access
4. Rate limit bypass attempts
5. JWT token manipulation
6. SSRF via webhook URLs
7. Path traversal in attachment download

## 7. Compliance Considerations

### GDPR
- [ ] Data processing documentation
- [ ] User consent mechanisms
- [ ] Right to access implemented
- [ ] Right to deletion implemented
- [ ] Data portability (export)
- [ ] Breach notification procedure

### CCPA
- [ ] "Do Not Sell" opt-out (N/A for email)
- [ ] Privacy policy updated
- [ ] Data collection disclosure

## 8. Incident Response

### Detection
- [ ] Alert on 5xx spike
- [ ] Alert on auth failures spike
- [ ] Alert on rate limit saturation
- [ ] Log anomaly detection (future)

### Response Procedure
1. Identify affected systems
2. Isolate if necessary (disable public endpoints)
3. Investigate via logs/traces
4. Patch vulnerability
5. Notify affected users if PII exposed
6. Post-mortem documentation

## 9. Configuration Hardening

### Environment Variables Checklist
```bash
# Critical secrets - MUST be random/unique
JWT_SECRET=<random 32+ chars>
TOTP_ENCRYPTION_KEY=<random 64 hex chars>
STRIPE_WEBHOOK_SECRET=<from Stripe>

# Disable dangerous features in prod
ALLOW_AUTO_DOMAIN_CREATION=false
PUBLIC_INBOX_ENABLED=false  # or true with CAPTCHA

# Rate limits - tune for traffic
RATE_LIMIT_MAX=100
SMTP_RATE_LIMIT_PER_IP=300

# Security
TRUST_PROXY=true  # Only behind reverse proxy
REQUIRE_EMAIL_VERIFICATION=true
REQUIRE_CAPTCHA_FOR_PUBLIC_INBOX=true
```

## 10. Security Monitoring

### Metrics to Track
- Failed login attempts per IP
- Rate limit hits by type
- JWT validation failures
- API key usage patterns
- Unusual email volumes

### Alerts
| Condition | Severity | Action |
|-----------|----------|--------|
| >100 failed logins/5min | High | Block IP |
| >1000 rate limit hits/5min | Medium | Investigate |
| JWT signing key used in error | Critical | Rotate key |
| New admin user created | Info | Audit |

## 11. Files to Review

### Security-Critical Files
| File | Focus |
|------|-------|
| `services/api/src/routes/auth.ts` | Password handling, JWT |
| `services/api/src/plugins/auth.ts` | Token validation |
| `services/api/src/routes/public-inbox.ts` | Unauthenticated access |
| `services/api/src/routes/messages.ts` | Ownership checks |
| `services/api/src/worker.ts` | Email processing |
| `services/api/src/config.ts` | Security defaults |

## 12. Quick Wins

### Immediate Fixes (No Code)
1. Rotate default JWT_SECRET
2. Set ALLOW_AUTO_DOMAIN_CREATION=false
3. Enable CAPTCHA for public inbox
4. Configure rate limits

### Code Changes (< 1 hour)
1. Add Helmet middleware
2. Restrict CORS to specific origin
3. Add request body size limit
4. Log authentication failures

### Medium Effort (1-4 hours)
1. Implement account lockout
2. Add password complexity validation
3. Sanitize HTML in email display
4. Add CSRF tokens for state-changing operations
