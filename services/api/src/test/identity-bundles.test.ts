import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { buildServer } from "../server";

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "changeme";

const resetDb = async () => {
  // Clean up order matters due to FK constraints
  await prisma.inbox.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.user.deleteMany();
};

describe("Identity Bundles Integration", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    // Create user with PROFESSIONAL tier to test breach monitor
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
        tier: "PROFESSIONAL"
      }
    });
  });

  it("lists available bundles", async () => {
    const res = await request(app.server).get("/api/bundles");
    expect(res.status).toBe(200);
    expect(res.body.bundles).toHaveLength(3);
    expect(res.body.bundles[0].id).toBe("shield");
    expect(res.body.bundles[1].id).toBe("guard");
    expect(res.body.bundles[2].id).toBe("pro");
  });

  it("calculates privacy score", async () => {
    const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.body.token;

    const res = await request(app.server)
      .get("/api/privacy-score")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("level");
    expect(res.body).toHaveProperty("breakdown");
  });

  it("manages aliases", async () => {
    const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.body.token;

    // 1. Create Domain
    const domainResp = await request(app.server)
      .post("/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "example.com" });
    expect(domainResp.status).toBe(201);
    const domainId = domainResp.body.domain.id;

    // 2. Create Alias
    const createRes = await request(app.server)
      .post("/api/aliases")
      .set("Authorization", `Bearer ${token}`)
      .send({
        domainId,
        localPart: "secure",
        forwardTo: "admin@test.local",
        label: "My Banking Alias"
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.localPart).toBe("secure");
    expect(createRes.body.forwardTo).toBe("admin@test.local");
    const aliasId = createRes.body.id;

    // 3. List Aliases
    const listRes = await request(app.server)
      .get("/api/aliases")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].id).toBe(aliasId);

    // 4. Delete Alias
    const deleteRes = await request(app.server)
      .delete(`/api/aliases/${aliasId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const listResAfter = await request(app.server)
      .get("/api/aliases")
      .set("Authorization", `Bearer ${token}`);
    expect(listResAfter.body.data).toHaveLength(0);
  });

  it("enables breach monitoring (PROFESSIONAL tier)", async () => {
    const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.body.token;

    const res = await request(app.server)
      .post("/api/breach-monitor")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe("test@example.com");
  });
});
