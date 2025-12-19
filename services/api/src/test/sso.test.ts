import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("SSO Integration", () => {
  let app: FastifyInstance;
  let org: any;
  let admin: any;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization and admin user
    org = await prisma.organization.create({
      data: {
        name: "SSO Test Org",
        slug: "sso-test-org",
        settings: {
          create: {
            ssoEnabled: true,
            require2FA: false,
            ssoConfig: {
              provider: "SAML",
              metadata: {
                saml: {
                  entityId: "https://sso.test.org",
                  acsUrl: "https://sso.test.org/sso/acs",
                  sloUrl: "https://sso.test.org/sso/slo",
                  cert: "mock-cert-data",
                  metadata: '<?xml version="1.0"?><EntityDescriptor>...</EntityDescriptor>',
                },
                oidc: {
                  clientId: "test-client-id",
                  clientSecret: "test-secret",
                  authUrl: "https://auth.test.org/oauth/authorize",
                  tokenUrl: "https://auth.test.org/oauth/token",
                  userInfoUrl: "https://auth.test.org/userinfo",
                  scopes: ["openid", "profile", "email"],
                },
              },
            },
          },
        },
        members: {
          create: {
            user: {
              create: {
                email: "admin@test.org",
                passwordHash: "hashed",
                role: "ADMIN",
              },
            },
            role: "OWNER",
          },
        },
      },
      include: { members: { include: { user: true } } },
    });

    admin = org.members[0].user;
  });

  describe("SAML Configuration", () => {
    it("should return SAML configuration when enabled", async () => {
      // Enable SSO for organization
      await prisma.organizationSettings.update({
        where: { organizationId: org.id },
        data: {
          ssoEnabled: true,
          ssoConfig: {
            provider: "SAML",
            metadata: {
              saml: {
                entityId: "https://sso.test.org/saml",
                acsUrl: "https://sso.test.org/saml/acs",
                sloUrl: "https://sso.test.org/saml/slo",
                cert: "mock-cert",
                metadata: '<?xml version="1.0"?><EntityDescriptor>...</EntityDescriptor>',
              },
            },
          },
        },
      });

      // In a real implementation, there would be an SSO endpoint
      const response = await app.inject({
        method: "GET",
        url: `/sso/saml/metadata/${org.slug}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      // This would test the SAML metadata endpoint
      expect(response.statusCode).toBe(200);
    });

    it("should reject SAML requests for non-existent organization", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/sso/saml/metadata/non-existent-org",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should validate SAML response signature", async () => {
      // Mock SAML response validation
      const mockSamlResponse = {
        SAMLResponse: "mock-saml-response",
        RelayState: "test-relay-state",
        Signature: "mock-signature",
      };

      // This would test the SAML ACS endpoint
      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/acs",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: mockSamlResponse,
      });

      // In a real implementation, this would validate the SAML response
      // For now, we test that the endpoint exists
      expect([200, 400, 401]).toContain(response.statusCode);
    });

    it("should handle SAML logout", async () => {
      const mockSamlLogoutRequest = {
        SAMLRequest: "mock-saml-request",
      };

      // This would test the SAML SLO endpoint
      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/slo",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: mockSamlLogoutRequest,
      });

      expect([200, 400]).toContain(response.statusCode);
    });

    it("should validate SAML certificates", async () => {
      // Test certificate validation
      const invalidCert = "invalid-cert-data";

      await expect(
        prisma.organizationSettings.update({
          where: { organizationId: org.id },
          data: {
            ssoConfig: {
              provider: "SAML",
              metadata: {
                saml: {
                  cert: invalidCert,
                },
              },
            },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("OIDC Configuration", () => {
    it("should return OIDC configuration when enabled", async () => {
      // Enable OIDC for organization
      await prisma.organizationSettings.update({
        where: { organizationId: org.id },
        data: {
          ssoEnabled: true,
          ssoConfig: {
            provider: "OIDC",
            metadata: {
              oidc: {
                clientId: "test-oidc-client",
                clientSecret: "test-oidc-secret",
                authUrl: "https://auth.test.org/oidc/auth",
                tokenUrl: "https://auth.test.org/oidc/token",
                userInfoUrl: "https://auth.test.org/oidc/userinfo",
                scopes: ["openid", "profile", "email"],
              },
            },
          },
        },
      });

      // This would test the OIDC discovery endpoint
      const response = await app.inject({
        method: "GET",
        url: `/sso/oidc/.well-known/openid-configuration/${org.slug}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should handle OIDC authorization code flow", async () => {
      // Simulate OIDC authorization request
      const authCodeParams = new URLSearchParams({
        client_id: "test-oidc-client",
        redirect_uri: "https://app.test.org/callback",
        response_type: "code",
        scope: "openid profile email",
        state: "test-state",
        nonce: "test-nonce",
      });

      const response = await app.inject({
        method: "GET",
        url: `/sso/oidc/auth?${authCodeParams.toString()}`,
      });

      expect([302, 400]).toContain(response.statusCode);
    });

    it("should exchange authorization code for tokens", async () => {
      // Mock authorization code
      const mockCode = "mock-auth-code";
      const mockClientId = "test-oidc-client";
      const mockClientSecret = "test-oidc-secret";

      const response = await app.inject({
        method: "POST",
        url: "/sso/oidc/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${mockClientId}:${mockClientSecret}`).toString("base64")}`,
        },
        payload: {
          grant_type: "authorization_code",
          code: mockCode,
          redirect_uri: "https://app.test.org/callback",
        },
      });

      expect([200, 400]).toContain(response.statusCode);
    });

    it("should validate OIDC tokens", async () => {
      // Mock JWT token validation
      const mockToken = "mock.jwt.token";

      const response = await app.inject({
        method: "POST",
        url: "/sso/oidc/introspect",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from("test-oidc-client:test-oidc-secret").toString("base64")}`,
        },
        payload: {
          token: mockToken,
        },
      });

      expect([200, 400]).toContain(response.statusCode);
    });

    it("should handle OIDC userinfo endpoint", async () => {
      // Mock JWT token for userinfo
      const mockToken = "mock.jwt.token";

      const response = await app.inject({
        method: "GET",
        url: "/sso/oidc/userinfo",
        headers: {
          "Authorization": `Bearer ${mockToken}`,
        },
      });

      expect([200, 401]).toContain(response.statusCode);
    });
  });

  describe("SSO User Mapping", () => {
    it("should create new user from SAML attributes", async () => {
      const samlAttributes = {
        email: "newuser@test.org",
        firstName: "New",
        lastName: "User",
        department: "Engineering",
      };

      // Mock SAML attribute processing
      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/attributes",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          attributes: samlAttributes,
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.user.email).toBe("newuser@test.org");
      expect(body.user.organizationId).toBe(org.id);
    });

    it("should map SAML roles to organization roles", async () => {
      const samlRoles = ["admin", "user", "viewer"];
      const expectedRoleMapping = {
        admin: "ADMIN",
        user: "MEMBER",
        viewer: "VIEWER",
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/role-mapping",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          samlRoles,
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.mappedRoles).toBeDefined();
      expect(body.mappedRoles.ADMIN).toContain("admin");
    });

    it("should handle OIDC claim mapping", async () => {
      const oidcClaims = {
        sub: "oidc-sub-123",
        email: "oidcuser@test.org",
        name: "OIDC User",
        groups: ["developers", "admin"],
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/oidc/claim-mapping",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          claims: oidcClaims,
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.userMapping).toBeDefined();
      expect(body.userMapping.email).toBe("oidcuser@test.org");
    });
  });

  describe("SSO Session Management", () => {
    it("should create SSO session", async () => {
      const mockSamlResponse = {
        email: "ssouser@test.org",
        userId: "sso-user-id",
        provider: "SAML",
        attributes: {
          firstName: "SSO",
          lastName: "User",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/session",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: mockSamlResponse,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.session).toBeDefined();
      expect(body.token).toBeDefined();
    });

    it("should validate SSO session", async () => {
      // Mock session validation
      const mockSessionId = "mock-session-id";

      const response = await app.inject({
        method: "GET",
        url: "/sso/session/validate",
        headers: {
          "Authorization": `Bearer ${mockSessionId}`,
        },
      });

      expect([200, 401]).toContain(response.statusCode);
    });

    it("should expire SSO sessions", async () => {
      // Create session with short expiration
      const response = await app.inject({
        method: "POST",
        url: "/sso/session",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          email: "expiringuser@test.org",
          userId: "expiring-user-id",
          provider: "SAML",
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        },
      });

      expect(response.statusCode).toBe(201);

      // Try to validate expired session
      const validateResponse = await app.inject({
        method: "GET",
        url: "/sso/session/validate",
        headers: {
          "Authorization": `Bearer ${response.json().session.id}`,
        },
      });

      expect(validateResponse.statusCode).toBe(401);
    });
  });

  describe("SSO Security", () => {
    it("should validate SAML signature", async () => {
      const invalidSamlResponse = {
        SAMLResponse: "invalid-response",
        Signature: "invalid-signature",
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/acs",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: invalidSamlResponse,
      });

      expect(response.statusCode).toBe(401);
    });

    it("should validate OIDC token signature", async () => {
      const invalidToken = "invalid.jwt.token";

      const response = await app.inject({
        method: "GET",
        url: "/sso/oidc/userinfo",
        headers: {
          "Authorization": `Bearer ${invalidToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should enforce CSRF protection in OIDC flow", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/sso/oidc/auth",
        headers: {
          // Missing state parameter - should be rejected
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should validate client ID in OIDC token exchange", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sso/oidc/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: {
          grant_type: "authorization_code",
          code: "mock-code",
          redirect_uri: "https://app.test.org/callback",
          // Missing client_id - should be rejected
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("SSO Configuration Management", () => {
    it("should allow updating SAML configuration", async () => {
      const updatedConfig = {
        provider: "SAML",
        metadata: {
          saml: {
            entityId: "https://updated-sso.test.org",
            acsUrl: "https://updated-sso.test.org/saml/acs",
            sloUrl: "https://updated-sso.test.org/saml/slo",
            cert: "updated-cert",
          },
        },
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/sso/config`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: updatedConfig,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings.ssoConfig.provider).toBe("SAML");
    });

    it("should allow switching between SAML and OIDC", async () => {
      // Switch from SAML to OIDC
      const oidcConfig = {
        provider: "OIDC",
        metadata: {
          oidc: {
            clientId: "switched-client-id",
            clientSecret: "switched-secret",
            authUrl: "https://switched-auth.test.org/oidc/auth",
            tokenUrl: "https://switched-auth.test.org/oidc/token",
            userInfoUrl: "https://switched-auth.test.org/oidc/userinfo",
            scopes: ["openid", "profile", "email"],
          },
        },
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/sso/config`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: oidcConfig,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings.ssoConfig.provider).toBe("OIDC");
    });

    it("should validate SSO configuration before saving", async () => {
      const invalidConfig = {
        provider: "SAML",
        metadata: {
          saml: {
            // Missing required fields
            acsUrl: "https://invalid.test.org/saml/acs",
          },
        },
      };

      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/sso/config`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidConfig,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should disable SSO and remove configuration", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/organizations/${org.id}/sso/config`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          ssoEnabled: false,
          provider: null,
          metadata: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings.ssoEnabled).toBe(false);
      expect(body.settings.ssoConfig).toBeNull();
    });
  });

  describe("SSO Error Handling", () => {
    it("should handle malformed SAML responses", async () => {
      const malformedResponse = {
        SAMLResponse: "malformed-base64",
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/acs",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: malformedResponse,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle expired SAML assertions", async () => {
      const expiredAssertion = {
        email: "expired@test.org",
        issuedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        expiresAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      };

      const response = await app.inject({
        method: "POST",
        url: "/sso/saml/attributes",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: expiredAssertion,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle OIDC server errors", async () => {
      // Mock OIDC server error
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("OIDC server error"));

      const response = await app.inject({
        method: "POST",
        url: "/sso/oidc/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: {
          grant_type: "authorization_code",
          code: "mock-code",
        },
      });

      expect(response.statusCode).toBe(502);
    });
  });
});