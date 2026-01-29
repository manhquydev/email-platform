# Phase 03: BullMQ Outbound Queue

**Status:** planned
**Effort:** 3h
**Dependencies:** Phase 01 (Database Schema)
**Owner:** Backend

## Objective

Implement async outbound email processing using BullMQ with retry logic, DKIM signing, and status tracking.

## Architecture

```
POST /messages/outbound
       |
       v
  Credit Check
       |
       v
  Suppression Check  <-- Phase 05
       |
       v
  OutboundMessage (QUEUED)
       |
       v
  outboundQueue.add(job)
       |
       v
  outboundWorker processes
       |
       +-- Load DKIM keys (Phase 02)
       +-- Sign message
       +-- Send via ESP/SMTP
       +-- Update OutboundMessage status
       |
       v
  SENT/FAILED + retries
```

## Implementation

### 1. Outbound Queue (`queue/outboundQueue.ts`)

```typescript
import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

export const OUTBOUND_QUEUE_NAME = 'outbound-email';

export interface OutboundJobData {
  outboundMessageId: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentData[];
  domainId: string;
  userId: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export const outboundQueue = new Queue<OutboundJobData>(OUTBOUND_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,  // OUTBOUND_RETRY_ATTEMPTS
    backoff: {
      type: 'exponential',
      delay: 1000,  // OUTBOUND_RETRY_DELAY_MS
    },
    removeOnComplete: 100,  // Keep last 100 for debugging
    removeOnFail: false,    // Keep failed for inspection
  },
});
```

### 2. Outbound Worker (`workers/outboundWorker.ts`)

```typescript
import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { OUTBOUND_QUEUE_NAME, OutboundJobData } from '../queue/outboundQueue';
import { prisma } from '../lib/prisma';
import { dkimService } from '../services/dkim.service';
import { outboundService } from '../services/outbound';

const worker = new Worker<OutboundJobData>(
  OUTBOUND_QUEUE_NAME,
  async (job: Job<OutboundJobData>) => {
    const { outboundMessageId, domainId, from, to, subject, text, html } = job.data;

    // 1. Update status to SENDING
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: {
        status: 'SENDING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      // 2. Load DKIM config (if exists)
      const dkimConfig = await dkimService.getDkimConfig(domainId);

      // 3. Build email message
      const message = buildMessage({ from, to, subject, text, html });

      // 4. Sign with DKIM (if configured)
      const signedMessage = dkimConfig
        ? await dkimService.signMessage(domainId, message)
        : message;

      // 5. Send via configured provider
      const result = await outboundService.sendRawMessage(signedMessage, to);

      // 6. Update status to SENT
      await prisma.outboundMessage.update({
        where: { id: outboundMessageId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          espMessageId: result.messageId,
          espProvider: result.provider,
        },
      });

      return { success: true, espMessageId: result.messageId };
    } catch (error) {
      // Let BullMQ handle retries
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 10,  // Process 10 jobs simultaneously
  }
);

// Handle completed jobs
worker.on('completed', async (job, result) => {
  console.log(`[OutboundWorker] Job ${job.id} completed:`, result);
});

// Handle failed jobs (after all retries exhausted)
worker.on('failed', async (job, error) => {
  if (job) {
    await prisma.outboundMessage.update({
      where: { id: job.data.outboundMessageId },
      data: {
        status: 'FAILED',
        bounceMessage: error.message,
      },
    });
  }
});
```

### 3. Outbound Service Modifications (`services/outbound.ts`)

Add method for raw message sending:

```typescript
// Add to OutboundService class:

async sendRawMessage(
  signedMessage: Buffer | string,
  to: string
): Promise<{ messageId: string; provider: string }> {
  const provider = process.env.ESP_PROVIDER || 'smtp';

  switch (provider) {
    case 'ses':
      return this.sendViaSES(signedMessage, to);
    case 'mailgun':
      return this.sendViaMailgun(signedMessage, to);
    case 'sendgrid':
      return this.sendViaSendGrid(signedMessage, to);
    default:
      return this.sendViaSMTP(signedMessage, to);
  }
}
```

### 4. Route Modifications (`routes/outbound.ts`)

Update `/messages/outbound` to use queue:

```typescript
app.post("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
  // ... existing validation and credit check ...

  // Create OutboundMessage record (QUEUED)
  const outboundMessage = await prisma.outboundMessage.create({
    data: {
      userId,
      domainId: domain.id,
      fromAddress: from,
      toAddress: to,
      subject,
      messageId: `<${uuid()}@${domainName}>`,
      status: 'QUEUED',
      espProvider: process.env.ESP_PROVIDER || 'smtp',
    },
  });

  // Add to queue
  await outboundQueue.add('send', {
    outboundMessageId: outboundMessage.id,
    from,
    to,
    subject,
    text,
    html,
    attachments,
    domainId: domain.id,
    userId,
  });

  return {
    ok: true,
    outboundId: outboundMessage.id,
    messageId: outboundMessage.messageId,
    status: 'QUEUED',
    remainingCredits: user.credits - CREDIT_COST,
  };
});

// Add: GET /messages/outbound - list sent messages
app.get("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
  const userId = (request.user as any).userId;
  const { status, from, to, page = 1, limit = 20 } = request.query as any;

  const where: any = { userId };
  if (status) where.status = status;
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

  const [items, total] = await Promise.all([
    prisma.outboundMessage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.outboundMessage.count({ where }),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
});

// Add: GET /messages/outbound/:id - get single message status
app.get("/messages/outbound/:id", { preHandler: app.authenticate }, async (request, reply) => {
  const userId = (request.user as any).userId;
  const { id } = request.params as any;

  const message = await prisma.outboundMessage.findFirst({
    where: { id, userId },
  });

  if (!message) return reply.status(404).send({ error: 'Message not found' });

  return message;
});
```

## Environment Variables

```bash
ESP_PROVIDER=smtp|ses|mailgun|sendgrid
OUTBOUND_RETRY_ATTEMPTS=3
OUTBOUND_RETRY_DELAY_MS=1000
OUTBOUND_WORKER_CONCURRENCY=10
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `queue/outboundQueue.ts` | Create |
| `workers/outboundWorker.ts` | Create |
| `services/outbound.ts` | Modify - add sendRawMessage, ESP routing |
| `routes/outbound.ts` | Modify - use queue, add list/get endpoints |
| `config.ts` | Modify - add ESP/retry config |
| `index.ts` | Modify - start worker |

## Acceptance Criteria

- [ ] OutboundMessage created with QUEUED status
- [ ] Job added to BullMQ queue
- [ ] Worker processes job and updates status
- [ ] Retries on transient failures (3 attempts)
- [ ] FAILED status after retry exhaustion
- [ ] GET /messages/outbound returns paginated list
- [ ] GET /messages/outbound/:id returns delivery details
- [ ] Concurrency limited to prevent overload

## Error Handling

| Error Type | Retry? | Final Status |
|------------|--------|--------------|
| SMTP timeout | Yes | FAILED after 3 |
| Auth error | No | FAILED immediately |
| Rate limited | Yes | FAILED after 3 |
| Invalid recipient | No | BOUNCED (via webhook) |
| Network error | Yes | FAILED after 3 |

## Notes

- Credit refund on FAILED status handled in worker.on('failed')
- DKIM signing is optional (graceful fallback if not configured)
- ESP provider selection via ENV allows runtime switching
- Worker started in index.ts alongside existing webhookWorker
