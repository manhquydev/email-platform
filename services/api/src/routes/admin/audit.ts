/**
 * Admin Audit Routes
 * Audit logs listing and CSV export
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function adminAuditRoutes(app: FastifyInstance) {
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
            where.actorId = query.data.userId;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: "desc" },
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
            where.timestamp = { ...where.timestamp, gte: new Date(query.data.startDate) };
        }

        if (query.data.endDate) {
            const endDate = new Date(query.data.endDate);
            endDate.setHours(23, 59, 59, 999);
            where.timestamp = { ...where.timestamp, lte: endDate };
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: "desc" },
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

        const headers = ["ID", "Action", "User Email", "Timestamp", "Metadata", "IP Address"];
        const rows = logs.map(log => [
            escapeCSV(log.id),
            escapeCSV(log.action),
            escapeCSV(log.user?.email || log.actorEmail),
            escapeCSV(log.timestamp.toISOString()),
            escapeCSV(log.metadata ? JSON.stringify(log.metadata) : ""),
            escapeCSV(log.ipAddress)
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");

        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`);

        return reply.send(csv);
    });
}
