import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SubscriptionTier } from "@prisma/client";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

async function createAndLoginUserWithTier(tier: SubscriptionTier) {
  const password = "Password123!";
  const email = `teams-${Date.now()}-${Math.random()}@example.com`;
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "USER",
      tier,
      emailVerified: new Date(),
    },
  });

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });

  expect(login.statusCode).toBe(200);
  return login.json().token as string;
}

describe("Teams Routes - smoke/authz/negative", () => {
  let token: string;

  beforeEach(async () => {
    token = await createAndLoginUserWithTier(SubscriptionTier.STARTER);
  });

  afterEach(async () => {
    await prisma.teamInbox.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
  });

  it("smoke: creates a team and returns it in /teams list", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/teams",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "Core Team",
        description: "Primary ownership team",
      },
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.json().team?.id).toBeDefined();

    const listRes = await app.inject({
      method: "GET",
      url: "/teams",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json().teams)).toBe(true);
    expect(listRes.json().teams.length).toBe(1);
  });

  it("authz: blocks unauthenticated access to /teams", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/teams",
    });

    expect(res.statusCode).toBe(401);
  });

  it("negative: rejects invalid team creation payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/teams",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        name: "",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid payload");
  });
});

