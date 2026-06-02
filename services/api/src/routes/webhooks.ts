import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateWebhookSecret, triggerWebhook, getAvailableEvents, WEBHOOK_EVENTS, signPayload } from '../services/webhookService';
import { createTierEnforceHandler } from '../services/tier-enforcement.service';
import { validateWebhookUrl } from '../utils/input-sanitizer';
import { encryptField } from '../utils/field-encryptor';
import crypto from 'crypto';
import { sharedErrorResponseSchema } from '../plugins/swagger';

const webhooksErrorResponseSchema = {
    ...sharedErrorResponseSchema,
};

const webhookEntitySchema = {
    type: "object",
    additionalProperties: true,
};

const webhookActionSuccessSchema = {
    type: "object",
    properties: {
        success: { type: "boolean" },
        message: { type: "string" },
    },
    required: ["success"],
};

const webhookLogEntitySchema = {
    type: "object",
    additionalProperties: true,
};

const webhookLogsListSchema = {
    type: "array",
    items: webhookLogEntitySchema,
};

export async function webhookRoutes(app: FastifyInstance) {
    // List available webhook events
    app.get('/webhooks/events', {
        schema: {
            tags: ["webhooks"],
            summary: "List available webhook events",
            response: {
                200: {
                    type: "object",
                    properties: {
                        events: { type: "array", items: { type: "string" } },
                    },
                    required: ["events"],
                },
                500: webhooksErrorResponseSchema,
            },
        },
    }, async () => {
        return {
            events: getAvailableEvents(),
        };
    });

    // Verify webhook signature (utility endpoint)
    app.post('/webhooks/verify-signature', {
        schema: {
            tags: ["webhooks"],
            summary: "Verify webhook signature",
            body: {
                type: "object",
                required: ["payload", "signature", "secret"],
                properties: {
                    payload: { type: "string" },
                    signature: { type: "string" },
                    secret: { type: "string" },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        valid: { type: "boolean" },
                    },
                    required: ["valid"],
                },
                400: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
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
        const actualBuffer = Buffer.from(signature, 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

        if (actualBuffer.length !== expectedBuffer.length) {
            return reply.status(400).send({ error: 'Invalid signature format' });
        }

        const isValid = crypto.timingSafeEqual(
            actualBuffer,
            expectedBuffer
        );

        return { valid: isValid };
    });

    // List all webhooks for the user
    app.get('/webhooks', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "List user webhooks",
            response: {
                200: { type: "array", items: webhookEntitySchema },
                401: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request) => {
        const user = request.user as { userId: string };
        const webhooks = await prisma.webhook.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' }
        });
        // The signing secret is stored encrypted and only revealed once at creation —
        // never echo it back on listing.
        return webhooks.map(({ secret, ...rest }) => rest);
    });

    // Create a new webhook
    app.post('/webhooks', {
        preHandler: [app.authenticate, createTierEnforceHandler('webhooks')],
        schema: {
            tags: ["webhooks"],
            summary: "Create webhook",
            body: {
                type: "object",
                required: ["name", "url"],
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 100 },
                    url: { type: "string", format: "uri" },
                    events: { type: "array", items: { type: "string" } },
                },
            },
            response: {
                201: webhookEntitySchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                403: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };

        const bodySchema = z.object({
            name: z.string().min(1).max(100),
            url: z.string().url(),
            events: z.array(z.string()).default(['email.received']),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: parsed.error.format() });
        }

        // SSRF Protection: Enhanced validation using input-sanitizer
        const urlValidation = validateWebhookUrl(parsed.data.url);
        if (!urlValidation.valid) {
            return reply.status(400).send({ error: `Invalid webhook URL: ${urlValidation.reason}` });
        }

        // Store the signing secret encrypted at rest; return the plaintext to the caller
        // exactly once here so they can configure their receiver.
        const plainSecret = generateWebhookSecret();
        const webhook = await prisma.webhook.create({
            data: {
                userId: user.userId,
                name: parsed.data.name,
                url: parsed.data.url,
                events: parsed.data.events,
                secret: encryptField(plainSecret),
            }
        });

        return reply.status(201).send({ ...webhook, secret: plainSecret });
    });

    // Delete a webhook
    app.delete('/webhooks/:id', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "Delete webhook",
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string", format: "uuid" },
                },
            },
            response: {
                200: webhookActionSuccessSchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                404: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const webhook = await prisma.webhook.findFirst({
            where: { id, userId: user.userId }
        });

        if (!webhook) {
            return reply.status(404).send({ error: 'Webhook not found' });
        }

        await prisma.webhook.delete({
            where: { id }
        });

        return reply.status(200).send({ success: true });
    });

    // Update a webhook
    app.put('/webhooks/:id', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "Update webhook",
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string", format: "uuid" },
                },
            },
            body: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 100 },
                    url: { type: "string", format: "uri" },
                    events: { type: "array", items: { type: "string" } },
                    isActive: { type: "boolean" },
                },
            },
            response: {
                200: webhookEntitySchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                404: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const updateSchema = z.object({
            name: z.string().min(1).max(100).optional(),
            url: z.string().url().optional(),
            events: z.array(z.string()).optional(),
            isActive: z.boolean().optional(),
        });

        const parsed = updateSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }

        // SSRF Protection: Enhanced validation using input-sanitizer
        if (parsed.data.url) {
            const urlValidation = validateWebhookUrl(parsed.data.url);
            if (!urlValidation.valid) {
                return reply.status(400).send({ error: `Invalid webhook URL: ${urlValidation.reason}` });
            }
        }

        const webhook = await prisma.webhook.findFirst({
            where: { id, userId: user.userId }
        });

        if (!webhook) {
            return reply.status(404).send({ error: 'Webhook not found' });
        }

        const updated = await prisma.webhook.update({
            where: { id },
            data: parsed.data
        });

        // Do not leak the stored signing secret on update responses.
        const { secret, ...safe } = updated;
        return safe;
    });

    // Get logs for a webhook
    app.get('/webhooks/:id/logs', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "Get webhook delivery logs",
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string", format: "uuid" },
                },
            },
            response: {
                200: webhookLogsListSchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                404: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const webhook = await prisma.webhook.findFirst({
            where: { id, userId: user.userId }
        });

        if (!webhook) {
            return reply.status(404).send({ error: 'Webhook not found' });
        }

        const logs = await prisma.webhookLog.findMany({
            where: { webhookId: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return logs;
    });

    // Test a webhook
    app.post('/webhooks/:id/test', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "Queue webhook test event",
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string", format: "uuid" },
                },
            },
            response: {
                200: webhookActionSuccessSchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                404: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const webhook = await prisma.webhook.findFirst({
            where: { id, userId: user.userId }
        });

        if (!webhook) {
            return reply.status(404).send({ error: 'Webhook not found' });
        }

        await triggerWebhook(user.userId, 'test.event', {
            message: 'This is a test webhook payload',
            testId: Math.random().toString(36).substring(7)
        });

        return { success: true, message: 'Test webhook queued' };
    });

    // Retry a failed webhook log
    app.post('/webhooks/:id/logs/:logId/retry', {
        preHandler: app.authenticate,
        schema: {
            tags: ["webhooks"],
            summary: "Retry a failed webhook delivery",
            params: {
                type: "object",
                required: ["id", "logId"],
                properties: {
                    id: { type: "string", format: "uuid" },
                    logId: { type: "string", format: "uuid" },
                },
            },
            response: {
                200: webhookActionSuccessSchema,
                400: webhooksErrorResponseSchema,
                401: webhooksErrorResponseSchema,
                404: webhooksErrorResponseSchema,
                500: webhooksErrorResponseSchema,
            },
        },
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id, logId } = request.params as { id: string; logId: string };

        const webhook = await prisma.webhook.findFirst({
            where: { id, userId: user.userId }
        });

        if (!webhook) {
            return reply.status(404).send({ error: 'Webhook not found' });
        }

        const log = await prisma.webhookLog.findFirst({
            where: { id: logId, webhookId: id }
        });

        if (!log) {
            return reply.status(404).send({ error: 'Log not found' });
        }

        // Re-trigger the webhook with the same payload
        await triggerWebhook(user.userId, log.eventType, log.payload);

        return { success: true, message: 'Webhook retry queued' };
    });
}
