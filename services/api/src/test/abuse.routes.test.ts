import { beforeEach, describe, expect, it } from "vitest";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

async function createAndLogin(role: "ADMIN" | "USER") {
  const password = "Password123!";
  const email = `${role.toLowerCase()}-abuse-${Date.now()}-${Math.random()}@example.com`;
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { email, passwordHash, role, emailVerified: new Date() },
  });

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });

  expect(login.statusCode).toBe(200);
  return login.json().token as string;
}

describe("Abuse Routes - smoke/authz/negative", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    adminToken = await createAndLogin("ADMIN");
    userToken = await createAndLogin("USER");
  });

  it("smoke: allows public abuse report creation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/abuse/reports",
      payload: {
        reporter: "reporter@example.com",
        reason: "spam message",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().report?.id).toBeDefined();
  });

  it("authz: blocks non-admin access to admin abuse rules endpoint", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/abuse/rules",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("negative: rejects invalid abuse rule payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/abuse/rules",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        type: "NOT_A_RULE",
        scope: "SOURCE_IP",
        value: "",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid payload");
  });
});

