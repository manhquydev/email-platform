/**
 * Admin Stats Routes
 * Dashboard statistics, trends, and timeseries data
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function adminStatsRoutes(app: FastifyInstance) {
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

    // Revenue Stats
    app.get("/admin/stats/revenue", { preHandler: app.requireAdmin }, async () => {
        const [totalRevenue, activeUsers] = await Promise.all([
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'SUCCEEDED' }
            }),
            prisma.user.count({ where: { subscriptionStatus: 'ACTIVE' } })
        ]);

        const activeSubs = await prisma.user.findMany({
            where: { subscriptionStatus: 'ACTIVE', stripeSubscriptionId: { not: null } },
            select: { tier: true }
        });

        const tierPrice: Record<string, number> = {
            'FREE': 0,
            'STARTER': 99000,
            'PROFESSIONAL': 199000,
            'ENTERPRISE': 499000
        };

        const mrr = activeSubs.reduce((acc, user) => acc + (tierPrice[user.tier] || 0), 0);

        return {
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            mrr,
            activeSubscribers: activeUsers
        };
    });
}
