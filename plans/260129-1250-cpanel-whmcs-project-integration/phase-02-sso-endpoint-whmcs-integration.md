# Phase 02: SSO Endpoint for WHMCS Integration

## Context Links
- [Plan Overview](./plan.md)
- [Codebase Analysis](./research/researcher-02-codebase-analysis.md)
- Existing SSO: `services/api/src/routes/sso.ts`
- Magic Link: `services/api/src/routes/magic-link.ts`
- Provider Service: `services/api/src/services/hosting-provider.service.ts`

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | Pending |
| Effort | 2 days |
| Owner | TBD |

Implement SSO token generation endpoint for WHMCS "Login to Webmail" button. Allows hosting providers to generate one-time login URLs for their tenants' mailboxes.

## Key Insights
- WHMCS needs: `POST /sso` → returns URL user clicks to auto-login
- Existing `magic-link.ts` pattern can be adapted
- Token must be: short-lived (5min), single-use, scoped to specific mailbox
- No password required - provider already authenticated via API key

## Requirements

### Functional
- FR1: Provider generates SSO token for tenant's mailbox
- FR2: Token exchanged for JWT session at webmail
- FR3: Token expires after 5 minutes or single use
- FR4: Token scoped to specific email address

### Non-Functional
- NFR1: Provider API key authentication required
- NFR2: Token cryptographically secure (32 bytes)
- NFR3: IP binding optional (configurable per provider)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WHMCS Admin   │     │  Ephemera API   │     │  Ephemera Web   │
│   Panel         │     │                 │     │  (Webmail)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ POST /v1/provider/    │                       │
         │ tenants/:id/mailboxes │                       │
         │ /:email/sso           │                       │
         ├──────────────────────>│                       │
         │                       │                       │
         │ { ssoUrl: "https://   │                       │
         │   webmail/auth/sso?   │                       │
         │   token=xxx" }        │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │ User clicks URL       │                       │
         ├───────────────────────┼──────────────────────>│
         │                       │                       │
         │                       │ GET /auth/sso?token   │
         │                       │<──────────────────────│
         │                       │                       │
         │                       │ { jwt, user }         │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │     User logged in    │
```

## Related Code Files

### Files to CREATE
| File | Purpose |
|------|---------|
| `services/api/src/services/provider-sso.service.ts` | SSO token generation/validation |

### Files to MODIFY
| File | Change |
|------|--------|
| `services/api/src/routes/provider.ts` | Add SSO endpoint |
| `services/api/src/routes/auth.ts` | Add SSO token exchange endpoint |
| `services/api/prisma/schema.prisma` | Add ProviderSsoToken model (if not using Redis) |

## Implementation Steps

### Backend (Day 1)

1. **Create ProviderSsoToken model** (Option A: Prisma)
```prisma
model ProviderSsoToken {
  id          String   @id @default(cuid())
  token       String   @unique
  email       String
  providerId  String
  tenantId    String
  expiresAt   DateTime
  usedAt      DateTime?
  clientIp    String?
  createdAt   DateTime @default(now())

  @@index([token])
  @@index([expiresAt])
}
```

2. **Create provider-sso.service.ts**
```typescript
// services/api/src/services/provider-sso.service.ts
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export class ProviderSsoService {
  private static TOKEN_TTL_MINUTES = 5;

  /**
   * Generate SSO token for mailbox login
   */
  static async generateToken(data: {
    providerId: string;
    tenantId: string;
    email: string;
    clientIp?: string;
  }): Promise<{ token: string; expiresAt: Date; ssoUrl: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.providerSsoToken.create({
      data: {
        token,
        email: data.email.toLowerCase(),
        providerId: data.providerId,
        tenantId: data.tenantId,
        expiresAt,
        clientIp: data.clientIp,
      },
    });

    const baseUrl = process.env.WEB_URL || 'https://app.ephemera.email';
    const ssoUrl = `${baseUrl}/auth/sso?token=${token}`;

    return { token, expiresAt, ssoUrl };
  }

  /**
   * Validate and consume SSO token
   */
  static async validateToken(token: string, clientIp?: string) {
    const record = await prisma.providerSsoToken.findUnique({
      where: { token },
    });

    if (!record) throw new Error('Invalid token');
    if (record.usedAt) throw new Error('Token already used');
    if (record.expiresAt < new Date()) throw new Error('Token expired');
    if (record.clientIp && clientIp && record.clientIp !== clientIp) {
      throw new Error('IP mismatch');
    }

    // Mark as used
    await prisma.providerSsoToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { email: record.email, providerId: record.providerId };
  }

  /**
   * Cleanup expired tokens (cron job)
   */
  static async cleanupExpired() {
    return prisma.providerSsoToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
```

3. **Add SSO endpoint to provider.ts**
```typescript
// In services/api/src/routes/provider.ts

const ssoSchema = z.object({
  returnUrl: z.string().url().optional(),
});

// Generate SSO token for mailbox
app.post('/v1/provider/tenants/:id/mailboxes/:email/sso',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, email } = request.params as { id: string; email: string };
    const decodedEmail = decodeURIComponent(email);

    // Verify mailbox belongs to tenant
    const mailboxes = await HostingProviderService.listMailboxes(
      request.provider!.providerId, id
    );
    const found = mailboxes.find(m => m.email === decodedEmail.toLowerCase());

    if (!found) {
      return reply.status(404).send({ error: 'Mailbox not found' });
    }

    const result = await ProviderSsoService.generateToken({
      providerId: request.provider!.providerId,
      tenantId: id,
      email: decodedEmail,
      clientIp: request.ip,
    });

    return { ssoUrl: result.ssoUrl, expiresAt: result.expiresAt };
});
```

### Frontend Integration (Day 2)

4. **Add SSO exchange route to auth.ts**
```typescript
// In services/api/src/routes/auth.ts

// GET /auth/sso?token=xxx - Exchange SSO token for JWT
app.get('/auth/sso', async (request, reply) => {
  const { token } = request.query as { token: string };

  if (!token) {
    return reply.status(400).send({ error: 'Token required' });
  }

  try {
    const { email } = await ProviderSsoService.validateToken(token, request.ip);

    // Find or create user session
    const user = await findOrCreateUserByEmail(email);
    const jwt = generateJwt(user);

    // Redirect to webmail with token
    return reply.redirect(`/inbox?sso_token=${jwt}`);
  } catch (error) {
    return reply.redirect('/login?error=sso_failed');
  }
});
```

5. **Add SSO handler in web app**
```typescript
// services/web/src/pages/auth/SsoCallback.tsx
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const token = params.get('sso_token');
  if (token) {
    localStorage.setItem('token', token);
    navigate('/inbox');
  }
}, []);
```

6. **Add token cleanup to existing cron**
```typescript
// In scheduled jobs
import { ProviderSsoService } from './services/provider-sso.service';

// Run every hour
schedule('0 * * * *', async () => {
  await ProviderSsoService.cleanupExpired();
});
```

## Todo List
- [ ] Add ProviderSsoToken model to Prisma schema
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Create provider-sso.service.ts
- [ ] Add SSO endpoint to provider.ts routes
- [ ] Add SSO exchange route to auth.ts
- [ ] Create SsoCallback.tsx page in web app
- [ ] Add cleanup to scheduled jobs
- [ ] Write tests for SSO flow
- [ ] Test with mock WHMCS request

## Success Criteria
- [ ] Provider can generate SSO URL via API
- [ ] User clicking SSO URL lands in webmail authenticated
- [ ] Token expires after 5 minutes
- [ ] Token works only once (single-use)
- [ ] Expired tokens cleaned up automatically

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Token interception | High | HTTPS only, short TTL |
| Token replay | High | Single-use enforcement |
| IP spoofing | Medium | Optional IP binding |
| Token enumeration | Low | 32-byte random token |

## Security Considerations
- Tokens are 256-bit random (cryptographically secure)
- 5-minute TTL prevents long-term exposure
- Single-use prevents replay attacks
- Optional IP binding for stricter security
- All communication over HTTPS
- Tokens stored hashed (optional enhancement)

## Next Steps
After completion:
1. Document SSO endpoint in Provider API docs
2. Proceed to Phase 03: Billing Snapshot Job
3. Test integration with actual WHMCS module
