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
            const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

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

        return reply.status(400).send({ error: "Verification failed" });
    });

    // 3. Login: Generate Options
    app.post("/auth/webauthn/login/options", async (request, reply) => {
        // Passkey login is username-less or username-based. 
        // Simplify: Require email (username) to look up user credentials?
        // Or implement resident key (user handle) flow? 
        // For now, let's assume user enters email or we use resident keys if supported.
        // But typical flow: User enters email -> we look up creds -> send challenge.

        const bodySchema = z.object({
            email: z.string().email().optional(),
        });
        const parsed = bodySchema.safeParse(request.body);
        const email = parsed.success ? parsed.data.email : undefined;

        let userCredentials: { id: string; transports: any[] }[] = [];
        let userIdForChallenge = "unknown";

        if (email) {
            const user = await prisma.user.findUnique({
                where: { email },
                include: { passkeyCredentials: true }
            });
            if (user) {
                userCredentials = user.passkeyCredentials.map(cred => ({
                    id: cred.credentialID,
                    transports: cred.transports as any[] // Fix simplewebauthn type
                }));
                userIdForChallenge = user.id;
            }
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: userCredentials.length > 0 ? userCredentials : undefined,
            userVerification: "preferred",
        });

        // To verify later, we need to map challenge to user if possible, or store globally by challenge ID.
        // Since registration needs auth, we used userId. Login is pre-auth.
        // We'll store challenge keyed by itself or a session ID. For simplicity here: key by challenge.
        challenges[options.challenge] = userIdForChallenge; // Store target user if known, else 'unknown'

        return options;
    });

    // 4. Login: Verify
    app.post("/auth/webauthn/login/verify", async (request, reply) => {
        const body = request.body as any;
        const challenge = challenges[body.challenge]; // Client must send back the challenge, or we extract from response clientDataJSON...
        // SimpleWebAuthn: VerifyAuthenticationResponseOpts needs expectedChallenge.
        // We strictly need to find the challenge. The response contains clientDataJSON which has the challenge.
        // But we need to lookup OUR stored challenge to verify it matches.
        // Usually we pass the challenge ID in a cookie or response. 
        // IMPORTANT: In this simplified flow, we assume single instance. Redis is needed for distributed.

        // We iterate challenges to find matching one? No, inefficient.
        // Real-world: Store challenge in signed HttpOnly cookie or session.
        // Hack for this implementation: Client sends 'challenge' (original base64url) in body top level? 
        // Standard response doesn't have it top-level.

        // Let's rely on caching by base64url challenge string if possible, but we don't know it yet.
        // We'll require frontend to send the `challenge` they received back to us in the payload wrapper,
        // or we assume server has a way to look it up.

        // Let's inspect `challenges` keys.
        // Wait, simplewebauthn verify function checks equality.

        // Workaround: Frontend MUST send the `challenge` string it received in `generateAuthenticationOptions`
        // alongside the `AuthenticationResponseJSON`.
        const expectedChallenge = body.challengeId;

        if (!expectedChallenge || !challenges[expectedChallenge]) {
            return reply.status(400).send({ error: "Challenge expired or invalid" });
        }

        const targetUserId = challenges[expectedChallenge];

        // We need the credential to get the public key.
        const credentialID = body.id;
        const credential = await prisma.passkeyCredential.findUnique({
            where: { credentialID },
            include: { user: true }
        });

        if (!credential) {
            return reply.status(400).send({ error: "Credential not found" });
        }

        // If we knew the user via email step, verify it matches
        if (targetUserId !== "unknown" && targetUserId !== credential.userId) {
            return reply.status(400).send({ error: "User mismatch" });
        }

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator: {
                    credentialID: credential.credentialID,
                    credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
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
