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

    // Trends stats - compare this week vs last week
    app.get("/admin/stats/trends", { preHandler: app.requireAdmin }, async () => {
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const [
            usersThisWeek, usersLastWeek,
            emailsThisWeek, emailsLastWeek,
            inboxesThisWeek, inboxesLastWeek,
            domainsThisWeek, domainsLastWeek
        ] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
            prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } } }),
            prisma.message.count({ where: { receivedAt: { gte: oneWeekAgo }, deletedAt: null } }),
            prisma.message.count({ where: { receivedAt: { gte: twoWeeksAgo, lt: oneWeekAgo }, deletedAt: null } }),
            prisma.inbox.count({ where: { createdAt: { gte: oneWeekAgo }, deletedAt: null } }),
            prisma.inbox.count({ where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo }, deletedAt: null } }),
            prisma.domain.count({ where: { createdAt: { gte: oneWeekAgo } } }),
            prisma.domain.count({ where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } } }),
        ]);

        const calcTrend = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            trends: {
                users: { current: usersThisWeek, previous: usersLastWeek, trend: calcTrend(usersThisWeek, usersLastWeek) },
                emails: { current: emailsThisWeek, previous: emailsLastWeek, trend: calcTrend(emailsThisWeek, emailsLastWeek) },
                inboxes: { current: inboxesThisWeek, previous: inboxesLastWeek, trend: calcTrend(inboxesThisWeek, inboxesLastWeek) },
                domains: { current: domainsThisWeek, previous: domainsLastWeek, trend: calcTrend(domainsThisWeek, domainsLastWeek) },
            }
        };
    });

    // Recent activity feed
    app.get("/admin/activity", { preHandler: app.requireAdmin }, async (request) => {
        const query = z.object({
            limit: z.coerce.number().min(1).max(50).optional(),
        }).safeParse(request.query);

        const limit = query.success ? (query.data.limit ?? 10) : 10;

        const recentLogs = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { user: { select: { email: true } } }
        });

        return { activity: recentLogs };
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
                tier: true,
                subscriptionStatus: true,
                stripeSubscriptionId: true,
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

    // Update User Tier (Subscription Manager)
    app.patch("/admin/users/:id/tier", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
        const body = z.object({
            tier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]),
            status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"]).optional(),
        }).safeParse(request.body);

        if (!params.success || !body.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) return reply.status(404).send({ error: "User not found" });

        const updated = await prisma.user.update({
            where: { id: params.data.id },
            data: {
                tier: body.data.tier,
                subscriptionStatus: body.data.status || "ACTIVE",
            }
        });

        await recordAudit((request.user as any).userId, "ADMIN_SUBSCRIPTION_UPDATE", {
            targetUserId: params.data.id,
            newTier: body.data.tier
        });

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

    // Bulk operations on users
    app.post("/admin/users/bulk", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            userIds: z.array(z.string().uuid()).min(1).max(100),
            action: z.enum(["enable", "disable", "delete"]),
        }).safeParse(request.body);

        if (!body.success) {
            return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
        }

        const adminId = (request.user as any)?.userId;
        const { userIds, action } = body.data;

        // Remove admin's own ID from the list to prevent self-modification
        const filteredIds = userIds.filter(id => id !== adminId);

        if (filteredIds.length === 0) {
            return reply.status(400).send({ error: "No valid users to update" });
        }

        let affected = 0;

        if (action === "enable") {
            const result = await prisma.user.updateMany({
                where: { id: { in: filteredIds } },
                data: { isDisabled: false }
            });
            affected = result.count;
        } else if (action === "disable") {
            const result = await prisma.user.updateMany({
                where: { id: { in: filteredIds } },
                data: { isDisabled: true }
            });
            affected = result.count;
        } else if (action === "delete") {
            // Cascade delete for each user
            for (const userId of filteredIds) {
                try {
                    await prisma.$transaction(async (tx) => {
                        await tx.message.deleteMany({ where: { inbox: { domain: { ownerId: userId } } } });
                        await tx.inbox.deleteMany({ where: { domain: { ownerId: userId } } });
                        await tx.domain.deleteMany({ where: { ownerId: userId } });
                        await tx.user.delete({ where: { id: userId } });
                    });
                    affected++;
                } catch {
                    // Skip if user not found or already deleted
                }
            }
        }

        await recordAudit(adminId ?? null, "BULK_USER_ACTION", {
            action,
            requestedCount: filteredIds.length,
            affectedCount: affected
        });

        return { success: true, affected };
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

    // Expanded System info endpoint with real-time resource metrics
    app.get("/admin/system-info", { preHandler: app.requireAdmin }, async () => {
        const si = await import("systeminformation");

        const [
            userCount,
            domainCount,
            messageCount,
            recentLogins,
            cpu,
            mem,
            fs
        ] = await Promise.all([
            prisma.user.count(),
            prisma.domain.count(),
            prisma.message.count({ where: { deletedAt: null } }),
            prisma.auditLog.count({
                where: {
                    action: "LOGIN",
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            }),
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
        ]);

        const mainDisk = fs[0]; // Assumption: first mount point is main

        return {
            system: {
                userCount,
                domainCount,
                messageCount,
                recentLogins24h: recentLogins,
                serverTime: new Date().toISOString(),
                resources: {
                    cpuLoad: Math.round(cpu.currentLoad),
                    memUsed: Math.round(mem.active / 1024 / 1024),
                    memTotal: Math.round(mem.total / 1024 / 1024),
                    diskUsed: Math.round(mainDisk?.use ?? 0),
                    diskAvailable: Math.round((mainDisk?.size ?? 0 - (mainDisk?.used ?? 0)) / 1024 / 1024 / 1024),
                }
            }
        };
    });

    // Get System Settings
    app.get("/admin/system/settings", { preHandler: app.requireAdmin }, async () => {
        const settings = await prisma.systemSetting.findMany();
        return { settings };
    });

    // Update System Setting
    app.post("/admin/system/settings", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            key: z.string(),
            value: z.string(),
        }).safeParse(request.body);

        if (!body.success) return reply.status(400).send({ error: "Invalid payload" });

        const setting = await prisma.systemSetting.upsert({
            where: { key: body.data.key },
            update: { value: body.data.value },
            create: { key: body.data.key, value: body.data.value }
        });

        await recordAudit((request.user as any).userId, "SYSTEM_SETTING_UPDATED", {
            key: body.data.key,
            value: body.data.value
        });

        return { setting };
    });

    // =====================================
    // Email Management (Admin Email Browser)
    // =====================================

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

        await recordAudit(request.user.userId, "ADMIN_EMAIL_DELETED", { emailId: params.data.id });

        return { success: true };
    });
}
