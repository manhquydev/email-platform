/**
 * Admin Telegram Management Routes
 * Manage user and inbox Telegram links, notifications, force unlink
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminTelegramRoutes(app: FastifyInstance) {
  /**
   * GET /admin/telegram/overview
   * Dashboard overview of Telegram integrations
   */
  app.get("/admin/telegram/overview", { preHandler: app.requireAdmin }, async () => {
    const [
      totalUserLinks,
      totalInboxLinks,
      activeInboxLinks,
      pausedInboxLinks,
      revokedInboxLinks,
      notificationsSent24h,
      notificationsFailed24h,
    ] = await Promise.all([
      prisma.user.count({ where: { telegramChatId: { not: null } } }),
      prisma.inboxTelegramLink.count(),
      prisma.inboxTelegramLink.count({ where: { status: "ACTIVE" } }),
      prisma.inboxTelegramLink.count({ where: { status: "PAUSED" } }),
      prisma.inboxTelegramLink.count({ where: { status: "REVOKED" } }),
      prisma.telegramNotificationLog.count({
        where: {
          status: "SENT",
          sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.telegramNotificationLog.count({
        where: {
          status: "FAILED",
          sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      userLinks: totalUserLinks,
      inboxLinks: {
        total: totalInboxLinks,
        active: activeInboxLinks,
        paused: pausedInboxLinks,
        revoked: revokedInboxLinks,
      },
      notifications24h: {
        sent: notificationsSent24h,
        failed: notificationsFailed24h,
        successRate: notificationsSent24h + notificationsFailed24h > 0
          ? Math.round((notificationsSent24h / (notificationsSent24h + notificationsFailed24h)) * 100)
          : 100,
      },
    };
  });

  /**
   * GET /admin/telegram/user-links
   * List all user-level Telegram links
   */
  app.get("/admin/telegram/user-links", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      search: z.string().optional(),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { limit, offset, search } = query.data;

    const where: any = {
      telegramChatId: { not: null },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { telegramChatId: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          telegramChatId: true,
          telegramLinkedAt: true,
          tier: true,
          createdAt: true,
        },
        orderBy: { telegramLinkedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, limit, offset },
    };
  });

  /**
   * GET /admin/telegram/inbox-links
   * List all inbox-level Telegram links
   */
  app.get("/admin/telegram/inbox-links", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      status: z.enum(["ACTIVE", "PAUSED", "REVOKED", "all"]).default("all"),
      search: z.string().optional(),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { limit, offset, status, search } = query.data;

    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { inboxEmail: { contains: search, mode: "insensitive" } },
        { telegramChatId: { contains: search } },
        { telegramUsername: { contains: search, mode: "insensitive" } },
      ];
    }

    const [links, total] = await Promise.all([
      prisma.inboxTelegramLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.inboxTelegramLink.count({ where }),
    ]);

    // Get notification counts for each link
    const linksWithStats = await Promise.all(
      links.map(async (link) => {
        const [sentCount, failedCount] = await Promise.all([
          prisma.telegramNotificationLog.count({
            where: {
              inboxEmail: link.inboxEmail,
              telegramChatId: link.telegramChatId,
              status: "SENT",
            },
          }),
          prisma.telegramNotificationLog.count({
            where: {
              inboxEmail: link.inboxEmail,
              telegramChatId: link.telegramChatId,
              status: "FAILED",
            },
          }),
        ]);

        return {
          ...link,
          notificationsSent: sentCount,
          notificationsFailed: failedCount,
        };
      })
    );

    return {
      data: linksWithStats,
      meta: { total, limit, offset },
    };
  });

  /**
   * GET /admin/telegram/notifications
   * List notification logs with filters
   */
  app.get("/admin/telegram/notifications", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      status: z.enum(["SENT", "FAILED", "all"]).default("all"),
      inboxEmail: z.string().optional(),
      telegramChatId: z.string().optional(),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { limit, offset, status, inboxEmail, telegramChatId } = query.data;

    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }
    if (inboxEmail) {
      where.inboxEmail = inboxEmail;
    }
    if (telegramChatId) {
      where.telegramChatId = telegramChatId;
    }

    const [logs, total] = await Promise.all([
      prisma.telegramNotificationLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.telegramNotificationLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, limit, offset },
    };
  });

  /**
   * POST /admin/telegram/user-links/:userId/unlink
   * Force unlink user-level Telegram connection
   */
  app.post("/admin/telegram/user-links/:userId/unlink", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({
      userId: z.string().uuid(),
    }).safeParse(request.params);

    const body = z.object({
      reason: z.string().optional(),
    }).safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.data.userId },
      select: { id: true, email: true, telegramChatId: true },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    if (!user.telegramChatId) {
      return reply.status(400).send({ error: "User has no Telegram link" });
    }

    const previousChatId = user.telegramChatId;

    // Unlink
    await prisma.user.update({
      where: { id: params.data.userId },
      data: {
        telegramChatId: null,
        telegramLinkedAt: null,
      },
    });

    // Audit log
    await recordAudit((request.user as any)?.id, "ADMIN_TELEGRAM_USER_UNLINKED", {
      targetUserId: user.id,
      targetEmail: user.email,
      telegramChatId: previousChatId,
      reason: body.data?.reason || "Admin action",
      adminId: (request.user as any)?.id,
    });

    return {
      success: true,
      message: `Telegram link removed for ${user.email}`,
    };
  });

  /**
   * POST /admin/telegram/inbox-links/:linkId/revoke
   * Revoke inbox-level Telegram link
   */
  app.post("/admin/telegram/inbox-links/:linkId/revoke", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({
      linkId: z.string().uuid(),
    }).safeParse(request.params);

    const body = z.object({
      reason: z.string().optional(),
    }).safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid link ID" });
    }

    const link = await prisma.inboxTelegramLink.findUnique({
      where: { id: params.data.linkId },
    });

    if (!link) {
      return reply.status(404).send({ error: "Link not found" });
    }

    if (link.status === "REVOKED") {
      return reply.status(400).send({ error: "Link already revoked" });
    }

    // Revoke
    await prisma.inboxTelegramLink.update({
      where: { id: params.data.linkId },
      data: { status: "REVOKED" },
    });

    // Audit log
    await recordAudit((request.user as any)?.id, "ADMIN_TELEGRAM_INBOX_LINK_REVOKED", {
      linkId: link.id,
      inboxEmail: link.inboxEmail,
      telegramChatId: link.telegramChatId,
      telegramUsername: link.telegramUsername,
      reason: body.data?.reason || "Admin action",
      adminId: (request.user as any)?.id,
    });

    return {
      success: true,
      message: `Telegram link revoked for inbox ${link.inboxEmail}`,
    };
  });

  /**
   * POST /admin/telegram/inbox-links/:linkId/reactivate
   * Reactivate a paused or revoked inbox-level Telegram link
   */
  app.post("/admin/telegram/inbox-links/:linkId/reactivate", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({
      linkId: z.string().uuid(),
    }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid link ID" });
    }

    const link = await prisma.inboxTelegramLink.findUnique({
      where: { id: params.data.linkId },
    });

    if (!link) {
      return reply.status(404).send({ error: "Link not found" });
    }

    if (link.status === "ACTIVE") {
      return reply.status(400).send({ error: "Link already active" });
    }

    // Reactivate
    await prisma.inboxTelegramLink.update({
      where: { id: params.data.linkId },
      data: { status: "ACTIVE" },
    });

    // Audit log
    await recordAudit((request.user as any)?.id, "ADMIN_TELEGRAM_INBOX_LINK_REACTIVATED", {
      linkId: link.id,
      inboxEmail: link.inboxEmail,
      telegramChatId: link.telegramChatId,
      previousStatus: link.status,
      adminId: (request.user as any)?.id,
    });

    return {
      success: true,
      message: `Telegram link reactivated for inbox ${link.inboxEmail}`,
    };
  });

  /**
   * DELETE /admin/telegram/inbox-links/:linkId
   * Permanently delete an inbox-level Telegram link
   */
  app.delete("/admin/telegram/inbox-links/:linkId", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({
      linkId: z.string().uuid(),
    }).safeParse(request.params);

    const body = z.object({
      reason: z.string().optional(),
    }).safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid link ID" });
    }

    const link = await prisma.inboxTelegramLink.findUnique({
      where: { id: params.data.linkId },
    });

    if (!link) {
      return reply.status(404).send({ error: "Link not found" });
    }

    // Delete
    await prisma.inboxTelegramLink.delete({
      where: { id: params.data.linkId },
    });

    // Audit log
    await recordAudit((request.user as any)?.id, "ADMIN_TELEGRAM_INBOX_LINK_DELETED", {
      linkId: link.id,
      inboxEmail: link.inboxEmail,
      telegramChatId: link.telegramChatId,
      telegramUsername: link.telegramUsername,
      reason: body.data?.reason || "Admin action",
      adminId: (request.user as any)?.id,
    });

    return {
      success: true,
      message: `Telegram link permanently deleted for inbox ${link.inboxEmail}`,
    };
  });
}
