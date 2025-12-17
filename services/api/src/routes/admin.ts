import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";
import { UserRole } from "@prisma/client";

export async function adminRoutes(app: FastifyInstance) {
    // Dashboard Statistics
    app.get("/admin/stats", { preHandler: app.requireAdmin }, async () => {
        const [
            totalUsers,
            totalDomains,
            verifiedDomains,
            totalInboxes,
            totalMessages,
            totalRules,
            openReports
        ] = await Promise.all([
            prisma.user.count(),
            prisma.domain.count(),
            prisma.domain.count({ where: { status: "VERIFIED" } }),
            prisma.inbox.count({ where: { deletedAt: null } }),
            prisma.message.count({ where: { deletedAt: null } }),
            prisma.rule.count(),
            prisma.abuseReport.count({ where: { status: "OPEN" } })
        ]);

        return {
            stats: {
                totalUsers,
                totalDomains,
                verifiedDomains,
                totalInboxes,
                totalMessages,
                totalRules,
                openReports
            }
        };
    });

    // Time-series stats for dashboard charts (last 7 days)
    app.get("/admin/stats/timeseries", { preHandler: app.requireAdmin }, async (request, reply) => {
        try {
            const days = 7;
            const now = new Date();
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            // Get daily counts using raw queries for efficiency
            const dailyMessages = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
                SELECT DATE("receivedAt") as date, COUNT(*) as count
                FROM "Message"
                WHERE "receivedAt" >= ${startDate}
                AND "deletedAt" IS NULL
                GROUP BY DATE("receivedAt")
                ORDER BY date ASC
            `;

            const dailyUsers = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
                SELECT DATE("createdAt") as date, COUNT(*) as count
                FROM "User"
                WHERE "createdAt" >= ${startDate}
                GROUP BY DATE("createdAt")
                ORDER BY date ASC
            `;

            const dailyInboxes = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
                SELECT DATE("createdAt") as date, COUNT(*) as count
                FROM "Inbox"
                WHERE "createdAt" >= ${startDate}
                AND "deletedAt" IS NULL
                GROUP BY DATE("createdAt")
                ORDER BY date ASC
            `;

            // Build complete date range with 0s for missing days
            const result = [];
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split("T")[0];

                const messages = dailyMessages.find(d => {
                    const dStr = d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0];
                    return dStr === dateStr;
                });
                const users = dailyUsers.find(d => {
                    const dStr = d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0];
                    return dStr === dateStr;
                });
                const inboxes = dailyInboxes.find(d => {
                    const dStr = d.date instanceof Date ? d.date.toISOString().split("T")[0] : String(d.date).split("T")[0];
                    return dStr === dateStr;
                });

                result.push({
                    date: dateStr,
                    emails: Number(messages?.count ?? 0),
                    users: Number(users?.count ?? 0),
                    inboxes: Number(inboxes?.count ?? 0),
                });
            }

            return { data: result };
        } catch (error) {
            request.log.error({ error }, "Failed to fetch timeseries stats");
            return reply.status(500).send({ error: "Failed to fetch timeseries stats" });
        }
    });

    // List Users with pagination
    app.get("/admin/users", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z
            .object({
                search: z.string().optional(),
                role: z.nativeEnum(UserRole).optional(),
                limit: z.coerce.number().min(1).max(100).optional(),
                offset: z.coerce.number().min(0).optional(),
            })
            .safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query" });
        }

        const where: any = {};

        if (query.data.search) {
            where.email = { contains: query.data.search, mode: "insensitive" };
        }

        if (query.data.role) {
            where.role = query.data.role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: query.data.limit ?? 20,
                skip: query.data.offset ?? 0,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    createdAt: true,
                    _count: {
                        select: { domains: true }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        return { data: users, meta: { total } };
    });

    // Update User (role, status, etc.)
    app.patch("/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
        const body = z
            .object({
                role: z.nativeEnum(UserRole).optional(),
                isDisabled: z.boolean().optional(),
            })
            .safeParse(request.body);

        if (!params.success || !body.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        // Prevent disabling self
        const adminId = (request.user as any)?.userId;
        if (body.data.isDisabled && params.data.id === adminId) {
            return reply.status(400).send({ error: "Cannot disable your own account" });
        }

        const updated = await prisma.user.update({
            where: { id: params.data.id },
            data: body.data,
            select: {
                id: true,
                email: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                isDisabled: true,
            }
        });

        await recordAudit(
            adminId ?? null,
            "USER_UPDATED",
            { targetUserId: params.data.id, changes: body.data }
        );

        return { user: updated };
    });

    // Delete User
    app.delete("/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

        if (!params.success) {
            return reply.status(400).send({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        // Prevent deleting self
        const adminId = (request.user as any)?.userId;
        if (params.data.id === adminId) {
            return reply.status(400).send({ error: "Cannot delete your own account" });
        }

        // Cascade delete: domains, inboxes, messages
        await prisma.$transaction(async (tx) => {
            // Delete user's messages
            await tx.message.deleteMany({
                where: { inbox: { domain: { ownerId: params.data.id } } }
            });
            // Delete user's inboxes
            await tx.inbox.deleteMany({
                where: { domain: { ownerId: params.data.id } }
            });
            // Delete user's domains
            await tx.domain.deleteMany({
                where: { ownerId: params.data.id }
            });
            // Delete user
            await tx.user.delete({ where: { id: params.data.id } });
        });

        await recordAudit(
            adminId ?? null,
            "USER_DELETED",
            { targetUserId: params.data.id, email: user.email }
        );

        return { success: true };
    });

    // Force verify user email
    app.post("/admin/users/:id/verify", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

        if (!params.success) {
            return reply.status(400).send({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        if (user.emailVerified) {
            return reply.status(400).send({ error: "User already verified" });
        }

        const updated = await prisma.user.update({
            where: { id: params.data.id },
            data: {
                emailVerified: new Date(),
                verificationToken: null
            },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            }
        });

        await recordAudit(
            (request.user as any)?.userId ?? null,
            "USER_FORCE_VERIFIED",
            { targetUserId: params.data.id }
        );

        return { user: updated };
    });

    // List Audit Logs
    app.get("/admin/audit-logs", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z
            .object({
                action: z.string().optional(),
                userId: z.string().uuid().optional(),
                limit: z.coerce.number().min(1).max(100).optional(),
                offset: z.coerce.number().min(0).optional(),
            })
            .safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query" });
        }

        const where: any = {};

        if (query.data.action) {
            where.action = query.data.action;
        }

        if (query.data.userId) {
            where.userId = query.data.userId;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: query.data.limit ?? 50,
                skip: query.data.offset ?? 0,
                include: {
                    user: { select: { email: true } }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return { data: logs, meta: { total } };
    });

    // Export Audit Logs as CSV
    app.get("/admin/audit-logs/export", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z
            .object({
                action: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
            .safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query" });
        }

        const where: any = {};

        if (query.data.action) {
            where.action = query.data.action;
        }

        if (query.data.startDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(query.data.startDate) };
        }

        if (query.data.endDate) {
            const endDate = new Date(query.data.endDate);
            endDate.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt, lte: endDate };
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 1000, // Limit export to 1000 records
            include: {
                user: { select: { email: true } }
            }
        });

        // Generate CSV
        const escapeCSV = (val: string | null | undefined) => {
            if (val == null) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ["ID", "Action", "User Email", "Created At", "Metadata"];
        const rows = logs.map(log => [
            escapeCSV(log.id),
            escapeCSV(log.action),
            escapeCSV(log.user?.email),
            escapeCSV(log.createdAt.toISOString()),
            escapeCSV(log.meta ? JSON.stringify(log.meta) : ""),
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");

        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`);

        return reply.send(csv);
    });

    // Get current admin profile info
    app.get("/admin/profile", { preHandler: app.requireAdmin }, async (request) => {
        const userId = (request.user as any)?.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                _count: {
                    select: { domains: true }
                }
            }
        });
        return { user };
    });

    // System info endpoint
    app.get("/admin/system-info", { preHandler: app.requireAdmin }, async () => {
        const [
            userCount,
            domainCount,
            messageCount,
            recentLogins
        ] = await Promise.all([
            prisma.user.count(),
            prisma.domain.count(),
            prisma.message.count({ where: { deletedAt: null } }),
            prisma.auditLog.count({
                where: {
                    action: "LOGIN",
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            })
        ]);

        return {
            system: {
                userCount,
                domainCount,
                messageCount,
                recentLogins24h: recentLogins,
                serverTime: new Date().toISOString(),
            }
        };
    });
}
