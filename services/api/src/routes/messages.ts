import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import path from "path";
import { appConfig } from "../config";
import { promises as fs } from "fs";
import { recordAudit } from "../utils/audit";

export async function messageRoutes(app: FastifyInstance) {
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

    const { inboxId, limit, offset, q, hasAttachments } = query.data;
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
      })
      .safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const inbox = await prisma.inbox.findUnique({ where: { id: params.data.id, deletedAt: null } });
    if (!inbox) {
      return reply.status(404).send({ error: "Inbox not found" });
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
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const where = {
      deletedAt: null,
      ...(query.data.domain ? { inbox: { domain: { name: query.data.domain } } } : {}),
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
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: query.data.limit ?? 50,
        skip: query.data.offset ?? 0,
        include: { inbox: { include: { domain: true } }, attachments: { where: { deletedAt: null } } },
      }),
      prisma.message.count({ where }),
    ]);

    return { data: messages, meta: { total } };
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

    return { message };
  });

  app.delete("/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.message.findUnique({ where: { id: params.data.id, deletedAt: null } });
    if (!existing) {
      return reply.status(404).send({ error: "Message not found" });
    }

    const now = new Date();
    await prisma.attachment.updateMany({ where: { messageId: existing.id }, data: { deletedAt: now } });
    await prisma.message.update({ where: { id: existing.id }, data: { deletedAt: now } });
    const userId = (request.user as any)?.userId ?? null;
    await recordAudit(userId, "MESSAGE_DELETED", { messageId: existing.id });
    return { ok: true };
  });

  app.get("/attachments/:id/download", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.data.id },
      include: { message: true },
    });
    if (!attachment) {
      return reply.status(404).send({ error: "Attachment not found" });
    }
    if (attachment.deletedAt || attachment.message?.deletedAt) {
      return reply.status(410).send({ error: "Attachment unavailable" });
    }

    const filePath = path.join(appConfig.storageDir, attachment.storageKey);
    const fileBuffer = await fs.readFile(filePath);
    reply.header("Content-Disposition", `attachment; filename="${attachment.filename}"`);
    reply.header("Content-Type", attachment.mimeType ?? "application/octet-stream");
    return reply.send(fileBuffer);
  });
}
