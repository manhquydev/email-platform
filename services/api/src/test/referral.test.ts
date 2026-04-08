import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { buildServer } from "../server";

const USER_EMAIL = "referral@test.local";
const USER_PASSWORD = "changeme";

const resetDb = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
};

describe("Referral routes", () => {
  const app = buildServer();
  let token = "";
  let userId = "";

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();

    const user = await prisma.user.create({
      data: {
        email: USER_EMAIL,
        passwordHash: await hashPassword(USER_PASSWORD),
        emailVerified: new Date(),
      },
    });

    userId = user.id;

    const loginRes = await request(app.server)
      .post("/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD });

    token = loginRes.body.token;
  });

  it("requires authentication on referral endpoints", async () => {
    const requests = [
      app.inject({ method: "GET", url: "/api/referral/code" }),
      app.inject({ method: "GET", url: "/api/referral/stats" }),
      app.inject({ method: "POST", url: "/api/referral/claim" }),
      app.inject({
        method: "POST",
        url: "/api/referral/apply",
        payload: { code: "ABCD-EFGH-IJKL" },
      }),
    ];

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.statusCode).toBe(401);
    });
  });

  it("returns stable stats and claim payloads for batched referral rewards", async () => {
    const codeRes = await request(app.server)
      .get("/api/referral/code")
      .set("Authorization", `Bearer ${token}`);

    expect(codeRes.status).toBe(200);
    expect(codeRes.body).toMatchObject({
      code: expect.stringMatching(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
      usageCount: 0,
    });

    const referralCode = codeRes.body.code as string;

    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId,
          action: "REFERRAL_USED",
          meta: { referralCode, newUserHash: "user-1", rewardAliases: 10 },
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "REFERRAL_USED",
          meta: { referralCode, newUserHash: "user-2", rewardAliases: 10 },
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "REFERRAL_USED",
          meta: { referralCode, newUserHash: "user-3", rewardAliases: 10 },
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "REFERRAL_REWARD_CLAIMED",
          meta: { count: 2, aliasesAdded: 20 },
        },
      }),
    ]);

    const statsRes = await request(app.server)
      .get("/api/referral/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body).toMatchObject({
      totalReferrals: 3,
      pendingRewards: 1,
      claimedRewards: 2,
      bonusAliases: 20,
    });
    expect(statsRes.body.recentReferrals).toBeUndefined();

    const claimRes = await request(app.server)
      .post("/api/referral/claim")
      .set("Authorization", `Bearer ${token}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body).toEqual({
      success: true,
      claimedRewards: 1,
      aliasesAwarded: 10,
      newTotal: 30,
    });

    const statsAfterClaimRes = await request(app.server)
      .get("/api/referral/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(statsAfterClaimRes.status).toBe(200);
    expect(statsAfterClaimRes.body).toMatchObject({
      totalReferrals: 3,
      pendingRewards: 0,
      claimedRewards: 3,
      bonusAliases: 30,
    });
  });
});
