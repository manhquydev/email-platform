// services/api/src/test/inbox-telegram.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";
import {
    generateInboxLinkToken,
    linkInboxToTelegram,
    getTokenStatus,
} from "../services/inbox-telegram-service";

describe("Inbox Telegram Service", () => {
    let app: FastifyInstance;
    let testInboxEmail: string;
    let testDomainId: string;
    let testInboxId: string;

    beforeAll(async () => {
        app = buildServer();
        await app.ready();

        // Create test domain and inbox
        const domain = await prisma.domain.create({
            data: { name: "test-telegram.example.com", status: "VERIFIED", verificationToken: "test" },
        });
        testDomainId = domain.id;

        const inbox = await prisma.inbox.create({
            data: { domainId: domain.id, localPart: "tgtest" },
        });
        testInboxId = inbox.id;

        testInboxEmail = "tgtest@test-telegram.example.com";
    });

    afterAll(async () => {
        // Cleanup in correct order
        await prisma.telegramNotificationLog.deleteMany({ where: { inboxEmail: testInboxEmail } }).catch(() => {});
        await prisma.inboxTelegramAuthToken.deleteMany({ where: { inboxEmail: testInboxEmail } }).catch(() => {});
        await prisma.inboxTelegramLink.deleteMany({ where: { inboxEmail: testInboxEmail } }).catch(() => {});
        await prisma.inbox.delete({ where: { id: testInboxId } }).catch(() => {});
        await prisma.domain.delete({ where: { id: testDomainId } }).catch(() => {});
        await app.close();
    });

    describe("Service Functions", () => {
        it("generateInboxLinkToken - creates token with QR code", async () => {
            const result = await generateInboxLinkToken(testInboxEmail);

            expect(result.token).toMatch(/^inbox_[A-Z0-9]{6}$/);
            expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
            expect(result.telegramLink).toContain("t.me/");
            expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
        });

        it("getTokenStatus - returns valid token status", async () => {
            const { token } = await generateInboxLinkToken(testInboxEmail);
            const status = await getTokenStatus(token);

            expect(status.valid).toBe(true);
            expect(status.used).toBe(false);
            expect(status.expired).toBe(false);
        });

        it("getTokenStatus - returns invalid for non-existent token", async () => {
            const status = await getTokenStatus("inbox_NONEXISTENT");

            expect(status.valid).toBe(false);
        });

        it("linkInboxToTelegram - links inbox to chat", async () => {
            const { token } = await generateInboxLinkToken(testInboxEmail);
            const result = await linkInboxToTelegram(token, "123456789", "testuser");

            expect(result.success).toBe(true);
            expect(result.inboxEmail).toBe(testInboxEmail);

            // Verify link created
            const link = await prisma.inboxTelegramLink.findFirst({
                where: { inboxEmail: testInboxEmail, telegramChatId: "123456789" },
            });
            expect(link).not.toBeNull();
            expect(link?.status).toBe("ACTIVE");
        });

        it("linkInboxToTelegram - rejects expired token", async () => {
            // Create expired token
            const token = "inbox_EXPIRE";
            await prisma.inboxTelegramAuthToken.create({
                data: {
                    inboxEmail: testInboxEmail,
                    token,
                    expiresAt: new Date(Date.now() - 1000), // Expired
                },
            });

            const result = await linkInboxToTelegram(token, "999999", "testuser");

            expect(result.success).toBe(false);
            expect(result.error).toContain("invalid or expired");
        });

        it("linkInboxToTelegram - rejects already used token", async () => {
            const { token } = await generateInboxLinkToken(testInboxEmail);

            // Use the token first time
            await linkInboxToTelegram(token, "111111111", "user1");

            // Try to use again
            const result = await linkInboxToTelegram(token, "222222222", "user2");

            expect(result.success).toBe(false);
            expect(result.error).toContain("invalid or expired");
        });
    });

    describe("API Endpoints", () => {
        it("POST /api/public/telegram/generate-token - returns token data", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/api/public/telegram/generate-token",
                payload: { inboxEmail: testInboxEmail },
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(body.token).toBeDefined();
            expect(body.token).toMatch(/^inbox_[A-Z0-9]{6}$/);
            expect(body.qrCodeDataUrl).toBeDefined();
            expect(body.telegramLink).toBeDefined();
            expect(body.expiresAt).toBeDefined();
        });

        it("POST /api/public/telegram/generate-token - validates inbox exists", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/api/public/telegram/generate-token",
                payload: { inboxEmail: "nonexistent@nonexistent.com" },
            });

            expect(res.statusCode).toBe(404);
        });

        it("GET /api/public/telegram/status/:token - returns status", async () => {
            const genRes = await app.inject({
                method: "POST",
                url: "/api/public/telegram/generate-token",
                payload: { inboxEmail: testInboxEmail },
            });
            const { token } = JSON.parse(genRes.payload);

            const res = await app.inject({
                method: "GET",
                url: `/api/public/telegram/status/${token}`,
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(body.valid).toBe(true);
            expect(body.used).toBe(false);
        });

        it("GET /api/public/telegram/status/:token - returns invalid for non-existent token", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/api/public/telegram/status/inbox_NOTFOUND",
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.payload);
            expect(body.valid).toBe(false);
        });
    });
});
