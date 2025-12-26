import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { buildServer } from "../server";
import { hashPassword } from "../utils/password";

// Use the main test DB from .env or default to 5432 if 5434 is missing/not migrated
const TEST_DB_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/email_service";

describe("Admin Code Deletion (Direct Integration)", () => {
    const prisma = new PrismaClient({
        datasources: { db: { url: TEST_DB_URL } },
    });
    const app = buildServer();
    let token: string;

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    beforeEach(async () => {
        // Cleanup specific to this test
        await prisma.codeRedemption.deleteMany();
        await prisma.redemptionCode.deleteMany({ where: { code: "FIX-VERIFY-123" } });
        await prisma.servicePackage.deleteMany({ where: { name: "Test Package Deletion" } });
        await prisma.user.deleteMany({ where: { email: "admin-codes-fix@test.local" } });

        // Setup admin user
        const passwordHash = await hashPassword("changeme");
        await prisma.user.create({
            data: {
                email: "admin-codes-fix@test.local",
                passwordHash,
                role: "ADMIN",
                emailVerified: new Date()
            }
        });

        // Login to get token
        const login = await request(app.server)
            .post("/auth/login")
            .send({ email: "admin-codes-fix@test.local", password: "changeme" });
        token = login.body.token;
    });

    it("should successfully delete a code even if it has redemptions", async () => {
        // 1. Create Package
        const pkg = await prisma.servicePackage.create({
            data: {
                name: "Test Package Deletion",
                type: "TIME_BASED",
                price: 1000,
                isActive: true
            }
        });

        // 2. Create Code
        const code = await prisma.redemptionCode.create({
            data: {
                code: "FIX-VERIFY-123",
                packageId: pkg.id,
                status: "ACTIVE"
            }
        });

        // 3. Create Redemption
        const adminUser = await prisma.user.findFirst({ where: { email: "admin-codes-fix@test.local" } });
        await prisma.codeRedemption.create({
            data: {
                codeId: code.id,
                userId: adminUser!.id
            }
        });

        // 4. Delete Code via API
        const response = await request(app.server)
            .delete(`/admin/codes/${code.id}`)
            .set("Authorization", `Bearer ${token}`);

        // 5. Assertions
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify records are gone
        const deletedCode = await prisma.redemptionCode.findUnique({ where: { id: code.id } });
        expect(deletedCode).toBeNull();

        const deletedRedemption = await prisma.codeRedemption.findFirst({ where: { codeId: code.id } });
        expect(deletedRedemption).toBeNull();
    });
});
