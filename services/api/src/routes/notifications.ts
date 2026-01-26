
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import {
    createScheduledNotification,
    listScheduledNotifications,
    getScheduledNotification,
    updateScheduledNotification,
    cancelScheduledNotification,
} from "../services/scheduled-notification-service";
import { sendNotificationToUser, type SendNotificationOptions } from "../services/telegram/notifications";

/**
 * Create notification log entry for delivery tracking
 */
async function createNotificationLog(
    notificationId: string,
    channel: 'WEB' | 'TELEGRAM' | 'PUSH',
    status: 'PENDING' | 'SENT' | 'FAILED',
    errorMessage?: string,
    metadata?: Record<string, any>
) {
    return prisma.notificationLog.create({
        data: {
            notificationId,
            channel,
            status,
            errorMessage,
            metadata,
        },
    });
}

export async function notificationRoutes(app: FastifyInstance) {
    // Get notifications for current user
    app.get("/", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const userId = request.user.userId;
        const { limit = 20, offset = 0 } = request.query as { limit?: number, offset?: number };

        const notifications = await prisma.notification.findMany({
            where: {
                userId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: userId, isRead: false }
        });

        return { notifications, unreadCount };
    });

    // Mark notification as read
    app.patch("/:id/read", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.userId;

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return reply.status(404).send({ error: "Notification not found" });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        return updated;
    });

    // Mark all as read
    app.patch("/read-all", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const userId = request.user.userId;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });

        return { success: true };
    });

    // Admin: Create notification
    app.post("/admin/send", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const schema = z.object({
            title: z.string().min(1),
            message: z.string().min(1),
            type: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PROMOTION"]),
            targetUserId: z.string().optional(),
            sendToAll: z.boolean().optional(),
            imageUrl: z.string().optional(),
            silent: z.boolean().optional(),
        });

        const body = schema.parse(request.body);
        const { targetUserId, title, message, type, sendToAll, imageUrl, silent } = body;

        if (!title || !message || !type) {
            return reply.status(400).send({ error: "Missing required fields" });
        }

        // Send to specific user
        if (targetUserId) {
            const notification = await prisma.notification.create({
                data: { userId: targetUserId, title, message, type, imageUrl },
            });

            await createNotificationLog(notification.id, 'WEB', 'SENT');

            // Enhanced Telegram send with acknowledge button
            const sendOptions: SendNotificationOptions = {
                silent,
                notificationId: notification.id,
                showAcknowledge: true,
            };

            try {
                const result = await sendNotificationToUser(targetUserId, title, message, type, imageUrl, sendOptions);
                await createNotificationLog(notification.id, 'TELEGRAM', result.success ? 'SENT' : 'FAILED', undefined, {
                    telegramMessageId: result.messageId,
                });
            } catch (e: any) {
                await createNotificationLog(notification.id, 'TELEGRAM', 'FAILED', e.message);
            }

            return { success: true, count: 1 };
        }

        // Send to all users
        if (sendToAll) {
            const users = await prisma.user.findMany({
                select: { id: true, telegramChatId: true }
            });

            const chunkSize = 50;
            for (let i = 0; i < users.length; i += chunkSize) {
                const chunk = users.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (u) => {
                    const notification = await prisma.notification.create({
                        data: { userId: u.id, title, message, type, imageUrl }
                    });

                    await createNotificationLog(notification.id, 'WEB', 'SENT');

                    if (u.telegramChatId) {
                        const sendOptions: SendNotificationOptions = {
                            silent,
                            notificationId: notification.id,
                            showAcknowledge: true,
                        };

                        try {
                            const result = await sendNotificationToUser(u.id, title, message, type, imageUrl, sendOptions);
                            await createNotificationLog(notification.id, 'TELEGRAM', result.success ? 'SENT' : 'FAILED', undefined, {
                                telegramMessageId: result.messageId,
                            });
                        } catch (e: any) {
                            await createNotificationLog(notification.id, 'TELEGRAM', 'FAILED', e.message);
                            console.error(`Failed to send telegram to ${u.id}`, e);
                        }
                    }
                }));
            }

            return { success: true, count: users.length };
        }

        return reply.status(400).send({ error: "Target required" });
    });

    // ========== SCHEDULED NOTIFICATIONS ==========

    // Create scheduled notification
    app.post("/admin/schedule", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const schema = z.object({
            title: z.string().min(1),
            message: z.string().min(1),
            type: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PROMOTION"]),
            targetMode: z.enum(["SPECIFIC", "ALL", "SEGMENT"]),
            targetUserId: z.string().optional(),
            templateId: z.string().optional(),
            imageUrl: z.string().optional(),
            scheduledFor: z.string().transform(s => new Date(s)),
        });

        try {
            const body = schema.parse(request.body);
            const scheduled = await createScheduledNotification({
                ...body,
                createdBy: request.user.userId,
            });
            return { success: true, scheduled };
        } catch (e: any) {
            return reply.status(400).send({ error: e.message });
        }
    });

    // List scheduled notifications
    app.get("/admin/scheduled", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const { status, limit = 50, offset = 0 } = request.query as {
            status?: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
            limit?: number;
            offset?: number;
        };

        const result = await listScheduledNotifications(status, Number(limit), Number(offset));
        return result;
    });

    // Get single scheduled notification
    app.get("/admin/scheduled/:id", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const { id } = request.params as { id: string };
        const scheduled = await getScheduledNotification(id);

        if (!scheduled) {
            return reply.status(404).send({ error: "Scheduled notification not found" });
        }

        return { scheduled };
    });

    // Update scheduled notification
    app.put("/admin/scheduled/:id", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const { id } = request.params as { id: string };
        const schema = z.object({
            title: z.string().min(1).optional(),
            message: z.string().min(1).optional(),
            type: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PROMOTION"]).optional(),
            scheduledFor: z.string().transform(s => new Date(s)).optional(),
            imageUrl: z.string().optional(),
        });

        try {
            const body = schema.parse(request.body);
            const updated = await updateScheduledNotification(id, body);
            return { success: true, scheduled: updated };
        } catch (e: any) {
            return reply.status(400).send({ error: e.message });
        }
    });

    // Cancel scheduled notification
    app.delete("/admin/scheduled/:id", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const { id } = request.params as { id: string };

        try {
            await cancelScheduledNotification(id);
            return { success: true };
        } catch (e: any) {
            return reply.status(400).send({ error: e.message });
        }
    });

    // ========== ANALYTICS ==========

    // Get notification analytics
    app.get("/admin/analytics", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const { days = 7 } = request.query as { days?: number };
        const to = new Date();
        const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000);

        const { getNotificationAnalytics } = await import("../services/notification-analytics-service");
        const analytics = await getNotificationAnalytics({ from, to });

        return analytics;
    });
}
