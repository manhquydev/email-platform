/**
 * Admin Payments Routes
 * Orders listing, refunds, subscription cancellation
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";
import { StripeService } from "../../services/stripe.service";

export async function adminPaymentsRoutes(app: FastifyInstance) {
    // List Orders / Payments
    app.get("/admin/orders", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z.object({
            search: z.string().optional(),
            limit: z.coerce.number().min(1).max(100).optional(),
            offset: z.coerce.number().min(0).optional(),
        }).safeParse(request.query);

        if (!query.success) return reply.status(400).send({ error: "Invalid query" });

        const where: any = {};
        if (query.data.search) {
            where.user = {
                email: { contains: query.data.search, mode: "insensitive" }
            };
        }

        const [orders, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: { user: { select: { email: true } } },
                orderBy: { createdAt: "desc" },
                take: query.data.limit ?? 20,
                skip: query.data.offset ?? 0,
            }),
            prisma.payment.count({ where })
        ]);

        return { data: orders, meta: { total } };
    });

    // Refund Payment
    app.post("/admin/payments/:id/refund", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        if (!params.success) return reply.status(400).send({ error: "Invalid payment ID" });

        try {
            await StripeService.refundPayment(params.data.id);
            await recordAudit((request.user as any).userId, "ADMIN_PAYMENT_REFUNDED", { paymentId: params.data.id });
            return { success: true };
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    // Cancel Subscription
    app.post("/admin/users/:id/subscription/cancel", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        if (!params.success) return reply.status(400).send({ error: "Invalid user ID" });

        try {
            await StripeService.cancelSubscription(params.data.id);
            await recordAudit((request.user as any).userId, "ADMIN_SUBSCRIPTION_CANCELLED", { targetUserId: params.data.id });
            return { success: true };
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });
}
