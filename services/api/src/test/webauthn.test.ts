import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, prisma } from "./setup";
import bcrypt from "bcryptjs";

// Mock @simplewebauthn/server
vi.mock("@simplewebauthn/server", async () => {
    return {
        generateRegistrationOptions: vi.fn(),
        verifyRegistrationResponse: vi.fn(),
        generateAuthenticationOptions: vi.fn(),
        verifyAuthenticationResponse: vi.fn(),
    };
});

import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";

describe("WebAuthn API", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
        // Create user
        const hashed = await bcrypt.hash("password123", 10);
        const user = await prisma.user.create({
            data: { email: "test-webauthn@example.com", passwordHash: hashed, role: "USER", emailVerified: new Date() },
        });
        userId = user.id;

        // Login to get token
        const loginRes = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "test-webauthn@example.com", password: "password123" },
        });
        token = loginRes.json().token;

        // Reset mocks
        vi.clearAllMocks();
    });

    describe("Registration", () => {
        it("should generate registration options", async () => {
            (generateRegistrationOptions as any).mockResolvedValue({
                challenge: "mock-challenge",
                rp: { name: "Test" },
                user: { id: "user-id", name: "test", displayName: "test" },
                pubKeyCredParams: [],
            });

            const res = await app.inject({
                method: "POST",
                url: "/auth/webauthn/register/options",
                headers: { Authorization: `Bearer ${token}` },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().challenge).toBe("mock-challenge");
            expect(generateRegistrationOptions).toHaveBeenCalled();
        });

        it("should verify registration and save credential", async () => {
            // Setup state (simulate previous option generation request if needed, 
            // but in my implementation challenge is cached in memory.
            // Since tests run in same process/memory space as app with `app.inject`?,
            // Fastify instance `app` preserves state if it's the same instance.
            // But we need to set the challenge in the `challenges` object in `webauthn.ts`.
            // We can't easily access that private variable.
            // However, we can call the options endpoint first to set it.

            // 1. Call options to set challenge in memory
            (generateRegistrationOptions as any).mockResolvedValue({
                challenge: "mock-challenge-reg",
            });
            await app.inject({
                method: "POST",
                url: "/auth/webauthn/register/options",
                headers: { Authorization: `Bearer ${token}` },
            });

            // 2. Call verify
            (verifyRegistrationResponse as any).mockResolvedValue({
                verified: true,
                registrationInfo: {
                    credentialID: "cred-id",
                    credentialPublicKey: Buffer.from("public-key"),
                    counter: 0,
                    credentialDeviceType: "singleDevice",
                    credentialBackedUp: false
                }
            });

            const res = await app.inject({
                method: "POST",
                url: "/auth/webauthn/register/verify",
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    id: "cred-id",
                    rawId: "cred-id",
                    response: {
                        clientDataJSON: "...",
                        attestationObject: "...",
                        transports: ["internal"]
                    },
                    type: "public-key"
                }
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().ok).toBe(true);

            // Check DB
            const cred = await prisma.passkeyCredential.findFirst({ where: { userId } });
            expect(cred).toBeDefined();
            expect(cred?.credentialID).toBe("cred-id");
        });
    });

    describe("Authentication", () => {
        beforeEach(async () => {
            // Seed a credential
            await prisma.passkeyCredential.create({
                data: {
                    userId,
                    credentialID: "existing-cred",
                    publicKey: "mock-pub-key",
                    counter: 0,
                    transports: ["internal"]
                }
            });
        });

        it("should generate login options", async () => {
            (generateAuthenticationOptions as any).mockResolvedValue({
                challenge: "mock-challenge-login",
                allowCredentials: [{ id: "existing-cred" }]
            });

            const res = await app.inject({
                method: "POST",
                url: "/auth/webauthn/login/options",
                payload: { email: "test-webauthn@example.com" }
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().challenge).toBe("mock-challenge-login");
        });

        it("should verify login and return token", async () => {
            // 1. Call options to set challenge
            (generateAuthenticationOptions as any).mockResolvedValue({
                challenge: "mock-challenge-login-verify",
            });
            await app.inject({
                method: "POST",
                url: "/auth/webauthn/login/options",
                payload: { email: "test-webauthn@example.com" }
            });

            // 2. Verify
            (verifyAuthenticationResponse as any).mockResolvedValue({
                verified: true,
                authenticationInfo: {
                    newCounter: 1
                }
            });

            const res = await app.inject({
                method: "POST",
                url: "/auth/webauthn/login/verify",
                payload: {
                    id: "existing-cred",
                    response: {},
                    challengeId: "mock-challenge-login-verify" // The "hack" field we added
                }
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.token).toBeDefined();
            expect(body.user.email).toBe("test-webauthn@example.com");

            // Check counter update
            const cred = await prisma.passkeyCredential.findFirst({ where: { credentialID: "existing-cred" } });
            expect(cred?.counter).toBe(1n);
        });
    });
});
