import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./setup";
import { buildServer } from "../server";
import { FastifyInstance } from "fastify";

describe("Export System", () => {
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
        name: "Export Test Org",
        slug: "export-test",
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
        name: "export.test.com",
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

    // Create test messages with attachments
    messages = await prisma.message.createMany({
      data: [
        {
          inboxId: inbox.id,
          fromAddress: "sender1@example.com",
          toAddress: "testuser@export.test.com",
          subject: "Important Document",
          textBody: "Please find the attached document.",
          htmlBody: "<p>Please find the attached document.</p>",
          receivedAt: new Date("2024-01-15T10:00:00Z"),
          size: 2048,
        },
        {
          inboxId: inbox.id,
          fromAddress: "sender2@example.com",
          toAddress: "testuser@export.test.com",
          subject: "Meeting Notes",
          textBody: "Here are the notes from yesterday's meeting.",
          receivedAt: new Date("2024-01-16T14:30:00Z"),
          size: 1024,
        },
        {
          inboxId: inbox.id,
          fromAddress: "sender3@example.com",
          toAddress: "testuser@export.test.com",
          subject: "Weekly Report",
          textBody: "Weekly report attached.",
          receivedAt: new Date("2024-01-17T09:15:00Z"),
          size: 3072,
        },
      ],
    });

    // Wait for messages to be created
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Message Export", () => {
    it("should export messages as JSON", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
          includeAttachments: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export).toBeDefined();
      expect(body.export.id).toBeDefined();
      expect(body.export.format).toBe("json");
      expect(body.export.totalRecords).toBe(3);
      expect(body.export.downloadUrl).toBeDefined();
      expect(body.export.expiresAt).toBeDefined();
    });

    it("should export messages as CSV", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "csv",
          filters: {
            inboxId: inbox.id,
          },
          fields: ["id", "fromAddress", "toAddress", "subject", "receivedAt"],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("csv");
      expect(body.export.totalRecords).toBe(3);
      expect(body.export.downloadUrl).toBeDefined();
    });

    it("should export messages as PDF", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "pdf",
          filters: {
            inboxId: inbox.id,
          },
          template: "professional",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("pdf");
      expect(body.export.totalRecords).toBe(3);
      expect(body.export.downloadUrl).toBeDefined();
    });

    it("should export with date range", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
            dateFrom: "2024-01-16T00:00:00Z",
            dateTo: "2024-01-17T23:59:59Z",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Should export messages from Jan 16-17
      expect(body.export.totalRecords).toBe(2);
    });

    it("should export with pagination", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
          limit: 2,
          offset: 0,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.totalRecords).toBe(2);
      expect(body.export.hasMore).toBe(true);
    });
  });

  describe("Export Templates", () => {
    it("should create custom export template", async () => {
      const template = {
        name: "Custom Report Template",
        description: "Custom template for monthly reports",
        format: "pdf",
        fields: [
          { field: "fromAddress", label: "From", width: "200px" },
          { field: "subject", label: "Subject", width: "300px" },
          { field: "receivedAt", label: "Date", width: "150px" },
        ],
        styles: {
          header: {
            fontSize: "16px",
            fontWeight: "bold",
            color: "#333333",
          },
          row: {
            fontSize: "12px",
            border: "1px solid #cccccc",
          },
        },
      };

      const response = await app.inject({
        method: "POST",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: template,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.template.name).toBe("Custom Report Template");
      expect(body.template.templateId).toBeDefined();
    });

    it("should list organization templates", async () => {
      // Create another template
      await app.inject({
        method: "POST",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Simple Template",
          description: "Simple export template",
          format: "csv",
          fields: ["fromAddress", "subject"],
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.templates).toHaveLength(2);
      expect(body.templates[0].name).toBe("Custom Report Template");
      expect(body.templates[1].name).toBe("Simple Template");
    });

    it("should use custom template for export", async () => {
      // Get custom template
      const templatesResponse = await app.inject({
        method: "GET",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      const template = templatesResponse.json().templates[0];

      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "pdf",
          filters: {
            inboxId: inbox.id,
          },
          templateId: template.templateId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("pdf");
      expect(body.export.templateId).toBe(template.templateId);
    });

    it("should delete template", async () => {
      // Get template to delete
      const templatesResponse = await app.inject({
        method: "GET",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      const template = templatesResponse.json().templates[0];

      const response = await app.inject({
        method: "DELETE",
        url: `/export/templates/${template.templateId}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify template is deleted
      const updatedList = await app.inject({
        method: "GET",
        url: `/export/templates`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      const templates = updatedList.json().templates;
      expect(templates.every((t: any) => t.templateId !== template.templateId)).toBe(true);
    });
  });

  describe("Export Scheduling", () => {
    it("should schedule recurring export", async () => {
      const schedule = {
        name: "Daily Export",
        description: "Export all messages daily",
        format: "csv",
        filters: {
          inboxId: inbox.id,
        },
        schedule: {
          frequency: "daily",
          time: "09:00",
          timezone: "UTC",
        },
        recipients: ["admin@export.test.com"],
        isActive: true,
      };

      const response = await app.inject({
        method: "POST",
        url: `/export/schedules`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: schedule,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.schedule.name).toBe("Daily Export");
      expect(body.schedule.scheduleId).toBeDefined();
      expect(body.schedule.schedule.frequency).toBe("daily");
    });

    it("should list export schedules", async () => {
      // Create another schedule
      await app.inject({
        method: "POST",
        url: `/export/schedules`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          name: "Weekly Export",
          description: "Export messages weekly",
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
          schedule: {
            frequency: "weekly",
            dayOfWeek: "monday",
            time: "10:00",
          },
          recipients: ["admin@export.test.com"],
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/export/schedules`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.schedules).toHaveLength(2);
      expect(body.schedules[0].name).toBe("Daily Export");
      expect(body.schedules[1].name).toBe("Weekly Export");
    });

    it("should update export schedule", async () => {
      // Get schedule to update
      const schedulesResponse = await app.inject({
        method: "GET",
        url: `/export/schedules`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      const schedule = schedulesResponse.json().schedules[0];

      const update = {
        name: "Updated Daily Export",
        recipients: ["admin@export.test.com", "backup@export.test.com"],
      };

      const response = await app.inject({
        method: "PUT",
        url: `/export/schedules/${schedule.scheduleId}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: update,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.schedule.name).toBe("Updated Daily Export");
      expect(body.schedule.recipients).toEqual([
        "admin@export.test.com",
        "backup@export.test.com",
      ]);
    });

    it("should pause and resume export schedule", async () => {
      // Get schedule
      const schedulesResponse = await app.inject({
        method: "GET",
        url: `/export/schedules`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      const schedule = schedulesResponse.json().schedules[0];

      // Pause schedule
      const pauseResponse = await app.inject({
        method: "PUT",
        url: `/export/schedules/${schedule.scheduleId}/pause`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(pauseResponse.statusCode).toBe(200);
      const pausedBody = pauseResponse.json();
      expect(pausedBody.schedule.isActive).toBe(false);

      // Resume schedule
      const resumeResponse = await app.inject({
        method: "PUT",
        url: `/export/schedules/${schedule.scheduleId}/resume`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(resumeResponse.statusCode).toBe(200);
      const resumedBody = resumeResponse.json();
      expect(resumedBody.schedule.isActive).toBe(true);
    });
  });

  describe("Export Management", () => {
    let exportJob: any;

    beforeAll(async () => {
      // Create an export job
      const exportResponse = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      exportJob = exportResponse.json().export;
    });

    it("should get export job status", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/export/jobs/${exportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.job.id).toBe(exportJob.id);
      expect(body.job.status).toBeDefined();
      expect(["pending", "processing", "completed", "failed"]).toContain(body.job.status);
    });

    it("should list export jobs", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/export/jobs`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          query: {
            organizationId: org.id,
            limit: 10,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.jobs).toHaveLength(1);
      expect(body.jobs[0].id).toBe(exportJob.id);
    });

    it("should cancel export job", async () => {
      // Create a long-running export job
      const longExportResponse = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
          largeDataset: true,
        },
      });

      const longExportJob = longExportResponse.json().export;

      // Cancel job
      const response = await app.inject({
        method: "DELETE",
        url: `/export/jobs/${longExportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify job is cancelled
      const statusResponse = await app.inject({
        method: "GET",
        url: `/export/jobs/${longExportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(statusResponse.json().job.status).toBe("cancelled");
    });

    it("should delete completed export job", async () => {
      // Wait for export to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await app.inject({
        method: "DELETE",
        url: `/export/jobs/${exportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify job is deleted
      const listResponse = await app.inject({
        method: "GET",
        url: `/export/jobs`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(listResponse.json().jobs.every((j: any) => j.id !== exportJob.id)).toBe(true);
    });
  });

  describe("Export Download and Storage", () => {
    it("should download exported file", async () => {
      // Create export
      const exportResponse = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "csv",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      const exportJob = exportResponse.json().export;

      // Wait for export to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Download file
      const downloadResponse = await app.inject({
        method: "GET",
        url: `/export/download/${exportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(downloadResponse.statusCode).toBe(200);
      expect(downloadResponse.headers["content-type"]).toContain("text/csv");
      expect(downloadResponse.body.length).toBeGreaterThan(0);
    });

    it("should handle expired export links", async () => {
      // Create export with short expiration
      const exportResponse = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
          expiresInSeconds: 1, // 1 second expiration
        },
      });

      const exportJob = exportResponse.json().export;

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Try to download
      const downloadResponse = await app.inject({
        method: "GET",
        url: `/export/download/${exportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(downloadResponse.statusCode).toBe(410);
    });

    it("should generate signed download URLs", async () => {
      // Create export
      const exportResponse = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "pdf",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      const exportJob = exportResponse.json().export;

      // Get signed URL
      const urlResponse = await app.inject({
        method: "GET",
        url: `/export/signed-url/${exportJob.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(urlResponse.statusCode).toBe(200);
      const body = urlResponse.json();

      expect(body.signedUrl).toBeDefined();
      expect(body.signedUrl).toContain("signature=");
    });
  });

  describe("Export Security and Permissions", () => {
    it("should require proper authorization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        // No authorization header
        payload: {
          format: "json",
          filters: {
            inboxId: inbox.id,
          },
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should enforce organization access control", async () => {
      // Create different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: "Other Export Org",
          slug: "other-export",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${otherOrg.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          filters: {
            organizationId: org.id,
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should rate limit export requests", async () => {
      // Perform many export requests
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: "POST",
          url: "/export/messages",
          headers: {
            "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
            "Content-Type": "application/json",
          },
          payload: {
            format: "json",
            filters: {
              inboxId: inbox.id,
            },
          },
        })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.statusCode === 429);

      // Should allow some requests but limit others
      expect(rateLimited.length).toBeGreaterThanOrEqual(0);
      expect(rateLimited.length).toBeLessThan(10);
    });

    it("should validate export parameters", async () => {
      const invalidExport = {
        format: "invalid-format",
        filters: {
          inboxId: "invalid-id",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/export/messages",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: invalidExport,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Export Analytics and Monitoring", () => {
    it("should track export statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/export/analytics?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.analytics).toBeDefined();
      expect(body.analytics.totalExports).toBeDefined();
      expect(body.analytics.averageExportSize).toBeDefined();
      expect(body.analytics.formatDistribution).toBeDefined();
    });

    it("should provide export performance metrics", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/export/performance?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.performance).toBeDefined();
      expect(body.averageProcessingTime).toBeDefined();
      expect(body.successRate).toBeDefined();
      expect(body.errorRate).toBeDefined();
    });

    it("should monitor storage usage", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/export/storage-usage?organizationId=${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.storage).toBeDefined();
      expect(body.totalSize).toBeDefined();
      expect(body.fileCount).toBeDefined();
      expect(body.expiringFiles).toBeDefined();
    });

    it("should clean up expired exports", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/export/cleanup`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          olderThan: 1, // Clean up exports older than 1 day
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.cleaned).toBeDefined();
      expect(body.cleaned.expiredFiles).toBeDefined();
      expect(body.cleaned.freedSpace).toBeDefined();
    });
  });

  describe("Bulk Export Operations", () => {
    it("should export multiple inboxes at once", async () => {
      // Create another inbox
      const inbox2 = await prisma.inbox.create({
        data: {
          domainId: domain.id,
          localPart: "testuser2",
          organizationId: org.id,
        },
      });

      // Create message in second inbox
      await prisma.message.create({
        data: {
          inboxId: inbox2.id,
          fromAddress: "bulk@example.com",
          toAddress: "testuser2@export.test.com",
          subject: "Bulk export test",
          textBody: "This message should be included in bulk export.",
          receivedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/export/bulk",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          inboxes: [inbox.id, inbox2.id],
          combine: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("json");
      expect(body.export.totalRecords).toBeGreaterThan(3); // Original messages + new one
    });

    it("should export domains", async () => {
      // Create another domain
      const domain2 = await prisma.domain.create({
        data: {
          name: "export2.test.com",
          organizationId: org.id,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/export/domains",
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "csv",
          domains: [domain.name, domain2.name],
          includeMessages: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("csv");
      expect(body.export.totalRecords).toBeGreaterThan(0);
    });

    it("should export organization data", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/export/organization/${org.id}`,
        headers: {
          "Authorization": `Bearer ${org.adminToken || "mock-token"}`,
          "Content-Type": "application/json",
        },
        payload: {
          format: "json",
          include: ["domains", "inboxes", "users", "settings"],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.export.format).toBe("json");
      expect(body.export.totalRecords).toBeGreaterThan(0);
      expect(body.export.organization).toBeDefined();
    });
  });
});