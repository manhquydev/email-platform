import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import nodemailer from "nodemailer";
import { tmpdir } from "os";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";
import { buildServer } from "../src/server";
import { startSmtpServer } from "../src/smtp";
import { setupEmailWorker } from "../src/worker";

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "changeme";
const TEST_DOMAIN = "example.com";
const SMTP_HOST = "127.0.0.1";

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

describe("SMTP ingest e2e", () => {
  const app = buildServer();
  const smtpPort = 2626;
  const storageDir = path.join(tmpdir(), "email-storage-e2e");
  let token = "";
  let smtpServer: ReturnType<typeof startSmtpServer>;
  let worker: ReturnType<typeof setupEmailWorker>;

  beforeAll(async () => {
    process.env.STORAGE_DIR = storageDir;
    process.env.SMTP_PORT = String(smtpPort);
    process.env.ALLOW_AUTO_DOMAIN_CREATION = "true";
    await ensureSchema();
    await app.ready();
    worker = setupEmailWorker(app.log);
    smtpServer = startSmtpServer(app.log, smtpPort);
  });

  afterAll(async () => {
    await app.close();
    smtpServer.close();
    await worker.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    try {
      await resetDb();
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      await prisma.user.create({
        data: { email: ADMIN_EMAIL, passwordHash, role: "ADMIN", tier: "ENTERPRISE", emailVerified: new Date() }
      });
      const login = await request(app.server).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      token = login.body.token;
      await prisma.domain.create({ data: { name: TEST_DOMAIN, verificationToken: "token", status: "VERIFIED" } });
      await prisma.inbox.create({
        data: {
          localPart: "hello",
          domain: { connect: { name: TEST_DOMAIN } },
        },
      });
    } catch (e) {
      console.error("Reset DB failed", e);
      throw e;
    }
  });

  it("accepts inbound SMTP and surfaces message via API", async () => {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    await transport.sendMail({
      from: "sender@test.local",
      to: `hello@${TEST_DOMAIN}`,
      subject: "Hello inbound",
      text: "This is a test email.",
    });

    const inboxes = await request(app.server)
      .get(`/inboxes?domain=${TEST_DOMAIN}`)
      .set("Authorization", `Bearer ${token}`);
    expect(inboxes.status).toBe(200);
    expect(inboxes.body.data.length).toBeGreaterThan(0);

    const inboxId = inboxes.body.data[0].id as string;
    let messages = await request(app.server)
      .get(`/inboxes/${inboxId}/messages`)
      .set("Authorization", `Bearer ${token}`);
    for (let i = 0; i < 12; i++) {
      if (messages.status === 200 && Array.isArray(messages.body?.data) && messages.body.data.length > 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      messages = await request(app.server)
        .get(`/inboxes/${inboxId}/messages`)
        .set("Authorization", `Bearer ${token}`);
    }
    expect(messages.status).toBe(200);
    expect(Array.isArray(messages.body.data)).toBe(true);
    expect(messages.body.data.length).toBeGreaterThan(0);
    expect(messages.body.data[0].subject).toContain("Hello inbound");
    expect(messages.body.data[0].textBody).toContain("test email");
  });

  it("rejects unknown recipient in strict mode", async () => {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    await expect(
      transport.sendMail({
        from: "sender@test.local",
        to: `unknown@${TEST_DOMAIN}`,
        subject: "Should reject",
        text: "unknown recipient",
      })
    ).rejects.toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 200));
    const unknownInbox = await prisma.inbox.findFirst({
      where: {
        localPart: "unknown",
        domain: { name: TEST_DOMAIN },
      },
    });
    expect(unknownInbox).toBeNull();
  });

  it("rejects recipient when inbox is disabled", async () => {
    await prisma.inbox.updateMany({
      where: { localPart: "hello", domain: { name: TEST_DOMAIN } },
      data: { deletedAt: new Date() },
    });

    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    await expect(
      transport.sendMail({
        from: "sender@test.local",
        to: `hello@${TEST_DOMAIN}`,
        subject: "Should reject disabled",
        text: "disabled inbox",
      })
    ).rejects.toBeDefined();
  });

  it("rejects recipient when domain is pending", async () => {
    const pendingDomain = `pending-${Date.now()}.example.com`;
    await prisma.domain.create({
      data: { name: pendingDomain, verificationToken: "pending-token", status: "PENDING" },
    });
    await prisma.inbox.create({
      data: {
        localPart: "hello",
        domain: { connect: { name: pendingDomain } },
      },
    });

    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    await expect(
      transport.sendMail({
        from: "sender@test.local",
        to: `hello@${pendingDomain}`,
        subject: "Should reject pending domain",
        text: "pending domain",
      })
    ).rejects.toBeDefined();
  });
});
