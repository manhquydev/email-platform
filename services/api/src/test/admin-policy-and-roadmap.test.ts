import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

describe("Admin policy and roadmap routes", () => {
  it("blocks API key access to /admin/* endpoints", async () => {
    const passwordHash = await hashPassword("admin123");
    const admin = await prisma.user.create({
      data: {
        email: `admin-key-${Math.random()}@example.com`,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });

    const rawApiKey = `ak_test_${Math.random().toString(36).slice(2)}`;
    const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

    await prisma.apiKey.create({
      data: {
        userId: admin.id,
        keyHash,
        prefix: rawApiKey.slice(0, 8),
        name: "admin-test-key",
        scopes: ["read", "write"],
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/admin/stats",
      headers: { "x-api-key": rawApiKey },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("API keys");
  });

  it("enables roadmap admin routes under /admin prefixes", async () => {
    const passwordHash = await hashPassword("admin123");
    const admin = await prisma.user.create({
      data: {
        email: `admin-roadmap-${Math.random()}@example.com`,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: admin.email, password: "admin123" },
    });
    const token = login.json().token as string;

    const healthRes = await app.inject({
      method: "GET",
      url: "/admin/health",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(healthRes.statusCode).toBe(200);

    const statusRes = await app.inject({
      method: "GET",
      url: "/admin/compliance/status",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().module).toBe("compliance");
  });
});
