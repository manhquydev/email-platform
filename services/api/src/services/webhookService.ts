/**
 * Enhanced Webhook Service
 * Handles webhook notifications with structured payloads and OTP support
 */

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
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
    // Email events
    'email.received': 'Triggered when a new email arrives',
    'email.read': 'Triggered when an email is marked as read',
    'email.deleted': 'Triggered when an email is deleted',
    'email.forwarded': 'Triggered when an email is forwarded',

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

/**
 * Get available webhook events
 */
export function getAvailableEvents() {
    return Object.entries(WEBHOOK_EVENTS).map(([key, description]) => ({
        event: key,
        description,
        default: DEFAULT_EVENTS.includes(key as WebhookEventType),
    }));
}
