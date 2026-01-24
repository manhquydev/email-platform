# Security Guide

This document outlines the security architecture and best practices implemented in the Ephemera email platform.

## Overview

The platform follows OWASP API Security Top 10 guidelines and implements defense-in-depth strategies across all layers.

## Authentication

### JWT Token Security

- **Access Tokens**: 15-minute expiry, includes `jti` claim for revocation
- **Refresh Tokens**: 7-day expiry with rotation on each use
- **Token Revocation**: Redis-backed denylist with fail-open pattern
- **Logout All**: Revokes all user tokens across devices

```typescript
// Token structure
{
  userId: string,
  role: "USER" | "ADMIN",
  tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
  type: "access" | "refresh",
  jti: string,  // Unique token ID for revocation
  iat: number,
  exp: number
}
```

### Two-Factor Authentication

- **TOTP**: Time-based one-time passwords (authenticator apps)
- **WebAuthn**: Hardware security keys and biometrics
- **Backup Codes**: 10 one-time recovery codes (bcrypt hashed)
- **Brute Force Protection**: Exponential backoff (3 attempts → 1min → 5min → 15min → 1hr)

### API Key Security

- **Scoped Access**: Client keys (read-only) vs Server keys (full access)
- **Key Hashing**: SHA-256 hashed storage (original never stored)
- **Expiration**: Optional expiry dates
- **Rate Limiting**: Per-key limits separate from user limits

## Authorization

### Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| USER | Own resources, team-shared resources |
| ADMIN | All resources, system management |

### Resource Ownership

All endpoints verify resource ownership before access:

```typescript
// Example: Attachment download
const attachment = await prisma.attachment.findUnique({
  where: { id },
  include: { message: { select: { inboxId: true } } }
});

const canAccess = await TeamService.canAccessInbox(userId, attachment.message.inboxId);
if (!canAccess) {
  return reply.status(403).send({ error: "Unauthorized" });
}
```

### Team-Based Sharing

- Granular permissions: `view`, `manage`, `admin`
- Invitation system with expiring tokens
- Audit trail for all team actions

## Rate Limiting

### Tier-Based Limits

| Tier | Requests/Minute |
|------|-----------------|
| FREE | 100 |
| STARTER | 500 |
| PROFESSIONAL | 2,000 |
| ENTERPRISE | 10,000 |

### Endpoint-Specific Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 10 | 5 minutes |
| `/auth/register` | 5 | 1 hour |
| `/auth/forgot-password` | 3 | 15 minutes |
| `/auth/2fa/verify` | 3 | 5 minutes |

### Implementation

- **Redis-backed**: Distributed rate limiting across instances
- **Fail-open**: Falls back to in-memory if Redis unavailable
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Input Validation

### Zod Schema Validation

All endpoints validate input with Zod schemas:

```typescript
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number"),
});
```

### Injection Prevention

#### Path Traversal
```typescript
// Blocks: ../../../etc/passwd, /etc/passwd
const safeKey = sanitizeStorageKey(userInput);
if (!isPathWithinBase(resolvedPath, baseDir)) {
  throw new Error("Path traversal detected");
}
```

#### Email Header Injection
```typescript
// Removes CR/LF to prevent header injection
const safeSubject = sanitizeEmailHeader(subject);
```

#### SSRF Protection
```typescript
// Blocks: localhost, private IPs, cloud metadata endpoints
const validation = validateWebhookUrl(url);
if (!validation.valid) {
  return reply.status(400).send({ error: validation.reason });
}
```

#### SQL Injection
- All queries use Prisma ORM (parameterized by default)
- Raw queries use template literals: `prisma.$queryRaw\`SELECT * FROM users WHERE id = ${userId}\``

## Security Headers

Implemented via `@fastify/helmet`:

```typescript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}
```

## Monitoring & Alerting

### Security Metrics (Prometheus)

```
# Authentication failures
auth_failures_total{reason="invalid_password|account_locked|token_revoked"}

# Rate limit violations
rate_limit_hits_total{endpoint="/auth/login"}

# Injection attempts blocked
injection_attempts_total{type="path_traversal|ssrf|header_injection"}

# Token revocations
token_revocations_total
```

### Audit Logging

All security-relevant actions are logged:

- Login success/failure
- Password changes
- 2FA enable/disable
- API key creation/deletion
- Permission changes

## Security Testing

### Automated Tests

```bash
# Run security test suite
npm run test -- src/test/security/

# Tests cover:
# - BOLA/IDOR protection
# - Authentication bypass
# - Injection prevention
# - Rate limiting
```

### CI/CD Integration

- `npm audit` on every PR
- Trivy vulnerability scanning
- Dependency review for license compliance
- Security test suite execution

## Incident Response

### Token Compromise

1. User: Use "Logout All Devices" feature
2. Admin: Revoke specific user tokens via admin panel
3. System: Automatic revocation on password change

### API Key Compromise

1. Delete compromised key immediately
2. Generate new key with same scopes
3. Update integrations with new key
4. Review audit logs for unauthorized access

## Best Practices for Developers

1. **Never log sensitive data**: Passwords, tokens, API keys
2. **Always validate input**: Use Zod schemas on all endpoints
3. **Check ownership first**: Verify access before loading resources
4. **Use parameterized queries**: Never concatenate user input into SQL
5. **Sanitize output**: Escape HTML in email templates
6. **Rate limit sensitive endpoints**: Auth, password reset, 2FA
7. **Audit security events**: Log all authentication and authorization decisions

## Compliance

- GDPR: Data retention policies, right to deletion
- OWASP API Top 10: Full coverage
- SOC 2: Audit logging, access controls
