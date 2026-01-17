# Phase 03: Webhook Notifications (MailHook)

**Duration:** Week 3
**Priority:** High
**Dependencies:** Phase 01, Phase 02

## 1. Objective

Tự động trigger webhook khi email đến:
- Event `email.received` khi có email mới
- Payload bao gồm message data và extracted OTP
- Retry logic với exponential backoff
- Webhook signature cho security

## 2. Current State

### Existing Implementation
- `Webhook` model với events array
- `WebhookService` với `triggerWebhook()` function
- `webhookQueue` với BullMQ
- `webhookWorker` để process queue
- Routes đầy đủ CRUD + test + logs

### Gap
- Chưa tự động trigger khi email đến
- Payload chưa bao gồm OTP data
- Cần integrate vào email processing flow

## 3. Tasks

### 3.1 Update Webhook Payload for email.received

**File:** `services/api/src/services/webhookService.ts` (update)

```typescript
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { webhookQueue } from '../queue/webhookQueue';
import type { Message, Inbox, Domain } from '@prisma/client';

export interface WebhookPayload {
    event: string;
    timestamp: string;
    idempotencyKey: string;
    data: any;
}

export interface EmailReceivedPayload {
    messageId: string;
    inboxId: string;
    inboxEmail: string;
    domainName: string;
    from: string | null;
    to: string | null;
    subject: string | null;
    receivedAt: string;
    hasAttachments: boolean;
    attachmentCount: number;
    extractedOtp: {
        code: string;
        confidence: string;
    } | null;
    preview: string;
    spamScore: number | null;
    headers: Record<string, string> | null;
}

/**
 * Build payload for email.received event
 */
export function buildEmailReceivedPayload(
    message: Message & {
        inbox: Inbox & { domain: Domain };
        attachments?: { id: string }[];
    }
): EmailReceivedPayload {
    const textPreview = (message.textBody || '').slice(0, 500);

    return {
        messageId: message.id,
        inboxId: message.inbox.id,
        inboxEmail: `${message.inbox.localPart}@${message.inbox.domain.name}`,
        domainName: message.inbox.domain.name,
        from: message.fromAddress,
        to: message.toAddress,
        subject: message.subject,
        receivedAt: message.receivedAt.toISOString(),
        hasAttachments: (message.attachments?.length || 0) > 0,
        attachmentCount: message.attachments?.length || 0,
        extractedOtp: message.extractedOtp ? {
            code: message.extractedOtp,
            confidence: message.otpConfidence || 'medium',
        } : null,
        preview: textPreview,
        spamScore: message.spamScore,
        headers: message.headers as Record<string, string> | null,
    };
}

/**
 * Generates an idempotency key for webhook delivery
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}

/**
 * Triggers a webhook event for a specific user
 */
export async function triggerWebhook(userId: string, event: string, data: any) {
    const webhooks = await prisma.webhook.findMany({
        where: {
            userId,
            isActive: true,
            events: {
                has: event
            }
        }
    });

    if (webhooks.length === 0) return;

    const idempotencyKey = generateIdempotencyKey();
    const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        idempotencyKey,
        data
    };

    const jobs = webhooks.map(webhook => ({
        name: `webhook-${webhook.id}`,
        data: {
            webhookId: webhook.id,
            payload
        },
        opts: {
            jobId: `${webhook.id}-${idempotencyKey}`,
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000, // Start with 1s, then 2s, 4s, 8s, 16s
            },
        }
    }));

    await webhookQueue.addBulk(jobs);
}

/**
 * Trigger email.received webhook for inbox owner
 */
export async function triggerEmailReceivedWebhook(
    message: Message & {
        inbox: Inbox & { domain: Domain; ownerId: string | null };
        attachments?: { id: string }[];
    }
) {
    if (!message.inbox.ownerId) return;

    const payload = buildEmailReceivedPayload(message as any);
    await triggerWebhook(message.inbox.ownerId, 'email.received', payload);
}

/**
 * Signs a payload with a secret using HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Generates a random secret for a new webhook
 */
export function generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
}
```

### 3.2 Update Webhook Worker with Retry Logic

**File:** `services/api/src/webhookWorker.ts` (update)

```typescript
import { Worker, Job } from 'bullmq';
import { prisma } from './lib/prisma';
import { signPayload, type WebhookPayload } from './services/webhookService';
import { appConfig } from './config';

interface WebhookJobData {
    webhookId: string;
    payload: WebhookPayload;
}

const worker = new Worker<WebhookJobData>(
    'webhook',
    async (job: Job<WebhookJobData>) => {
        const { webhookId, payload } = job.data;
        const startTime = Date.now();

        const webhook = await prisma.webhook.findUnique({
            where: { id: webhookId }
        });

        if (!webhook || !webhook.isActive) {
            console.log(`[Webhook] Skipping inactive webhook ${webhookId}`);
            return { skipped: true };
        }

        const payloadStr = JSON.stringify(payload);
        const signature = signPayload(payloadStr, webhook.secret);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Ephemera-Event': payload.event,
                    'X-Ephemera-Delivery': payload.idempotencyKey,
                    'X-Ephemera-Signature': `sha256=${signature}`,
                    'X-Ephemera-Timestamp': payload.timestamp,
                    'User-Agent': 'Ephemera-Webhook/1.0',
                },
                body: payloadStr,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const duration = Date.now() - startTime;
            const responseBody = await response.text().catch(() => '');

            // Log the delivery
            await prisma.webhookLog.create({
                data: {
                    webhookId,
                    eventType: payload.event,
                    payload: payload as any,
                    statusCode: response.status,
                    responseBody: responseBody.slice(0, 1000), // Limit response body
                    duration,
                }
            });

            // Check if successful (2xx status)
            if (response.status >= 200 && response.status < 300) {
                console.log(`[Webhook] Delivered ${webhookId} -> ${response.status} (${duration}ms)`);
                return { success: true, status: response.status };
            }

            // Non-2xx status - throw to trigger retry
            throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 200)}`);

        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Log the failure
            await prisma.webhookLog.create({
                data: {
                    webhookId,
                    eventType: payload.event,
                    payload: payload as any,
                    statusCode: null,
                    responseBody: error.message,
                    duration,
                }
            });

            console.error(`[Webhook] Failed ${webhookId}: ${error.message}`);

            // Re-throw to trigger BullMQ retry
            throw error;
        }
    },
    {
        connection: {
            host: appConfig.redisHost,
            port: appConfig.redisPort,
        },
        concurrency: 10,
    }
);

worker.on('completed', (job) => {
    console.log(`[Webhook] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[Webhook] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
});

export { worker as webhookWorker };
```

### 3.3 Integrate into Email Processing

**File:** `services/api/src/workers/emailWorker.ts` (update)

Add webhook trigger after message is saved:

```typescript
import { triggerEmailReceivedWebhook } from '../services/webhookService';

// After message is created and saved:
const messageWithRelations = await prisma.message.findUnique({
    where: { id: message.id },
    include: {
        inbox: {
            include: { domain: true }
        },
        attachments: true,
    }
});

if (messageWithRelations) {
    // Trigger webhook
    await triggerEmailReceivedWebhook(messageWithRelations as any);
}
```

### 3.4 Add More Event Types

**File:** `services/api/src/types/webhookEvents.ts` (new)

```typescript
export const WEBHOOK_EVENTS = {
    // Email events
    'email.received': 'Triggered when a new email arrives',
    'email.read': 'Triggered when an email is marked as read',
    'email.deleted': 'Triggered when an email is deleted',

    // Inbox events
    'inbox.created': 'Triggered when a new inbox is created',
    'inbox.deleted': 'Triggered when an inbox is deleted',

    // Domain events
    'domain.verified': 'Triggered when a domain is verified',

    // Test event
    'test.event': 'Test webhook delivery',
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;

export const DEFAULT_EVENTS: WebhookEventType[] = ['email.received'];
```

### 3.5 Update Webhook Routes

**File:** `services/api/src/routes/webhooks.ts` (update)

Add endpoint to list available events:

```typescript
import { WEBHOOK_EVENTS, DEFAULT_EVENTS } from '../types/webhookEvents';

// List available webhook events
app.get('/webhooks/events', async () => {
    return {
        events: Object.entries(WEBHOOK_EVENTS).map(([key, description]) => ({
            event: key,
            description,
            default: DEFAULT_EVENTS.includes(key as any),
        })),
    };
});

// Update create webhook to validate events
app.post('/webhooks', { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as { userId: string };

    const bodySchema = z.object({
        name: z.string().min(1).max(100),
        url: z.string().url(),
        events: z.array(z.enum(Object.keys(WEBHOOK_EVENTS) as [string, ...string[]]))
            .default(['email.received']),
    });

    // ... rest of implementation
});
```

### 3.6 Webhook Verification Endpoint

Allow users to verify webhook signature:

**File:** `services/api/src/routes/webhooks.ts` (add)

```typescript
// Verify webhook signature (utility endpoint)
app.post('/webhooks/verify-signature', async (request, reply) => {
    const bodySchema = z.object({
        payload: z.string(),
        signature: z.string(),
        secret: z.string(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request' });
    }

    const { payload, signature, secret } = parsed.data;
    const expectedSignature = `sha256=${signPayload(payload, secret)}`;

    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    return { valid: isValid };
});
```

### 3.7 Frontend Webhook Management

**File:** `services/web/src/components/webhooks/WebhookCard.tsx`

```tsx
import { useState } from 'react';
import { Webhook, Trash2, Play, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { api } from '../../utils/api';

interface WebhookCardProps {
    webhook: {
        id: string;
        name: string;
        url: string;
        secret: string;
        events: string[];
        isActive: boolean;
        createdAt: string;
    };
    onDelete: (id: string) => void;
    onTest: (id: string) => void;
}

export function WebhookCard({ webhook, onDelete, onTest }: WebhookCardProps) {
    const [showSecret, setShowSecret] = useState(false);
    const [copied, setCopied] = useState(false);

    const copySecret = async () => {
        await navigator.clipboard.writeText(webhook.secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${webhook.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <Webhook className={`w-5 h-5 ${webhook.isActive ? 'text-green-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">{webhook.name}</h3>
                        <p className="text-sm text-slate-400 truncate max-w-md">{webhook.url}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onTest(webhook.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Test webhook"
                    >
                        <Play className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                        onClick={() => onDelete(webhook.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete webhook"
                    >
                        <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {/* Events */}
                <div className="flex flex-wrap gap-2">
                    {webhook.events.map(event => (
                        <span
                            key={event}
                            className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded"
                        >
                            {event}
                        </span>
                    ))}
                </div>

                {/* Secret */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Secret:</span>
                    <code className="text-sm text-slate-300 font-mono">
                        {showSecret ? webhook.secret.slice(0, 20) + '...' : '••••••••••••••••'}
                    </code>
                    <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={copySecret}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

## 4. Webhook Payload Examples

### email.received

```json
{
    "event": "email.received",
    "timestamp": "2026-01-17T00:00:00.000Z",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "data": {
        "messageId": "msg-123",
        "inboxId": "inbox-456",
        "inboxEmail": "test@domain.com",
        "domainName": "domain.com",
        "from": "sender@example.com",
        "to": "test@domain.com",
        "subject": "Your verification code",
        "receivedAt": "2026-01-17T00:00:00.000Z",
        "hasAttachments": false,
        "attachmentCount": 0,
        "extractedOtp": {
            "code": "123456",
            "confidence": "high"
        },
        "preview": "Your verification code is 123456...",
        "spamScore": 0.1,
        "headers": {
            "X-Mailer": "Example Mailer"
        }
    }
}
```

### Signature Verification (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')}`;

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// Express middleware
app.post('/webhook', express.text({ type: '*/*' }), (req, res) => {
    const signature = req.headers['x-ephemera-signature'];
    const isValid = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body);
    // Process webhook...
});
```

## 5. Testing

### Unit Tests

```typescript
describe("WebhookService", () => {
    describe("buildEmailReceivedPayload", () => {
        it("should build payload with OTP", () => {
            const message = createMockMessage({ extractedOtp: "123456" });
            const payload = buildEmailReceivedPayload(message);

            expect(payload.extractedOtp?.code).toBe("123456");
        });

        it("should include attachment count", () => {
            const message = createMockMessage({ attachments: [{}, {}] });
            const payload = buildEmailReceivedPayload(message);

            expect(payload.hasAttachments).toBe(true);
            expect(payload.attachmentCount).toBe(2);
        });
    });

    describe("signPayload", () => {
        it("should create consistent signature", () => {
            const payload = '{"test": true}';
            const secret = "test-secret";

            const sig1 = signPayload(payload, secret);
            const sig2 = signPayload(payload, secret);

            expect(sig1).toBe(sig2);
        });
    });
});
```

### Integration Tests

```typescript
describe("Webhook E2E", () => {
    it("should trigger webhook on email received", async () => {
        // Setup webhook listener
        const webhookServer = await createMockWebhookServer();

        // Create webhook
        await api.post("/webhooks", {
            name: "Test",
            url: webhookServer.url,
            events: ["email.received"],
        });

        // Send email to SMTP
        await sendTestEmail("test@domain.com");

        // Wait for webhook delivery
        const received = await webhookServer.waitForRequest(5000);

        expect(received.headers["x-ephemera-event"]).toBe("email.received");
        expect(received.body.data.inboxEmail).toBe("test@domain.com");
    });
});
```

## 6. Acceptance Criteria

- [ ] Webhook auto-triggered on email.received
- [ ] Payload includes all message fields
- [ ] Payload includes extracted OTP
- [ ] Signature header present
- [ ] Retry logic works (5 attempts, exponential backoff)
- [ ] Failed deliveries logged
- [ ] Successful deliveries logged
- [ ] Test webhook endpoint works
- [ ] Available events endpoint works
- [ ] Frontend webhook management works
- [ ] Signature verification utility works
