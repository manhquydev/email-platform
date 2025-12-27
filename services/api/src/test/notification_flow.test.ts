import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildServer } from "../server";
import * as telegramBot from "../services/telegramBot";

// Mock Telegram service
vi.mock("../services/telegramBot", async () => {
    return {
        sendTelegramMessage: vi.fn().mockResolvedValue(true),
        sendNotificationToUser: vi.fn().mockResolvedValue(true),
        setupBotCommands: vi.fn().mockResolvedValue(true),
    };
});

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
    notification: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
    prisma: prismaMock
}));

describe("Notification System Integration (Mocked)", () => {
    let app: any;
    let adminToken: string;
    let userToken: string;
    const adminId = "admin-123";
    const userId = "user-456";

    beforeEach(async () => {
        vi.clearAllMocks();

        // Setup App
        app = await buildServer();
        // Skip .ready() which might try to connect to DB/Redis if configured in specific plugins
        // But buildServer usually just registers plugins.
        // We mocked prisma so it should be fine.

        // Mock Auth/User Lookup for Admin
        prismaMock.user.findUnique.mockImplementation(async (args: any) => {
            if (args.where.id === adminId) return { id: adminId, role: "ADMIN", telegramChatId: "123" };
            if (args.where.id === userId) return { id: userId, role: "USER", telegramChatId: "456" };
            return null;
        });

        // Mock Tokens (using real app.jwt if possible, or just generate dummies if we mocked auth middleware)
        // Since we didn't mock fastify-jwt, we can use it.
        adminToken = app.jwt.sign({ userId: adminId, role: "ADMIN", email: "admin@test.com" });
        userToken = app.jwt.sign({ userId: userId, role: "USER", email: "user@test.com" });
    });

    it("should allow admin to send a notification to a specific user", async () => {
        const spy = vi.spyOn(telegramBot, 'sendTelegramMessage');

        // Mock create return
        prismaMock.notification.create.mockResolvedValue({
            id: "notif-1",
            userId,
            title: "Test",
            message: "Msg",
            type: "INFO"
        });

        const response = await app.inject({
            method: "POST",
            url: "/notifications/admin/send",
            headers: { Authorization: `Bearer ${adminToken}` },
            payload: {
                title: "Test Notification",
                message: "This is a test message",
                type: "INFO",
                targetUserId: userId
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ success: true, count: 1 });

        // Verify Prisma called
        expect(prismaMock.notification.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: userId,
                title: "Test Notification"
            })
        }));
    });

    it("should allow user to fetch their notifications", async () => {
        // Mock findMany
        prismaMock.notification.findMany.mockResolvedValue([
            { id: "1", title: "Test", message: "Msg", type: "INFO", isRead: false, createdAt: new Date() }
        ]);
        prismaMock.notification.count.mockResolvedValue(1);

        const response = await app.inject({
            method: "GET",
            url: "/notifications",
            headers: { Authorization: `Bearer ${userToken}` }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.notifications).toHaveLength(1);
        expect(body.unreadCount).toBe(1);

        expect(prismaMock.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: userId }
        }));
    });

    it("should allow user to mark notification as read", async () => {
        // Mock findFirst (check owner)
        prismaMock.notification.findFirst.mockResolvedValue({ id: "1", userId: userId });
        // Mock update
        prismaMock.notification.update.mockResolvedValue({ id: "1", isRead: true });

        const response = await app.inject({
            method: "PATCH",
            url: "/notifications/1/read",
            headers: { Authorization: `Bearer ${userToken}` }
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.notification.update).toHaveBeenCalled();
    });

    it("should allow user to mark all as read", async () => {
        // Mock updateMany
        prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });
        prismaMock.notification.count.mockResolvedValue(0); // After update, unread count is 0

        const response = await app.inject({
            method: "PATCH",
            url: `/notifications/read-all`,
            headers: { Authorization: `Bearer ${userToken}` }
        });

        expect(response.statusCode).toBe(200);
        expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: userId, isRead: false },
            data: { isRead: true }
        }));
    });

    it("should forbid non-admin from sending notifications", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/notifications/admin/send",
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                title: "Hacked",
                message: "Attempt",
                type: "ERROR",
                targetUserId: userId
            }
        });

        expect(response.statusCode).toBe(403);
    });
});
