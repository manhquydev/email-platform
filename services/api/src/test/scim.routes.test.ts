import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

const prismaMock = vi.hoisted(() => ({
  identityProvider: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const mockProvisionUser = vi.hoisted(() => vi.fn());

vi.mock("../lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../_wip/identity/jit-provisioning", () => ({
  provisionUser: mockProvisionUser,
}));

import { scimRoutes } from "../routes/scim";

const providerRecord = {
  id: "provider-1",
  organizationId: "org-1",
  type: "saml",
  name: "Mock Provider",
  config: { scimSecret: "scim-secret" },
  enabled: true,
  syncEnabled: false,
  lastSyncAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("SCIM Routes (focused, mocked) - smoke/authz/negative", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(scimRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("smoke: creates SCIM user with valid bearer token", async () => {
    prismaMock.identityProvider.findUnique.mockResolvedValue(providerRecord);
    mockProvisionUser.mockResolvedValue({
      id: "user-1",
      email: "scim-user@example.com",
      isDisabled: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await app.inject({
      method: "POST",
      url: "/scim/v2/provider-1/Users",
      headers: {
        authorization: "Bearer scim-secret",
      },
      payload: {
        userName: "scim-user@example.com",
        externalId: "external-123",
        emails: [{ value: "scim-user@example.com", primary: true }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("user-1");
    expect(res.json().userName).toBe("scim-user@example.com");
  });

  it("authz: rejects SCIM request without bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/scim/v2/provider-1/Users",
      payload: {
        userName: "missing-auth@example.com",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Missing authentication");
  });

  it("negative: rejects SCIM request with invalid bearer token", async () => {
    prismaMock.identityProvider.findUnique.mockResolvedValue(providerRecord);

    const res = await app.inject({
      method: "POST",
      url: "/scim/v2/provider-1/Users",
      headers: {
        authorization: "Bearer wrong-token",
      },
      payload: {
        userName: "invalid-token@example.com",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Invalid token");
  });
});

