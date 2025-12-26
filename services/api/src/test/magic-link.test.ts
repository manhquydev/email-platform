import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, prisma } from "./setup";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { outboundService } from "../services/outbound";

describe("Magic Link API", () => {
    let email = "magic@example.com";
    let userId: string;

    beforeEach(async () => {
        // Clear mocks
        vi.restoreAllMocks();

        // Mock the method on the singleton instance
        vi.spyOn(outboundService, 'sendMagicLoginEmail').mockResolvedValue(true as any);

        // Create user
        const hashed = await bcrypt.hash("password123", 10);
        const user = await prisma.user.create({
            data: { email, passwordHash: hashed, role: "USER", emailVerified: new Date() },
        });
        userId = user.id;
    });

    it("should request magic link successfully", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/auth/magic-link/request",
            payload: { email }
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().ok).toBe(true);

        // Verify token created
        const tokenToken = await prisma.magicLinkToken.findFirst({
            where: { userId }
        });
        expect(tokenToken).toBeDefined();

        // Verify email sent
        expect(outboundService.sendMagicLoginEmail).toHaveBeenCalled();
        const linkArg = (outboundService.sendMagicLoginEmail as any).mock.calls[0][1];
        expect(linkArg).toContain("/auth/magic-link/verify?token=");
    });

    it("should verify magic link token", async () => {
        // 1. Generate token manually
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.magicLinkToken.create({
            data: {
                userId,
                token: tokenHash,
                expiresAt,
            }
        });

        // 2. Verify
        const res = await app.inject({
            method: "POST",
            url: "/auth/magic-link/verify",
            payload: { token: rawToken }
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.token).toBeDefined();
        expect(body.user.email).toBe(email);
    });

    it("should reject expired token", async () => {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() - 1000); // Expired

        await prisma.magicLinkToken.create({
            data: {
                userId,
                token: tokenHash,
                expiresAt,
            }
        });

        const res = await app.inject({
            method: "POST",
            url: "/auth/magic-link/verify",
            payload: { token: rawToken }
        });

        expect(res.statusCode).toBe(401);
    });
});
