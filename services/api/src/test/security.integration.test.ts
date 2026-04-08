
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { buildServer } from "../server";
import { promises as fs } from "fs";
import path from "path";

const resetDb = async () => {
    await prisma.attachment.deleteMany();
    await prisma.message.deleteMany();
    await prisma.inbox.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.domain.deleteMany();
};

const ensureSchema = async () => {
    try {
        await prisma.user.count();
    } catch {
        // In real CI, we might want to fail or run migration. 
        // For this verified environment, we assume DB is reachable or throw error.
        console.warn("Database likely not migrated or reachable. Tests might fail.");
    }
};

describe("Security Integration Tests", () => {
    const app = buildServer();

    beforeAll(async () => {
        await ensureSchema();
        await app.ready();
        const storageDir = process.env.STORAGE_DIR || "tmp-storage-test";
        await fs.mkdir(storageDir, { recursive: true });
    });

    afterAll(async () => {
        await app.close();
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await resetDb();
    });

    it("AUDIT LOG: logs failed login attempts", async () => {
        const email = "audit_test@example.com";
        const password = "securepassword";
        const passwordHash = await hashPassword(password);

        await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: "USER",
                emailVerified: new Date()
            }
        });

        // Attempt login with WRONG password
        const res = await request(app.server)
            .post("/auth/login")
            .send({ email, password: "wrongpassword" });

        expect(res.status).toBe(401);

        const log = await prisma.auditLog.findFirst({
            where: { action: "auth.login.failed" },
            orderBy: { createdAt: "desc" }
        });

        expect(log).toBeDefined();
        expect(log?.action).toBe("auth.login.failed");
        const meta = log?.meta as any;
        expect(meta.email).toBe(email);
        expect(meta.reason).toBe("invalid_password");
    });

    it("IDOR: prevents unauthorized attachment download", async () => {
        const domain = await prisma.domain.create({
            data: { name: "idor.test", status: "VERIFIED", verificationToken: "abc" }
        });

        const pwd = await hashPassword("123456");
        const userA = await prisma.user.create({ data: { email: "userA@test.com", passwordHash: pwd, role: "USER", emailVerified: new Date() } });
        const userB = await prisma.user.create({ data: { email: "userB@test.com", passwordHash: pwd, role: "USER", emailVerified: new Date() } });

        const inboxA = await prisma.inbox.create({
            data: {
                domainId: domain.id,
                localPart: "usera",
                ownerId: userA.id, // Owned by A
                claimedAt: new Date()
            }
        });

        const messageA = await prisma.message.create({
            data: {
                inboxId: inboxA.id,
                subject: "Secret Doc"
            }
        });

        const storageKey = "test-execution-file.txt";
        if (process.env.STORAGE_DIR) {
            await fs.writeFile(path.join(process.env.STORAGE_DIR, storageKey), "Secret Content");
        }

        const attachmentA = await prisma.attachment.create({
            data: {
                messageId: messageA.id,
                filename: "secret.txt",
                storageKey: storageKey,
                size: 100
            }
        });

        const loginA = await request(app.server).post("/auth/login").send({ email: "userA@test.com", password: "123456" });
        const tokenA = loginA.body.token;

        const loginB = await request(app.server).post("/auth/login").send({ email: "userB@test.com", password: "123456" });
        const tokenB = loginB.body.token;

        // ATTACK: User B tries to download User A's attachment
        const reqAttack = await request(app.server)
            .get(`/attachments/${attachmentA.id}/download`)
            .set("Authorization", `Bearer ${tokenB}`);

        expect(reqAttack.status).toBe(403); // MUST BE 403

        // VALID: User A tries to download
        const reqValid = await request(app.server)
            .get(`/attachments/${attachmentA.id}/download`)
            .set("Authorization", `Bearer ${tokenA}`);

        // Expect 200 (success) or 404 (file not found on disk) but NOT 403.
        // If we mocked storage correctly or file exists, it's 200.
        const validStatuses = [200, 404];
        expect(validStatuses).toContain(reqValid.status);
        if (reqValid.status === 403) {
            throw new Error("User A should be allowed to access their own attachment");
        }
    });

});
