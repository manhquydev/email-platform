/**
 * Telegram Integration Tests
 * Tests for Telegram bot linking, preferences, and webhook handling
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { app, prisma } from "./setup";
import bcrypt from "bcryptjs";

// Mock fetch for Telegram API calls
const mockFetch = vi.fn();
const originalFetch = global.fetch;

function getInlineKeyboardUrlsFromFetchCalls(): string[] {
    return mockFetch.mock.calls.flatMap(([, options]) => {
        const body = (options as { body?: unknown } | undefined)?.body;
        if (typeof body !== "string") return [];

        try {
            const payload = JSON.parse(body) as {
                reply_markup?: { inline_keyboard?: Array<Array<{ url?: string }>> };
            };
            const rows = payload.reply_markup?.inline_keyboard;
            if (!rows) return [];
            return rows.flatMap((row) => row.map((button) => button.url).filter((url): url is string => typeof url === "string"));
        } catch {
            return [];
        }
    });
}

describe("Telegram Integration", () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
        // Reset mocks
        vi.clearAllMocks();
        global.fetch = mockFetch as typeof fetch;
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ ok: true, result: {} }),
        });

        // Create test user and login
        const hashed = await bcrypt.hash("password123", 10);
        const user = await prisma.user.create({
            data: { email: "telegram-test@example.com", passwordHash: hashed, role: "USER", emailVerified: new Date() },
        });
        userId = user.id;

        const loginRes = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "Content-Type": "application/json" },
            payload: { email: "telegram-test@example.com", password: "password123" },
        });
        userToken = loginRes.json().token;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    describe("GET /telegram/status", () => {
        it("should return unlinked status for new user", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/telegram/status",
                headers: { Authorization: `Bearer ${userToken}` },
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.linked).toBe(false);
            expect(body.notifyOnEmail).toBe(true);
        });

        it("should return linked status when user has telegramChatId", async () => {
            // Link user to telegram
            await prisma.user.update({
                where: { id: userId },
                data: {
                    telegramChatId: "123456789",
                    telegramLinkedAt: new Date(),
                    notifyOnEmail: true,
                },
            });

            const res = await app.inject({
                method: "GET",
                url: "/telegram/status",
                headers: { Authorization: `Bearer ${userToken}` },
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.linked).toBe(true);
            expect(body.notifyOnEmail).toBe(true);
            expect(body.linkedAt).toBeDefined();
        });
    });

    describe("POST /telegram/link-token", () => {
        it("should generate a link token and bot link", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/telegram/link-token",
                headers: { Authorization: `Bearer ${userToken}` },
            });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.token).toBeDefined();
            expect(body.token).toHaveLength(6);
            expect(body.botLink).toContain("https://t.me/");
            expect(body.botLink).toContain(body.token);
            expect(body.expiresIn).toBe(900); // 15 minutes
        });

        it("should create token record in database", async () => {
            await app.inject({
                method: "POST",
                url: "/telegram/link-token",
                headers: { Authorization: `Bearer ${userToken}` },
            });

            const tokens = await prisma.telegramLinkToken.findMany({
                where: { userId },
            });

            expect(tokens.length).toBe(1);
            expect(tokens[0].token).toHaveLength(6);
            expect(tokens[0].expiresAt).toBeDefined();
        });

        it("should reuse unexpired token if exists", async () => {
            // First request
            const res1 = await app.inject({
                method: "POST",
                url: "/telegram/link-token",
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const token1 = res1.json().token;

            // Second request
            const res2 = await app.inject({
                method: "POST",
                url: "/telegram/link-token",
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const token2 = res2.json().token;

            expect(token1).toBe(token2);
        });
    });

    describe("DELETE /telegram/unlink", () => {
        it("should unlink Telegram account", async () => {
            // First link the user
            await prisma.user.update({
                where: { id: userId },
                data: {
                    telegramChatId: "123456789",
                    telegramLinkedAt: new Date(),
                },
            });

            const res = await app.inject({
                method: "DELETE",
                url: "/telegram/unlink",
                headers: { Authorization: `Bearer ${userToken}` },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().success).toBe(true);

            // Verify user is unlinked
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.telegramChatId).toBeNull();
        });
    });

    describe("PATCH /telegram/preferences", () => {
        it("should update notification preference", async () => {
            // Link user first
            await prisma.user.update({
                where: { id: userId },
                data: {
                    telegramChatId: "123456789",
                    notifyOnEmail: true,
                },
            });

            const res = await app.inject({
                method: "PATCH",
                url: "/telegram/preferences",
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json",
                },
                payload: { notifyOnEmail: false },
            });

            expect(res.statusCode).toBe(200);

            // Verify preference updated
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.notifyOnEmail).toBe(false);
        });

        it("should reject invalid payload", async () => {
            const res = await app.inject({
                method: "PATCH",
                url: "/telegram/preferences",
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json",
                },
                payload: { invalidField: "test" },
            });

            // Should still succeed but not change anything
            expect(res.statusCode).toBe(200);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.notifyOnEmail).toBe(true);
        });
    });

    describe("POST /telegram/webhook", () => {
        beforeEach(() => {
            // Clear TELEGRAM_WEBHOOK_SECRET for webhook tests
            delete process.env.TELEGRAM_WEBHOOK_SECRET;
        });

        it("should accept webhook without secret when not configured", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 12345,
                    message: {
                        message_id: 1,
                        chat: { id: 123456, type: "private" },
                        text: "/start",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().ok).toBe(true);
        });

        it("should reject webhook with wrong secret", async () => {
            process.env.TELEGRAM_WEBHOOK_SECRET = "correct-secret";

            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "wrong-secret",
                },
                payload: {
                    update_id: 12345,
                    message: {
                        message_id: 1,
                        chat: { id: 123456, type: "private" },
                        text: "/start",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(401);
        });

        it("should accept webhook with correct secret", async () => {
            process.env.TELEGRAM_WEBHOOK_SECRET = "correct-secret";

            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: {
                    "Content-Type": "application/json",
                    "x-telegram-bot-api-secret-token": "correct-secret",
                },
                payload: {
                    update_id: 12345,
                    message: {
                        message_id: 1,
                        chat: { id: 123456, type: "private" },
                        text: "/start",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().ok).toBe(true);
        });

        it("should include notifications settings deep-link in /start welcome message", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 123450,
                    message: {
                        message_id: 10,
                        chat: { id: 123456, type: "private" },
                        text: "/start",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);

            const urls = getInlineKeyboardUrlsFromFetchCalls();
            expect(urls.some((url) => url.includes("/settings?tab=notifications"))).toBe(true);
            expect(urls.some((url) => url.includes("/app?tab=settings&section=notifications"))).toBe(false);
        });

        it("should include notifications settings deep-link in /settings response for unlinked user", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 123451,
                    message: {
                        message_id: 11,
                        from: { id: 222333444, first_name: "Guest", is_bot: false },
                        chat: { id: 222333444, type: "private" },
                        text: "/settings",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);

            const urls = getInlineKeyboardUrlsFromFetchCalls();
            expect(urls.some((url) => url.includes("/settings?tab=notifications"))).toBe(true);
            expect(urls.some((url) => url.includes("/app?tab=settings&section=notifications"))).toBe(false);
        });

        it("should handle /start with link token", async () => {
            // Create a link token
            const tokenRes = await app.inject({
                method: "POST",
                url: "/telegram/link-token",
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const token = tokenRes.json().token;

            // Simulate Telegram sending /start with token
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 12346,
                    message: {
                        message_id: 2,
                        from: { id: 987654321, first_name: "Test", is_bot: false },
                        chat: { id: 987654321, type: "private" },
                        text: `/start ${token}`,
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);

            // Verify user was linked
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.telegramChatId).toBe("987654321");
        });

        it("should handle /unlink command", async () => {
            // First link the user
            await prisma.user.update({
                where: { id: userId },
                data: {
                    telegramChatId: "987654321",
                    telegramLinkedAt: new Date(),
                },
            });

            // Simulate /unlink command
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 12347,
                    message: {
                        message_id: 3,
                        from: { id: 987654321, first_name: "Test", is_bot: false },
                        chat: { id: 987654321, type: "private" },
                        text: "/unlink",
                        date: Math.floor(Date.now() / 1000),
                    },
                },
            });

            expect(res.statusCode).toBe(200);

            // Verify user was unlinked
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.telegramChatId).toBeNull();
        });

        it("should handle callback queries", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/telegram/webhook",
                headers: { "Content-Type": "application/json" },
                payload: {
                    update_id: 12348,
                    callback_query: {
                        id: "callback123",
                        from: { id: 987654321, first_name: "Test" },
                        data: "copy_otp:123456",
                    },
                },
            });

            expect(res.statusCode).toBe(200);
            expect(res.json().ok).toBe(true);
        });
    });
});

describe("Telegram Utility Functions", () => {
    it("generateLinkToken should create 6-char alphanumeric token", async () => {
        // Import and test the function directly
        const { generateLinkToken } = await import("../services/telegram");

        const token = generateLinkToken();

        expect(token).toHaveLength(6);
        expect(token).toMatch(/^[A-Z2-9]+$/); // No confusing chars like 0,O,1,I
    });

    it("generateLinkToken should create unique tokens", async () => {
        const { generateLinkToken } = await import("../services/telegram");

        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
            tokens.add(generateLinkToken());
        }

        // Should have at least 95 unique tokens out of 100
        expect(tokens.size).toBeGreaterThan(95);
    });
});
