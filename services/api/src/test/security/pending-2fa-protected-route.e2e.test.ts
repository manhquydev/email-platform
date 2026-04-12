import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { app, prisma } from "../setup";

describe("Pending 2FA temp-token guard (E2E)", () => {
  it("blocks pending2FA temp-token on protected route /domains", async () => {
    const password = "Password123!";
    const hashed = await bcrypt.hash(password, 10);
    const email = `pending2fa-e2e-${Date.now()}@example.com`;

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        role: "USER",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "Content-Type": "application/json" },
      payload: {
        email,
        password,
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.json();
    expect(loginBody.requires2FA).toBe(true);
    expect(loginBody.tempToken).toBeDefined();

    const protectedRes = await app.inject({
      method: "GET",
      url: "/domains",
      headers: { Authorization: `Bearer ${loginBody.tempToken}` },
    });

    expect(protectedRes.statusCode).toBe(401);
    expect(protectedRes.json().code).toBe("TWO_FACTOR_REQUIRED");
  });
});
