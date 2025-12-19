import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { encrypt, decrypt } from "../utils/encryption";
import { authenticator } from "otplib";

export async function authenticatorRoutes(app: FastifyInstance) {
    // Create new authenticator account
    app.post("/auth/authenticator/accounts", { preHandler: app.authenticate }, async (request, reply) => {
        const bodySchema = z.object({
            serviceName: z.string().min(1),
            accountName: z.string().optional(),
            secret: z.string().min(1),
            issuer: z.string().optional(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const { serviceName, accountName, secret, issuer } = parsed.data;
        const userId = (request.user as any).userId;

        // Validate secret is base32? 
        // otplib provides check? No, usually just assumes string. 
        // But we should probably ensure it's valid for TOTP generation if we can.
        // However, some secrets might be raw. Let's assume user provides Base32.
        // Ideally we try to generate a token to verify it logic.
        try {
            authenticator.generate(secret);
        } catch (e) {
            return reply.status(400).send({ error: "Invalid secret format. Ensure it is a valid Base32 string." });
        }

        const encryptedSecret = encrypt(secret);

        const account = await prisma.authenticatorAccount.create({
            data: {
                userId,
                serviceName,
                accountName,
                secret: encryptedSecret,
                issuer,
            },
        });

        return { ok: true, id: account.id };
    });

    // List accounts (returns decrypted secrets for the client to generate codes)
    app.get("/auth/authenticator/accounts", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;

        const accounts = await prisma.authenticatorAccount.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        const decryptedAccounts = accounts.map((acc) => {
            try {
                return {
                    ...acc,
                    secret: decrypt(acc.secret),
                };
            } catch (e) {
                // Handle decryption failure gracefully
                return {
                    ...acc,
                    secret: null,
                    error: "Failed to decrypt"
                };
            }
        });

        return { accounts: decryptedAccounts };
    });

    // Delete account
    app.delete("/auth/authenticator/accounts/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = (request.user as any).userId;

        const account = await prisma.authenticatorAccount.findUnique({
            where: { id },
        });

        if (!account || account.userId !== userId) {
            return reply.status(404).send({ error: "Account not found" });
        }

        await prisma.authenticatorAccount.delete({
            where: { id },
        });

        return { ok: true };
    });
}
