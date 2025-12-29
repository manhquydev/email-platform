import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";

export async function apiKeysRoutes(app: FastifyInstance) {
    // List API Keys
    app.get("/api-keys", { preHandler: app.authenticate }, async (req, reply) => {
        const userId = (req.user as any).userId;
        const keys = await prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                prefix: true,
                lastUsedAt: true,
                createdAt: true,
            }
        });
        return { keys };
    });

    // Create API Key
    app.post("/api-keys", { preHandler: app.authenticate }, async (req, reply) => {
        const userId = (req.user as any).userId;
        const schema = z.object({
            name: z.string().min(1).max(50),
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) return reply.status(400).send({ error: "Invalid payload" });

        // Generate Key: epk_live_<32_random_bytes_hex>
        const randomBytes = crypto.randomBytes(32).toString("hex");
        const key = `epk_live_${randomBytes}`;
        const prefix = key.slice(0, 16); // "epk_live_1234..."

        // Hash key for storage (SHA256)
        const keyHash = crypto.createHash("sha256").update(key).digest("hex");

        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name: parsed.data.name,
                prefix,
                keyHash,
            }
        });

        await recordAudit(userId, "CREATE_API_KEY", { keyId: apiKey.id, name: apiKey.name });

        return {
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                prefix: apiKey.prefix,
                createdAt: apiKey.createdAt,
                key: key // RETURN ONLY ONCE
            }
        };
    });

    // Delete API Key
    app.delete("/api-keys/:id", { preHandler: app.authenticate }, async (req, reply) => {
        const userId = (req.user as any).userId;
        const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

        const key = await prisma.apiKey.findFirst({
            where: { id, userId }
        });

        if (!key) return reply.status(404).send({ error: "API Key not found" });

        await prisma.apiKey.delete({ where: { id } });

        await recordAudit(userId, "DELETE_API_KEY", { keyId: id });

        return { success: true };
    });
}
