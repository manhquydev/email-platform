/**
 * Billing Routes Tests
 * Tests for subscription management, checkout, and tier limits
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

// Mock Stripe service BEFORE importing
const mockStripeService = vi.hoisted(() => ({
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    handleWebhook: vi.fn(),
}));

vi.mock("../services/stripe.service", () => ({
    StripeService: mockStripeService,
}));

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
    user: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    servicePackage: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    payment: {
        findMany: vi.fn(),
    },
    domain: {
        count: vi.fn(),
    },
    inbox: {
        count: vi.fn(),
    },
}));

vi.mock("../lib/prisma", () => ({
    prisma: prismaMock,
}));

// Mock app config
vi.mock("../config", () => ({
    appConfig: {
        stripe: { apiKey: "sk_test_mock", webhookSecret: "whsec_mock" },
        webUrl: "http://localhost:3000",
        storageDir: "/tmp",
    },
}));

import { billingRoutes } from "../routes/billing";

const mockUser = { userId: "user-123", role: "USER" };

describe("Billing Routes", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = Fastify();

        // Mock authentication decorator
        app.decorate("authenticate", async (req: any) => {
            req.user = mockUser;
        });

        await app.register(billingRoutes);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe("GET /billing/packages", () => {
        it("should return active packages", async () => {
            const mockPackages = [
                { id: "pkg-1", name: "Starter", price: 9.99, isActive: true },
                { id: "pkg-2", name: "Pro", price: 29.99, isActive: true },
            ];
            prismaMock.servicePackage.findMany.mockResolvedValue(mockPackages);

            const response = await app.inject({
                method: "GET",
                url: "/billing/packages",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.packages).toHaveLength(2);
            expect(body.stripeEnabled).toBe(true);
        });
    });

    describe("GET /billing/plans", () => {
        it("should return plans (backward compatible)", async () => {
            const mockPackages = [
                { id: "pkg-1", name: "Free", price: 0 },
            ];
            prismaMock.servicePackage.findMany.mockResolvedValue(mockPackages);

            const response = await app.inject({
                method: "GET",
                url: "/billing/plans",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.plans).toBeDefined();
        });
    });

    describe("GET /billing/payments", () => {
        it("should return user payment history", async () => {
            const mockPayments = [
                { id: "pay-1", amount: 9.99, createdAt: new Date() },
                { id: "pay-2", amount: 29.99, createdAt: new Date() },
            ];
            prismaMock.payment.findMany.mockResolvedValue(mockPayments);

            const response = await app.inject({
                method: "GET",
                url: "/billing/payments",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.payments).toHaveLength(2);
            expect(prismaMock.payment.findMany).toHaveBeenCalledWith({
                where: { userId: "user-123" },
                orderBy: { createdAt: "desc" },
                take: 20,
            });
        });
    });

    describe("POST /billing/checkout", () => {
        it("should create checkout session with valid package", async () => {
            const mockSession = {
                id: "cs_mock123",
                url: "https://checkout.stripe.com/session/mock",
            };
            mockStripeService.createCheckoutSession.mockResolvedValue(mockSession);

            const response = await app.inject({
                method: "POST",
                url: "/billing/checkout",
                payload: {
                    packageId: "123e4567-e89b-12d3-a456-426614174000",
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.sessionId).toBe("cs_mock123");
            expect(body.url).toBe("https://checkout.stripe.com/session/mock");
        });

        it("should reject invalid packageId format", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/billing/checkout",
                payload: { packageId: "not-a-uuid" },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("Invalid payload");
        });

        it("should handle Stripe service errors", async () => {
            mockStripeService.createCheckoutSession.mockRejectedValue(
                new Error("Package not found")
            );

            const response = await app.inject({
                method: "POST",
                url: "/billing/checkout",
                payload: {
                    packageId: "123e4567-e89b-12d3-a456-426614174000",
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("Package not found");
        });
    });

    describe("POST /billing/portal", () => {
        it("should create customer portal session", async () => {
            const mockSession = {
                url: "https://billing.stripe.com/session/mock",
            };
            mockStripeService.createPortalSession.mockResolvedValue(mockSession);

            const response = await app.inject({
                method: "POST",
                url: "/billing/portal",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.url).toBe("https://billing.stripe.com/session/mock");
        });

        it("should handle errors when user has no Stripe customer", async () => {
            mockStripeService.createPortalSession.mockRejectedValue(
                new Error("No Stripe customer found")
            );

            const response = await app.inject({
                method: "POST",
                url: "/billing/portal",
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("POST /billing/cancel", () => {
        it("should cancel subscription", async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: "user-123",
                stripeSubscriptionId: "sub_mock123",
            });

            const response = await app.inject({
                method: "POST",
                url: "/billing/cancel",
                payload: { immediately: false },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
        });

        it("should reject when no active subscription", async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: "user-123",
                stripeSubscriptionId: null,
            });

            const response = await app.inject({
                method: "POST",
                url: "/billing/cancel",
                payload: {},
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("No active subscription");
        });
    });

    describe("POST /billing/webhook", () => {
        it("should reject webhook without signature", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/billing/webhook",
                headers: {
                    "content-type": "application/json",
                },
                payload: { type: "checkout.session.completed" },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("Missing stripe-signature");
        });
    });
});
