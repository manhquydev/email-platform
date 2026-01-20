/**
 * Email Filter Routes
 * CRUD operations for email filters and labels
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getMatchingFilters, type EmailData } from '../services/emailFilters';
import { createTierEnforceHandler } from '../services/tier-enforcement.service';

// Validation schemas
const createFilterSchema = z.object({
    inboxId: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    matchType: z.enum(['ALL', 'ANY']).default('ALL'),
    conditions: z.array(z.object({
        field: z.enum(['FROM', 'TO', 'SUBJECT', 'BODY', 'HAS_ATTACHMENT']),
        operator: z.enum(['CONTAINS', 'NOT_CONTAINS', 'EQUALS', 'NOT_EQUALS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX']),
        value: z.string(),
    })),
    actions: z.array(z.object({
        type: z.enum(['MOVE_TO_FOLDER', 'ADD_LABEL', 'REMOVE_LABEL', 'MARK_READ', 'MARK_SPAM', 'DELETE', 'FORWARD']),
        value: z.string().optional(),
    })),
    priority: z.number().int().default(0),
    isEnabled: z.boolean().default(true),
});

const updateFilterSchema = createFilterSchema.partial().omit({ inboxId: true });

const createLabelSchema = z.object({
    inboxId: z.string().uuid(),
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    parentId: z.string().uuid().optional(),
});

const updateLabelSchema = createLabelSchema.partial().omit({ inboxId: true });

export const filterRoutes: FastifyPluginAsync = async (app) => {
    // ==================
    // EMAIL FILTERS
    // ==================

    // List filters for an inbox
    app.get('/inboxes/:inboxId/filters', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { inboxId } = req.params as { inboxId: string };
        const user = req.user as { userId: string };

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: inboxId, domain: { ownerId: user.userId }, deletedAt: null },
        });

        if (!inbox) {
            return reply.status(404).send({ error: 'Inbox not found' });
        }

        const filters = await prisma.emailFilter.findMany({
            where: { inboxId },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        });

        return { filters };
    });

    // Create a filter
    app.post('/filters', { preHandler: [app.authenticate, createTierEnforceHandler('filters')] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { userId: string };
        const parsed = createFilterSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }
        const body = parsed.data;

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: body.inboxId, domain: { ownerId: user.userId }, deletedAt: null },
        });

        if (!inbox) {
            return reply.status(404).send({ error: 'Inbox not found' });
        }

        const filter = await prisma.emailFilter.create({
            data: {
                inboxId: body.inboxId,
                name: body.name,
                description: body.description,
                matchType: body.matchType,
                conditions: body.conditions,
                actions: body.actions,
                priority: body.priority,
                isEnabled: body.isEnabled,
            },
        });

        return reply.status(201).send(filter);
    });

    // Update a filter
    app.patch('/filters/:id', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const user = req.user as { userId: string };
        const parsed = updateFilterSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }
        const body = parsed.data;

        // Verify filter ownership
        const filter = await prisma.emailFilter.findFirst({
            where: { id, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!filter) {
            return reply.status(404).send({ error: 'Filter not found' });
        }

        const updated = await prisma.emailFilter.update({
            where: { id },
            data: body,
        });

        return updated;
    });

    // Delete a filter
    app.delete('/filters/:id', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const user = req.user as { userId: string };

        // Verify filter ownership
        const filter = await prisma.emailFilter.findFirst({
            where: { id, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!filter) {
            return reply.status(404).send({ error: 'Filter not found' });
        }

        await prisma.emailFilter.delete({ where: { id } });

        return { success: true };
    });

    // Test a filter with sample email data
    const testFilterSchema = z.object({
        fromAddress: z.string().optional(),
        toAddress: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        hasAttachment: z.boolean().default(false),
    });

    app.post('/filters/:id/test', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const user = req.user as { userId: string };

        // Verify filter ownership
        const filter = await prisma.emailFilter.findFirst({
            where: { id, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!filter) {
            return reply.status(404).send({ error: 'Filter not found' });
        }

        const parsed = testFilterSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }

        const testEmail: EmailData = {
            fromAddress: parsed.data.fromAddress ?? null,
            toAddress: parsed.data.toAddress ?? null,
            subject: parsed.data.subject ?? null,
            textBody: parsed.data.body ?? null,
            htmlBody: null,
            hasAttachment: parsed.data.hasAttachment,
        };

        const matchingFilters = await getMatchingFilters(filter.inboxId, testEmail);
        const thisFilterMatches = matchingFilters.some(f => f.id === id);

        return {
            matches: thisFilterMatches,
            filter: {
                id: filter.id,
                name: filter.name,
                conditions: filter.conditions,
                actions: filter.actions,
            },
            testData: testEmail,
            allMatchingFilters: matchingFilters.map(f => ({ id: f.id, name: f.name })),
        };
    });

    // Test all filters for an inbox with sample email
    app.post('/inboxes/:inboxId/filters/test', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { inboxId } = req.params as { inboxId: string };
        const user = req.user as { userId: string };

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: inboxId, domain: { ownerId: user.userId }, deletedAt: null },
        });

        if (!inbox) {
            return reply.status(404).send({ error: 'Inbox not found' });
        }

        const parsed = testFilterSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }

        const testEmail: EmailData = {
            fromAddress: parsed.data.fromAddress ?? null,
            toAddress: parsed.data.toAddress ?? null,
            subject: parsed.data.subject ?? null,
            textBody: parsed.data.body ?? null,
            htmlBody: null,
            hasAttachment: parsed.data.hasAttachment,
        };

        const matchingFilters = await getMatchingFilters(inboxId, testEmail);

        return {
            matchCount: matchingFilters.length,
            matchingFilters: matchingFilters.map(f => ({
                id: f.id,
                name: f.name,
                actions: f.actions,
            })),
            testData: testEmail,
        };
    });

    // ==================
    // LABELS
    // ==================

    // List labels for an inbox
    app.get('/inboxes/:inboxId/labels', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { inboxId } = req.params as { inboxId: string };
        const user = req.user as { userId: string };

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: inboxId, domain: { ownerId: user.userId }, deletedAt: null },
        });

        if (!inbox) {
            return reply.status(404).send({ error: 'Inbox not found' });
        }

        const labels = await prisma.label.findMany({
            where: { inboxId },
            include: {
                _count: { select: { messages: true } },
                children: true,
            },
            orderBy: { name: 'asc' },
        });

        return { labels };
    });

    // Create a label
    app.post('/labels', { preHandler: [app.authenticate, createTierEnforceHandler('labels')] }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { userId: string };
        const parsed = createLabelSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }
        const body = parsed.data;

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: body.inboxId, domain: { ownerId: user.userId }, deletedAt: null },
        });

        if (!inbox) {
            return reply.status(404).send({ error: 'Inbox not found' });
        }

        // Check for duplicate name
        const existing = await prisma.label.findFirst({
            where: { inboxId: body.inboxId, name: body.name },
        });

        if (existing) {
            return reply.status(409).send({ error: 'Label already exists' });
        }

        const label = await prisma.label.create({
            data: {
                inboxId: body.inboxId,
                name: body.name,
                color: body.color,
                parentId: body.parentId,
            },
        });

        return reply.status(201).send(label);
    });

    // Update a label
    app.patch('/labels/:id', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const user = req.user as { userId: string };
        const parsed = updateLabelSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
        }
        const body = parsed.data;

        // Verify label ownership
        const label = await prisma.label.findFirst({
            where: { id, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!label) {
            return reply.status(404).send({ error: 'Label not found' });
        }

        const updated = await prisma.label.update({
            where: { id },
            data: body,
        });

        return updated;
    });

    // Delete a label
    app.delete('/labels/:id', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const user = req.user as { userId: string };

        // Verify label ownership
        const label = await prisma.label.findFirst({
            where: { id, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!label) {
            return reply.status(404).send({ error: 'Label not found' });
        }

        await prisma.label.delete({ where: { id } });

        return { success: true };
    });

    // ==================
    // MESSAGE LABELS
    // ==================

    // Add label to message
    app.post('/messages/:messageId/labels/:labelId', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { messageId, labelId } = req.params as { messageId: string; labelId: string };
        const user = req.user as { userId: string };

        // Verify message ownership
        const message = await prisma.message.findFirst({
            where: { id: messageId, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!message) {
            return reply.status(404).send({ error: 'Message not found' });
        }

        // Verify label exists and belongs to same inbox
        const label = await prisma.label.findFirst({
            where: { id: labelId, inboxId: message.inboxId },
        });

        if (!label) {
            return reply.status(404).send({ error: 'Label not found' });
        }

        const messageLabel = await prisma.messageLabel.upsert({
            where: { messageId_labelId: { messageId, labelId } },
            create: { messageId, labelId },
            update: {},
        });

        return reply.status(201).send(messageLabel);
    });

    // Remove label from message
    app.delete('/messages/:messageId/labels/:labelId', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { messageId, labelId } = req.params as { messageId: string; labelId: string };
        const user = req.user as { userId: string };

        // Verify message ownership
        const message = await prisma.message.findFirst({
            where: { id: messageId, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!message) {
            return reply.status(404).send({ error: 'Message not found' });
        }

        await prisma.messageLabel.deleteMany({
            where: { messageId, labelId },
        });

        return { success: true };
    });

    // Get messages by label
    app.get('/labels/:labelId/messages', { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { labelId } = req.params as { labelId: string };
        const user = req.user as { userId: string };
        const { limit = '50', offset = '0' } = req.query as { limit?: string; offset?: string };

        // Verify label ownership
        const label = await prisma.label.findFirst({
            where: { id: labelId, inbox: { domain: { ownerId: user.userId } } },
        });

        if (!label) {
            return reply.status(404).send({ error: 'Label not found' });
        }

        const messages = await prisma.message.findMany({
            where: {
                labels: { some: { labelId } },
                deletedAt: null,
            },
            include: {
                attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            },
            orderBy: { receivedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        return { messages };
    });
};
