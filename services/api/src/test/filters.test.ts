/**
 * Email Filter Routes Tests
 * Tests CRUD operations for email filters and labels
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

// Mock Prisma with vi.hoisted to ensure proper hoisting
const prismaMock = vi.hoisted(() => ({
    inbox: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
    },
    emailFilter: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    label: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
}));

vi.mock("../lib/prisma", () => ({
    prisma: prismaMock,
}));

// Bypass tier gate in route unit tests; tier enforcement has dedicated test coverage.
vi.mock("../services/tier-enforcement.service", () => ({
    createTierEnforceHandler: () => async () => {},
}));

import { filterRoutes } from "../routes/filters";

const mockUser = { userId: "user-123", role: "USER" };

describe("Email Filter Routes", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = Fastify();

        // Mock authentication decorator
        app.decorate("authenticate", async (req: any) => {
            req.user = mockUser;
        });

        await app.register(filterRoutes);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe("GET /inboxes/:inboxId/filters", () => {
        it("should return filters for owned inbox", async () => {
            const mockInbox = { id: "inbox-123", domain: { ownerId: "user-123" } };
            const mockFilters = [
                { id: "filter-1", name: "Spam filter", priority: 10 },
                { id: "filter-2", name: "Newsletter", priority: 5 },
            ];

            prismaMock.inbox.findFirst.mockResolvedValue(mockInbox);
            prismaMock.emailFilter.findMany.mockResolvedValue(mockFilters);

            const response = await app.inject({
                method: "GET",
                url: "/inboxes/inbox-123/filters",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.filters).toHaveLength(2);
            expect(prismaMock.inbox.findFirst).toHaveBeenCalledWith({
                where: { id: "inbox-123", domain: { ownerId: "user-123" }, deletedAt: null },
            });
        });

        it("should return 404 for non-existent inbox", async () => {
            prismaMock.inbox.findFirst.mockResolvedValue(null);

            const response = await app.inject({
                method: "GET",
                url: "/inboxes/inbox-999/filters",
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /filters", () => {
        const validInboxId = "123e4567-e89b-12d3-a456-426614174001";
        const validFilterPayload = {
            inboxId: validInboxId,
            name: "Important emails",
            matchType: "ALL",
            conditions: [
                { field: "FROM", operator: "CONTAINS", value: "@company.com" },
            ],
            actions: [
                { type: "ADD_LABEL", value: "important" },
            ],
        };

        it("should create filter for owned inbox", async () => {
            const mockInbox = { id: validInboxId, domain: { ownerId: "user-123" } };
            const createdFilter = { id: "filter-new", ...validFilterPayload };

            prismaMock.inbox.findFirst.mockResolvedValue(mockInbox);
            prismaMock.emailFilter.create.mockResolvedValue(createdFilter);

            const response = await app.inject({
                method: "POST",
                url: "/filters",
                payload: validFilterPayload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.id).toBe("filter-new");
        });

        it("should reject invalid filter payload", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/filters",
                payload: { name: "" }, // Missing required fields
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when inbox not owned", async () => {
            prismaMock.inbox.findFirst.mockResolvedValue(null);

            const response = await app.inject({
                method: "POST",
                url: "/filters",
                payload: validFilterPayload,
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("PATCH /filters/:filterId", () => {
        it("should update filter for owned inbox", async () => {
            const mockFilter = {
                id: "filter-123",
                inbox: { domain: { ownerId: "user-123" } },
                name: "Old name",
            };
            const updatedFilter = { ...mockFilter, name: "New name" };

            prismaMock.emailFilter.findFirst.mockResolvedValue(mockFilter);
            prismaMock.emailFilter.update.mockResolvedValue(updatedFilter);

            const response = await app.inject({
                method: "PATCH",
                url: "/filters/filter-123",
                payload: { name: "New name" },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.name).toBe("New name");
        });

        it("should return 404 for non-owned filter", async () => {
            prismaMock.emailFilter.findFirst.mockResolvedValue(null);

            const response = await app.inject({
                method: "PATCH",
                url: "/filters/filter-999",
                payload: { name: "New name" },
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("DELETE /filters/:filterId", () => {
        it("should delete filter for owned inbox", async () => {
            const mockFilter = {
                id: "filter-123",
                inbox: { domain: { ownerId: "user-123" } },
            };

            prismaMock.emailFilter.findFirst.mockResolvedValue(mockFilter);
            prismaMock.emailFilter.delete.mockResolvedValue(mockFilter);

            const response = await app.inject({
                method: "DELETE",
                url: "/filters/filter-123",
            });

            expect(response.statusCode).toBe(200);
        });

        it("should return 404 for non-owned filter", async () => {
            prismaMock.emailFilter.findFirst.mockResolvedValue(null);

            const response = await app.inject({
                method: "DELETE",
                url: "/filters/filter-999",
            });

            expect(response.statusCode).toBe(404);
        });
    });
});

describe("Label Routes", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = Fastify();

        app.decorate("authenticate", async (req: any) => {
            req.user = mockUser;
        });

        await app.register(filterRoutes);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe("GET /inboxes/:inboxId/labels", () => {
        it("should return labels for owned inbox", async () => {
            const mockInbox = { id: "inbox-123", domain: { ownerId: "user-123" } };
            const mockLabels = [
                { id: "label-1", name: "Work", color: "#ff0000" },
                { id: "label-2", name: "Personal", color: "#00ff00" },
            ];

            prismaMock.inbox.findFirst.mockResolvedValue(mockInbox);
            prismaMock.label.findMany.mockResolvedValue(mockLabels);

            const response = await app.inject({
                method: "GET",
                url: "/inboxes/inbox-123/labels",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.labels).toHaveLength(2);
        });
    });

    describe("POST /labels", () => {
        const validInboxId = "123e4567-e89b-12d3-a456-426614174001";

        it("should create label with valid color", async () => {
            const mockInbox = { id: validInboxId, domain: { ownerId: "user-123" } };
            const labelPayload = {
                inboxId: validInboxId,
                name: "Important",
                color: "#ff5733",
            };
            const createdLabel = { id: "label-new", ...labelPayload };

            prismaMock.inbox.findFirst.mockResolvedValue(mockInbox);
            prismaMock.label.create.mockResolvedValue(createdLabel);

            const response = await app.inject({
                method: "POST",
                url: "/labels",
                payload: labelPayload,
            });

            expect(response.statusCode).toBe(201);
        });

        it("should reject invalid color format", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/labels",
                payload: {
                    inboxId: validInboxId,
                    name: "Invalid",
                    color: "not-a-color",
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
