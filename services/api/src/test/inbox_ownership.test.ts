import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { FastifyInstance } from "fastify";

// 1. Mock Prisma BEFORE importing app/routes
const prismaMock = {
    domain: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    inbox: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
    },
    auditLog: {
        create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prismaMock)),
};

vi.mock("../lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("../utils/audit", () => ({
    recordAudit: vi.fn(),
}));

vi.mock("../utils/token", () => ({
    generateToken: () => "mock-token",
}));

describe("Inbox Ownership Tests (Mocked)", () => {
    let app: FastifyInstance;
    let buildServer: any;

    beforeAll(async () => {
        process.env.DATABASE_URL = "postgres://mock:5432/mock";
        process.env.JWT_SECRET = "test-secret";
        const serverModule = await import("../server");
        buildServer = serverModule.buildServer;
        app = buildServer();
        await app.ready();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const userA = { userId: "user-a-id", role: "USER", email: "a@test.com" };
    const userB = { userId: "user-b-id", role: "USER", email: "b@test.com" };
    const adminUser = { userId: "admin-id", role: "ADMIN", email: "admin@test.com" };

    const generateAuthToken = (user: any) => app.jwt.sign(user);
    const domainId = "123e4567-e89b-12d3-a456-426614174000";
    const inboxId = "999e4567-e89b-12d3-a456-426614174000";

    // ====================
    // SD-01: Inbox creation sets ownerId
    // ====================
    it("SD-01: POST /inboxes should set ownerId to current user", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            name: "test.com",
            isPublic: true,
            status: "VERIFIED",
            ownerId: userA.userId
        });

        (prismaMock.inbox.findUnique as any).mockResolvedValue(null);

        (prismaMock.inbox.create as any).mockImplementation(async (args: any) => ({
            id: inboxId,
            localPart: "myemail",
            domainId: domainId,
            ownerId: args.data.ownerId,
            claimedAt: args.data.claimedAt || new Date()
        }));

        const res = await app.inject({
            method: "POST",
            url: "/inboxes",
            headers: { Authorization: `Bearer ${userAToken}` },
            payload: { domainId, localPart: "myemail" }
        });

        expect(res.statusCode).toBe(200);
        expect(prismaMock.inbox.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    ownerId: userA.userId,
                    claimedAt: expect.any(Date)
                })
            })
        );
    });

    // ====================
    // SD-02: GET /inboxes filters by ownerId for regular users
    // ====================
    it("SD-02: GET /inboxes should only return user's own inboxes", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.inbox.findMany as any).mockResolvedValue([
            { id: "inbox-1", localPart: "mine", ownerId: userA.userId }
        ]);
        (prismaMock.inbox.count as any).mockResolvedValue(1);

        const res = await app.inject({
            method: "GET",
            url: "/inboxes",
            headers: { Authorization: `Bearer ${userAToken}` }
        });

        expect(res.statusCode).toBe(200);
        expect(prismaMock.inbox.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    ownerId: userA.userId
                })
            })
        );
    });

    // ====================
    // SD-03: Admin can see all inboxes (no ownerId filter)
    // ====================
    it("SD-03: Admin GET /inboxes should see all inboxes (no owner filter)", async () => {
        const adminToken = generateAuthToken(adminUser);

        (prismaMock.inbox.findMany as any).mockResolvedValue([
            { id: "inbox-1", localPart: "a", ownerId: userA.userId },
            { id: "inbox-2", localPart: "b", ownerId: userB.userId }
        ]);
        (prismaMock.inbox.count as any).mockResolvedValue(2);

        const res = await app.inject({
            method: "GET",
            url: "/inboxes",
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        expect(res.statusCode).toBe(200);

        // Admin should NOT have ownerId filter in where clause
        const callArgs = (prismaMock.inbox.findMany as any).mock.calls[0][0];
        expect(callArgs.where).not.toHaveProperty("ownerId");
    });

    // ====================
    // SD-04: User B cannot delete User A's inbox
    // ====================
    it("SD-04: User B cannot delete User A's inbox", async () => {
        const userBToken = generateAuthToken(userB);

        (prismaMock.inbox.findUnique as any).mockResolvedValue({
            id: inboxId,
            localPart: "secret",
            ownerId: userA.userId, // Owned by User A
            domain: {
                id: domainId,
                name: "test.com",
                ownerId: userA.userId
            }
        });

        const res = await app.inject({
            method: "DELETE",
            url: `/inboxes/${inboxId}`,
            headers: { Authorization: `Bearer ${userBToken}` }
        });

        expect(res.statusCode).toBe(403);
    });

    // ====================
    // SD-05: Owner can delete their own inbox
    // ====================
    it("SD-05: Owner can delete their own inbox", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.inbox.findUnique as any).mockResolvedValue({
            id: inboxId,
            localPart: "myinbox",
            ownerId: userA.userId,
            deletedAt: null,
            domain: {
                id: domainId,
                name: "test.com",
                ownerId: userA.userId
            }
        });

        (prismaMock.inbox.update as any).mockResolvedValue({
            id: inboxId,
            deletedAt: new Date()
        });

        const res = await app.inject({
            method: "DELETE",
            url: `/inboxes/${inboxId}`,
            headers: { Authorization: `Bearer ${userAToken}` }
        });

        expect(res.statusCode).toBe(200);
        expect(prismaMock.inbox.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    deletedAt: expect.any(Date)
                })
            })
        );
    });

    // ====================
    // DS-03: Cannot unshare domain if others have inboxes
    // ====================
    it("DS-03: Cannot unshare domain if other users have inboxes", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            name: "shared.com",
            ownerId: userA.userId,
            status: "VERIFIED",
            isPublic: true
        });

        // Other users have inboxes on this domain
        (prismaMock.inbox.count as any).mockResolvedValue(3);

        const res = await app.inject({
            method: "PATCH",
            url: `/domains/${domainId}`,
            headers: { Authorization: `Bearer ${userAToken}` },
            payload: { isPublic: false }
        });

        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body.code).toBe("DOMAIN_HAS_DEPENDENTS");
    });

    // ====================
    // DS-02: Can unshare domain if no others use it
    // ====================
    it("DS-02: Can unshare domain if no other users have inboxes", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            name: "myonly.com",
            ownerId: userA.userId,
            status: "VERIFIED",
            isPublic: true
        });

        // No other users have inboxes
        (prismaMock.inbox.count as any).mockResolvedValue(0);

        (prismaMock.domain.update as any).mockResolvedValue({
            id: domainId,
            isPublic: false,
            sharedAt: null
        });

        const res = await app.inject({
            method: "PATCH",
            url: `/domains/${domainId}`,
            headers: { Authorization: `Bearer ${userAToken}` },
            payload: { isPublic: false }
        });

        expect(res.statusCode).toBe(200);
    });
});
