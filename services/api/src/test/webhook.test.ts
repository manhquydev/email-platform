import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Webhook System", () => {
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
        name: "Webhook Test Org",
        slug: "webhook-test",
        settings: {
          create: {
            webhooksEnabled: true,
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

  describe("Webhook Configuration", () => {
    it("should create webhook configuration", async () => {
      const webhookConfig = {
        organizationId: org.id,
        name: "Message Created Webhook",
        url: "https://example.com/webhook",
        secret: "webhook_secret_123",
        events: ["message.created", "message.deleted"],
        timeout: 30,
        retryAttempts: 5,
        retryDelay: 120,
        description: "Notify when messages are created or deleted",
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: webhookConfig,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.webhook.id).toBeDefined();
      expect(body.webhook.name).toBe("Message Created Webhook");
      expect(body.webhook.url).toBe("https://example.com/webhook");
      expect(body.webhook.events).toEqual(["message.created", "message.deleted"]);
      expect(body.webhook.timeout).toBe(30);
      expect(body.webhook.retryAttempts).toBe(5);
      expect(body.webhook.retryDelay).toBe(120);
      expect(body.webhook.secret).toBe("webhook_secret_123");
    });

    it("should validate webhook URL format", async () => {
      const invalidWebhookConfig = {
        organizationId: org.id,
        name: "Invalid URL Webhook",
        url: "invalid-url",
        events: ["message.created"],
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidWebhookConfig,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should require events array", async () => {
      const webhookConfig = {
        organizationId: org.id,
        name: "No Events Webhook",
        url: "https://example.com/webhook",
        // Missing events
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: webhookConfig,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should validate event types", async () => {
      const webhookConfig = {
        organizationId: org.id,
        name: "Invalid Event Webhook",
        url: "https://example.com/webhook",
        events: ["invalid.event"],
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: webhookConfig,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should set default values", async () => {
      const webhookConfig = {
        organizationId: org.id,
        name: "Default Values Webhook",
        url: "https://example.com/webhook",
        events: ["message.created"],
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: webhookConfig,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.webhook.timeout).toBe(30); // Default
      expect(body.webhook.retryAttempts).toBe(3); // Default
      expect(body.webhook.retryDelay).toBe(60); // Default
      expect(body.webhook.status).toBe("ACTIVE"); // Default
    });
  });

  describe("Webhook Management", () => {
    let webhook: any;

    beforeAll(async () => {
      webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Management Test Webhook",
          url: "https://example.com/webhook",
          secret: "test_secret",
          events: ["message.created", "domain.created"],
          timeout: 30,
          retryAttempts: 3,
          retryDelay: 60,
          createdBy: admin.id,
        },
      });
    });

    it("should list webhooks for organization", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/webhooks?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.webhooks).toHaveLength(1);
      expect(body.webhooks[0].name).toBe("Management Test Webhook");
    });

    it("should get specific webhook", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/webhooks/${webhook.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.webhook.id).toBe(webhook.id);
      expect(body.webhook.name).toBe("Management Test Webhook");
    });

    it("should update webhook configuration", async () => {
      const updateConfig = {
        name: "Updated Webhook Name",
        events: ["message.created", "message.updated", "domain.created"],
        timeout: 45,
        retryAttempts: 5,
        retryDelay: 90,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/webhooks/${webhook.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: updateConfig,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.webhook.name).toBe("Updated Webhook Name");
      expect(body.webhook.events).toEqual(["message.created", "message.updated", "domain.created"]);
      expect(body.webhook.timeout).toBe(45);
      expect(body.webhook.retryAttempts).toBe(5);
      expect(body.webhook.retryDelay).toBe(90);
    });

    it("should enable/disable webhook", async () => {
      // Disable webhook
      const response = await app.inject({
        method: "PUT",
        url: `/webhooks/${webhook.id}`,
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

      expect(body.webhook.status).toBe("INACTIVE");

      // Verify webhook is disabled
      const disabledWebhook = await prisma.webhook.findUnique({
        where: { id: webhook.id },
      });

      expect(disabledWebhook?.status).toBe("INACTIVE");
    });

    it("should delete webhook", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/webhooks/${webhook.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify webhook is deleted
      const deletedWebhook = await prisma.webhook.findUnique({
        where: { id: webhook.id },
      });

      expect(deletedWebhook).toBeNull();
    });

    it("should handle non-existent webhook", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/webhooks/non-existent-id",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Webhook Delivery", () => {
    let webhook: any;
    let mockWebhookUrl: string;

    beforeAll(async () => {
      // Mock webhook URL
      mockWebhookUrl = "http://localhost:3000/mock-webhook";

      webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Delivery Test Webhook",
          url: mockWebhookUrl,
          secret: "delivery_secret_123",
          events: ["message.created"],
          timeout: 10,
          retryAttempts: 3,
          retryDelay: 5,
          createdBy: admin.id,
        },
      });
    });

    it("should deliver webhook payload successfully", async () => {
      // Create mock webhook server
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const payload = {
        event: "message.created",
        data: {
          id: "msg-123",
          inboxId: "inbox-123",
          from: "sender@example.com",
          to: "test@webhook.test",
          subject: "Test Message",
          receivedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();

      expect(body.delivery.id).toBeDefined();
      expect(body.delivery.status).toBe("pending");
      expect(body.delivery.webhookId).toBe(webhook.id);
      expect(body.delivery.event).toBe("message.created");
      expect(body.delivery.payload).toEqual(payload);

      // Verify delivery was attempted
      expect(fetch).toHaveBeenCalledWith(
        mockWebhookUrl,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Signature": expect.any(String),
            "X-Webhook-Event": "message.created",
            "X-Webhook-Id": webhook.id,
          }),
        })
      );
    });

    it("should retry delivery on failure", async () => {
      // Mock failed first attempt, successful retry
      vi.spyOn(global, "fetch")
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: vi.fn().mockResolvedValue({ success: true }),
        } as any);

      const payload = {
        event: "message.updated",
        data: {
          id: "msg-456",
          changes: { subject: "Updated Subject" },
        },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);

      // Verify multiple attempts
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle webhook signature validation", async () => {
      const payload = {
        event: "message.created",
        data: { id: "msg-789" },
        timestamp: new Date().toISOString(),
      };

      // Generate signature
      const signature = require("crypto")
        .createHmac("sha256", webhook.secret)
        .update(JSON.stringify(payload))
        .digest("hex");

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(202);
    });

    it("should reject invalid signature", async () => {
      const payload = {
        event: "message.created",
        data: { id: "msg-789" },
        timestamp: new Date().toISOString(),
      };

      // Invalid signature
      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
          "X-Webhook-Signature": "invalid-signature",
        },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should handle timeout during delivery", async () => {
      // Mock slow response
      vi.spyOn(global, "fetch").mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  statusText: "OK",
                  json: vi.fn().mockResolvedValue({ success: true }),
                } as any),
              2000 // 2 seconds, longer than timeout of 10
            )
          )
      );

      const payload = {
        event: "message.created",
        data: { id: "msg-timeout" },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);
    });

    it("should track webhook delivery attempts", async () => {
      // Clear previous deliveries
      await prisma.webhookDelivery.deleteMany({
        where: { webhookId: webhook.id },
      });

      // Mock successful delivery
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const payload = {
        event: "message.created",
        data: { id: "msg-track" },
        timestamp: new Date().toISOString(),
      };

      await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      // Check delivery records
      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookId: webhook.id },
      });

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].webhookId).toBe(webhook.id);
      expect(deliveries[0].eventType).toBe("message.created");
      expect(deliveries[0].attempt).toBe(1);
      expect(deliveries[0].status).toBe("delivered");
    });
  });

  describe("Webhook Events and Payloads", () => {
    let webhook: any;
    let domain: any;
    let inbox: any;

    beforeAll(async () => {
      webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Events Test Webhook",
          url: "https://example.com/webhook",
          events: [
            "message.created",
            "message.deleted",
            "domain.created",
            "domain.updated",
            "domain.deleted",
          ],
          createdBy: admin.id,
        },
      });

      domain = await prisma.domain.create({
        data: {
          name: "events.test.com",
          organizationId: org.id,
        },
      });

      inbox = await prisma.inbox.create({
        data: {
          domainId: domain.id,
          localPart: "test",
          organizationId: org.id,
        },
      });
    });

    it("should generate message.created payload", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const payload = {
        event: "message.created",
        data: {
          id: "msg-123",
          inboxId: inbox.id,
          from: "sender@test.com",
          to: "test@events.test.com",
          subject: "Test Message",
          textBody: "Hello, this is a test message",
          receivedAt: new Date().toISOString(),
          attachments: [],
        },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);
    });

    it("should generate domain.created payload", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const newDomain = {
        id: "domain-123",
        name: "new.test.com",
        status: "VERIFIED",
        organizationId: org.id,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        event: "domain.created",
        data: newDomain,
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);
    });

    it("should handle bulk events", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const bulkPayload = {
        event: "message.bulk",
        data: {
          messages: [
            {
              id: "msg-1",
              inboxId: inbox.id,
              from: "sender1@test.com",
              to: "test@events.test.com",
              subject: "Bulk Message 1",
            },
            {
              id: "msg-2",
              inboxId: inbox.id,
              from: "sender2@test.com",
              to: "test@events.test.com",
              subject: "Bulk Message 2",
            },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: bulkPayload,
      });

      expect(response.statusCode).toBe(202);
    });

    it("should filter events based on webhook subscription", async () => {
      const restrictedWebhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Restricted Events Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"], // Only subscribed to this
          createdBy: admin.id,
        },
      });

      // Deliver message.created (should work)
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ success: true }),
      } as any);

      const messagePayload = {
        event: "message.created",
        data: { id: "msg-filtered" },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${restrictedWebhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: messagePayload,
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe("Webhook Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      const webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Error Test Webhook",
          url: "https://nonexistent.example.com/webhook",
          events: ["message.created"],
          retryAttempts: 2,
          retryDelay: 1,
          createdBy: admin.id,
        },
      });

      const payload = {
        event: "message.created",
        data: { id: "msg-error" },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);

      // Check for failed delivery
      const delivery = await prisma.webhookDelivery.findFirst({
        where: { webhookId: webhook.id },
      });

      expect(delivery?.status).toBe("failed");
      expect(delivery?.error).toContain("Network error");
    });

    it("should handle invalid HTTP status codes", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: vi.fn().mockResolvedValue({ error: "Invalid payload" }),
      } as any);

      const webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Status Error Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"],
          retryAttempts: 1,
          retryDelay: 1,
          createdBy: admin.id,
        },
      });

      const payload = {
        event: "message.created",
        data: { id: "msg-status-error" },
        timestamp: new Date().toISOString(),
      };

      const response = await app.inject({
        method: "POST",
        url: `/webhooks/${webhook.id}/deliver`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload,
      });

      expect(response.statusCode).toBe(202);

      // Check for failed delivery
      const delivery = await prisma.webhookDelivery.findFirst({
        where: { webhookId: webhook.id },
      });

      expect(delivery?.statusCode).toBe(400);
      expect(delivery?.status).toBe("failed");
    });

    it("should handle webhook configuration validation errors", async () => {
      const invalidWebhookConfig = {
        organizationId: org.id,
        name: "Invalid Config Webhook",
        url: "http://invalid-url",
        events: ["invalid.event"],
      };

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidWebhookConfig,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Webhook Security", () => {
    it("should require proper authorization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        // No authorization header
        payload: {
          organizationId: org.id,
          name: "Unauthorized Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should validate organization ownership", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Organization",
          slug: "other-org",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: otherOrg.id,
          name: "Unauthorized Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should validate webhook secret format", async () => {
      const webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Secret Test Webhook",
          url: "https://example.com/webhook",
          secret: "weak", // Too short secret
          events: ["message.created"],
          createdBy: admin.id,
        },
      });

      expect(webhook.id).toBeDefined();
    });
  });

  describe("Webhook History and Analytics", () => {
    let webhook: any;

    beforeAll(async () => {
      webhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Analytics Test Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"],
          createdBy: admin.id,
        },
      });

      // Create some delivery records
      const deliveries = [];
      for (let i = 0; i < 10; i++) {
        deliveries.push({
          webhookId: webhook.id,
          eventType: "message.created",
          payload: { id: `msg-${i}` },
          statusCode: i < 8 ? 200 : 500, // 8 success, 2 failures
          duration: Math.random() * 1000,
          attempt: 1,
          status: i < 8 ? "delivered" : "failed",
        });
      }

      await prisma.webhookDelivery.createMany({
        data: deliveries,
      });
    });

    it("should get webhook delivery history", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/webhooks/${webhook.id}/deliveries`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.deliveries).toHaveLength(10);
      expect(body.deliveries[0].webhookId).toBe(webhook.id);
    });

    it("should filter webhook deliveries", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/webhooks/${webhook.id}/deliveries`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
        query: {
          status: "delivered",
          limit: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.deliveries).toHaveLength(5);
      expect(body.deliveries[0].status).toBe("delivered");
    });

    it("should provide webhook analytics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/webhooks/${webhook.id}/analytics`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics).toBeDefined();
      expect(body.analytics.totalDeliveries).toBe(10);
      expect(body.analytics.successRate).toBe(80); // 8/10
      expect(body.analytics.averageDuration).toBeDefined();
    });

    it("should calculate retry statistics", async () => {
      // Create webhook with retries
      const retryWebhook = await prisma.webhook.create({
        data: {
          organizationId: org.id,
          name: "Retry Stats Webhook",
          url: "https://example.com/webhook",
          events: ["message.created"],
          retryAttempts: 3,
          retryDelay: 5,
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/webhooks/${retryWebhook.id}/analytics`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics.retryAttempts).toBeDefined();
      expect(body.analytics.successRate).toBeDefined();
    });
  });
});