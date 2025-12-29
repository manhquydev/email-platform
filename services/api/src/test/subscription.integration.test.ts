import { vi, describe, it, expect, beforeEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { subscriptionRoutes } from "../routes/subscription";
import { prisma } from "../lib/prisma";
import rateLimit from "@fastify/rate-limit";

// Mock Prisma
vi.mock("../lib/prisma", () => ({
    prisma: {
        redemptionCode: {
            findUnique: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            create: vi.fn(),
        },
        codeRedemption: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            findUniqueOrThrow: vi.fn(),
            update: vi.fn(),
        },
        servicePackage: {
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    }
}));

// Mock Audit
vi.mock("../utils/audit", () => ({
    recordAudit: vi.fn()
}));

describe("Subscription Routes Integration", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        vi.clearAllMocks();

        app = Fastify();

        // Mock Auth Decorators
        app.decorate("authenticate", async (req: any, reply: any) => {
            req.user = { userId: "user-123", email: "test@example.com", role: "USER" };
        });
        app.decorate("requireAdmin", async (req: any, reply: any) => {
            req.user = { userId: "admin-123", email: "admin@example.com", role: "ADMIN" };
        });

        // Register Rate Limiter (Memory Store by default)
        await app.register(rateLimit, {
            global: false, // We only text the route config
        });

        await app.register(subscriptionRoutes);
        await app.ready();
    });

    describe("POST /subscription/redeem", () => {
        it("should successfully redeem a TIME_BASED code", async () => {
            const mockCode = {
                id: "code-1",
                code: "TEST-CODE",
                status: "ACTIVE",
                maxUses: 1,
                usedCount: 0,
                expiresAt: null,
                package: {
                    id: "pkg-1",
                    name: "Starter Plan",
                    type: "TIME_BASED",
                    durationDays: 30,
                    targetTier: "STARTER"
                }
            };

            const mockUser = {
                id: "user-123",
                tier: "FREE",
                subscriptionEndsAt: null
            };

            // Setup Mocks
            (prisma.redemptionCode.findUnique as any).mockResolvedValue(mockCode);
            (prisma.redemptionCode.update as any).mockResolvedValue({ ...mockCode, usedCount: 1 });
            (prisma.codeRedemption.findFirst as any).mockResolvedValue(null); // Not redeemed yet
            (prisma.codeRedemption.create as any).mockResolvedValue({});
            (prisma.user.findUnique as any).mockResolvedValue(mockUser);
            (prisma.user.findUniqueOrThrow as any).mockResolvedValue(mockUser);
            (prisma.user.update as any).mockResolvedValue({});

            // Execute
            const response = await app.inject({
                method: "POST",
                url: "/subscription/redeem",
                payload: { code: "TEST-CODE" }
            });

            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({ success: true, message: "Redeemed: Starter Plan" });

            // Verify User Update logic
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user-123" },
                data: expect.objectContaining({
                    tier: "STARTER",
                    subscriptionStatus: "ACTIVE"
                })
            }));
        });

        it("should successfully redeem a USAGE_BASED code (Credits)", async () => {
            const mockCode = {
                id: "code-2",
                code: "CREDIT-100",
                status: "ACTIVE",
                maxUses: 1,
                usedCount: 0,
                package: {
                    id: "pkg-2",
                    name: "100 Credits",
                    type: "USAGE_BASED",
                    creditAmount: 100
                }
            };

            (prisma.redemptionCode.findUnique as any).mockResolvedValue(mockCode);
            (prisma.redemptionCode.update as any).mockResolvedValue({ ...mockCode, usedCount: 1 });
            (prisma.codeRedemption.findFirst as any).mockResolvedValue(null);
            (prisma.codeRedemption.create as any).mockResolvedValue({});
            (prisma.user.findUnique as any).mockResolvedValue({ id: "user-123", credits: 0 });
            (prisma.user.update as any).mockResolvedValue({});

            const response = await app.inject({
                method: "POST",
                url: "/subscription/redeem",
                payload: { code: "CREDIT-100" }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { credits: { increment: 100 } }
            }));
        });

        it("should reject invalid codes", async () => {
            (prisma.redemptionCode.findUnique as any).mockResolvedValue(null);

            const response = await app.inject({
                method: "POST",
                url: "/subscription/redeem",
                payload: { code: "INVALID" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should reject already redeemed codes by same user", async () => {
            const mockCode = {
                id: "code-1",
                code: "ONCE-ONLY",
                status: "ACTIVE",
                maxUses: 10, // Multi-use code
                usedCount: 5,
                package: { id: "pkg-1", type: "USAGE_BASED" }
            };

            (prisma.redemptionCode.findUnique as any).mockResolvedValue(mockCode);
            // Simulate checked existing redemption
            (prisma.codeRedemption.findFirst as any).mockResolvedValue({ id: "rec-1" });

            const response = await app.inject({
                method: "POST",
                url: "/subscription/redeem",
                payload: { code: "ONCE-ONLY" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().error).toMatch(/already redeemed/);
        });

        it("should enforce rate limits (5 per hour)", async () => {
            // Mock valid code lookup to pass validation phase if it reaches logic
            // But rate limit should hit BEFORE logic
            (prisma.redemptionCode.findUnique as any).mockResolvedValue(null); // Just to be safe if it leaks

            // Fire 5 requests
            for (let i = 0; i < 5; i++) {
                const res = await app.inject({
                    method: "POST",
                    url: "/subscription/redeem",
                    payload: { code: "TEST" }
                });
                // Should be processed (404 because code invalid, but NOT 429)
                expect(res.statusCode).not.toBe(429);
            }

            // Fire 6th request
            const res = await app.inject({
                method: "POST",
                url: "/subscription/redeem",
                payload: { code: "TEST" }
            });

            expect(res.statusCode).toBe(429);
        });
    });
});
