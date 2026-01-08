/**
 * Admin Emails Routes
 * Email browser for admin - list, view, delete emails
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminEmailsRoutes(app: FastifyInstance) {
    // List all emails with pagination and filtering
    app.get("/admin/emails", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z.object({
            search: z.string().optional(),
            inboxId: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            limit: z.coerce.number().min(1).max(100).optional(),
            offset: z.coerce.number().min(0).optional(),
        }).safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query" });
        }

        const where: any = { deletedAt: null };

        if (query.data.search) {
            where.OR = [
                { subject: { contains: query.data.search, mode: "insensitive" } },
                { fromAddress: { contains: query.data.search, mode: "insensitive" } },
            ];
        }

        if (query.data.inboxId) {
            where.inboxId = query.data.inboxId;
        }

        if (query.data.startDate) {
            where.receivedAt = { ...where.receivedAt, gte: new Date(query.data.startDate) };
        }

        if (query.data.endDate) {
            where.receivedAt = { ...where.receivedAt, lte: new Date(query.data.endDate) };
        }

        const [emails, total] = await Promise.all([
            prisma.message.findMany({
                where,
                orderBy: { receivedAt: "desc" },
                take: query.data.limit ?? 20,
                skip: query.data.offset ?? 0,
                select: {
                    id: true,
                    subject: true,
                    fromAddress: true,
                    receivedAt: true,
                    isRead: true,
                    inbox: {
                        select: {
                            localPart: true,
                            domain: { select: { name: true } }
                        }
                    }
                }
            }),
            prisma.message.count({ where })
        ]);

        return {
            data: emails.map(e => ({
                ...e,
                toAddress: `${e.inbox.localPart}@${e.inbox.domain.name}`
            })),
            meta: { total, limit: query.data.limit ?? 20, offset: query.data.offset ?? 0 }
        };
    });

    // Get single email details (for admin viewing)
    app.get("/admin/emails/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid email ID" });
        }

        const email = await prisma.message.findUnique({
            where: { id: params.data.id },
            include: {
                inbox: {
                    select: {
                        localPart: true,
                        domain: { select: { name: true } },
                        owner: { select: { email: true } }
                    }
                }
            }
        });

        if (!email) {
            return reply.status(404).send({ error: "Email not found" });
        }

        return { email };
    });

    // Delete email (admin action)
    app.delete("/admin/emails/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid email ID" });
        }

        await prisma.message.update({
            where: { id: params.data.id },
            data: { deletedAt: new Date() }
        });

        await recordAudit((request.user as any).userId, "ADMIN_EMAIL_DELETED", { emailId: params.data.id });

        return { success: true };
    });
}
