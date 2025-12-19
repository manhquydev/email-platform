import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Automation Rules", () => {
  let app: FastifyInstance;
  let org: any;
  let domain: any;
  let inbox: any;
  let user: any;
  let admin: any;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    // Create organization and users
    org = await prisma.organization.create({
      data: {
        name: "Automation Test Org",
        slug: "automation-test",
        settings: {
          create: {
            ssoEnabled: false,
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

    // Create domain
    domain = await prisma.domain.create({
      data: {
        name: "automation.test.com",
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

    // Create labels
    await prisma.label.create({
      data: {
        inboxId: inbox.id,
        name: "Important",
        color: "#EF4444",
      },
    });

    await prisma.label.create({
      data: {
        inboxId: inbox.id,
        name: "Newsletter",
        color: "#3B82F6",
      },
    });
  });

  describe("Automation Rule Creation", () => {
    it("should create automation rule", async () => {
      const rule = {
        name: "Spam Filter",
        description: "Mark messages from known spam domains as spam",
        matchType: "ALL",
        conditions: [
          {
            field: "SENDER_DOMAIN",
            operator: "CONTAINS",
            value: "spam",
          },
          {
            field: "HAS_ATTACHMENT",
            operator: "EQUALS",
            value: "false",
          },
        ],
        actions: [
          {
            type: "MARK_SPAM",
          },
        ],
        priority: 1,
        isEnabled: true,
        organizationId: org.id,
      };

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: rule,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.rule.name).toBe("Spam Filter");
      expect(body.rule.id).toBeDefined();
      expect(body.rule.conditions).toEqual(rule.conditions);
      expect(body.rule.actions).toEqual(rule.actions);
    });

    it("should validate rule conditions", async () => {
      const invalidRule = {
        name: "Invalid Rule",
        description: "Rule with invalid conditions",
        matchType: "ALL",
        conditions: [
          {
            field: "INVALID_FIELD",
            operator: "CONTAINS",
            value: "test",
          },
        ],
        actions: [
          {
            type: "MOVE_TO_FOLDER",
            value: "invalid-folder",
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidRule,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should validate rule actions", async () => {
      const invalidRule = {
        name: "Invalid Action Rule",
        description: "Rule with invalid actions",
        matchType: "ALL",
        conditions: [
          {
            field: "FROM",
            operator: "CONTAINS",
            value: "test",
          },
        ],
        actions: [
          {
            type: "INVALID_ACTION",
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: invalidRule,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should create rule with ANY match type", async () => {
      const rule = {
        name: "Important Messages",
        description: "Mark messages as important if they match any condition",
        matchType: "ANY",
        conditions: [
          {
            field: "SUBJECT",
            operator: "CONTAINS",
            value: "urgent",
          },
          {
            field: "FROM",
            operator: "CONTAINS",
            value: "boss",
          },
        ],
        actions: [
          {
            type: "ADD_LABEL",
            value: "Important",
          },
        ],
        priority: 5,
        isEnabled: true,
      };

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: rule,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.rule.matchType).toBe("ANY");
    });

    it("should create rule with complex conditions", async () => {
      const rule = {
        name: "Newsletter Filter",
        description: "Filter newsletters based on multiple criteria",
        matchType: "ALL",
        conditions: [
          {
            field: "SUBJECT",
            operator: "REGEX",
            value: "Newsletter|Digest|Update",
          },
          {
            field: "BODY",
            operator: "CONTAINS",
            value: "unsubscribe",
          },
          {
            field: "HAS_ATTACHMENT",
            operator: "EQUALS",
            value: "false",
          },
        ],
        actions: [
          {
            type: "ADD_LABEL",
            value: "Newsletter",
          },
          {
            type: "MOVE_TO_FOLDER",
            value: "Archive",
          },
        ],
        priority: 2,
        isEnabled: true,
      };

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: rule,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.rule.conditions).toHaveLength(3);
      expect(body.rule.actions).toHaveLength(2);
    });
  });

  describe("Automation Rule Management", () => {
    let rule: any;

    beforeAll(async () => {
      rule = await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Test Rule",
          description: "Test automation rule",
          matchType: "ALL",
          conditions: [
            { field: "FROM", operator: "CONTAINS", value: "test" },
          ],
          actions: [
            { type: "ADD_LABEL", value: "Test" },
          ],
          priority: 1,
          isEnabled: true,
          createdBy: admin.id,
        },
      });
    });

    it("should list automation rules", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.rules).toHaveLength(1);
      expect(body.rules[0].name).toBe("Test Rule");
    });

    it("should get specific rule", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/${rule.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.rule.id).toBe(rule.id);
      expect(body.rule.name).toBe("Test Rule");
    });

    it("should update rule", async () => {
      const update = {
        name: "Updated Test Rule",
        description: "Updated description",
        priority: 5,
        isEnabled: false,
      };

      const response = await app.inject({
        method: "PUT",
        url: `/automation/rules/${rule.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: update,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.rule.name).toBe("Updated Test Rule");
      expect(body.rule.priority).toBe(5);
      expect(body.rule.isEnabled).toBe(false);
    });

    it("should enable/disable rule", async () => {
      // Disable rule
      const disableResponse = await app.inject({
        method: "PUT",
        url: `/automation/rules/${rule.id}/disable`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(disableResponse.statusCode).toBe(200);
      const disabledBody = disableResponse.json();
      expect(disabledBody.rule.isEnabled).toBe(false);

      // Enable rule
      const enableResponse = await app.inject({
        method: "PUT",
        url: `/automation/rules/${rule.id}/enable`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(enableResponse.statusCode).toBe(200);
      const enabledBody = enableResponse.json();
      expect(enabledBody.rule.isEnabled).toBe(true);
    });

    it("should delete rule", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/automation/rules/${rule.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify rule is deleted
      const listResponse = await app.inject({
        method: "GET",
        url: `/automation/rules?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(listResponse.json().rules).toHaveLength(0);
    });

    it("should handle non-existent rule", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/automation/rules/non-existent-id",
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Rule Evaluation and Execution", () => {
    let rule: any;
    let testMessage: any;

    beforeAll(async () => {
      // Create rule
      rule = await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Priority Rule",
          description: "Mark high priority messages",
          matchType: "ALL",
          conditions: [
            { field: "SUBJECT", operator: "CONTAINS", value: "urgent" },
            { field: "FROM", operator: "CONTAINS", value: "admin" },
          ],
          actions: [
            { type: "ADD_LABEL", value: "Important" },
            { type: "MARK_READ" },
          ],
          priority: 10,
          isEnabled: true,
          createdBy: admin.id,
        },
      });

      // Create test message
      testMessage = await prisma.message.create({
        data: {
          inboxId: inbox.id,
          fromAddress: "admin@company.com",
          toAddress: "testuser@automation.test.com",
          subject: "Urgent: System maintenance tonight",
          textBody: "This is an urgent message about system maintenance.",
          receivedAt: new Date(),
        },
      });
    });

    it("should evaluate rule against message", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/${rule.id}/evaluate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          messageId: testMessage.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.evaluation).toBeDefined();
      expect(body.evaluation.matches).toBe(true);
      expect(body.evaluation.matchedConditions).toHaveLength(2);
      expect(body.evaluation.executedActions).toHaveLength(2);
    });

    it("should not match message that doesn't meet conditions", async () => {
      const nonMatchingMessage = await prisma.message.create({
        data: {
          inboxId: inbox.id,
          fromAddress: "user@example.com",
          toAddress: "testuser@automation.test.com",
          subject: "Regular message",
          textBody: "This is a regular message.",
          receivedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/${rule.id}/evaluate`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          messageId: nonMatchingMessage.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.evaluation.matches).toBe(false);
      expect(body.evaluation.matchedConditions).toHaveLength(0);
      expect(body.evaluation.executedActions).toHaveLength(0);
    });

    it("should execute rule actions", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/${rule.id}/execute`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          messageId: testMessage.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.execution).toBeDefined();
      expect(body.execution.actionsExecuted).toBe(true);
      expect(body.execution.updatedMessage).toBeDefined();

      // Verify message was updated
      const updatedMessage = await prisma.message.findUnique({
        where: { id: testMessage.id },
        include: { labels: true },
      });

      expect(updatedMessage?.isRead).toBe(true);
      expect(updatedMessage?.labels).toHaveLength(1);
      expect(updatedMessage?.labels[0].name).toBe("Important");
    });

    it("should handle rule execution errors", async () => {
      // Create rule with invalid action
      const errorRule = await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Error Rule",
          description: "Rule that will cause errors",
          matchType: "ALL",
          conditions: [
            { field: "FROM", operator: "CONTAINS", value: "test" },
          ],
          actions: [
            { type: "INVALID_ACTION" },
          ],
          priority: 1,
          isEnabled: true,
          createdBy: admin.id,
        },
      });

      const message = await prisma.message.create({
        data: {
          inboxId: inbox.id,
          fromAddress: "test@example.com",
          toAddress: "testuser@automation.test.com",
          subject: "Test error message",
          textBody: "Test message for error rule.",
          receivedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/${errorRule.id}/execute`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          messageId: message.id,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();

      expect(body.error).toBeDefined();
      expect(body.error).toContain("invalid action");
    });
  });

  describe("Batch Rule Processing", () => {
    it("should process multiple messages with rules", async () => {
      // Create test messages
      const messages = await prisma.message.createMany({
        data: [
          {
            inboxId: inbox.id,
            fromAddress: "newsletter@tech.com",
            toAddress: "testuser@automation.test.com",
            subject: "Tech Newsletter #123",
            textBody: "Latest tech news and updates.",
            receivedAt: new Date(),
          },
          {
            inboxId: inbox.id,
            fromAddress: "alerts@service.com",
            toAddress: "testuser@automation.test.com",
            subject: "System Alert",
            textBody: "Critical system alert detected.",
            receivedAt: new Date(),
          },
        ],
      });

      // Create newsletter rule
      await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Newsletter Rule",
          description: "Mark newsletters",
          matchType: "ALL",
          conditions: [
            { field: "FROM", operator: "CONTAINS", value: "newsletter" },
          ],
          actions: [
            { type: "ADD_LABEL", value: "Newsletter" },
          ],
          priority: 1,
          isEnabled: true,
          createdBy: admin.id,
        },
      });

      // Create alert rule
      await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Alert Rule",
          description: "Mark alerts",
          matchType: "ALL",
          conditions: [
            { field: "SUBJECT", operator: "CONTAINS", value: "alert" },
          ],
          actions: [
            { type: "ADD_LABEL", value: "Important" },
          ],
          priority: 2,
          isEnabled: true,
          createdBy: admin.id,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/process-batch`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          messageIds: messages.map((m: any) => m.id),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.batch).toBeDefined();
      expect(body.batch.processed).toBe(2);
      expect(body.batch.successful).toBe(2);
      expect(body.batch.failed).toBe(0);

      // Verify messages were processed
      const updatedMessages = await prisma.message.findMany({
        where: { id: { in: messages.map((m: any) => m.id) } },
        include: { labels: true },
      });

      expect(updatedMessages[0].labels.some((l: any) => l.name === "Newsletter")).toBe(true);
      expect(updatedMessages[1].labels.some((l: any) => l.name === "Important")).toBe(true);
    });
  });

  describe("Rule Scheduling", () => {
    it("should schedule rule execution", async () => {
      const schedule = {
        ruleId: (await prisma.automationRule.findFirst())!.id,
        scheduleType: "recurring",
        cronExpression: "0 9 * * *", // Daily at 9 AM
        timezone: "UTC",
        isActive: true,
        nextRunAt: new Date("2024-01-20T09:00:00Z"),
      };

      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/schedule`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: schedule,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.schedule.id).toBeDefined();
      expect(body.schedule.scheduleType).toBe("recurring");
      expect(body.schedule.cronExpression).toBe("0 9 * * *");
    });

    it("should list scheduled rules", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/schedules`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.schedules).toHaveLength(1);
      expect(body.schedules[0].isActive).toBe(true);
    });

    it("should pause and resume scheduled rule", async () => {
      // Get schedule
      const schedulesResponse = await app.inject({
        method: "GET",
        url: `/automation/rules/schedules`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      const schedule = schedulesResponse.json().schedules[0];

      // Pause schedule
      const pauseResponse = await app.inject({
        method: "PUT",
        url: `/automation/rules/schedules/${schedule.id}/pause`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(pauseResponse.statusCode).toBe(200);
      const pausedBody = pauseResponse.json();
      expect(pausedBody.schedule.isActive).toBe(false);

      // Resume schedule
      const resumeResponse = await app.inject({
        method: "PUT",
        url: `/automation/rules/schedules/${schedule.id}/resume`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(resumeResponse.statusCode).toBe(200);
      const resumedBody = resumeResponse.json();
      expect(resumedBody.schedule.isActive).toBe(true);
    });
  });

  describe("Rule Testing and Debugging", () => {
    it("should test rule with sample data", async () => {
      const rule = await prisma.automationRule.create({
        data: {
          organizationId: org.id,
          name: "Test Rule",
          description: "Rule for testing",
          matchType: "ALL",
          conditions: [
            { field: "FROM", operator: "CONTAINS", value: "test" },
          ],
          actions: [
            { type: "ADD_LABEL", value: "Test" },
          ],
          priority: 1,
          isEnabled: true,
          createdBy: admin.id,
        },
      });

      const testData = {
        from: "test@example.com",
        to: "testuser@automation.test.com",
        subject: "Test subject",
        textBody: "Test body content",
        hasAttachment: false,
      };

      const response = await app.inject({
        method: "POST",
        url: `/automation/rules/${rule.id}/test`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
          "Content-Type": "application/json",
        },
        payload: testData,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.test).toBeDefined();
      expect(body.test.matches).toBe(true);
      expect(body.test.matchedConditions).toHaveLength(1);
    });

    it("should provide rule execution log", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/logs?ruleId=${(await prisma.automationRule.findFirst())!.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.logs).toBeDefined();
      expect(Array.isArray(body.logs)).toBe(true);
    });

    it("should analyze rule performance", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/performance`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.performance).toBeDefined();
      expect(body.averageExecutionTime).toBeDefined();
      expect(body.successRate).toBeDefined();
      expect(body.errorRate).toBeDefined();
    });
  });

  describe("Rule Security and Permissions", () => {
    it("should require proper authorization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        // No authorization header
        payload: {
          name: "Unauthorized Rule",
          conditions: [],
          actions: [],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should enforce organization access control", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Automation Org",
          slug: "other-automation",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${otherOrg.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          organizationId: org.id,
          name: "Unauthorized Rule",
          conditions: [],
          actions: [],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should limit rule creation for regular users", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/automation/rules",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "User Rule",
          conditions: [],
          actions: [],
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Rule Analytics and Statistics", () => {
    it("should track rule execution statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/analytics?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics).toBeDefined();
      expect(body.analytics.totalRules).toBeDefined();
      expect(body.analytics.activeRules).toBeDefined();
      expect(body.analytics.averageMatches).toBeDefined();
      expect(body.analytics.topRules).toBeDefined();
    });

    it("should provide rule performance metrics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/automation/rules/metrics?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${admin.token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.executionTime).toBeDefined();
      expect(body.metrics.matchRate).toBeDefined();
      expect(body.metrics.actionSuccessRate).toBeDefined();
    });
  });
});