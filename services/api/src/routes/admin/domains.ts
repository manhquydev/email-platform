/**
 * Admin Domains Routes
 * Domain listing, bulk operations, and contribution review
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminDomainsRoutes(app: FastifyInstance) {
    // List Domains for Admin (with approval filter)
    app.get("/admin/domains", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z.object({
            status: z.enum(["PENDING", "VERIFIED"]).optional(),
            contributionStatus: z.enum(["NONE", "PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
            limit: z.coerce.number().min(1).max(100).optional(),
            offset: z.coerce.number().min(0).optional(),
        }).safeParse(request.query);

        if (!query.success) return reply.status(400).send({ error: "Invalid query" });

        const where: any = {};
        if (query.data.status) where.status = query.data.status;
        if (query.data.contributionStatus) where.contributionStatus = query.data.contributionStatus;

        const [domains, total] = await Promise.all([
            prisma.domain.findMany({
                where,
                include: { owner: { select: { email: true } } },
                orderBy: { createdAt: "desc" },
                take: query.data.limit ?? 20,
                skip: query.data.offset ?? 0,
            }),
            prisma.domain.count({ where })
        ]);

        return { data: domains, meta: { total } };
    });

    // Review contributed domain
    app.post("/admin/domains/:id/review", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
        const body = z.object({
            status: z.enum(["APPROVED", "REJECTED"]),
            note: z.string().max(500).optional(),
        }).safeParse(request.body);

        if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid payload" });

        const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
        if (!domain) return reply.status(404).send({ error: "Domain not found" });

        const updated = await prisma.domain.update({
            where: { id: params.data.id },
            data: {
                contributionStatus: body.data.status,
                isPublic: body.data.status === "APPROVED",
                sharedAt: body.data.status === "APPROVED" ? new Date() : null,
            }
        });

        await recordAudit((request.user as any).userId, "DOMAIN_REVIEWED", {
            domainId: params.data.id,
            status: body.data.status,
            note: body.data.note
        });

        return { domain: updated };
    });

    // Bulk operations on domains
    app.post("/admin/domains/bulk", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            domainIds: z.array(z.string()).min(1).max(100),
            action: z.enum(["verify", "make_public", "make_private", "delete"]),
        }).safeParse(request.body);

        if (!body.success) {
            return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
        }

        const adminId = (request.user as any)?.userId;
        const { domainIds, action } = body.data;

        let affected = 0;

        if (action === "verify") {
            const result = await prisma.domain.updateMany({
                where: { id: { in: domainIds }, status: { not: "VERIFIED" } },
                data: { status: "VERIFIED" }
            });
            affected = result.count;
        } else if (action === "make_public") {
            const result = await prisma.domain.updateMany({
                where: { id: { in: domainIds } },
                data: { isPublic: true }
            });
            affected = result.count;
        } else if (action === "make_private") {
            const result = await prisma.domain.updateMany({
                where: { id: { in: domainIds } },
                data: { isPublic: false }
            });
            affected = result.count;
        } else if (action === "delete") {
            for (const domainId of domainIds) {
                try {
                    await prisma.$transaction(async (tx) => {
                        await tx.message.deleteMany({ where: { inbox: { domainId } } });
                        await tx.inbox.deleteMany({ where: { domainId } });
                        await tx.domain.delete({ where: { id: domainId } });
                    });
                    affected++;
                } catch {
                    // Skip if domain not found
                }
            }
        }

        await recordAudit(adminId ?? null, "BULK_DOMAIN_ACTION", {
            action,
            requestedCount: domainIds.length,
            affectedCount: affected
        });

        return { success: true, affected };
    });
}
