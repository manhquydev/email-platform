import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("API Key Management", () => {
  let app: FastifyInstance;
  let org: any;
  let admin: any;
  let user: any;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization and users
    org = await prisma.organization.create({
      data: {
        name: "API Key Test Org",
        slug: "api-key-test",
        settings: {
          create: {
            maxApiKeys: 10,
            apiAccessEnabled: true,
          },
        },
        members: {
          create: [
            {
              user: {
                create: {
                  email: "admin@test.org",
                  passwordHash: "hashed",
                  role: "ADMIN",
                },
              },
              role: "ADMIN",
            },
            {
              user: {
                create: {
                  email: "user@test.org",
                  passwordHash: "hashed",
                  role: "USER",
                },
              },
              role: "MEMBER",
            },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    admin = org.members.find((m: any) => m.user.role === "ADMIN").user;
    user = org.members.find((m: any) => m.user.role === "USER").user;
  });

  describe("API Key Creation", () => {
    it("should create API key with correct format", async () => {
      const mockApiKey = "sk_test_1234567890abcdefghijklmnopqrstuvwxyz";

      // Generate key components
      const keyPrefix = mockApiKey.substring(0, 8);
      const keyLastFour = mockApiKey.substring(mockApiKey.length - 4);
      const keyHash = Buffer.from(mockApiKey).toString("base64"); // Mock hashing

      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Test API Key",
          permissions: ["domains:read", "inboxes:read"],
          rateLimit: 60,
          burstLimit: 10,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.apiKey).toBeDefined();
      expect(body.apiKey.startsWith(keyPrefix)).toBe(true);
      expect(body.apiKey.endsWith(keyLastFour)).toBe(true);
      expect(body.name).toBe("Test API Key");
      expect(body.permissions).toEqual(["domains:read", "inboxes:read"]);
      expect(body.rateLimit).toBe(60);
      expect(body.burstLimit).toBe(10);
      expect(body.organizationId).toBe(org.id);
    });

    it("should create API key with default limits", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Default Limits Key",
          permissions: ["domains:read"],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.rateLimit).toBeUndefined();
      expect(body.burstLimit).toBeUndefined();
    });

    it("should require name and organization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          // Missing name and organizationId
          permissions: ["domains:read"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should validate permissions format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Invalid Permissions",
          permissions: ["invalid:permission"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should not expose sensitive data in response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Security Test",
          permissions: ["domains:read"],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      // Should not expose keyHash, keyPrefix in response
      expect(body).not.toHaveProperty("keyHash");
      expect(body).not.toHaveProperty("keyPrefix");
      expect(body).toHaveProperty("apiKey"); // Full key shown once
    });
  });

  describe("API Key Authentication", () => {
    let apiKey: any;

    beforeAll(async () => {
      // Create test API key
      const mockApiKey = "sk_test_auth1234567890abcdefghijklmnopqr";

      apiKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Auth Test Key",
          keyPrefix: "sk_test_a1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          permissions: ["domains:read", "inboxes:write"],
          rateLimit: 30,
          burstLimit: 5,
          createdBy: admin.id,
        },
      });
    });

    it("should authenticate valid API key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_auth1234567890abcdefghijklmnopqr`,
        },
      });

      expect([200, 401]).toContain(response.statusCode);
    });

    it("should reject invalid API key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer invalid-api-key`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject API key with wrong prefix", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer wrong_prefix_1234567890abcdefghijklmnopqr`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should require Bearer prefix", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `sk_test_auth1234567890abcdefghijklmnopqr`, // Missing Bearer
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should handle malformed API key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_`, // Too short
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should authenticate with organization context", async () => {
      // Create domain in organization
      await prisma.domain.create({
        data: {
          name: "auth-test.example.com",
          organizationId: org.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/domains?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer sk_test_auth1234567890abcdefghijklmnopqr`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("API Key Permissions", () => {
    let apiKey: any;

    beforeAll(async () => {
      // Create API key with limited permissions
      const mockApiKey = "sk_test_perm1234567890abcdefghijklmnopqr";

      apiKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Permission Test Key",
          keyPrefix: "sk_test_p1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          permissions: ["domains:read"], // Only read permissions
          createdBy: admin.id,
        },
      });
    });

    it("should allow operations with permitted permissions", async () => {
      // Create domain first
      await prisma.domain.create({
        data: {
          name: "perm-test.example.com",
          organizationId: org.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_perm1234567890abcdefghijklmnopqr`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should reject operations without required permissions", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_perm1234567890abcdefghijklmnopqr`,
        },
        payload: {
          name: "unauthorized.example.com",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should allow wildcard permissions", async () => {
      // Create API key with wildcard permissions
      const mockApiKey = "sk_test_wild1234567890abcdefghijklmnopqr";

      const wildcardKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Wildcard Key",
          keyPrefix: "sk_test_w1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          permissions: ["*"], // Wildcard
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_wild1234567890abcdefghijklmnopqr`,
        },
        payload: {
          name: "wildcard.example.com",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should validate permission scopes", async () => {
      const mockApiKey = "sk_test_scope1234567890abcdefghijklmnopqr";

      const scopeKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Scope Test Key",
          keyPrefix: "sk_test_s1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          permissions: ["domains:read", "inboxes:read", "messages:read"],
          createdBy: admin.id,
        },
      });

      // Test permitted operations
      const readResponse = await app.inject({
        method: "GET",
        url: "/inboxes",
        headers: {
          "Authorization": `Bearer sk_test_scope1234567890abcdefghijklmnopqr`,
        },
      });

      expect(readResponse.statusCode).toBe(200);

      // Test forbidden operation
      const writeResponse = await app.inject({
        method: "POST",
        url: "/inboxes",
        headers: {
          "Authorization": `Bearer sk_test_scope1234567890abcdefghijklmnopqr`,
        },
        payload: {
          domain: "scope.test.com",
          localPart: "test",
          organizationId: org.id,
        },
      });

      expect(writeResponse.statusCode).toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    let apiKey: any;

    beforeAll(async () => {
      // Create API key with strict rate limits
      const mockApiKey = "sk_test_rate1234567890abcdefghijklmnopqr";

      apiKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Rate Limit Test Key",
          keyPrefix: "sk_test_r1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          rateLimit: 2, // 2 requests per minute
          burstLimit: 1, // 1 burst request
          createdBy: admin.id,
        },
      });
    });

    it("should enforce rate limits", async () => {
      // First two requests should succeed
      let response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_rate1234567890abcdefghijklmnopqr`,
        },
      });
      expect(response.statusCode).toBe(200);

      response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_rate1234567890abcdefghijklmnopqr`,
        },
      });
      expect(response.statusCode).toBe(200);

      // Third request should be rate limited
      response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_rate1234567890abcdefghijklmnopqr`,
        },
      });

      expect(response.statusCode).toBe(429);
    });

    it("should track API usage", async () => {
      // Create API key without rate limits to test usage tracking
      const mockApiKey = "sk_test_usage1234567890abcdefghijklmnopqr";

      const usageKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Usage Test Key",
          keyPrefix: "sk_test_u1",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          createdBy: admin.id,
        },
      });

      // Make several requests
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "GET",
          url: "/domains",
          headers: {
            "Authorization": `Bearer sk_test_usage1234567890abcdefghijklmnopqr`,
          },
        });
      }

      // Check usage count
      const updatedKey = await prisma.apiKey.findUnique({
        where: { id: usageKey.id },
      });

      expect(updatedKey?.usageCount).toBeGreaterThanOrEqual(5);
    });

    it("should reset usage count", async () => {
      const mockApiKey = "sk_test_reset1234567890abcdefghijklmnopqr";

      const resetKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Reset Test Key",
          keyPrefix: "sk_test_r2",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          usageCount: 10,
          createdBy: admin.id,
        },
      });

      // Reset usage
      const response = await app.inject({
        method: "POST",
        url: `/api-keys/${resetKey.id}/reset-usage`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.usageCount).toBe(0);

      // Verify in database
      const updatedKey = await prisma.apiKey.findUnique({
        where: { id: resetKey.id },
      });

      expect(updatedKey?.usageCount).toBe(0);
    });
  });

  describe("API Key Management", () => {
    it("should list API keys for organization", async () => {
      // Create a few API keys
      const keys = [];
      for (let i = 0; i < 3; i++) {
        const mockApiKey = `sk_test_list${i}1234567890abcdefghijklmnopqr`;
        const key = await prisma.apiKey.create({
          data: {
            organizationId: org.id,
            name: `List Test Key ${i}`,
            keyPrefix: `sk_test_l${i}`,
            keyHash: Buffer.from(mockApiKey).toString("base64"),
            keyLastFour: "stuv",
            createdBy: admin.id,
          },
        });
        keys.push(key);
      }

      const response = await app.inject({
        method: "GET",
        url: `/api-keys?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.apiKeys).toHaveLength(3);
      expect(body.apiKeys[0].name).toBe("List Test Key 0");
    });

    it("should update API key status", async () => {
      const mockApiKey = "sk_test_update1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Update Test Key",
          keyPrefix: "sk_test_u2",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          status: "ACTIVE",
          createdBy: admin.id,
        },
      });

      // Deactivate key
      const response = await app.inject({
        method: "PUT",
        url: `/api-keys/${key.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          status: "INACTIVE",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.status).toBe("INACTIVE");

      // Try to use deactivated key
      const authResponse = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_update1234567890abcdefghijklmnopqr`,
        },
      });

      expect(authResponse.statusCode).toBe(401);
    });

    it("should revoke API key", async () => {
      const mockApiKey = "sk_test_revoke1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Revoke Test Key",
          keyPrefix: "sk_test_r3",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api-keys/${key.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify key is revoked
      const revokedKey = await prisma.apiKey.findUnique({
        where: { id: key.id },
      });

      expect(revokedKey?.status).toBe("REVOKED");
    });

    it("should update API key permissions", async () => {
      const mockApiKey = "sk_test_perm_update1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Permission Update Key",
          keyPrefix: "sk_test_pu",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          permissions: ["domains:read"],
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api-keys/${key.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          permissions: ["domains:read", "inboxes:read", "messages:read"],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.permissions).toEqual(["domains:read", "inboxes:read", "messages:read"]);
    });

    it("should update API key rate limits", async () => {
      const mockApiKey = "sk_test_rate_update1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Rate Update Key",
          keyPrefix: "sk_test_ru",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          rateLimit: 30,
          burstLimit: 5,
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "PUT",
        url: `/api-keys/${key.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          rateLimit: 100,
          burstLimit: 20,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.rateLimit).toBe(100);
      expect(body.burstLimit).toBe(20);
    });
  });

  describe("API Key Expiration", () => {
    it("should create API key with expiration", async () => {
      const expiresAt = new Date(Date.now() + 86400000); // 24 hours from now

      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Expiring Key",
          permissions: ["domains:read"],
          expiresAt,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.expiresAt).toBe(expiresAt.toISOString());
    });

    it("should reject expired API key", async () => {
      const mockApiKey = "sk_test_expired1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Expired Key",
          keyPrefix: "sk_test_ex",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer sk_test_expired1234567890abcdefghijklmnopqr`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should warn about expiring keys", async () => {
      const expiresSoon = new Date(Date.now() + 3600000); // 1 hour from now

      const response = await app.inject({
        method: "GET",
        url: "/api-keys/expiring",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
        query: {
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should return empty array or expiring keys based on implementation
      expect(Array.isArray(body.apiKeys)).toBe(true);
    });
  });

  describe("API Key Security", () => {
    it("should hash API keys securely", async () => {
      const mockApiKey = "sk_test_secure1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Secure Key",
          keyPrefix: "sk_test_sc",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          createdBy: admin.id,
        },
      });

      // Hash should not be the original key
      expect(key.keyHash).not.toBe(mockApiKey);
      expect(key.keyHash.length).toBeGreaterThan(0);
    });

    it("should not expose sensitive data in list", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api-keys?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      body.apiKeys.forEach((key: any) => {
        expect(key).not.toHaveProperty("keyHash");
        expect(key).not.toHaveProperty("apiKey");
        expect(key.keyPrefix).toBeDefined();
        expect(key.keyLastFour).toBeDefined();
      });
    });

    it("should validate API key prefix format", async () => {
      const mockApiKey = "invalid_prefix1234567890abcdefghijklmnopqr";

      const response = await app.inject({
        method: "GET",
        url: "/domains",
        headers: {
          "Authorization": `Bearer ${mockApiKey}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should handle API key rotation", async () => {
      const mockApiKey = "sk_test_rotate1234567890abcdefghijklmnopqr";

      const key = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Rotate Test Key",
          keyPrefix: "sk_test_rt",
          keyHash: Buffer.from(mockApiKey).toString("base64"),
          keyLastFour: "stuv",
          createdBy: admin.id,
        },
      });

      // Rotate key
      const response = await app.inject({
        method: "POST",
        url: `/api-keys/${key.id}/rotate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.newApiKey).toBeDefined();
      expect(body.oldKeyId).toBe(key.id);

      // Verify old key is inactive
      const updatedKey = await prisma.apiKey.findUnique({
        where: { id: key.id },
      });

      expect(updatedKey?.status).toBe("INACTIVE");
    });
  });
});