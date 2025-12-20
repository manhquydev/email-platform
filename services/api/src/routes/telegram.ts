/**
 * Telegram Integration Routes
 * Handles linking/unlinking Telegram accounts and webhook processing
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
    createTelegramLinkToken,
    getTelegramStatus,
    unlinkTelegramAccount,
    updateTelegramNotifyPreference,
    handleTelegramWebhook,
    type TelegramUpdate,
} from "../services/telegramBot";

export async function telegramRoutes(app: FastifyInstance) {
    // Get Telegram link status (authenticated)
    app.get("/telegram/status", { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        const status = await getTelegramStatus(user.userId);
        return status;
    });

    // Generate link token (authenticated)
    app.post("/telegram/link-token", { preHandler: app.authenticate }, async (request) => {
        const user = request.user as { userId: string };
        const token = await createTelegramLinkToken(user.userId);

        // Return token and bot link
        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TempMailProBot';
        return {
            token,
            botLink: `https://t.me/${botUsername}?start=${token}`,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    });

    // Unlink Telegram (authenticated)
    app.delete("/telegram/unlink", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        await unlinkTelegramAccount(user.userId);
        return reply.status(200).send({ success: true });
    });

    // Update notification preferences (authenticated)
    app.patch("/telegram/preferences", { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };

        const bodySchema = z.object({
            notifyOnEmail: z.boolean().optional(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        if (parsed.data.notifyOnEmail !== undefined) {
            await updateTelegramNotifyPreference(user.userId, parsed.data.notifyOnEmail);
        }

        return { success: true };
    });

    // Telegram Webhook (public - called by Telegram servers)
    app.post("/telegram/webhook", async (request, reply) => {
        // Verify webhook secret if configured
        const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (webhookSecret) {
            const headerSecret = request.headers['x-telegram-bot-api-secret-token'];
            if (headerSecret !== webhookSecret) {
                return reply.status(401).send({ error: "Unauthorized" });
            }
        }

        try {
            const update = request.body as TelegramUpdate;
            await handleTelegramWebhook(update);
            return { ok: true };
        } catch (error) {
            console.error('[Telegram Webhook] Error:', error);
            // Always return 200 to Telegram to prevent retries
            return { ok: true };
        }
    });
}
