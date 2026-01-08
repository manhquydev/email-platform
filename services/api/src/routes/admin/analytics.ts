/**
 * Admin Analytics Routes
 * Public inbox viewer analytics and session tracking
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  /**
   * GET /admin/analytics/public-viewer
   * Dashboard stats for public inbox viewer
   */
  app.get("/admin/analytics/public-viewer", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      timeRange: z.enum(["7d", "30d", "all"]).default("7d"),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { timeRange } = query.data;
    const startDate = timeRange === "all"
      ? new Date(0)
      : new Date(Date.now() - (timeRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000);

    // Get stats using raw SQL for performance
    const stats = await prisma.$queryRaw<Array<{
      searches: bigint;
      message_views: bigint;
      message_lists: bigint;
      attachment_downloads: bigint;
      unique_ips: bigint;
      unique_sessions: bigint;
    }>>`
      SELECT
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_INBOX_SEARCHED' THEN id END) as searches,
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_MESSAGE_VIEWED' THEN id END) as message_views,
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_MESSAGES_LISTED' THEN id END) as message_lists,
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_ATTACHMENT_DOWNLOADED' THEN id END) as attachment_downloads,
        COUNT(DISTINCT meta->>'ip') as unique_ips,
        COUNT(DISTINCT meta->>'sessionId') as unique_sessions
      FROM "AuditLog"
      WHERE action LIKE 'PUBLIC_%'
        AND "createdAt" >= ${startDate}
    `;

    // Get top inboxes
    const topInboxesRaw = await prisma.$queryRaw<Array<{
      email: string;
      view_count: bigint;
    }>>`
      SELECT
        meta->>'email' as email,
        COUNT(*) as view_count
      FROM "AuditLog"
      WHERE action IN ('PUBLIC_MESSAGE_VIEWED', 'PUBLIC_MESSAGES_LISTED')
        AND "createdAt" >= ${startDate}
        AND meta->>'email' IS NOT NULL
      GROUP BY meta->>'email'
      ORDER BY view_count DESC
      LIMIT 10
    `;

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        action: { in: ["PUBLIC_INBOX_SEARCHED", "PUBLIC_MESSAGE_VIEWED", "PUBLIC_ATTACHMENT_DOWNLOADED"] },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      totalSearches: Number(stats[0]?.searches || 0),
      totalMessageViews: Number(stats[0]?.message_views || 0),
      totalMessageLists: Number(stats[0]?.message_lists || 0),
      totalAttachmentDownloads: Number(stats[0]?.attachment_downloads || 0),
      uniqueIPs: Number(stats[0]?.unique_ips || 0),
      uniqueSessions: Number(stats[0]?.unique_sessions || 0),
      topInboxes: topInboxesRaw.map(row => ({
        email: row.email,
        views: Number(row.view_count),
      })),
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
      timeRange,
    };
  });

  /**
   * GET /admin/analytics/public-viewer/sessions
   * Session-based analytics with pagination
   */
  app.get("/admin/analytics/public-viewer/sessions", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { limit, offset } = query.data;

    // Get session stats
    const sessionsRaw = await prisma.$queryRaw<Array<{
      session_id: string;
      ip: string;
      user_agent: string;
      first_seen: Date;
      last_seen: Date;
      search_count: bigint;
      view_count: bigint;
      inboxes_accessed: string;
    }>>`
      SELECT
        meta->>'sessionId' as session_id,
        meta->>'ip' as ip,
        meta->>'userAgent' as user_agent,
        MIN("createdAt") as first_seen,
        MAX("createdAt") as last_seen,
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_INBOX_SEARCHED' THEN id END) as search_count,
        COUNT(DISTINCT CASE WHEN action = 'PUBLIC_MESSAGE_VIEWED' THEN id END) as view_count,
        STRING_AGG(DISTINCT meta->>'email', ', ') as inboxes_accessed
      FROM "AuditLog"
      WHERE action LIKE 'PUBLIC_%'
        AND meta->>'sessionId' IS NOT NULL
      GROUP BY meta->>'sessionId', meta->>'ip', meta->>'userAgent'
      ORDER BY last_seen DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const totalSessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT meta->>'sessionId') as count
      FROM "AuditLog"
      WHERE action LIKE 'PUBLIC_%'
        AND meta->>'sessionId' IS NOT NULL
    `;

    return {
      sessions: sessionsRaw.map(row => ({
        sessionId: row.session_id,
        ip: row.ip,
        userAgent: row.user_agent,
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        searchCount: Number(row.search_count),
        viewCount: Number(row.view_count),
        inboxesAccessed: row.inboxes_accessed ? row.inboxes_accessed.split(", ") : [],
      })),
      meta: {
        total: Number(totalSessions[0]?.count || 0),
        limit,
        offset,
      },
    };
  });

  /**
   * GET /admin/analytics/public-viewer/details
   * Detailed audit log with filters
   */
  app.get("/admin/analytics/public-viewer/details", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      action: z.string().optional(),
      ip: z.string().optional(),
      sessionId: z.string().optional(),
      email: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { action, ip, sessionId, email, startDate, endDate, limit, offset } = query.data;

    // Build where clause for Prisma
    const where: any = {
      action: action || { startsWith: "PUBLIC_" },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // For JSON field filters, use raw query
    if (ip || sessionId || email) {
      const conditions: string[] = ["action LIKE 'PUBLIC_%'"];
      const params: any[] = [];
      let paramIndex = 1;

      if (action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }
      if (ip) {
        conditions.push(`meta->>'ip' = $${paramIndex}`);
        params.push(ip);
        paramIndex++;
      }
      if (sessionId) {
        conditions.push(`meta->>'sessionId' = $${paramIndex}`);
        params.push(sessionId);
        paramIndex++;
      }
      if (email) {
        conditions.push(`meta->>'email' = $${paramIndex}`);
        params.push(email);
        paramIndex++;
      }
      if (startDate) {
        conditions.push(`"createdAt" >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        conditions.push(`"createdAt" <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      const data = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "AuditLog" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        ...params, limit, offset
      );

      const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "AuditLog" WHERE ${whereClause}`,
        ...params
      );

      return {
        data,
        meta: { total: Number(totalResult[0]?.count || 0), limit, offset },
      };
    }

    // Standard Prisma query (no JSON filters)
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, limit, offset },
    };
  });

  /**
   * GET /admin/analytics/public-viewer/export
   * CSV export for GDPR compliance
   */
  app.get("/admin/analytics/public-viewer/export", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { startDate, endDate } = query.data;

    const where: any = {
      action: { startsWith: "PUBLIC_" },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000, // Limit to 10k rows for performance
    });

    // Generate CSV
    const csvRows = ["ID,Action,IP,Session ID,Email,User Agent,Timestamp"];

    for (const log of logs) {
      const meta = (log.meta as Record<string, any>) || {};
      csvRows.push([
        log.id,
        log.action,
        meta.ip || "",
        meta.sessionId || "",
        meta.email || "",
        (meta.userAgent || "").replace(/,/g, ";"), // Escape commas
        log.createdAt.toISOString(),
      ].join(","));
    }

    const csv = csvRows.join("\n");
    const filename = `audit-public-viewer-${new Date().toISOString().split("T")[0]}.csv`;

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return csv;
  });
}
