
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "../services/telegramBot"; // Assuming default export or part of module
import { z } from "zod";

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
        preHandler: [app.authenticate] // Should also check for ADMIN role, assuming middleware or check
    }, async (request, reply) => {
        const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
        if (user?.role !== 'ADMIN') {
            return reply.status(403).send({ error: "Unauthorized" });
        }

        const schema = z.object({
            title: z.string().min(1),
            message: z.string().min(1),
            type: z.enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PROMOTION"]),
            targetUserId: z.string().optional(), // If null, send to all? Or just specific for now? 
            // For now let supports specific user or we can implement 'all' loop
            sendToAll: z.boolean().optional()
        });

        const body = schema.parse(request.body);

        if (body.targetUserId) {
            // Send to specific user
            const notification = await prisma.notification.create({
                data: {
                    userId: body.targetUserId,
                    title: body.title,
                    message: body.message,
                    type: body.type
                }
            });

            // Sync with Telegram
            const targetUser = await prisma.user.findUnique({ where: { id: body.targetUserId } });
            if (targetUser?.telegramChatId) {
                // Send notification via Telegram
                const { sendNotificationToUser } = await import("../services/telegramBot");
                await sendNotificationToUser(body.targetUserId, body.title, body.message, body.type);
            }

            return { success: true, count: 1 };
            // Send to all users
            const users = await prisma.user.findMany({ select: { id: true } });

            // Create database notifications
            const notificationsData = users.map(u => ({
                userId: u.id,
                title: body.title,
                message: body.message,
                type: body.type
            }));

            await prisma.notification.createMany({
                data: notificationsData
            });

            // Send Telegram to users who have it linked
            const telegramUsers = await prisma.user.findMany({
                where: { telegramChatId: { not: null } },
                select: { id: true, telegramChatId: true }
            });

            if (telegramUsers.length > 0) {
                const { sendNotificationToUser } = await import("../services/telegramBot");
                // Send in parallel but catch errors so one failure doesn't stop others
                Promise.allSettled(telegramUsers.map(user =>
                    sendNotificationToUser(user.id, body.title, body.message, body.type)
                )).catch(console.error);
            }

            return { success: true, count: users.length };
        }

        return reply.status(400).send({ error: "Target required" });
    });
}
