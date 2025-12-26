import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config";
import { recordAudit } from "../utils/audit";

// In-memory cache for challenges (in production, use Redis)
const challenges: Record<string, string> = {};

export async function webauthnRoutes(app: FastifyInstance) {
    const rpName = "Email Platform";
    const rpID = new URL(appConfig.webUrl).hostname;
    const origin = appConfig.webUrl;

    // 1. Register: Generate Options
    app.post("/auth/webauthn/register/options", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { passkeyCredentials: true }
        });

        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: user.id,
            userName: user.email,
            attestationType: "none",
            excludeCredentials: user.passkeyCredentials.map((cred) => ({
                id: cred.credentialID,
                transports: cred.transports as any[],
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
                authenticatorAttachment: "platform",
            },
        });

        challenges[userId] = options.challenge;

        return options;
    });

    // 2. Register: Verify
    app.post("/auth/webauthn/register/verify", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const body = request.body as any; // Allow any for SimpleWebAuthn types

        const challenge = challenges[userId];
        if (!challenge) {
            return reply.status(400).send({ error: "Challenge not found or expired" });
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
        } catch (error) {
            request.log.error(error, "WebAuthn Registration Verification failed");
            return reply.status(400).send({ error: "Verification failed" });
        }

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            const { credentialID, credentialPublicKey, counter } = registrationInfo;

            await prisma.passkeyCredential.create({
                data: {
                    userId,
                    credentialID,
                    publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
                    counter: BigInt(counter),
                    transports: (body.response.transports as string[]) || [],
                },
            });

            delete challenges[userId];
            await recordAudit(userId, "PASSKEY_REGISTERED", {});

            return { ok: true, verified };
        }
        // ...
        authenticator: {
            credentialID: credential.credentialID,
                credentialPublicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64url')),
                    counter: BigInt(credential.counter),
                        transports: credential.transports as any[], // Fix type
                },
    });
} catch (error) {
    console.error(error);
    return reply.status(400).send({ error: "Verification failed" });
}

const { verified, authenticationInfo } = verification;

if (verified) {
    // Update counter
    await prisma.passkeyCredential.update({
        where: { id: credential.id },
        data: {
            counter: BigInt(authenticationInfo.newCounter),
            lastUsedAt: new Date(),
        }
    });

    delete challenges[expectedChallenge];

    // Login success: Issue JWT
    const user = credential.user;
    if (user.isDisabled) {
        return reply.status(403).send({ error: "Account is disabled" });
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier }, { expiresIn: "30d" });
    await recordAudit(user.id, "LOGIN_PASSKEY", { ip: request.ip });

    return { token, user: { id: user.id, email: user.email, role: user.role } };
}

return reply.status(400).send({ error: "Verification failed" });
    });

// 5. List Credentials
app.get("/auth/webauthn/credentials", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const credentials = await prisma.passkeyCredential.findMany({
        where: { userId },
        select: {
            id: true,
            credentialID: true,
            createdAt: true,
            lastUsedAt: true,
            transports: true,
        },
        orderBy: { createdAt: 'desc' }
    });
    return credentials;
});

// 6. Delete Credential
app.delete("/auth/webauthn/credentials/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };

    const credential = await prisma.passkeyCredential.findUnique({
        where: { id },
    });

    if (!credential || credential.userId !== userId) {
        return reply.status(404).send({ error: "Credential not found" });
    }

    await prisma.passkeyCredential.delete({
        where: { id },
    });

    await recordAudit(userId, "PASSKEY_DELETED", { credentialId: id });

    return { success: true };
});
}
