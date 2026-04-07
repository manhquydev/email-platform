import { describe, it, expect, beforeEach, vi } from "vitest";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

const mockVerifyDomainOwnership = vi.fn(async () => true);
const mockAddDomainToPostfix = vi.fn(async () => ({ success: true, method: "skipped", domains: [] }));

vi.mock("../utils/dns", () => ({
  verifyDomainOwnership: (...args: unknown[]) => mockVerifyDomainOwnership(...args),
}));

vi.mock("../utils/postfix-sync", async () => {
  const actual = await vi.importActual("../utils/postfix-sync");
  return {
    ...(actual as object),
    addDomainToPostfix: (...args: unknown[]) => mockAddDomainToPostfix(...args),
  };
});

describe("Admin bulk verify DNS proof", () => {
  let adminToken = "";
  let adminId = "";

  beforeEach(async () => {
    mockVerifyDomainOwnership.mockReset();
    mockAddDomainToPostfix.mockReset();
    mockAddDomainToPostfix.mockResolvedValue({ success: true, method: "skipped", domains: [] });

    const passwordHash = await hashPassword("admin123");
    const admin = await prisma.user.create({
      data: {
        email: `bulk-admin-${Math.random()}@example.com`,
        passwordHash,
        emailVerified: new Date(),
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: admin.email, password: "admin123" },
    });
    adminToken = login.json().token;
  });

  it("verifies only domains with DNS proof and returns failed list", async () => {
    const d1 = await prisma.domain.create({
      data: { name: `ok-${Date.now()}.example.com`, verificationToken: "tok1", ownerId: adminId },
    });
    const d2 = await prisma.domain.create({
      data: { name: `fail-${Date.now()}.example.com`, verificationToken: "tok2", ownerId: adminId },
    });

    mockVerifyDomainOwnership
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const res = await app.inject({
      method: "POST",
      url: "/admin/domains/bulk",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { domainIds: [d1.id, d2.id], action: "verify" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().affected).toBe(1);
    expect(res.json().failed).toHaveLength(1);
    expect(res.json().failed[0].id).toBe(d2.id);

    const updated1 = await prisma.domain.findUnique({ where: { id: d1.id } });
    const updated2 = await prisma.domain.findUnique({ where: { id: d2.id } });
    expect(updated1?.status).toBe("VERIFIED");
    expect(updated2?.status).toBe("PENDING");
    expect(mockAddDomainToPostfix).toHaveBeenCalledTimes(1);
  });

  it("rolls back verify when postfix sync fails", async () => {
    const d1 = await prisma.domain.create({
      data: { name: `sync-fail-${Date.now()}.example.com`, verificationToken: "tok-sync", ownerId: adminId },
    });

    mockVerifyDomainOwnership.mockResolvedValueOnce(true);
    mockAddDomainToPostfix.mockResolvedValueOnce({
      success: false,
      method: "file",
      domains: [],
      error: "sync failed",
    });

    const res = await app.inject({
      method: "POST",
      url: "/admin/domains/bulk",
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { domainIds: [d1.id], action: "verify" },
    });

    expect(res.statusCode).toBe(503);
    const updated = await prisma.domain.findUnique({ where: { id: d1.id } });
    expect(updated?.status).toBe("PENDING");
  });
});

