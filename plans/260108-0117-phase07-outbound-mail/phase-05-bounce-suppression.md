# Phase 05: Bounce Suppression

**Status:** planned
**Effort:** 3h
**Dependencies:** Phase 01 (Database Schema), Phase 04 (ESP Webhooks)
**Owner:** Backend

## Objective

Implement bounce suppression list management to prevent sending to invalid or complaining recipients.

## Suppression Flow

```
POST /messages/outbound
       |
       v
  Check BounceSuppressionList
       |
       +-- Found & not expired --> Return 400 "Recipient suppressed"
       |
       +-- Not found --> Continue to queue
```

## Implementation

### 1. Suppression Service (`services/bounce-suppression.ts`)

```typescript
import { prisma } from '../lib/prisma';

export class BounceSuppressionService {
  /**
   * Check if email is suppressed
   * Returns suppression reason if suppressed, null if not
   */
  async isEmailSuppressed(email: string): Promise<{
    suppressed: boolean;
    reason?: string;
    expiresAt?: Date;
  }> {
    const normalizedEmail = email.toLowerCase().trim();

    const entry = await prisma.bounceSuppressionList.findUnique({
      where: { email: normalizedEmail },
    });

    if (!entry) {
      return { suppressed: false };
    }

    // Check if soft bounce has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      // Remove expired entry
      await prisma.bounceSuppressionList.delete({
        where: { id: entry.id },
      });
      return { suppressed: false };
    }

    return {
      suppressed: true,
      reason: entry.reason,
      expiresAt: entry.expiresAt || undefined,
    };
  }

  /**
   * Add email to suppression list
   */
  async addToSuppressionList(
    email: string,
    reason: 'hard_bounce' | 'complaint' | 'manual',
    sourceId?: string,
    expiresAt?: Date
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    await prisma.bounceSuppressionList.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        reason,
        sourceId,
        expiresAt,
      },
      update: {
        reason,
        sourceId,
        expiresAt,
      },
    });
  }

  /**
   * Remove email from suppression list (manual override)
   */
  async removeFromSuppressionList(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const result = await prisma.bounceSuppressionList.deleteMany({
      where: { email: normalizedEmail },
    });

    return result.count > 0;
  }

  /**
   * Get suppression list with pagination
   */
  async getSuppressionList(options: {
    page?: number;
    limit?: number;
    reason?: string;
  }) {
    const { page = 1, limit = 50, reason } = options;

    const where: any = {};
    if (reason) where.reason = reason;

    const [items, total] = await Promise.all([
      prisma.bounceSuppressionList.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bounceSuppressionList.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Bulk check multiple emails
   */
  async checkBulk(emails: string[]): Promise<Map<string, boolean>> {
    const normalized = emails.map(e => e.toLowerCase().trim());

    const suppressed = await prisma.bounceSuppressionList.findMany({
      where: {
        email: { in: normalized },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { email: true },
    });

    const suppressedSet = new Set(suppressed.map(s => s.email));
    const result = new Map<string, boolean>();

    for (const email of normalized) {
      result.set(email, suppressedSet.has(email));
    }

    return result;
  }

  /**
   * Cleanup expired entries (cron job)
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.bounceSuppressionList.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}

export const bounceSuppressionService = new BounceSuppressionService();
```

### 2. Integration with Outbound Route (`routes/outbound.ts`)

Add suppression check before queuing:

```typescript
import { bounceSuppressionService } from '../services/bounce-suppression';

app.post("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
  // ... existing validation ...

  // Check suppression list BEFORE credit deduction
  const suppressionCheck = await bounceSuppressionService.isEmailSuppressed(to);
  if (suppressionCheck.suppressed) {
    return reply.status(400).send({
      error: 'Recipient is suppressed',
      reason: suppressionCheck.reason,
      expiresAt: suppressionCheck.expiresAt,
      hint: 'Contact support to remove from suppression list',
    });
  }

  // ... continue with credit check and queuing ...
});
```

### 3. Suppression Admin Routes (`routes/suppression.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { bounceSuppressionService } from '../services/bounce-suppression';

export async function suppressionRoutes(app: FastifyInstance) {
  // List suppression entries (admin or domain owner)
  app.get('/suppression', { preHandler: app.authenticate }, async (request, reply) => {
    const { page, limit, reason } = request.query as any;
    const user = request.user as any;

    // Only admins can view full list
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    return bounceSuppressionService.getSuppressionList({ page, limit, reason });
  });

  // Check if specific email is suppressed
  app.get('/suppression/check/:email', { preHandler: app.authenticate }, async (request, reply) => {
    const { email } = request.params as any;
    return bounceSuppressionService.isEmailSuppressed(email);
  });

  // Manually add to suppression list (admin only)
  app.post('/suppression', { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as any;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { email, reason, expiresAt } = request.body as any;
    await bounceSuppressionService.addToSuppressionList(
      email,
      reason || 'manual',
      undefined,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return { ok: true, email };
  });

  // Remove from suppression list (admin only)
  app.delete('/suppression/:email', { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as any;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { email } = request.params as any;
    const removed = await bounceSuppressionService.removeFromSuppressionList(email);

    if (!removed) {
      return reply.status(404).send({ error: 'Email not found in suppression list' });
    }

    return { ok: true, removed: email };
  });
}
```

### 4. Cleanup Cron Job

Add to existing cron setup or create new:

```typescript
// In index.ts or dedicated cron file
import cron from 'node-cron';
import { bounceSuppressionService } from './services/bounce-suppression';

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  const cleaned = await bounceSuppressionService.cleanupExpired();
  console.log(`[Cron] Cleaned ${cleaned} expired suppression entries`);
});
```

## API Specifications

### List Suppressed Emails

```http
GET /suppression?page=1&limit=50&reason=hard_bounce
Authorization: Bearer <admin_token>

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "email": "invalid@example.com",
      "reason": "hard_bounce",
      "sourceId": "outbound-msg-uuid",
      "createdAt": "2026-01-08T...",
      "expiresAt": null
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 3
}
```

### Check Email Suppression

```http
GET /suppression/check/user@example.com
Authorization: Bearer <token>

Response 200:
{
  "suppressed": true,
  "reason": "complaint",
  "expiresAt": null
}
```

### Add to Suppression

```http
POST /suppression
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "bad@example.com",
  "reason": "manual",
  "expiresAt": "2026-02-08T00:00:00Z"
}

Response 201: { "ok": true, "email": "bad@example.com" }
```

### Remove from Suppression

```http
DELETE /suppression/bad@example.com
Authorization: Bearer <admin_token>

Response 200: { "ok": true, "removed": "bad@example.com" }
Response 404: { "error": "Email not found in suppression list" }
```

## Suppression Policies

| Event | Suppression Action | Expiry |
|-------|-------------------|--------|
| Hard bounce | Add immediately | Never |
| Complaint | Add immediately | Never |
| Soft bounce | Optional (after 3x) | 7 days |
| Manual | Admin adds | Configurable |

## Files to Create/Modify

| File | Action |
|------|--------|
| `services/bounce-suppression.ts` | Create |
| `routes/suppression.ts` | Create |
| `routes/outbound.ts` | Modify - add suppression check |
| `index.ts` | Modify - register routes, add cron |

## Acceptance Criteria

- [ ] Suppression check blocks sending to suppressed emails
- [ ] Hard bounces auto-added to suppression
- [ ] Complaints auto-added to suppression
- [ ] Soft bounce entries expire after configured time
- [ ] Admin can view full suppression list
- [ ] Admin can manually add/remove entries
- [ ] Expired entries cleaned up daily
- [ ] Bulk check works for multiple emails

## Security Notes

- Email addresses stored in lowercase for consistent matching
- Only admins can view/modify suppression list
- Audit logging recommended for suppression changes
- Consider hashing emails for privacy (future enhancement)
