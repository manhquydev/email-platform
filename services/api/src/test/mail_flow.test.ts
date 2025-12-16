import { describe, it, expect } from "vitest";
import { app, prisma } from "./setup";
import request from "supertest";

describe("Mail Flow Integration", () => {
    it("should retrieve messages for an inbox via API", async () => {
        // 1. Create Domain & Inbox
        const domain = await prisma.domain.create({
            data: { name: "mail.com", status: "VERIFIED", verificationToken: "xyz" },
        });
        const inbox = await prisma.inbox.create({
            data: { domainId: domain.id, localPart: "user1" },
        });

        // 2. Simulate "Receiving" email (Inbound) - Direct DB insertion
        await prisma.message.create({
            data: {
                inboxId: inbox.id,
                subject: "Hello World",
                fromAddress: "sender@external.com",
                toAddress: "user1@mail.com",
                receivedAt: new Date(),
                textBody: "This is a test email.",
            },
        });

        // 3. Login to get token
        const user = await prisma.user.create({
            data: { email: "admin@mail.com", passwordHash: "hash", role: "ADMIN" }
        });

        const token = app.jwt.sign({ userId: user.id, role: "ADMIN" });

        // 4. Fetch via API - Correct access via /inboxes/:id/messages
        const res = await app.inject({
            method: "GET",
            url: `/inboxes/${inbox.id}/messages`,
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.statusCode !== 200) {
            console.log("Mail Flow Error:", res.body);
        }
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toHaveLength(1);
        expect(body.data[0].subject).toBe("Hello World");
    });
});
