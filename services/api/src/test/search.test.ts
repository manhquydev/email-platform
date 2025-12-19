import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Search Functionality", () => {
  let app: FastifyInstance;
  let org: any;
  let domain: any;
  let inbox: any;
  let messages: any[] = [];

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization
    org = await prisma.organization.create({
      data: {
        name: "Search Test Org",
        slug: "search-test",
        settings: {
          create: {
            ssoEnabled: false,
          },
        },
      },
    });

    // Create domain
    domain = await prisma.domain.create({
      data: {
        name: "search.test.com",
        organizationId: org.id,
      },
    });

    // Create inbox
    inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart: "testuser",
        organizationId: org.id,
      },
    });

    // Create test messages
    messages = await prisma.message.createMany({
      data: [
        {
          inboxId: inbox.id,
          fromAddress: "alice@company.com",
          toAddress: "testuser@search.test.com",
          subject: "Important project update",
          textBody: "This is an important message about the new project deadline and requirements.",
          receivedAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          inboxId: inbox.id,
          fromAddress: "bob@client.com",
          toAddress: "testuser@search.test.com",
          subject: "Meeting tomorrow",
          textBody: "Let's schedule a meeting for tomorrow to discuss the proposal.",
          receivedAt: new Date("2024-01-16T14:30:00Z"),
        },
        {
          inboxId: inbox.id,
          fromAddress: "newsletter@techblog.com",
          toAddress: "testuser@search.test.com",
          subject: "Latest tech news",
          textBody: "Check out the latest developments in artificial intelligence and machine learning.",
          receivedAt: new Date("2024-01-17T09:15:00Z"),
        },
        {
          inboxId: inbox.id,
          fromAddress: "noreply@service.com",
          toAddress: "testuser@search.test.com",
          subject: "Your order has been shipped",
          textBody: "Order #12345 has been shipped and is on its way to you.",
          receivedAt: new Date("2024-01-18T16:45:00Z"),
        },
        {
          inboxId: inbox.id,
          fromAddress: "security@bank.com",
          toAddress: "testuser@search.test.com",
          subject: "Security alert",
          textBody: "We detected suspicious activity on your account. Please review immediately.",
          receivedAt: new Date("2024-01-19T11:20:00Z"),
        },
      ],
    });

    // Wait for messages to be created
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Message Search", () => {
    it("should search messages by subject", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "project",
          filters: {
            inboxId: inbox.id,
          },
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].subject).toContain("project");
      expect(body.total).toBe(1);
    });

    it("should search messages by sender email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "alice@company.com",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].fromAddress).toBe("alice@company.com");
    });

    it("should search messages by body content", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "meeting tomorrow",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].textBody).toContain("meeting tomorrow");
    });

    it("should perform full-text search across all fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "artificial intelligence",
          scope: "all",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should find message about tech news
      const techNewsMessage = body.messages.find(
        (m: any) => m.subject.includes("tech news")
      );
      expect(techNewsMessage).toBeDefined();
    });

    it("should search with pagination", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
          },
          limit: 2,
          offset: 0,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(2);
      expect(body.total).toBeGreaterThan(2);
    });

    it("should search with date range filter", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            dateFrom: "2024-01-16T00:00:00Z",
            dateTo: "2024-01-18T23:59:59Z",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should find messages between Jan 16 and Jan 18
      expect(body.messages.length).toBeGreaterThan(0);
      body.messages.forEach((msg: any) => {
        const date = new Date(msg.receivedAt);
        expect(date).toBeGreaterThanOrEqual(new Date("2024-01-16T00:00:00Z"));
        expect(date).toBeLessThanOrEqual(new Date("2024-01-18T23:59:59Z"));
      });
    });

    it("should search with sender domain filter", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            senderDomain: "company.com",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should find messages from company.com
      expect(body.messages.length).toBeGreaterThan(0);
      body.messages.forEach((msg: any) => {
        expect(msg.fromAddress).toContain("company.com");
      });
    });

    it("should support fuzzy search", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "proekt", // Misspelled "project"
          fuzzy: true,
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should still find the project message despite misspelling
      expect(body.messages.length).toBeGreaterThan(0);
    });

    it("should handle search with no results", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "nonexistent term",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe("Advanced Search Filters", () => {
    beforeAll(async () => {
      // Create more test messages with different attributes
      await prisma.message.createMany({
        data: [
          {
            inboxId: inbox.id,
            fromAddress: "urgent@priority.com",
            toAddress: "testuser@search.test.com",
            subject: "URGENT: Action required immediately",
            textBody: "This message requires immediate attention.",
            receivedAt: new Date("2024-01-20T08:00:00Z"),
            isRead: false,
            isPinned: true,
          },
          {
            inboxId: inbox.id,
            fromAddress: "archived@old.com",
            toAddress: "testuser@search.test.com",
            subject: "Old document",
            textBody: "This is an archived document from last year.",
            receivedAt: new Date("2023-12-01T10:00:00Z"),
            isRead: true,
            isPinned: false,
          },
        ],
      });

      // Wait for messages to be created
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("should filter by read/unread status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            isRead: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should only return unread messages
      body.messages.forEach((msg: any) => {
        expect(msg.isRead).toBe(false);
      });
    });

    it("should filter by pinned status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            isPinned: true,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should only return pinned messages
      expect(body.messages.length).toBeGreaterThan(0);
      body.messages.forEach((msg: any) => {
        expect(msg.isPinned).toBe(true);
      });
    });

    it("should filter by multiple criteria", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            isRead: true,
            dateFrom: "2024-01-01T00:00:00Z",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should return read messages from 2024
      body.messages.forEach((msg: any) => {
        expect(msg.isRead).toBe(true);
        const date = new Date(msg.receivedAt);
        expect(date.getFullYear()).toBe(2024);
      });
    });

    it("should exclude specific senders", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
            excludeSender: "newsletter@techblog.com",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should not include newsletter
      body.messages.forEach((msg: any) => {
        expect(msg.fromAddress).not.toBe("newsletter@techblog.com");
      });
    });
  });

  describe("Search Indexing and Performance", () => {
    it("should create search indexes", async () => {
      // Test that search indexes exist by performing a search
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          analyze: true, // Include performance analysis
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.performance).toBeDefined();
      expect(body.performance.queryTime).toBeDefined();
      expect(body.performance.indexesUsed).toBeDefined();
    });

    it("should handle large result sets efficiently", async () => {
      // Create many test messages
      const bulkMessages = Array.from({ length: 100 }, (_, i) => ({
        inboxId: inbox.id,
        fromAddress: `bulk${i}@example.com`,
        toAddress: "testuser@search.test.com",
        subject: `Bulk message ${i}`,
        textBody: `This is bulk message number ${i} for performance testing.`,
        receivedAt: new Date(`2024-01-${String(21 + i).padStart(2, '0')}T10:00:00Z`),
      }));

      await prisma.message.createMany({
        data: bulkMessages,
      });

      // Wait for messages to be created
      await new Promise((resolve) => setTimeout(resolve, 200));

      const startTime = Date.now();
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "bulk",
          limit: 50,
        },
      });
      const queryTime = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.messages).toHaveLength(50);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it("should cache search results", async () => {
      // First search
      const response1 = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "project",
          cache: true,
        },
      });

      expect(response1.statusCode).toBe(200);

      // Second identical search should be faster
      const startTime = Date.now();
      const response2 = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "project",
          cache: true,
        },
      });
      const cachedQueryTime = Date.now() - startTime;

      expect(response2.statusCode).toBe(200);
      expect(cachedQueryTime).toBeLessThan(50); // Much faster when cached
    });
  });

  describe("Search Analytics and Statistics", () => {
    it("should track search queries", async () => {
      // Perform several searches
      await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "meeting",
        },
      });

      await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "project",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/search/analytics?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics).toBeDefined();
      expect(body.analytics.queries).toBeDefined();
      expect(Array.isArray(body.analytics.queries)).toBe(true);
    });

    it("should provide search statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search/statistics?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.statistics).toBeDefined();
      expect(body.statistics.totalQueries).toBeDefined();
      expect(body.statistics.averageResponseTime).toBeDefined();
      expect(body.statistics.topQueries).toBeDefined();
    });

    it("should identify popular search terms", async () => {
      // Perform multiple searches for the same term
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/messages/search",
          headers: {
            "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
            "Content-Type": "application/json",
          },
          payload: {
            query: "popular",
          },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: `/search/popular-terms?organizationId=${org.id}&limit=10`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.terms).toBeDefined();
      expect(Array.isArray(body.terms)).toBe(true);
      expect(body.terms.length).toBeGreaterThan(0);
    });
  });

  describe("Search Security and Permissions", () => {
    it("should enforce organization access control", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Search Org",
          slug: "other-search",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${otherOrg.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            organizationId: org.id,
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should prevent SQL injection in search queries", async () => {
      const maliciousQuery = "'; DROP TABLE messages; --";

      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: maliciousQuery,
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain("invalid query");
    });

    it("should rate limit search requests", async () => {
      // Perform many searches quickly
      const promises = Array.from({ length: 100 }, () =>
        app.inject({
          method: "POST",
          url: "/messages/search",
          headers: {
            "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
            "Content-Type": "application/json",
          },
          payload: {
            query: "rate",
          },
        })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.statusCode === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe("Search Export and Bulk Operations", () => {
    it("should export search results", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "*",
          filters: {
            inboxId: inbox.id,
          },
          export: true,
          format: "csv",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export).toBeDefined();
      expect(body.export.url).toBeDefined();
      expect(body.export.format).toBe("csv");
      expect(body.export.totalRecords).toBeGreaterThan(0);
    });

    it("should bulk mark messages as read from search results", async () => {
      // Create unread messages
      await prisma.message.createMany({
        data: [
          {
            inboxId: inbox.id,
            fromAddress: "bulk1@example.com",
            toAddress: "testuser@search.test.com",
            subject: "Bulk test 1",
            textBody: "Test message 1",
            receivedAt: new Date(),
            isRead: false,
          },
          {
            inboxId: inbox.id,
            fromAddress: "bulk2@example.com",
            toAddress: "testuser@search.test.com",
            subject: "Bulk test 2",
            textBody: "Test message 2",
            receivedAt: new Date(),
            isRead: false,
          },
        ],
      });

      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "bulk",
          filters: {
            inboxId: inbox.id,
            isRead: false,
          },
          bulkAction: "markAsRead",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.bulkAction).toBe("markAsRead");
      expect(body.updatedCount).toBeGreaterThan(0);
    });

    it("should bulk delete messages from search results", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/messages/search",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          query: "delete",
          filters: {
            inboxId: inbox.id,
          },
          bulkAction: "delete",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.bulkAction).toBe("delete");
      expect(body.deletedCount).toBeDefined();
    });
  });
});