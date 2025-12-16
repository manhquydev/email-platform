import { describe, it, expect } from "vitest";
import { app, prisma } from "./setup";
import bcrypt from "bcryptjs";

describe("Auth Integration", () => {
    it("should login successfully with valid credentials", async () => {
        // Setup user
        const hashed = await bcrypt.hash("password123", 10);
        await prisma.user.create({
            data: { email: "test@example.com", passwordHash: hashed, role: "USER" },
        });

        const res = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "Content-Type": "application/json" },
            payload: { email: "test@example.com", password: "password123" },
        });

        if (res.statusCode !== 200) {
            console.log("Login Error Body:", res.body);
        }

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.token).toBeDefined();
    });

    it("should reject invalid credentials", async () => {
        // Fix: Use a valid bcrypt hash for the "stored" password to avoid bcrypt errors
        const validHash = await bcrypt.hash("somePassword", 10);
        await prisma.user.create({
            data: { email: "wrong@example.com", passwordHash: validHash, role: "USER" },
        });

        const res = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "Content-Type": "application/json" },
            // Provide a timestamp or unique param to avoid caching if any (unlikely in test)
            payload: { email: "wrong@example.com", password: "wrong" },
        });

        expect(res.statusCode).toBe(401);
    });

    it("should allow changing password", async () => {
        const hashed = await bcrypt.hash("oldpass", 10);
        await prisma.user.create({
            data: { email: "change@example.com", passwordHash: hashed, role: "USER" },
        });

        // Login to get token
        const loginRes = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "Content-Type": "application/json" },
            payload: { email: "change@example.com", password: "oldpass" },
        });
        const token = loginRes.json().token;

        // Change password
        const changeRes = await app.inject({
            method: "POST",
            url: "/auth/change-password",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            payload: { newPassword: "newpass123" },
        });

        if (changeRes.statusCode !== 200) {
            console.log("Change Password Error:", changeRes.body);
        }
        expect(changeRes.statusCode).toBe(200);

        // Verify login with new password
        const verifyRes = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "Content-Type": "application/json" },
            payload: { email: "change@example.com", password: "newpass123" },
        });
        expect(verifyRes.statusCode).toBe(200);
    });
});
