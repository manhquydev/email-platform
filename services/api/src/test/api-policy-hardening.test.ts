import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { app, prisma } from "./setup";

describe("API policy hardening", () => {
  it("redacts domain owner and verification fields for anonymous sessions", async () => {
    const passwordHash = await bcrypt.hash("owner-password", 10);
    const owner = await prisma.user.create({
      data: {
        email: "owner-redaction@example.com",
        passwordHash,
        role: "USER",
      },
    });

    const domain = await prisma.domain.create({
      data: {
        name: "public-redaction.test",
        status: "VERIFIED",
        verificationToken: "super-secret-verification-token",
        isPublic: true,
        ownerId: owner.id,
      },
    });

    const anonAuth = await app.inject({
      method: "POST",
      url: "/auth/anonymous",
    });
    expect(anonAuth.statusCode).toBe(200);
    const token = anonAuth.json().accessToken as string;
    expect(token).toBeTruthy();

    const listRes = await app.inject({
      method: "GET",
      url: "/domains",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json() as { data: Array<Record<string, unknown>> };
    const listedDomain = listBody.data.find((item) => item.id === domain.id);
    expect(listedDomain).toBeDefined();
    expect(listedDomain?.verificationToken).toBeUndefined();
    expect(listedDomain?.owner).toBeUndefined();
    expect(listedDomain?.ownerId).toBeUndefined();

    const detailRes = await app.inject({
      method: "GET",
      url: `/domains/${domain.id}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const detailBody = detailRes.json() as { domain: Record<string, unknown> };
    expect(detailBody.domain.verificationToken).toBeUndefined();
    expect(detailBody.domain.owner).toBeUndefined();
    expect(detailBody.domain.ownerId).toBeUndefined();
  });

  it("returns 403 when public inbox creation is disabled by policy", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/public/inboxes",
      payload: {
        domain: "example.com",
        localPart: "policy-check",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: "Public inbox creation is disabled by policy",
    });
  });

  it("returns 400 for malformed webhook signature format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/verify-signature",
      payload: {
        payload: "{\"event\":\"test\"}",
        signature: "sha256=bad",
        secret: "super-secret",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Invalid signature format" });
  });
});
