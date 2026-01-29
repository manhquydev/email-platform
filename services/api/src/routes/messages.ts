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
import { outboundService } from "../services/outbound";
import { OTPExtractorService } from "../services/otp-extractor.service";
import { PhishingDetectorService } from "../services/phishing-detector.service";
import { EmailCategorizerService } from "../services/email-categorizer.service";

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
        // Include labels and attachment count
        include: {
          _count: { select: { attachments: true } },
          labels: { include: { label: true } },
        },
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
        // Include labels and attachment count
        include: {
          _count: { select: { attachments: true } },
          labels: { include: { label: true } },
        },
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
        include: { inbox: { include: { domain: true } }, attachments: { where: { deletedAt: null } }, labels: { include: { label: true } } },
      }),
      prisma.message.count({ where }),
    ]);

    return { data: messages, meta: { total } };
  });

  // Fuzzy search using pg_trgm similarity ranking
  // SECURITY: Added ownership filter to prevent BOLA vulnerability
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
    const userId = (request.user as any).userId;
    const isAdmin = (request.user as any).role === "ADMIN";

    // SECURITY FIX: Get accessible inbox IDs for ownership filtering
    const accessibleInboxIds = await TeamService.getAccessibleInboxIds(userId);

    // If user has no accessible inboxes and is not admin, return empty
    if (accessibleInboxIds.length === 0 && !isAdmin) {
      return { data: [], meta: { query: q, threshold, total: 0 } };
    }

    // Use raw SQL for pg_trgm similarity search with ownership filter
    const messages = isAdmin
      ? await prisma.$queryRaw`
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
        `
      : await prisma.$queryRaw`
          SELECT m.*,
                 GREATEST(
                   COALESCE(similarity(m.subject, ${q}), 0),
                   COALESCE(similarity(m."textBody", ${q}), 0)
                 ) as relevance
          FROM "Message" m
          WHERE m."deletedAt" IS NULL
            AND m."inboxId" = ANY(${accessibleInboxIds}::uuid[])
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
      include: { attachments: { where: { deletedAt: null } }, inbox: { include: { domain: true } }, labels: { include: { label: true } } },
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

  // SECURITY: Optimized attachment download - check ownership BEFORE loading file
  app.get("/attachments/:id/download", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const userId = (request.user as any)?.userId ?? null;
    const role = (request.user as any)?.role;

    // SECURITY FIX: Check ownership BEFORE loading full attachment data
    const attachmentMeta = await prisma.attachment.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        storageKey: true,
        filename: true,
        mimeType: true,
        message: { select: { inboxId: true } }
      },
    });

    if (!attachmentMeta) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    // Check access before streaming file
    const hasAccess = await TeamService.canAccessInbox(userId, attachmentMeta.message.inboxId);
    if (!hasAccess && role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    try {
      const stream = await storageService.getReadStream(attachmentMeta.storageKey);
      // Sanitize filename to prevent header injection
      const safeFilename = attachmentMeta.filename.replace(/["\\]/g, "_");
      reply.header("Content-Disposition", `attachment; filename="${safeFilename}"`);
      reply.header("Content-Type", attachmentMeta.mimeType || "application/octet-stream");
      return reply.send(stream);
    } catch (e) {
      request.log.error(e);
      return reply.status(404).send({ error: "File not found" });
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
        // Sanitize filename to prevent header injection
        const safeAttFilename = attachment.filename.replace(/["\\]/g, "_");
        attPart.setHeader("Content-Disposition", `attachment; filename="${safeAttFilename}"`);
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

  // Reply to a message
  app.post("/messages/:id/reply", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const bodySchema = z.object({
      text: z.string().optional(),
      html: z.string().optional(),
      subject: z.string().optional(),
      replyAll: z.boolean().optional().default(false),
    });

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    if (!body.data.text && !body.data.html) {
      return reply.status(400).send({ error: "Reply must have text or html content" });
    }

    const userId = (request.user as any).userId;

    // Get original message
    const originalMessage = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: {
        inbox: { include: { domain: true } },
        attachments: { where: { deletedAt: null } },
      },
    });

    if (!originalMessage) {
      return reply.status(404).send({ error: "Message not found" });
    }

    // Check access to inbox
    const hasAccess = await TeamService.canAccessInbox(userId, originalMessage.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Check if domain is verified and owned
    const domain = originalMessage.inbox.domain;
    if (domain.ownerId !== userId && !domain.isPublic) {
      return reply.status(403).send({ error: "Cannot send from this domain" });
    }

    if (domain.status !== "VERIFIED") {
      return reply.status(403).send({ error: "Domain not verified for sending" });
    }

    // Build reply addresses
    const fromAddress = `${originalMessage.inbox.localPart}@${domain.name}`;
    const toAddress = originalMessage.fromAddress;

    if (!toAddress) {
      return reply.status(400).send({ error: "Original message has no sender address to reply to" });
    }

    // Build subject (add Re: if not already present)
    let replySubject = body.data.subject || originalMessage.subject || "";
    if (!replySubject.toLowerCase().startsWith("re:")) {
      replySubject = `Re: ${replySubject}`;
    }

    // Build threading headers
    const inReplyTo = originalMessage.messageId;
    const references = originalMessage.messageId;

    // Create outbound message record
    const outboundMsg = await prisma.outboundMessage.create({
      data: {
        userId,
        domainId: domain.id,
        inboxId: originalMessage.inbox.id,
        fromAddress,
        toAddress,
        subject: replySubject,
        messageId: `tmp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: "SENDING",
        inReplyTo,
        replyToMessageId: originalMessage.id,
      },
    });

    // Send email
    try {
      const info = await outboundService.sendEmail(
        fromAddress,
        toAddress,
        replySubject,
        body.data.text,
        body.data.html,
        undefined, // No attachments for now
        {
          headers: {
            "In-Reply-To": inReplyTo || "",
            "References": references || "",
          },
        }
      );

      // Update record with real Message-ID and SENT status
      await prisma.outboundMessage.update({
        where: { id: outboundMsg.id },
        data: {
          messageId: info.messageId,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await recordAudit(userId, "EMAIL_REPLY_SENT", {
        msgId: info.messageId,
        outboundMessageId: outboundMsg.id,
        originalMessageId: originalMessage.id,
        from: fromAddress,
        to: toAddress,
      });

      return {
        ok: true,
        messageId: info.messageId,
        outboundId: outboundMsg.id,
      };
    } catch (err: any) {
      // Update record to FAILED
      await prisma.outboundMessage.update({
        where: { id: outboundMsg.id },
        data: {
          status: "FAILED",
          bounceMessage: err.message,
        },
      }).catch(() => {});

      request.log.error(err, "Failed to send reply");
      return reply.status(500).send({ error: "Failed to send reply", details: err.message });
    }
  });

  // Forward a message to another address
  app.post("/messages/:id/forward", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const bodySchema = z.object({
      to: z.string().email(),
      text: z.string().optional(),
      html: z.string().optional(),
      includeAttachments: z.boolean().optional().default(false),
    });

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    // Get original message
    const originalMessage = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: {
        inbox: { include: { domain: true } },
        attachments: { where: { deletedAt: null } },
      },
    });

    if (!originalMessage) {
      return reply.status(404).send({ error: "Message not found" });
    }

    // Check access to inbox
    const hasAccess = await TeamService.canAccessInbox(userId, originalMessage.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Check if domain is verified
    const domain = originalMessage.inbox.domain;
    if (domain.ownerId !== userId && !domain.isPublic) {
      return reply.status(403).send({ error: "Cannot forward from this domain" });
    }

    if (domain.status !== "VERIFIED") {
      return reply.status(403).send({ error: "Domain not verified for sending" });
    }

    const fromAddress = `${originalMessage.inbox.localPart}@${domain.name}`;
    const toAddress = body.data.to;

    // Build forward subject
    let forwardSubject = originalMessage.subject || "";
    if (!forwardSubject.toLowerCase().startsWith("fwd:")) {
      forwardSubject = `Fwd: ${forwardSubject}`;
    }

    // Build forward body
    const forwardHeader = `
---------- Forwarded message ----------
From: ${originalMessage.fromAddress || "unknown"}
Date: ${originalMessage.receivedAt.toISOString()}
Subject: ${originalMessage.subject || "(no subject)"}
To: ${originalMessage.toAddress || "unknown"}
`;

    const textBody = body.data.text
      ? `${body.data.text}\n\n${forwardHeader}\n${originalMessage.textBody || ""}`
      : `${forwardHeader}\n${originalMessage.textBody || ""}`;

    const htmlBody = body.data.html
      ? `${body.data.html}<br><br><hr>${forwardHeader.replace(/\n/g, "<br>")}<br>${originalMessage.htmlBody || originalMessage.textBody || ""}`
      : originalMessage.htmlBody
        ? `<hr>${forwardHeader.replace(/\n/g, "<br>")}<br>${originalMessage.htmlBody}`
        : undefined;

    // Handle attachments if requested
    let attachments: any[] = [];
    if (body.data.includeAttachments && originalMessage.attachments.length > 0) {
      for (const att of originalMessage.attachments) {
        try {
          const stream = await storageService.getReadStream(att.storageKey);
          const chunks: Buffer[] = [];
          for await (const chunk of stream as any) {
            chunks.push(Buffer.from(chunk));
          }
          attachments.push({
            filename: att.filename,
            content: Buffer.concat(chunks),
            contentType: att.mimeType || "application/octet-stream",
          });
        } catch (err) {
          request.log.warn({ attachmentId: att.id, err }, "Failed to include attachment in forward");
        }
      }
    }

    // Create outbound message record
    const outboundMsg = await prisma.outboundMessage.create({
      data: {
        userId,
        domainId: domain.id,
        inboxId: originalMessage.inbox.id,
        fromAddress,
        toAddress,
        subject: forwardSubject,
        messageId: `tmp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: "SENDING",
        replyToMessageId: originalMessage.id,
      },
    });

    // Send email
    try {
      const info = await outboundService.sendEmail(
        fromAddress,
        toAddress,
        forwardSubject,
        textBody,
        htmlBody,
        attachments.length > 0 ? attachments : undefined
      );

      await prisma.outboundMessage.update({
        where: { id: outboundMsg.id },
        data: {
          messageId: info.messageId,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await recordAudit(userId, "EMAIL_FORWARDED", {
        msgId: info.messageId,
        outboundMessageId: outboundMsg.id,
        originalMessageId: originalMessage.id,
        from: fromAddress,
        to: toAddress,
        attachmentCount: attachments.length,
      });

      return {
        ok: true,
        messageId: info.messageId,
        outboundId: outboundMsg.id,
      };
    } catch (err: any) {
      await prisma.outboundMessage.update({
        where: { id: outboundMsg.id },
        data: {
          status: "FAILED",
          bounceMessage: err.message,
        },
      }).catch(() => {});

      request.log.error(err, "Failed to forward message");
      return reply.status(500).send({ error: "Failed to forward message", details: err.message });
    }
  });

  // AI Summarization endpoint
  app.post("/messages/:id/summarize", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const bodySchema = z.object({
      forceRegenerate: z.boolean().optional().default(false),
    });

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const body = bodySchema.safeParse(request.body || {});
    const forceRegenerate = body.success ? body.data.forceRegenerate : false;

    const userId = (request.user as any).userId;

    // Import AI service
    const { AISummarizationService } = await import("../services/ai-summarization.service");
    const { appConfig } = await import("../config");

    // Check if AI is enabled
    if (!AISummarizationService.isEnabled()) {
      return reply.status(503).send({
        error: "AI summarization not available",
        message: "AI features are not configured on this server",
      });
    }

    // Check user tier access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    if (!AISummarizationService.hasTierAccess(user.tier)) {
      return reply.status(403).send({
        error: "Upgrade required",
        message: "AI summarization requires Starter plan or higher",
        currentTier: user.tier,
        requiredTier: "STARTER",
      });
    }

    // Check message access
    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      select: { id: true, inboxId: true, aiSummary: true, aiSummarizedAt: true },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    try {
      const result = await AISummarizationService.summarize(
        params.data.id,
        userId,
        forceRegenerate
      );

      return {
        summary: result.summary,
        cached: result.cached,
      };
    } catch (error: any) {
      request.log.error(error, "Failed to generate AI summary");
      return reply.status(500).send({
        error: "Failed to generate summary",
        details: error.message,
      });
    }
  });

  // --- AI Gatekeeper Endpoints ---

  // GET /messages/:id/otp - Extract OTP from message
  app.get("/messages/:id/otp", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const userId = (request.user as any).userId;
    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    // Check access
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    try {
      const result = await OTPExtractorService.extractAndSave(params.data.id);
      if (!result) {
        return reply.send({ found: false, otp: null });
      }
      return reply.send({ found: true, otp: result });
    } catch (error: any) {
      request.log.error(error, "Failed to extract OTP");
      return reply.status(500).send({ error: "Failed to extract OTP" });
    }
  });

  // GET /messages/:id/phishing - Analyze message for phishing
  app.get("/messages/:id/phishing", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const userId = (request.user as any).userId;
    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      select: {
        id: true, inboxId: true, fromAddress: true, subject: true,
        textBody: true, htmlBody: true, spfResult: true, dkimResult: true, dmarcResult: true,
      },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const result = PhishingDetectorService.analyze(message);
    return reply.send(result);
  });

  // GET /messages/:id/category - Get message category
  app.get("/messages/:id/category", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const userId = (request.user as any).userId;
    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      select: { id: true, inboxId: true, fromAddress: true, subject: true, textBody: true, htmlBody: true },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const result = EmailCategorizerService.categorize(message);
    return reply.send(result);
  });

  // --- Message Move/Copy/Archive/Trash ---

  app.post("/messages/:id/move", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ folderId: z.string().uuid() }).safeParse(request.body);

    if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid request" });

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!message) return reply.status(404).send({ error: "Message not found" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Verify folder belongs to same inbox
    const folder = await prisma.folder.findUnique({ where: { id: body.data.folderId } });
    if (!folder || folder.inboxId !== message.inboxId) {
      return reply.status(400).send({ error: "Invalid folder" });
    }

    // Update message
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { folderId: folder.id }
    });

    return { message: updated };
  });

  app.post("/messages/:id/archive", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "Invalid request" });

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!message) return reply.status(404).send({ error: "Message not found" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Find Archive folder
    let archiveFolder = await prisma.folder.findFirst({
      where: { inboxId: message.inboxId, specialUse: "\\Archive" }
    });
    if (!archiveFolder) {
      archiveFolder = await prisma.folder.create({
        data: {
          inboxId: message.inboxId,
          name: "Archive",
          specialUse: "\\Archive",
          sortOrder: 5
        }
      });
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { folderId: archiveFolder.id }
    });

    return { message: updated };
  });

  app.post("/messages/:id/trash", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "Invalid request" });

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null },
      include: { inbox: true }
    });
    if (!message) return reply.status(404).send({ error: "Message not found" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Find Trash folder
    let trashFolder = await prisma.folder.findFirst({
      where: { inboxId: message.inboxId, specialUse: "\\Trash" }
    });
    if (!trashFolder) {
      trashFolder = await prisma.folder.create({
        data: {
          inboxId: message.inboxId,
          name: "Trash",
          specialUse: "\\Trash",
          sortOrder: 4
        }
      });
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { folderId: trashFolder.id }
    });

    return { message: updated };
  });

  // Flag operations
  app.post("/messages/:id/flags", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ flag: z.string() }).safeParse(request.body);

    if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid request" });

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null }
    });
    if (!message) return reply.status(404).send({ error: "Message not found" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    await prisma.messageFlag.upsert({
      where: { messageId_flag: { messageId: message.id, flag: body.data.flag } },
      update: {},
      create: { messageId: message.id, flag: body.data.flag }
    });

    return { ok: true };
  });

  app.delete("/messages/:id/flags/:flag", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid(), flag: z.string() }).safeParse(request.params);

    if (!params.success) return reply.status(400).send({ error: "Invalid request" });

    const message = await prisma.message.findUnique({
      where: { id: params.data.id, deletedAt: null }
    });
    if (!message) return reply.status(404).send({ error: "Message not found" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, message.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    await prisma.messageFlag.deleteMany({
      where: { messageId: message.id, flag: params.data.flag }
    });

    return { ok: true };
  });
}
