import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

describe("Admin Code Deletion (Direct Integration)", () => {
    let token: string;

    // app and prisma are already set up by setup.ts hooks

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
        // Login to get token
        const login = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "admin-codes-fix@test.local", password: "changeme" }
        });
        token = login.json().token;
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
        // 4. Delete Code via API
        const response = await app.inject({
            method: "DELETE",
            url: `/admin/codes/${code.id}`,
            headers: { Authorization: `Bearer ${token}` }
        });

        // 5. Assertions
        // 5. Assertions
        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);

        // Verify records are gone
        const deletedCode = await prisma.redemptionCode.findUnique({ where: { id: code.id } });
        expect(deletedCode).toBeNull();

        const deletedRedemption = await prisma.codeRedemption.findFirst({ where: { codeId: code.id } });
        expect(deletedRedemption).toBeNull();
    });
});
