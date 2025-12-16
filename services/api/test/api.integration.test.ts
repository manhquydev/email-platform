import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";
import { buildServer } from "../src/server";

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "changeme";

const resetDb = async () => {
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.inbox.deleteMany();
  await prisma.abuseReport.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
};

const ensureSchema = async () => {
  const result = await prisma.$queryRaw<{ reg: string | null }[]>`SELECT to_regclass('public."User"')::text as reg`;
  if (!result[0] || !result[0].reg) {
    throw new Error("Database not migrated. Run `npx prisma migrate deploy` against the test DATABASE_URL.");
  }
};

describe("API integration", () => {
  const app = buildServer();

  beforeAll(async () => {
    await ensureSchema();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({ data: { email: ADMIN_EMAIL, passwordHash, role: "ADMIN", emailVerified: new Date() } });
  });

  it("exposes health status", async () => {
    const res = await request(app.server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("api");
  });

  it("returns 404 for outbound when feature disabled", async () => {
    const res = await request(app.server)
      .post("/messages/outbound")
      .send({ from: "a@example.com", to: "b@example.com", subject: "hi" });
    expect(res.status).toBe(404);
  });

  it("logs in, creates domain and inbox, and lists messages", async () => {
    const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    const token = login.body.token as string;
    expect(token).toBeTruthy();

    const domainResp = await request(app.server)
      .post("/domains")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "example.com" });
    expect(domainResp.status).toBe(200);
    const domainId = domainResp.body.domain.id as string;
    expect(domainId).toBeTruthy();

    const inboxResp = await request(app.server)
      .post("/inboxes")
      .set("Authorization", `Bearer ${token}`)
      .send({ domainId, localPart: "hello" });
    expect(inboxResp.status).toBe(200);
    expect(inboxResp.body.inbox.localPart).toBe("hello");

    const listInboxes = await request(app.server)
      .get("/inboxes")
      .set("Authorization", `Bearer ${token}`);
    expect(listInboxes.status).toBe(200);
    expect(Array.isArray(listInboxes.body.data)).toBe(true);
    expect(listInboxes.body.data.length).toBe(1);

    const msgs = await request(app.server)
      .get(`/inboxes/${inboxResp.body.inbox.id}/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(msgs.status).toBe(200);
    expect(Array.isArray(msgs.body.data)).toBe(true);
    expect(msgs.body.data.length).toBe(0);
  });

  it("filters domains by search param", async () => {
    const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.body.token as string;

    await prisma.domain.createMany({
      data: [
        { name: "alpha.test", verificationToken: "a" },
        { name: "bravo.test", verificationToken: "b" },
      ],
    });

    const res = await request(app.server)
      .get("/domains?search=alpha")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("alpha.test");
  });
});
