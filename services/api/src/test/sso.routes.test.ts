import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";

const mockSamlGetProvider = vi.hoisted(() => vi.fn());
const mockOidcGetProvider = vi.hoisted(() => vi.fn());
const mockProvisionUser = vi.hoisted(() => vi.fn());

vi.mock("../_wip/identity/saml-sp", () => ({
  SamlService: { getProvider: mockSamlGetProvider },
}));

vi.mock("../_wip/identity/oidc-client", () => ({
  OidcService: { getProvider: mockOidcGetProvider },
}));

vi.mock("../_wip/identity/jit-provisioning", () => ({
  provisionUser: mockProvisionUser,
}));

import { ssoRoutes } from "../routes/sso";

describe("SSO Routes (focused, mocked) - smoke/authz/negative", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.register(jwt, { secret: "test-secret" });
    await app.register(ssoRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("smoke: redirects for SAML login initiation", async () => {
    mockSamlGetProvider.mockResolvedValue({
      getAuthorizeUrl: vi.fn().mockResolvedValue("https://idp.example.com/login"),
    });

    const res = await app.inject({
      method: "GET",
      url: "/sso/saml/provider-a/login",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://idp.example.com/login");
  });

  it("authz: route is intentionally public (no bearer required)", async () => {
    mockOidcGetProvider.mockResolvedValue({
      getAuthorizationUrl: vi.fn().mockReturnValue("https://oidc.example.com/auth"),
    });

    const res = await app.inject({
      method: "GET",
      url: "/sso/oidc/provider-b/login",
    });

    expect(res.statusCode).toBe(302);
    expect(res.statusCode).not.toBe(401);
  });

  it("negative: returns 400 when SAML provider initialization fails", async () => {
    mockSamlGetProvider.mockRejectedValue(new Error("provider not configured"));

    const res = await app.inject({
      method: "GET",
      url: "/sso/saml/provider-c/login",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("SSO initiation failed");
  });
});

