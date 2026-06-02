/**
 * Email Forwarding Routes
 * Handles forwarding rules management and email verification
 * Enhanced with multi-destination support (Email, Telegram, Discord, Webhook)
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
    sendForwardVerification,
    confirmForwardVerification,
    getVerifiedEmails,
    removeVerifiedEmail,
} from "../services/emailForwarder";
import { getForwardingStats } from "../services/forwarding";
import { createTierEnforceHandler } from "../services/tier-enforcement.service";
import { sendApiError } from "../utils/errorHandler";
import { encryptField } from "../utils/field-encryptor";
import { validateWebhookUrl } from "../utils/input-sanitizer";

// Schema for conditions
const conditionSchema = z.object({
    id: z.string().optional(),
    field: z.enum(['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER', 'HAS_ATTACHMENT']),
    operator: z.enum(['EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'CONTAINS_OTP', 'EXISTS']),
    value: z.string().nullable(),
    headerName: z.string().optional(),
    caseSensitive: z.boolean().optional(),
});

// Schema for creating/updating rules
const ruleBodySchema = z.object({
    name: z.string().min(1).max(100),
    inboxId: z.string().nullable().optional(),
    destinationType: z.enum(['EMAIL', 'TELEGRAM', 'DISCORD', 'WEBHOOK']).default('EMAIL'),
    forwardTo: z.string().email().nullable().optional(),
    telegramChatId: z.string().nullable().optional(),
    discordWebhookUrl: z.string().url().nullable().optional(),
    webhookUrl: z.string().url().nullable().optional(),
    webhookSecret: z.string().nullable().optional(),
    conditions: z.array(conditionSchema).default([]),
    matchType: z.enum(['ALL', 'ANY']).default('ALL'),
    priority: z.number().min(0).max(100).default(50),
    isActive: z.boolean().default(true),
});

export async function forwardingRoutes(app: FastifyInstance) {
    // Get verified forward emails
    app.get("/forwarding/emails", { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        const emails = await getVerifiedEmails(user.userId);
        return { emails };
    });

    // Send verification to forward email
    app.post("/forwarding/verify-email", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };

        const bodySchema = z.object({
            email: z.string().email(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Email không hợp lệ", { code: "BAD_REQUEST" });
        }

        const result = await sendForwardVerification(user.userId, parsed.data.email);
        if (!result.success) {
            return sendApiError(reply, 400, result.error ?? "Verification email could not be sent", { code: "BAD_REQUEST" });
        }

        return { success: true, message: "Mã xác minh đã được gửi" };
    });

    // Confirm forward email verification
    app.post("/forwarding/confirm-email", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };

        const bodySchema = z.object({
            email: z.string().email(),
            code: z.string().length(6),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Dữ liệu không hợp lệ", { code: "BAD_REQUEST" });
        }

        const result = await confirmForwardVerification(user.userId, parsed.data.email, parsed.data.code);
        if (!result.success) {
            return sendApiError(reply, 400, result.error ?? "Verification code is invalid", { code: "BAD_REQUEST" });
        }

        return { success: true, message: "Email đã được xác minh" };
    });

    // Remove verified email
    app.delete("/forwarding/emails/:email", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { email } = request.params as { email: string };

        await removeVerifiedEmail(user.userId, email);
        return { success: true };
    });

    // Get forwarding rules
    app.get("/forwarding/rules", { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        const rules = await prisma.forwardingRule.findMany({
            where: { userId: user.userId },
            orderBy: { priority: 'desc' },
            include: {
                inbox: {
                    select: { id: true, localPart: true, domain: { select: { name: true } } }
                },
                _count: { select: { logs: true } }
            }
        });
        // Webhook signing secrets are stored encrypted and must not be echoed to clients.
        return { rules: rules.map(({ webhookSecret, ...rest }) => rest) };
    });

    // Create forwarding rule (enhanced)
    app.post("/forwarding/rules", { preHandler: [app.authenticate, createTierEnforceHandler('forwardingRules')] }, async (request, reply) => {
        const user = request.user as { userId: string };

        const parsed = ruleBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid data", { code: "BAD_REQUEST", details: parsed.error.issues });
        }

        const data = parsed.data;

        // Validate destination based on type
        if (data.destinationType === 'EMAIL' && !data.forwardTo) {
            return sendApiError(reply, 400, "Email destination required", { code: "BAD_REQUEST" });
        }
        if (data.destinationType === 'TELEGRAM' && !data.telegramChatId) {
            return sendApiError(reply, 400, "Telegram chat ID required", { code: "BAD_REQUEST" });
        }
        if (data.destinationType === 'DISCORD' && !data.discordWebhookUrl) {
            return sendApiError(reply, 400, "Discord webhook URL required", { code: "BAD_REQUEST" });
        }
        if (data.destinationType === 'WEBHOOK' && !data.webhookUrl) {
            return sendApiError(reply, 400, "Webhook URL required", { code: "BAD_REQUEST" });
        }

        // Verify inbox ownership if specified
        if (data.inboxId) {
            const inbox = await prisma.inbox.findFirst({
                where: { id: data.inboxId, ownerId: user.userId }
            });
            if (!inbox) {
                return sendApiError(reply, 400, "Inbox not found or not owned", { code: "BAD_REQUEST" });
            }
        }

        // Block SSRF at rule-creation time as well as at delivery time (defense in depth).
        if (data.destinationType === 'WEBHOOK' && data.webhookUrl) {
            const urlCheck = validateWebhookUrl(data.webhookUrl);
            if (!urlCheck.valid) {
                return sendApiError(reply, 400, `Invalid webhook URL: ${urlCheck.reason}`, { code: "BAD_REQUEST" });
            }
        }

        const rule = await prisma.forwardingRule.create({
            data: {
                userId: user.userId,
                name: data.name,
                inboxId: data.inboxId || null,
                destinationType: data.destinationType,
                forwardTo: data.forwardTo || null,
                telegramChatId: data.telegramChatId || null,
                discordWebhookUrl: data.discordWebhookUrl || null,
                webhookUrl: data.webhookUrl || null,
                webhookSecret: data.webhookSecret ? encryptField(data.webhookSecret) : null,
                conditions: data.conditions,
                matchType: data.matchType,
                priority: data.priority,
                isActive: data.isActive,
            }
        });

        return { success: true, ruleId: rule.id };
    });

    // Update forwarding rule (enhanced)
    app.patch("/forwarding/rules/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const updateSchema = ruleBodySchema.partial();
        const parsed = updateSchema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid data", { code: "BAD_REQUEST" });
        }

        if (parsed.data.webhookUrl) {
            const urlCheck = validateWebhookUrl(parsed.data.webhookUrl);
            if (!urlCheck.valid) {
                return sendApiError(reply, 400, `Invalid webhook URL: ${urlCheck.reason}`, { code: "BAD_REQUEST" });
            }
        }

        const rule = await prisma.forwardingRule.findFirst({
            where: { id, userId: user.userId }
        });

        if (!rule) {
            return sendApiError(reply, 404, "Rule not found", { code: "NOT_FOUND" });
        }

        // Encrypt an updated webhook secret at rest, matching the create path.
        const updateData = { ...parsed.data };
        if (updateData.webhookSecret) {
            updateData.webhookSecret = encryptField(updateData.webhookSecret);
        }

        await prisma.forwardingRule.update({
            where: { id },
            data: updateData
        });

        return { success: true };
    });

    // Delete forwarding rule
    app.delete("/forwarding/rules/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const rule = await prisma.forwardingRule.findFirst({
            where: { id, userId: user.userId }
        });

        if (!rule) {
            return sendApiError(reply, 404, "Rule not found", { code: "NOT_FOUND" });
        }

        await prisma.forwardingRule.delete({ where: { id } });
        return { success: true };
    });

    // Get forwarding logs for a rule
    app.get("/forwarding/rules/:id/logs", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const rule = await prisma.forwardingRule.findFirst({
            where: { id, userId: user.userId }
        });

        if (!rule) {
            return sendApiError(reply, 404, "Rule not found", { code: "NOT_FOUND" });
        }

        const logs = await prisma.forwardingLog.findMany({
            where: { ruleId: id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return { logs };
    });

    // Get forwarding stats for user
    app.get("/forwarding/stats", { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        return await getForwardingStats(user.userId);
    });

    // Test a forwarding rule
    app.post("/forwarding/rules/:id/test", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const rule = await prisma.forwardingRule.findFirst({
            where: { id, userId: user.userId }
        });

        if (!rule) {
            return sendApiError(reply, 404, "Rule not found", { code: "NOT_FOUND" });
        }

        // Create test message data (not persisted)
        const testData = {
            id: `test-${Date.now()}`,
            fromAddress: "test@example.com",
            toAddress: "you@domain.com",
            subject: "Test Forwarding - OTP: 123456",
            textBody: "This is a test message. Your verification code is 123456.",
            receivedAt: new Date(),
        };

        return {
            success: true,
            message: "Test mode - rule configuration validated",
            testData,
            ruleConfig: {
                destinationType: rule.destinationType,
                matchType: rule.matchType,
                conditionsCount: Array.isArray(rule.conditions) ? rule.conditions.length : 0,
            }
        };
    });
}
