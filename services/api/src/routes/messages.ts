import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import path from "path";
import { version } from "../../package.json";
import { appConfig } from "../config";
import { storageService } from "../services/storage";
import { promises as fs } from "fs";
import { recordAudit } from "../utils/audit";
import Mailbuild from "mailbuild";
import { realtimeEvents } from "../services/realtime-events";
import { TeamService } from "../services/team.service";

export const messageRoutes = async (app: FastifyInstance) => {
  app.get("/messages", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        inboxId: z.string().uuid(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
        q: z.string().optional(),
        hasAttachments: z.coerce.boolean().optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const userId = (request.user as any).userId;
    const { inboxId, limit, offset, q, hasAttachments } = query.data;

    // Check access to inbox
    const hasAccess = await TeamService.canAccessInbox(userId, inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized access to this inbox" });
    }

    const where = {
      inboxId,
      deletedAt: null,
      ...(q
        ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" as const } },
            { fromAddress: { contains: q, mode: "insensitive" as const } },
            { toAddress: { contains: q, mode: "insensitive" as const } },
            { textBody: { contains: q, mode: "insensitive" as const } },
          ],
        }
        : {}),
      ...(hasAttachments
        ? {
          attachments: {
            some: { deletedAt: null },
          },
        }
        : {}),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: limit ?? 50,
        skip: offset ?? 0,
        include: { attachments: { where: { deletedAt: null } } },
      }),
      prisma.message.count({ where }),
    ]);

    return { data: messages, meta: { total } };
  });

  app.get("/inboxes/:id/messages", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const query = z
      .object({
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
        q: z.string().optional(),
        from: z.string().optional(),
        subject: z.string().optional(),
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
        hasAttachments: z.coerce.boolean().optional(),
        isRead: z.coerce.boolean().optional(),
      })
      .safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const inbox = await prisma.inbox.findUnique({ where: { id: params.data.id, deletedAt: null } });
    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, inbox.id);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized access to this inbox" });
    }

    const where = {
      inboxId: inbox.id,
      deletedAt: null,
      ...(query.data.q
        ? {
          OR: [
            { subject: { contains: query.data.q, mode: "insensitive" as const } },
            { fromAddress: { contains: query.data.q, mode: "insensitive" as const } },
            { toAddress: { contains: query.data.q, mode: "insensitive" as const } },
            { textBody: { contains: query.data.q, mode: "insensitive" as const } },
          ],
        }
        : {}),
      ...(query.data.from ? { fromAddress: { contains: query.data.from, mode: "insensitive" as const } } : {}),
      ...(query.data.subject ? { subject: { contains: query.data.subject, mode: "insensitive" as const } } : {}),
      ...(query.data.start || query.data.end
        ? {
          receivedAt: {
            ...(query.data.start ? { gte: new Date(query.data.start) } : {}),
            ...(query.data.end ? { lte: new Date(query.data.end) } : {}),
          },
        }
        : {}),

      ...(query.data.hasAttachments
        ? {
          attachments: {
            some: { deletedAt: null },
          },
        }
        : {}),
      ...(query.data.isRead !== undefined ? { isRead: query.data.isRead } : {}),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: query.data.limit ?? 50,
        skip: query.data.offset ?? 0,
        include: { attachments: { where: { deletedAt: null } } },
      }),
      prisma.message.count({ where }),
    ]);
    return { data: messages, meta: { total } };
  });

  app.get("/messages/search", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        q: z.string().optional(),
        domain: z.string().optional(),
        from: z.string().optional(),
        hasAttachment: z.enum(["true", "false"]).optional(),
        isRead: z.enum(["true", "false"]).optional(),
        after: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const { q, domain, from, hasAttachment, isRead, after, limit = 50, offset = 0 } = query.data;
    const userId = (request.user as any).userId;
    const isAdmin = (request.user as any).role === "ADMIN";

    // Get all accessible inbox IDs for the user
    const accessibleInboxIds = await TeamService.getAccessibleInboxIds(userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
      ...(!isAdmin ? { inboxId: { in: accessibleInboxIds } } : {}),
    };

    // Domain filter
    if (domain) {
      where.inbox = { domain: { name: domain } };
    }

    // Text search
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" as const } },
        { fromAddress: { contains: q, mode: "insensitive" as const } },
        { toAddress: { contains: q, mode: "insensitive" as const } },
        { textBody: { contains: q, mode: "insensitive" as const } },
      ];
    }

    // From address filter
    if (from) {
      where.fromAddress = { contains: from, mode: "insensitive" as const };
    }

    // Has attachment filter
    if (hasAttachment === "true") {
      where.attachments = { some: { deletedAt: null } };
    }

    // Read status filter
    if (isRead === "true") {
      where.isRead = true;
    } else if (isRead === "false") {
      where.isRead = false;
    }

    // Date filter (messages after a certain date)
    if (after) {
      where.receivedAt = { gte: new Date(after) };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: limit,
        skip: offset,
        include: { inbox: { include: { domain: true } }, attachments: { where: { deletedAt: null } } },
      }),
      prisma.message.count({ where }),
    ]);

    return { data: messages, meta: { total } };
  });

  // Fuzzy search using pg_trgm similarity ranking
  app.get("/messages/search/fuzzy", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        q: z.string().min(1),
        limit: z.coerce.number().min(1).max(100).optional(),
        threshold: z.coerce.number().min(0).max(1).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Search query required" });
    }

    const { q, limit = 20, threshold = 0.3 } = query.data;

    // Use raw SQL for pg_trgm similarity search
    const messages = await prisma.$queryRaw`
      SELECT m.*, 
             GREATEST(
               COALESCE(similarity(m.subject, ${q}), 0),
               COALESCE(similarity(m."textBody", ${q}), 0)
             ) as relevance
      FROM "Message" m
      WHERE m."deletedAt" IS NULL
        AND (
          similarity(m.subject, ${q}) > ${threshold}
          OR similarity(m."textBody", ${q}) > ${threshold}
        )
      ORDER BY relevance DESC
      LIMIT ${limit}
    `;

    return { data: messages, meta: { query: q, threshold } };
  });

  app.get("/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { attachments: { where: { deletedAt: null } }, inbox: { include: { domain: true } } },
    });
    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    return { message };
  });

  app.delete("/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!existing) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, existing.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const now = new Date();
    await prisma.attachment.updateMany({ where: { messageId: existing.id }, data: { deletedAt: now } });
    await prisma.message.update({ where: { id: existing.id }, data: { deletedAt: now } });
    await recordAudit(userId, "MESSAGE_DELETED", { messageId: existing.id });

    // Publish realtime event
    await realtimeEvents.publishEmailDeleted(userId, {
      messageId: existing.id,
      inboxId: existing.inboxId,
    });

    return { ok: true };
  });

  app.patch("/messages/:id/read", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ isRead: z.boolean() }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!existing) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, existing.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const updated = await prisma.message.update({
      where: { id: existing.id },
      data: { isRead: body.data.isRead },
      include: { attachments: { where: { deletedAt: null } }, inbox: { include: { domain: true } } },
    });

    // Publish realtime event
    await realtimeEvents.publishEmailRead(userId, {
      messageId: existing.id,
      inboxId: existing.inboxId,
      isRead: body.data.isRead,
    });

    return { message: updated };
  });

  // Pin/unpin message
  app.patch("/messages/:id/pin", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ isPinned: z.boolean() }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!existing) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, existing.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const updated = await prisma.message.update({
      where: { id: existing.id },
      data: { isPinned: body.data.isPinned },
      include: { attachments: { where: { deletedAt: null } }, inbox: { include: { domain: true } } },
    });

    return { message: updated };
  });

  // Snooze message
  app.patch("/messages/:id/snooze", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      snoozedUntil: z.string().datetime().nullable()
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!existing) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, existing.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const updated = await prisma.message.update({
      where: { id: existing.id },
      data: { snoozedUntil: body.data.snoozedUntil ? new Date(body.data.snoozedUntil) : null },
      include: { attachments: { where: { deletedAt: null } }, inbox: { include: { domain: true } } },
    });

    return { message: updated };
  });

  app.get("/attachments/:id/download", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.data.id },
      include: { message: { include: { inbox: true } } },
    });
    if (!attachment) return reply.status(404).send("Not found");
    const userId = (request.user as any)?.userId ?? null;
    const hasAccess = await TeamService.canAccessInbox(userId, attachment.message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") return reply.status(403).send("Unauthorized");

    try {
      const stream = await storageService.getReadStream(attachment.storageKey);
      reply.header("Content-Disposition", `attachment; filename="${attachment.filename}"`);
      reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
      return reply.send(stream);
    } catch (e) {
      request.log.error(e);
      return reply.status(404).send("File not found");
    }
  });

  // Export message as .eml file
  app.get("/messages/:id/export", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: { include: { domain: true } }, attachments: { where: { deletedAt: null } } },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Build RFC 5322 email using mailbuild
    const mail = new Mailbuild("multipart/mixed");

    mail.setHeader("Message-ID", message.messageId || `<${message.id}@${message.inbox.domain.name}>`);
    mail.setHeader("Date", message.receivedAt.toUTCString());
    mail.setHeader("From", message.fromAddress || "unknown@unknown");
    mail.setHeader("To", message.toAddress || `${message.inbox.localPart}@${message.inbox.domain.name}`);
    mail.setHeader("Subject", message.subject || "(no subject)");

    // Add text body
    if (message.textBody) {
      const textPart = mail.appendChild();
      textPart.setHeader("Content-Type", "text/plain; charset=utf-8");
      textPart.setContent(message.textBody);
    }

    // Add HTML body if exists
    if (message.htmlBody) {
      const htmlPart = mail.appendChild();
      htmlPart.setHeader("Content-Type", "text/html; charset=utf-8");
      htmlPart.setContent(message.htmlBody);
    }

    // Add attachments
    for (const attachment of message.attachments) {
      try {
        const streamOrBlob = await storageService.getReadStream(attachment.storageKey);
        let content: string;

        if (streamOrBlob instanceof Blob) {
          // Handle Blob (rare case)
          const buffer = Buffer.from(await streamOrBlob.arrayBuffer());
          content = buffer.toString("base64");
        } else {
          // Handle Readable stream
          const chunks: Buffer[] = [];
          for await (const chunk of streamOrBlob) {
            chunks.push(Buffer.from(chunk));
          }
          content = Buffer.concat(chunks).toString("base64");
        }

        const attPart = mail.appendChild();
        attPart.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
        attPart.setHeader("Content-Transfer-Encoding", "base64");
        attPart.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`);
        attPart.setContent(content);
      } catch (err) {
        request.log.warn({ attachmentId: attachment.id, err }, "Failed to include attachment in export");
      }
    }

    const emlContent = mail.build();
    const filename = `email_${message.id.slice(0, 8)}.eml`;

    reply.header("Content-Type", "message/rfc822");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);

    return reply.send(emlContent);
  });
}
