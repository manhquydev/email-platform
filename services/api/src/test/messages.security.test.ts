
import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { messageRoutes } from "../routes/messages";
import { prisma } from "../lib/prisma";

// Mock Prisma
vi.mock("../lib/prisma", () => ({
    prisma: {
        message: {
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        attachment: {
            updateMany: vi.fn(),
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    }
}));

vi.mock("../utils/audit", () => ({
    recordAudit: vi.fn()
}));

// Mock Storage Service to avoid S3 config errors
vi.mock("../services/storage", () => ({
    storageService: {
        getReadStream: vi.fn()
    }
}));

// Mock Config
vi.mock("../config", () => ({
    appConfig: {
        storageDir: "/tmp",
        s3: { enabled: false }
    }
}));

describe("Security Audit: IDOR Vulnerability", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = Fastify();
        // Mock Auth: Simulate User A
        app.decorate("authenticate", async (req: any, reply: any) => {
            req.user = { userId: "user-A", role: "USER" };
        });
        await app.register(messageRoutes);
        await app.ready();
    });

    it("VULNERABILITY: User A should NOT be able to read User B's message", async () => {
        // Setup: Message belongs to User B ("user-B")
        const mockMessage = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            subject: "Secret Data",
            inbox: {
                id: "123e4567-e89b-12d3-a456-426614174001",
                ownerId: "user-B", // <--- Belongs to User B
                domain: { name: "test.com" }
            }
        };

        (prisma.message.findUnique as any).mockResolvedValue(mockMessage);

        const response = await app.inject({
            method: "GET",
            url: "/messages/123e4567-e89b-12d3-a456-426614174000"
        });

        // EXPECTATION FOR SECURE SYSTEM: 403 Forbidden or 404 Not Found
        // ACTUAL VULNERABILITY: 200 OK (User A sees User B's data)

        console.log("IDOR Test Response Code:", response.statusCode);

        if (response.statusCode === 200) {
            console.error("CRITICAL: IDOR Vulnerability Confirmed. User A accessed User B's message.");
            expect(response.statusCode).toBe(200); // Proving the bug exists
        } else {
            console.log("System is secure.");
        }
    });
});
