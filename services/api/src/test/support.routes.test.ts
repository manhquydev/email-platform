import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

async function createAndLogin(role: "ADMIN" | "USER") {
  const password = "Password123!";
  const email = `${role.toLowerCase()}-support-${Date.now()}-${Math.random()}@example.com`;
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

describe("Support Routes - smoke/authz/negative", () => {
  let userToken: string;

  beforeEach(async () => {
    userToken = await createAndLogin("USER");
  });

  afterEach(async () => {
    await prisma.ticketMessage.deleteMany();
    await prisma.supportTicket.deleteMany();
  });

  it("smoke: creates and lists a support ticket for the authenticated user", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/support/tickets",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        subject: "Need technical help",
        category: "TECHNICAL",
        content: "My inbox is not syncing in dashboard.",
      },
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().ticket?.id).toBeDefined();

    const listRes = await app.inject({
      method: "GET",
      url: "/support/tickets",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json().data)).toBe(true);
    expect(listRes.json().data.length).toBe(1);
  });

  it("authz: denies user access to admin support endpoints", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/support/tickets",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("negative: rejects invalid ticket payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/support/tickets",
      headers: { Authorization: `Bearer ${userToken}` },
      payload: {
        subject: "bad",
        category: "TECHNICAL",
        content: "short",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid payload");
  });
});

