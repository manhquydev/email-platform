/**
 * Admin System Routes
 * System info, settings, cleanup, and health checks
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminSystemRoutes(app: FastifyInstance) {
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

    // System Cleanup Trigger
    app.post("/admin/system/cleanup", { preHandler: app.requireAdmin }, async (req, reply) => {
        const logger = {
            info: (obj: any, msg: string) => req.log.info(obj, msg),
            error: (obj: any, msg: string) => req.log.error(obj, msg),
            warn: (obj: any, msg: string) => req.log.warn(obj, msg)
        };

        const { runRetentionSweep } = await import("../../retention");

        try {
            await runRetentionSweep(logger);
            await recordAudit((req.user as any).userId, "SYSTEM_CLEANUP_TRIGGERED", {});
            return { success: true, message: "Retention sweep completed" };
        } catch (err: any) {
            return reply.status(500).send({ error: "Cleanup failed: " + err.message });
        }
    });

    // Check DB Connection
    app.post("/admin/system/check-db", { preHandler: app.requireAdmin }, async (req, reply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return { success: true, message: "Database connection healthy" };
        } catch (err: any) {
            return reply.status(500).send({ error: "Database check failed: " + err.message });
        }
    });
}
