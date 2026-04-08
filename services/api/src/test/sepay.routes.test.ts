import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageType, SubscriptionTier } from "@prisma/client";
import { app, prisma } from "./setup";
import { hashPassword } from "../utils/password";

async function createAndLoginUser() {
  const password = "Password123!";
  const email = `sepay-${Date.now()}-${Math.random()}@example.com`;
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

describe("SePay Routes - smoke/authz/negative", () => {
  let token: string;

  beforeEach(async () => {
    token = await createAndLoginUser();
  });

  afterEach(async () => {
    await prisma.pendingPayment.deleteMany();
    await prisma.payment.deleteMany();
  });

  it("smoke: creates SePay checkout for an active package", async () => {
    const pkg = await prisma.servicePackage.create({
      data: {
        name: "SePay Starter",
        description: "Test package",
        price: 100000,
        currency: "VND",
        type: PackageType.TIME_BASED,
        durationDays: 30,
        targetTier: SubscriptionTier.PROFESSIONAL,
        isActive: true,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/billing/sepay/checkout",
      headers: { Authorization: `Bearer ${token}` },
      payload: { packageId: pkg.id },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().orderCode).toMatch(/^EP_/);
    expect(res.json().qrUrl).toContain("qr.sepay.vn");
  });

  it("authz: blocks unauthenticated SePay checkout", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/billing/sepay/checkout",
      payload: { packageId: "123e4567-e89b-12d3-a456-426614174000" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("negative: rejects invalid packageId payload format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/billing/sepay/checkout",
      headers: { Authorization: `Bearer ${token}` },
      payload: { packageId: "invalid-package-id" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid payload");
  });
});

