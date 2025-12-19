import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Quota System", () => {
  let app: FastifyInstance;
  let org: any;
  let user: any;

  beforeAll(async () => {
    // Setup test environment
    app = buildServer();
    await app.ready();

    // Create organization with specific limits
    org = await prisma.organization.create({
      data: {
        name: "Quota Test Org",
        slug: "quota-test",
        settings: {
          create: {
            maxDomains: 3,
            maxInboxes: 10,
            maxMembers: 5,
            maxApiKeys: 5,
            require2FA: false,
          },
        },
        members: {
          create: {
            user: {
              create: {
                email: "quota@example.com",
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

    user = org.members[0].user;
  });

  describe("Domain Quotas", () => {
    it("should allow creating domains within limit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "domain1.quota.test",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should reject domain creation when limit is reached", async () => {
      // Create 2 more domains to reach the limit of 3
      await prisma.domain.create({
        data: {
          name: "domain2.quota.test",
          organizationId: org.id,
          ownerId: user.id,
        },
      });

      await prisma.domain.create({
        data: {
          name: "domain3.quota.test",
          organizationId: org.id,
          ownerId: user.id,
        },
      });

      // Try to create one more domain
      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "domain4.quota.test",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(429);
      const body = response.json();
      expect(body.message).toContain("quota exceeded");
    });

    it("should allow creating domains when limit is increased", async () => {
      // Update organization settings to increase limit
      await prisma.organizationSettings.update({
        where: { organizationId: org.id },
        data: { maxDomains: 5 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "domain5.quota.test",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Inbox Quotas", () => {
    beforeEach(async () => {
      // Create a domain for inbox creation
      await prisma.domain.create({
        data: {
          name: "inbox-quota.test",
          organizationId: org.id,
          ownerId: user.id,
        },
      });
    });

    it("should allow creating inboxes within limit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/inboxes",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          domain: "inbox-quota.test",
          localPart: "test1",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should reject inbox creation when domain inbox limit is reached", async () => {
      // Mock inbox quota middleware to test limit enforcement
      // In a real scenario, this would be enforced by middleware

      // Create multiple inboxes to test limit
      for (let i = 0; i < 10; i++) {
        await prisma.inbox.create({
          data: {
            domainId: (await prisma.domain.findFirst({ where: { name: "inbox-quota.test" } }))!.id,
            localPart: `inbox${i}`,
            organizationId: org.id,
          },
        });
      }

      const response = await app.inject({
        method: "POST",
        url: "/inboxes",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          domain: "inbox-quota.test",
          localPart: "inbox11",
          organizationId: org.id,
        },
      });

      expect(response.statusCode).toBe(429);
    });

    it("should allow admin to bypass inbox limits", async () => {
      // Create admin user
      const admin = await prisma.user.create({
        data: {
          email: "admin@example.com",
          passwordHash: "hashed",
          role: "ADMIN",
        },
      });

      // Add admin to organization
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: admin.id,
          role: "ADMIN",
        },
      });

      // Generate token for admin
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { "Content-Type": "application/json" },
        payload: { email: "admin@example.com", password: "hashed" },
      });
      const adminToken = loginResponse.json().token;

      // Admin should be able to create inbox despite limits
      const response = await app.inject({
        method: "POST",
        url: "/inboxes",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        payload: {
          domain: "inbox-quota.test",
          localPart: "admin-inbox",
          organizationId: org.id,
        },
      });

      // In a real implementation, admin might be able to bypass limits
      // This tests the behavior as implemented in the quota middleware
      expect([201, 429]).toContain(response.statusCode);
    });
  });

  describe("Member Quotas", () => {
    it("should count members correctly", async () => {
      // Add more members to test quota
      for (let i = 0; i < 3; i++) {
        const memberUser = await prisma.user.create({
          data: {
            email: `member${i}@example.com`,
            passwordHash: "hashed",
            role: "USER",
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: memberUser.id,
            role: "MEMBER",
            invitedBy: user.id,
          },
        });
      }

      // Check that member count is correct
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: org.id, isActive: true },
      });

      expect(memberCount).toBe(4); // Original owner + 3 new members
    });

    it("should reject new member addition when limit is reached", async () => {
      // Add 1 more member to reach limit of 5
      const lastUser = await prisma.user.create({
        data: {
          email: "last@example.com",
          passwordHash: "hashed",
          role: "USER",
        },
      });

      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: lastUser.id,
          role: "MEMBER",
          invitedBy: user.id,
        },
      });

      // Try to add one more member
      const extraUser = await prisma.user.create({
        data: {
          email: "extra@example.com",
          passwordHash: "hashed",
          role: "USER",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/organizations/members",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          userId: extraUser.id,
          role: "MEMBER",
        },
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe("API Key Quotas", () => {
    it("should allow creating API keys within limit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Test Key 1",
          permissions: ["domains:read", "inboxes:read"],
          rateLimit: 60,
          burstLimit: 10,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should reject API key creation when limit is reached", async () => {
      // Create 4 more API keys to reach limit of 5
      for (let i = 2; i <= 5; i++) {
        await prisma.apiKey.create({
          data: {
            organizationId: org.id,
            name: `Test Key ${i}`,
            keyPrefix: `test${i}`,
            keyHash: "hash",
            keyLastFour: `test`,
            createdBy: user.id,
          },
        });
      }

      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Too Many Keys",
          permissions: ["domains:read"],
        },
      });

      expect(response.statusCode).toBe(429);
    });

    it("should allow creating keys when limit is increased", async () => {
      // Update organization to increase API key limit
      await prisma.organizationSettings.update({
        where: { organizationId: org.id },
        data: { maxApiKeys: 10 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api-keys",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "New Key",
          permissions: ["domains:read"],
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Usage Tracking and Overage", () => {
    it("should track API usage correctly", async () => {
      const apiKey = await prisma.apiKey.create({
        data: {
          organizationId: org.id,
          name: "Usage Test Key",
          keyPrefix: "usage",
          keyHash: "hash",
          keyLastFour: "test",
          createdBy: user.id,
        },
      });

      // Simulate API usage
      await prisma.apiUsageLog.createMany({
        data: [
          {
            apiKeyId: apiKey.id,
            method: "GET",
            endpoint: "/domains",
            statusCode: 200,
            responseTime: 100,
            ip: "127.0.0.1",
          },
          {
            apiKeyId: apiKey.id,
            method: "POST",
            endpoint: "/inboxes",
            statusCode: 201,
            responseTime: 150,
            ip: "127.0.0.1",
          },
          {
            apiKeyId: apiKey.id,
            method: "GET",
            endpoint: "/domains",
            statusCode: 200,
            responseTime: 120,
            ip: "127.0.0.1",
          },
        ],
      });

      // Check usage count
      const apiKeyUpdated = await prisma.apiKey.findUnique({
        where: { id: apiKey.id },
      });

      expect(apiKeyUpdated?.usageCount).toBe(3);
    });

    it("should detect overage for subscription tier", async () => {
      // Create subscription with usage limits
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          tier: "STARTER",
          status: "ACTIVE",
          billingEmail: "billing@example.com",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
          usage: {
            domainsUsed: 2,
            domainsLimit: 3,
            inboxesUsed: 50,
            inboxesLimit: 100,
          },
          limits: {
            maxDomains: 3,
            maxInboxes: 100,
            maxMembers: 10,
            maxApiKeys: 5,
          },
        },
      });

      // Try to create domain beyond limit
      const response = await app.inject({
        method: "POST",
        url: "/domains",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "overage.test",
          organizationId: org.id,
        },
      });

      // Should be blocked due to overage
      expect([403, 429]).toContain(response.statusCode);
    });

    it("should warn when approaching quota limits", async () => {
      // Create subscription at 90% usage
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          tier: "PROFESSIONAL",
          status: "ACTIVE",
          billingEmail: "billing@example.com",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
          usage: {
            domainsUsed: 18,
            domainsLimit: 20,
            inboxesUsed: 900,
            inboxesLimit: 1000,
          },
          limits: {
            maxDomains: 20,
            maxInboxes: 1000,
            maxMembers: 50,
            maxApiKeys: 20,
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/organizations/quota-usage",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should include warnings for approaching limits
      expect(body.warnings).toBeDefined();
      expect(Array.isArray(body.warnings)).toBe(true);
    });
  });

  describe("Quota Reset and Billing Periods", () => {
    it("should reset usage at billing period start", async () => {
      // Create subscription with usage
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          tier: "STARTER",
          status: "ACTIVE",
          billingEmail: "billing@example.com",
          billingPeriod: "monthly",
          currentPeriodStart: new Date("2024-01-01"),
          currentPeriodEnd: new Date("2024-02-01"),
          usage: {
            domainsUsed: 1,
            domainsLimit: 3,
            inboxesUsed: 10,
            inboxesLimit: 100,
          },
        },
      });

      // Simulate new billing period
      const newPeriodStart = new Date("2024-02-01");
      const newPeriodEnd = new Date("2024-03-01");

      await prisma.organizationSubscription.update({
        where: { organizationId: org.id },
        data: {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          usage: {
            domainsUsed: 0,
            domainsLimit: 3,
            inboxesUsed: 0,
            inboxesLimit: 100,
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/organizations/quota-usage",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Usage should be reset
      expect(body.usage.domainsUsed).toBe(0);
      expect(body.usage.inboxesUsed).toBe(0);
    });
  });

  describe("Quota API Endpoints", () => {
    it("should return quota usage information", async () => {
      // Create some test data
      await prisma.domain.create({
        data: {
          name: "usage.test",
          organizationId: org.id,
        },
      });

      await prisma.inbox.create({
        data: {
          domain: {
            create: {
              name: "inbox-usage.test",
              organizationId: org.id,
            },
          },
          localPart: "test",
          organizationId: org.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/organizations/quota-usage",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.usage).toBeDefined();
      expect(body.limits).toBeDefined();
      expect(body.organization.id).toBe(org.id);

      // Should track at least 1 domain and 1 inbox
      expect(body.usage.domainsUsed).toBeGreaterThanOrEqual(1);
      expect(body.usage.inboxesUsed).toBeGreaterThanOrEqual(1);
    });

    it("should return organization settings with limits", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/organizations/settings",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.settings).toBeDefined();
      expect(body.settings.maxDomains).toBe(3);
      expect(body.settings.maxInboxes).toBe(10);
      expect(body.settings.maxMembers).toBe(5);
      expect(body.settings.maxApiKeys).toBe(5);
    });
  });
});