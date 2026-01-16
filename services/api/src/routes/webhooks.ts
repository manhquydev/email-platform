import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateWebhookSecret, triggerWebhook, getAvailableEvents, WEBHOOK_EVENTS, signPayload } from '../services/webhookService';
import crypto from 'crypto';

// SSRF Protection: Block internal network URLs
const isInternalUrl = (urlString: string): boolean => {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname.toLowerCase();

        // Block localhost and loopback
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            return true;
        }

        // Block private IP ranges
        const ipv4Parts = hostname.split('.');
        if (ipv4Parts.length === 4) {
            const first = parseInt(ipv4Parts[0], 10);
            const second = parseInt(ipv4Parts[1], 10);

            // 10.x.x.x
            if (first === 10) return true;
            // 172.16.x.x - 172.31.x.x
            if (first === 172 && second >= 16 && second <= 31) return true;
            // 192.168.x.x
            if (first === 192 && second === 168) return true;
            // 169.254.x.x (link-local)
            if (first === 169 && second === 254) return true;
        }

        // Block internal docker/kubernetes hostnames
        if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.svc.cluster.local')) {
            return true;
        }

        return false;
    } catch {
        return true; // Block invalid URLs
    }
};

export async function webhookRoutes(app: FastifyInstance) {
    // List available webhook events
    app.get('/webhooks/events', async () => {
        return {
            events: getAvailableEvents(),
        };
    });

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

    // List all webhooks for the user
    app.get('/webhooks', { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        const webhooks = await prisma.webhook.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' }
        });
        return webhooks;
    });

    // Create a new webhook
    app.post('/webhooks', { preHandler: app.authenticate }, async (request, reply) => {
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

        // SSRF Protection: Block internal network URLs
        if (isInternalUrl(parsed.data.url)) {
            return reply.status(400).send({ error: 'Webhook URL cannot point to internal networks' });
        }

        const webhook = await prisma.webhook.create({
            data: {
                userId: user.userId,
                name: parsed.data.name,
                url: parsed.data.url,
                events: parsed.data.events,
                secret: generateWebhookSecret(),
            }
        });

        return reply.status(201).send(webhook);
    });

    // Delete a webhook
    app.delete('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {
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
    app.put('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {
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

        // SSRF Protection: Block internal network URLs
        if (parsed.data.url && isInternalUrl(parsed.data.url)) {
            return reply.status(400).send({ error: 'Webhook URL cannot point to internal networks' });
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

        return updated;
    });

    // Get logs for a webhook
    app.get('/webhooks/:id/logs', { preHandler: app.authenticate }, async (request, reply) => {
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
    app.post('/webhooks/:id/test', { preHandler: app.authenticate }, async (request, reply) => {
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
    app.post('/webhooks/:id/logs/:logId/retry', { preHandler: app.authenticate }, async (request, reply) => {
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
