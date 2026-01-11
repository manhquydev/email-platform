// services/api/src/test/public-inbox.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";

describe("Public Inbox API", () => {
    let app: FastifyInstance;
    let testInboxId: string;
    let testMessageId: string;
    let testDomainId: string;
    let privateInboxId: string;

    beforeAll(async () => {
        app = buildServer();
        await app.ready();

        // Create test domain and inbox
        const domain = await prisma.domain.create({
            data: { name: "test-public.example.com", status: "VERIFIED", verificationToken: "test" },
        });
        testDomainId = domain.id;

        // Create PUBLIC inbox for testing
        const inbox = await prisma.inbox.create({
            data: { domainId: domain.id, localPart: "testuser", shareMode: "PUBLIC" },
        });
        testInboxId = inbox.id;

        // Create PRIVATE inbox for testing
        const privateInbox = await prisma.inbox.create({
            data: { domainId: domain.id, localPart: "privateuser", shareMode: "PRIVATE" },
        });
        privateInboxId = privateInbox.id;

        // Create test message for public inbox
        const message = await prisma.message.create({
            data: {
                inboxId: inbox.id,
                fromAddress: "sender@example.com",
                subject: "Test Subject",
                textBody: "Test body content",
                htmlBody: "<p>Test HTML</p>",
            },
        });
        testMessageId = message.id;

        // Create test message for private inbox
        await prisma.message.create({
            data: {
                inboxId: privateInbox.id,
                fromAddress: "sender@example.com",
                subject: "Private Message",
                textBody: "Private content",
            },
        });
    });

    afterAll(async () => {
        // Cleanup in correct order due to foreign keys
        await prisma.message.deleteMany({ where: { inboxId: { in: [testInboxId, privateInboxId] } } });
        await prisma.inbox.deleteMany({ where: { id: { in: [testInboxId, privateInboxId] } } });
        await prisma.domain.delete({ where: { id: testDomainId } }).catch(() => {});
        await app.close();
    });

    it("POST /api/public/inbox/search - finds existing inbox", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/public/inbox/search",
            payload: { email: "testuser@test-public.example.com" },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.inbox.email).toBe("testuser@test-public.example.com");
    });

    it("POST /api/public/inbox/search - returns 404 for non-existent inbox", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/public/inbox/search",
            payload: { email: "nonexistent@test-public.example.com" },
        });

        expect(res.statusCode).toBe(404);
    });

    it("POST /api/public/inbox/search - validates email format", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/public/inbox/search",
            payload: { email: "invalid-email" },
        });

        expect(res.statusCode).toBe(400);
    });

    it("GET /api/public/inbox/:email/messages - returns paginated messages", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/testuser@test-public.example.com/messages",
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.data).toBeInstanceOf(Array);
        expect(body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/public/inbox/:email/messages - respects pagination params", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/testuser@test-public.example.com/messages?limit=10&offset=0",
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.meta.limit).toBe(10);
        expect(body.meta.offset).toBe(0);
    });

    it("GET /api/public/inbox/:email/messages/:messageId - returns message detail", async () => {
        const res = await app.inject({
            method: "GET",
            url: `/api/public/inbox/testuser@test-public.example.com/messages/${testMessageId}`,
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.message.subject).toBe("Test Subject");
        expect(body.message.htmlBody).toBeDefined();
        // Verify sourceIp is not exposed
        expect(body.message.sourceIp).toBeUndefined();
    });

    it("GET /api/public/inbox/:email/messages/:messageId - returns 404 for non-existent message", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/testuser@test-public.example.com/messages/00000000-0000-0000-0000-000000000000",
        });

        expect(res.statusCode).toBe(404);
    });

    it("GET /api/public/inbox/:email/messages - returns 404 for non-existent inbox", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/nonexistent@test-public.example.com/messages",
        });

        expect(res.statusCode).toBe(404);
    });

    // Share Mode Tests
    it("POST /api/public/inbox/search - returns 403 for PRIVATE inbox", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/public/inbox/search",
            payload: { email: "privateuser@test-public.example.com" },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe("INBOX_PRIVATE");
        expect(body.error).toContain("private");
    });

    it("GET /api/public/inbox/:email/messages - returns 403 for PRIVATE inbox", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/privateuser@test-public.example.com/messages",
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe("INBOX_PRIVATE");
    });

    it("GET /api/public/inbox/:email/messages/:messageId - returns 403 for PRIVATE inbox", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/privateuser@test-public.example.com/messages/00000000-0000-0000-0000-000000000000",
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe("INBOX_PRIVATE");
    });

    it("PUBLIC inbox - search succeeds", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/public/inbox/search",
            payload: { email: "testuser@test-public.example.com" },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.inbox.email).toBe("testuser@test-public.example.com");
    });

    it("PUBLIC inbox - messages list succeeds", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/api/public/inbox/testuser@test-public.example.com/messages",
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.data).toBeInstanceOf(Array);
    });
});
