/**
 * Email Forwarding Routes
 * Handles forwarding rules management and email verification
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
    sendForwardVerification,
    confirmForwardVerification,
    getVerifiedEmails,
    removeVerifiedEmail,
    createForwardingRule,
    getForwardingRules,
    updateForwardingRule,
    deleteForwardingRule,
} from "../services/emailForwarder";

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
            return reply.status(400).send({ error: "Email không hợp lệ" });
        }

        const result = await sendForwardVerification(user.userId, parsed.data.email);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
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
            return reply.status(400).send({ error: "Dữ liệu không hợp lệ" });
        }

        const result = await confirmForwardVerification(user.userId, parsed.data.email, parsed.data.code);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
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
        const rules = await getForwardingRules(user.userId);
        return { rules };
    });

    // Create forwarding rule
    app.post("/forwarding/rules", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };

        const bodySchema = z.object({
            name: z.string().min(1).max(100),
            inboxId: z.string().optional(),
            conditions: z.object({
                senderDomains: z.array(z.string()).optional(),
                containsOTP: z.boolean().optional(),
                subjectContains: z.string().optional(),
            }).optional().default({}),
            forwardTo: z.string().email(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Dữ liệu không hợp lệ", details: parsed.error.issues });
        }

        const result = await createForwardingRule(user.userId, parsed.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return { success: true, ruleId: result.ruleId };
    });

    // Update forwarding rule
    app.patch("/forwarding/rules/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const bodySchema = z.object({
            name: z.string().min(1).max(100).optional(),
            conditions: z.object({
                senderDomains: z.array(z.string()).optional(),
                containsOTP: z.boolean().optional(),
                subjectContains: z.string().optional(),
            }).optional(),
            forwardTo: z.string().email().optional(),
            isActive: z.boolean().optional(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Dữ liệu không hợp lệ" });
        }

        const result = await updateForwardingRule(user.userId, id, parsed.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return { success: true };
    });

    // Delete forwarding rule
    app.delete("/forwarding/rules/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const result = await deleteForwardingRule(user.userId, id);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return { success: true };
    });
}
