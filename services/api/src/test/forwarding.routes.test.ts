import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

async function createAndLoginUser() {
  const password = "Password123!";
  const email = `forwarding-${Date.now()}-${Math.random()}@example.com`;
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { email, passwordHash, role: "USER", emailVerified: new Date() },
  });

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });

  expect(login.statusCode).toBe(200);
  return login.json().token as string;
}

describe("Forwarding Routes - smoke/authz/negative", () => {
  let token: string;

  beforeEach(async () => {
    token = await createAndLoginUser();
  });

  afterEach(async () => {
    await prisma.forwardingLog.deleteMany();
    await prisma.forwardingRule.deleteMany();
    await prisma.forwardVerification.deleteMany();
  });

  it("smoke: creates a forwarding rule and lists it", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/forwarding/rules",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "Forward alerts",
        destinationType: "EMAIL",
        forwardTo: "dest@example.com",
        conditions: [],
      },
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.json().success).toBe(true);
    expect(createRes.json().ruleId).toBeDefined();

    const listRes = await app.inject({
      method: "GET",
      url: "/forwarding/rules",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json().rules)).toBe(true);
    expect(listRes.json().rules.length).toBe(1);
  });

  it("authz: blocks unauthenticated access to forwarding routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/forwarding/rules",
    });

    expect(res.statusCode).toBe(401);
  });

  it("negative: rejects EMAIL destination without forwardTo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/forwarding/rules",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "Invalid email destination",
        destinationType: "EMAIL",
        conditions: [],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Email destination required");
  });
});

