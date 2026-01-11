import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";
import { storageService } from "../services/storage";
import { generateSessionId } from "../utils/session";

/**
 * Public inbox viewer routes - no authentication required
 * Allows viewing emails for any inbox on VERIFIED domains
 */
export async function publicInboxRoutes(app: FastifyInstance) {
  // Rate limit configuration for public endpoints
  const publicRateLimit = {
    max: 100,
    timeWindow: "1 minute",
  };

  /**
   * POST /public/inbox/search
   * Search for an inbox by email address and return basic info
   */
  app.post("/public/inbox/search", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    const [localPart, domainName] = body.data.email.split("@");
    if (!localPart || !domainName) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: {
        localPart,
        domain: { name: domainName, status: "VERIFIED" },
        deletedAt: null,
      },
      include: { domain: { select: { name: true } } },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    // Check share mode - PRIVATE inboxes are not accessible publicly
    if (inbox.shareMode === "PRIVATE") {
      await recordAudit(null, "PRIVATE_INBOX_ACCESS_DENIED", {
        email: body.data.email,
        ip: request.ip,
        userAgent: request.headers["user-agent"] || "Unknown",
        reason: "Inbox is private",
        timestamp: Date.now(),
      });
      return reply.status(403).send({
        error: "This inbox is private. Only the owner can access it.",
        code: "INBOX_PRIVATE",
      });
    }

    await recordAudit(null, "PUBLIC_INBOX_SEARCHED", {
      email: body.data.email,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
      sessionId: generateSessionId(request.ip, request.headers["user-agent"] || "Unknown"),
      searchQuery: body.data.email,
      referer: request.headers["referer"],
      timestamp: Date.now(),
    });

    return {
      inbox: {
        id: inbox.id,
        email: `${inbox.localPart}@${inbox.domain.name}`,
        localPart: inbox.localPart,
        domain: inbox.domain.name,
      },
    };
  });

  /**
   * GET /public/inbox/:email/messages
   * Get paginated list of messages for an inbox
   */
  app.get("/public/inbox/:email/messages", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const params = z.object({ email: z.string() }).safeParse(request.params);
    const query = z.object({
      limit: z.coerce.number().min(1).max(50).default(20),
      offset: z.coerce.number().min(0).default(0),
      sort: z.enum(["asc", "desc"]).default("desc"),
    }).safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const [localPart, domainName] = params.data.email.split("@");
    if (!localPart || !domainName) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: {
        localPart,
        domain: { name: domainName, status: "VERIFIED" },
        deletedAt: null,
      },
      select: { id: true, shareMode: true },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    // Check share mode - PRIVATE inboxes are not accessible publicly
    if (inbox.shareMode === "PRIVATE") {
      await recordAudit(null, "PRIVATE_INBOX_ACCESS_DENIED", {
        email: params.data.email,
        ip: request.ip,
        userAgent: request.headers["user-agent"] || "Unknown",
        reason: "Inbox is private - messages list",
        timestamp: Date.now(),
      });
      return reply.status(403).send({
        error: "This inbox is private. Only the owner can view messages.",
        code: "INBOX_PRIVATE",
      });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { inboxId: inbox.id, deletedAt: null },
        orderBy: { receivedAt: query.data.sort },
        take: query.data.limit,
        skip: query.data.offset,
        select: {
          id: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          isRead: true,
          textBody: true,
          _count: { select: { attachments: true } },
        },
      }),
      prisma.message.count({ where: { inboxId: inbox.id, deletedAt: null } }),
    ]);

    // Truncate preview to 150 chars, exclude full textBody
    const messagesWithPreview = messages.map((m) => ({
      id: m.id,
      fromAddress: m.fromAddress,
      subject: m.subject,
      receivedAt: m.receivedAt,
      isRead: m.isRead,
      preview: m.textBody?.slice(0, 150) || "",
      attachmentCount: m._count.attachments,
    }));

    await recordAudit(null, "PUBLIC_MESSAGES_LISTED", {
      email: params.data.email,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
      sessionId: generateSessionId(request.ip, request.headers["user-agent"] || "Unknown"),
      messageCount: messagesWithPreview.length,
      referer: request.headers["referer"],
      timestamp: Date.now(),
    });

    return { data: messagesWithPreview, meta: { total, limit: query.data.limit, offset: query.data.offset } };
  });

  /**
   * GET /public/inbox/:email/messages/:messageId
   * Get full message detail with attachments
   */
  app.get("/public/inbox/:email/messages/:messageId", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const params = z.object({
      email: z.string(),
      messageId: z.string().uuid(),
    }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const [localPart, domainName] = params.data.email.split("@");
    if (!localPart || !domainName) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: {
        localPart,
        domain: { name: domainName, status: "VERIFIED" },
        deletedAt: null,
      },
      select: { id: true, shareMode: true },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    // Check share mode - PRIVATE inboxes are not accessible publicly
    if (inbox.shareMode === "PRIVATE") {
      await recordAudit(null, "PRIVATE_INBOX_ACCESS_DENIED", {
        email: params.data.email,
        messageId: params.data.messageId,
        ip: request.ip,
        userAgent: request.headers["user-agent"] || "Unknown",
        reason: "Inbox is private - message detail",
        timestamp: Date.now(),
      });
      return reply.status(403).send({
        error: "This inbox is private. Only the owner can access it.",
        code: "INBOX_PRIVATE",
      });
    }

    const message = await prisma.message.findFirst({
      where: {
        id: params.data.messageId,
        inboxId: inbox.id,
        deletedAt: null,
      },
      include: {
        attachments: {
          where: { deletedAt: null },
          select: { id: true, filename: true, mimeType: true, size: true },
        },
      },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    await recordAudit(null, "PUBLIC_MESSAGE_VIEWED", {
      email: params.data.email,
      messageId: message.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
      sessionId: generateSessionId(request.ip, request.headers["user-agent"] || "Unknown"),
      hasAttachments: message.attachments.length > 0,
      referer: request.headers["referer"],
      timestamp: Date.now(),
    });

    // Exclude internal fields (sourceIp, ownerId not in message)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sourceIp, ...safeMessage } = message as any;

    return { message: safeMessage };
  });

  /**
   * GET /public/attachments/:id/download
   * Download attachment file (only if parent inbox is on VERIFIED domain)
   */
  app.get("/public/attachments/:id/download", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid attachment ID" });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.data.id },
      include: {
        message: {
          include: {
            inbox: {
              include: { domain: true },
            },
          },
        },
      },
    });

    if (!attachment || attachment.deletedAt) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    // Verify parent inbox is on VERIFIED domain
    if (attachment.message.inbox.domain.status !== "VERIFIED") {
      return reply.status(403).send({ error: "Access denied" });
    }

    // Verify inbox and message not deleted
    if (attachment.message.inbox.deletedAt || attachment.message.deletedAt) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    // Check share mode - PRIVATE inboxes are not accessible publicly
    if (attachment.message.inbox.shareMode === "PRIVATE") {
      const inboxEmail = `${attachment.message.inbox.localPart}@${attachment.message.inbox.domain.name}`;
      await recordAudit(null, "PRIVATE_INBOX_ACCESS_DENIED", {
        attachmentId: params.data.id,
        inboxEmail,
        ip: request.ip,
        userAgent: request.headers["user-agent"] || "Unknown",
        reason: "Inbox is private - attachment download",
        timestamp: Date.now(),
      });
      return reply.status(403).send({
        error: "This inbox is private. Only the owner can access attachments.",
        code: "INBOX_PRIVATE",
      });
    }

    const stream = await storageService.getReadStream(attachment.storageKey);

    await recordAudit(null, "PUBLIC_ATTACHMENT_DOWNLOADED", {
      attachmentId: params.data.id,
      messageId: attachment.message.id,
      inboxEmail: `${attachment.message.inbox.localPart}@${attachment.message.inbox.domain.name}`,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
      sessionId: generateSessionId(request.ip, request.headers["user-agent"] || "Unknown"),
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      referer: request.headers["referer"],
      timestamp: Date.now(),
    });

    reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename="${attachment.filename}"`);

    return reply.send(stream);
  });
}
