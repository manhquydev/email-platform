import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("Shared Domain Workflow (Mocked)", () => {
    let app: FastifyInstance;
    let buildServer: any;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.DATABASE_URL = "postgres://mock:5432/mock";
        process.env.JWT_SECRET = "test-secret";
    });

    it("should initialize app", async () => {
        const serverModule = await import("../server");
        buildServer = serverModule.buildServer;
        app = buildServer();
        await app.ready();
        expect(app).toBeDefined();
    });

    const adminUser = { userId: "admin-id", role: "ADMIN", email: "admin@test.com" };
    const userA = { userId: "user-a-id", role: "USER", email: "a@test.com" };
    const userB = { userId: "user-b-id", role: "USER", email: "b@test.com" };

    const generateAuthToken = (user: any) => {
        return app.jwt.sign(user);
    };

    // Use a valid UUID for tests
    const domainId = "123e4567-e89b-12d3-a456-426614174000";

    it("should allow Owner to request contribution (PENDING_REVIEW)", async () => {
        const userAToken = generateAuthToken(userA);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            name: "test.com",
            ownerId: userA.userId,
            status: "VERIFIED",
            isPublic: false,
            contributionStatus: "NONE"
        });

        (prismaMock.domain.update as any).mockResolvedValue({
            id: domainId,
            name: "test.com",
            status: "VERIFIED",
            contributionStatus: "PENDING_REVIEW"
        });

        const res = await app.inject({
            method: "PATCH",
            url: `/domains/${domainId}`,
            headers: { Authorization: `Bearer ${userAToken}` },
            payload: { contributionStatus: "PENDING_REVIEW" }
        });

        if (res.statusCode !== 200) {
            console.log("PENDING_REVIEW failed:", res.statusCode, res.json());
        }

        expect(res.statusCode).toBe(200);
        expect(prismaMock.domain.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ contributionStatus: "PENDING_REVIEW" })
        }));
    });

    it("should allow Admin to Approve contribution and Auto-Public", async () => {
        const adminToken = generateAuthToken(adminUser);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            ownerId: userA.userId,
            contributionStatus: "PENDING_REVIEW",
            status: "VERIFIED"
        });

        (prismaMock.domain.update as any).mockResolvedValue({
            id: domainId,
            contributionStatus: "APPROVED",
            isPublic: true
        });

        const res = await app.inject({
            method: "PATCH",
            url: `/domains/${domainId}`,
            headers: { Authorization: `Bearer ${adminToken}` },
            payload: { contributionStatus: "APPROVED" }
        });

        if (res.statusCode !== 200) {
            console.log("APPROVED failed:", res.statusCode, res.json());
        }

        expect(res.statusCode).toBe(200);
        expect(prismaMock.domain.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                contributionStatus: "APPROVED",
                isPublic: true
            })
        }));
    });

    it("should allow User B to create inbox on Public (Shared) Domain", async () => {
        const userBToken = generateAuthToken(userB);

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: domainId,
            name: "test.com",
            isPublic: true,
            status: "VERIFIED",
            ownerId: userA.userId
        });

        (prismaMock.inbox.findUnique as any).mockResolvedValue(null);

        (prismaMock.inbox.create as any).mockResolvedValue({
            id: "inbox-1",
            localPart: "hello",
            domainId: domainId
        });

        // We assume the route uses body validation but not params for domain ID (it's in body)
        // Checking inboxes.ts POST route would confirm if it needs UUID or just string.
        // Assuming standard UUID usage in this project, domainId in body should be UUID too.
        const res = await app.inject({
            method: "POST",
            url: "/inboxes",
            headers: { Authorization: `Bearer ${userBToken}` },
            payload: { domainId, localPart: "hello" }
        });

        if (res.statusCode !== 200 && res.statusCode !== 201) {
            console.log("Create Inbox failed:", res.statusCode, res.json());
        }

        expect(res.statusCode).toBe(201);
    });

    it("should BLOCK User B from creating inbox on Private Domain", async () => {
        const userBToken = generateAuthToken(userB);
        const privateDomainId = "999e4567-e89b-12d3-a456-426614174999";

        (prismaMock.domain.findUnique as any).mockResolvedValue({
            id: privateDomainId,
            name: "private.com",
            isPublic: false,
            status: "VERIFIED",
            ownerId: userA.userId
        });

        const res = await app.inject({
            method: "POST",
            url: "/inboxes",
            headers: { Authorization: `Bearer ${userBToken}` },
            payload: { domainId: privateDomainId, localPart: "hacker" }
        });

        expect(res.statusCode).toBe(403);
    });
});
