
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
            sendToAll: z.boolean().optional(),
            imageUrl: z.string().optional()
        });

        const body = schema.parse(request.body);

        const { targetUserId, title, message, type, sendToAll, imageUrl } = body;

        // Validation
        if (!title || !message || !type) {
            return reply.status(400).send({ error: "Missing required fields" });
        }

        // Send to specific user
        if (targetUserId) {
            // Create in database
            await prisma.notification.create({
                data: {
                    userId: targetUserId,
                    title,
                    message,
                    type,
                },
            });

            // Send via Telegram
            const { sendNotificationToUser } = await import("../services/telegramBot");
            await sendNotificationToUser(targetUserId, title, message, type, imageUrl);

            return { success: true, count: 1 };
        }

        // Send to all users
        if (sendToAll) {
            // Get all users
            const users = await prisma.user.findMany({
                select: { id: true, telegramChatId: true }
            });

            return { success: true, count: users.length };
        }

        return reply.status(400).send({ error: "Target required" });
    });
}
