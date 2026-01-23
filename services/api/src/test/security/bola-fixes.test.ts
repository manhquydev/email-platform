/**
 * Security Tests for Phase 1: BOLA/IDOR Fixes
 * Tests verify ownership checks are enforced on all endpoints
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { messageRoutes } from "../../routes/messages";
import { prisma } from "../../lib/prisma";
import { TeamService } from "../../services/team.service";

// Mock dependencies
vi.mock("../../lib/prisma", () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    attachment: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
  }
}));

vi.mock("../../services/team.service", () => ({
  TeamService: {
    canAccessInbox: vi.fn(),
    getAccessibleInboxIds: vi.fn(),
  }
}));

vi.mock("../../utils/audit", () => ({
  recordAudit: vi.fn()
}));

vi.mock("../../services/storage", () => ({
  storageService: {
    getReadStream: vi.fn()
  }
}));

vi.mock("../../services/realtime-events", () => ({
  realtimeEvents: {
    publishEmailDeleted: vi.fn(),
    publishEmailRead: vi.fn(),
  }
}));

vi.mock("../../config", () => ({
  appConfig: {
    storageDir: "/tmp",
    s3: { enabled: false }
  }
}));

describe("Phase 1 Security: BOLA/IDOR Fixes", () => {
  let app: FastifyInstance;
  const userA = { userId: "user-A-id", role: "USER" };
  const userB = { userId: "user-B-id", role: "USER" };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.decorate("authenticate", async (req: any) => {
      req.user = userA; // Default: User A
    });
    await app.register(messageRoutes);
    await app.ready();
  });

  describe("Fuzzy Search BOLA Protection", () => {
    it("should only return messages from accessible inboxes", async () => {
      // User A can only access inbox-A
      (TeamService.getAccessibleInboxIds as any).mockResolvedValue(["inbox-A-id"]);

      // Mock returns messages (simulating SQL with ownership filter)
      (prisma.$queryRaw as any).mockResolvedValue([
        { id: "msg-1", subject: "User A Message", inboxId: "inbox-A-id" }
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/messages/search/fuzzy?q=test"
      });

      expect(response.statusCode).toBe(200);
      // Verify TeamService was called to get accessible inboxes
      expect(TeamService.getAccessibleInboxIds).toHaveBeenCalledWith("user-A-id");
    });

    it("should return empty for user with no accessible inboxes", async () => {
      (TeamService.getAccessibleInboxIds as any).mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/messages/search/fuzzy?q=secret"
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });

    it("admin should see all messages without ownership filter", async () => {
      // Reconfigure app with admin user
      const adminApp = Fastify();
      adminApp.decorate("authenticate", async (req: any) => {
        req.user = { userId: "admin-id", role: "ADMIN" };
      });
      await adminApp.register(messageRoutes);
      await adminApp.ready();

      (TeamService.getAccessibleInboxIds as any).mockResolvedValue([]);
      (prisma.$queryRaw as any).mockResolvedValue([
        { id: "msg-1", subject: "Any Message" }
      ]);

      const response = await adminApp.inject({
        method: "GET",
        url: "/messages/search/fuzzy?q=test"
      });

      expect(response.statusCode).toBe(200);
      // Admin uses unfiltered query (first $queryRaw call pattern)
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(1);
    });
  });

  describe("Attachment Download IDOR Protection", () => {
    it("should block download if user cannot access inbox", async () => {
      // Attachment exists but belongs to different user's inbox
      (prisma.attachment.findUnique as any).mockResolvedValue({
        id: "att-1",
        storageKey: "s3/att-1",
        filename: "secret.pdf",
        mimeType: "application/pdf",
        message: { inboxId: "inbox-B-id" } // User B's inbox
      });

      // User A cannot access inbox-B
      (TeamService.canAccessInbox as any).mockResolvedValue(false);

      const response = await app.inject({
        method: "GET",
        url: "/attachments/123e4567-e89b-12d3-a456-426614174000/download"
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toBe("Unauthorized");
    });

    it("should allow download if user owns the inbox", async () => {
      const { storageService } = await import("../../services/storage");

      (prisma.attachment.findUnique as any).mockResolvedValue({
        id: "att-1",
        storageKey: "s3/att-1",
        filename: "my-file.pdf",
        mimeType: "application/pdf",
        message: { inboxId: "inbox-A-id" }
      });

      (TeamService.canAccessInbox as any).mockResolvedValue(true);

      // Mock stream
      const mockStream = { pipe: vi.fn() };
      (storageService.getReadStream as any).mockResolvedValue(mockStream);

      const response = await app.inject({
        method: "GET",
        url: "/attachments/123e4567-e89b-12d3-a456-426614174000/download"
      });

      // Ownership check should happen BEFORE loading file
      expect(TeamService.canAccessInbox).toHaveBeenCalledWith("user-A-id", "inbox-A-id");
    });

    it("should check ownership BEFORE loading file data", async () => {
      // This test verifies we check access before streaming file (security optimization)
      const { storageService } = await import("../../services/storage");

      (prisma.attachment.findUnique as any).mockResolvedValue({
        id: "att-1",
        storageKey: "s3/expensive-file",
        filename: "big.zip",
        mimeType: "application/zip",
        message: { inboxId: "inbox-B-id" }
      });

      (TeamService.canAccessInbox as any).mockResolvedValue(false);

      await app.inject({
        method: "GET",
        url: "/attachments/123e4567-e89b-12d3-a456-426614174000/download"
      });

      // File should NOT be loaded since access was denied
      expect(storageService.getReadStream).not.toHaveBeenCalled();
    });
  });
});
