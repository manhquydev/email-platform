import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { webhookQueue } from '../queue/webhookQueue';

export interface WebhookPayload {
    event: string;
    timestamp: string;
    idempotencyKey: string;
    data: any;
}

/**
 * Generates an idempotency key for webhook delivery.
 * This helps receivers deduplicate webhook deliveries.
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}

/**
 * Triggers a webhook event for a specific user.
 * Finds all active webhooks for that user that are subscribed to the event.
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
            jobId: `${webhook.id}-${idempotencyKey}`, // Prevents duplicate jobs
        }
    }));

    await webhookQueue.addBulk(jobs);
}

/**
 * Signs a payload with a secret using HMAC-SHA256.
 */
export function signPayload(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Generates a random secret for a new webhook.
 */
export function generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
}
