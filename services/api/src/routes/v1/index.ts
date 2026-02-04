/**
 * API v1 Routes - Developer API for third-party integrations
 * "Stripe for Privacy" - RESTful endpoints with versioning
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { OTPExtractorService } from "../../services/otp-extractor.service";
import { EmailCategorizerService } from "../../services/email-categorizer.service";
import { PhishingDetectorService } from "../../services/phishing-detector.service";

export async function v1Routes(app: FastifyInstance) {
  // All v1 routes require API key authentication (handled by app.authenticate)

  // POST /v1/inboxes - Create a new inbox
  app.post("/v1/inboxes", { preHandler: app.authenticate }, async (req, reply) => {
    const user = req.user as any;
    const userId = user.userId;
    const anonymousId = user.anonymousId; // Check if anonymous session

    const schema = z.object({
      domain: z.string().optional(),
      localPart: z.string().optional(),
      expiresInMinutes: z.number().min(1).max(43200).optional(), // Max 30 days
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    // Find a public domain if none specified
    const domain = parsed.data.domain
      ? await prisma.domain.findFirst({ where: { name: parsed.data.domain, isPublic: true } })
      : await prisma.domain.findFirst({ where: { isPublic: true }, orderBy: { createdAt: "asc" } });

    if (!domain) {
      return reply.status(400).send({ error: "No available domain" });
    }

    // Generate random local part if not provided
    const localPart = parsed.data.localPart || `api-${Date.now().toString(36)}`;

    // Check if inbox already exists
    const existing = await prisma.inbox.findUnique({
      where: { domainId_localPart: { domainId: domain.id, localPart } },
    });
    if (existing && !existing.deletedAt) {
      return reply.status(409).send({ error: "Inbox already exists" });
    }

    const expiresAt = parsed.data.expiresInMinutes
      ? new Date(Date.now() + parsed.data.expiresInMinutes * 60 * 1000)
      : null;

    const inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart,
        // For anonymous sessions: track anonymousAccountId instead of ownerId
        // For regular users: set ownerId as normal
        ...(anonymousId
          ? { anonymousAccountId: anonymousId, ownerId: null }
          : { ownerId: userId, anonymousAccountId: null }
        ),
        expiresAt,
      },
      include: { domain: true },
    });

    return reply.status(201).send({
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain.name,
      createdAt: inbox.createdAt,
      expiresAt: inbox.expiresAt,
    });
  });

  // GET /v1/inboxes/:id - Get inbox details
  app.get("/v1/inboxes/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid inbox ID" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: { id: params.data.id, ownerId: userId, deletedAt: null },
      include: { domain: true, _count: { select: { messages: true } } },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    return {
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain.name,
      messageCount: inbox._count.messages,
      createdAt: inbox.createdAt,
      expiresAt: inbox.expiresAt,
    };
  });

  // DELETE /v1/inboxes/:id - Delete inbox
  app.delete("/v1/inboxes/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid inbox ID" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: { id: params.data.id, ownerId: userId, deletedAt: null },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    await prisma.inbox.update({
      where: { id: inbox.id },
      data: { deletedAt: new Date() },
    });

    return reply.status(204).send();
  });

  // GET /v1/inboxes/:id/messages - List messages in inbox
  app.get("/v1/inboxes/:id/messages", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
    }).safeParse(req.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const inbox = await prisma.inbox.findFirst({
      where: { id: params.data.id, ownerId: userId, deletedAt: null },
    });

    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { inboxId: inbox.id, deletedAt: null },
        orderBy: { receivedAt: "desc" },
        take: query.data.limit,
        skip: query.data.offset,
        select: {
          id: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          isRead: true,
          extractedOtp: true,
        },
      }),
      prisma.message.count({ where: { inboxId: inbox.id, deletedAt: null } }),
    ]);

    return {
      data: messages,
      meta: { total, limit: query.data.limit, offset: query.data.offset },
    };
  });

  // GET /v1/messages/:id - Get message detail
  app.get("/v1/messages/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const message = await prisma.message.findFirst({
      where: { id: params.data.id, deletedAt: null, inbox: { ownerId: userId } },
      include: { inbox: { include: { domain: true } }, attachments: true },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    return {
      id: message.id,
      inboxId: message.inboxId,
      from: message.fromAddress,
      to: message.toAddress,
      subject: message.subject,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      receivedAt: message.receivedAt,
      isRead: message.isRead,
      extractedOtp: message.extractedOtp,
      attachments: message.attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
      })),
    };
  });

  // GET /v1/messages/:id/otp - Extract OTP from message
  app.get("/v1/messages/:id/otp", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const message = await prisma.message.findFirst({
      where: { id: params.data.id, deletedAt: null, inbox: { ownerId: userId } },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const result = await OTPExtractorService.extractAndSave(params.data.id);
    return { found: !!result, otp: result };
  });

  // GET /v1/messages/:id/analysis - Get full message analysis (category, phishing)
  app.get("/v1/messages/:id/analysis", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid message ID" });
    }

    const message = await prisma.message.findFirst({
      where: { id: params.data.id, deletedAt: null, inbox: { ownerId: userId } },
    });

    if (!message) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const [otp, category, phishing] = await Promise.all([
      OTPExtractorService.extractAndSave(params.data.id),
      EmailCategorizerService.categorize(message),
      PhishingDetectorService.analyze(message),
    ]);

    return {
      otp: otp ? { found: true, ...otp } : { found: false },
      category,
      phishing,
    };
  });

  // GET /v1/usage - Get API usage stats
  app.get("/v1/usage", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as any).userId;

    const [inboxCount, messageCount, apiKeyCount] = await Promise.all([
      prisma.inbox.count({ where: { ownerId: userId, deletedAt: null } }),
      prisma.message.count({ where: { inbox: { ownerId: userId }, deletedAt: null } }),
      prisma.apiKey.count({ where: { userId } }),
    ]);

    return {
      inboxes: inboxCount,
      messages: messageCount,
      apiKeys: apiKeyCount,
    };
  });
}
