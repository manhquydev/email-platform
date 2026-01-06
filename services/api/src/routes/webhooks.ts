import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateWebhookSecret, triggerWebhook } from '../services/webhookService';

export async function webhookRoutes(app: FastifyInstance) {
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

// Update a webhook    app.put('/webhooks/:id', { preHandler: app.authenticate }, async (request, reply) => {        const user = request.user as { userId: string };        const { id } = request.params as { id: string };        const updateSchema = z.object({            name: z.string().min(1).max(100).optional(),            url: z.string().url().optional(),            events: z.array(z.string()).optional(),            isActive: z.boolean().optional(),        });        const parsed = updateSchema.safeParse(request.body);        if (!parsed.success) {            return reply.status(400).send({ error: 'Invalid

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
}
