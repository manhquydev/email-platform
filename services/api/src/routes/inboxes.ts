import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function inboxRoutes(app: FastifyInstance) {
  app.get("/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        domain: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const domainFilter = query.data.domain;
    const where = {
      deletedAt: null,
      ...(domainFilter ? { domain: { name: domainFilter } } : {}),
      ...(query.data.search
        ? { localPart: { contains: query.data.search, mode: "insensitive" as const } }
        : {}),
    };
    const [inboxes, total] = await Promise.all([
      prisma.inbox.findMany({
        where,
        include: { domain: true },
        orderBy: { createdAt: "desc" },
        take: query.data.limit ?? 100,
        skip: query.data.offset ?? 0,
      }),
      prisma.inbox.count({ where }),
    ]);
    return { data: inboxes, meta: { total } };
  });

  app.post("/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      domainId: z.string().uuid(),
      localPart: z.string().min(1),
      expiresAt: z.string().datetime().nullable().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { domainId, localPart, expiresAt } = parsed.data;
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // Kiểm tra domain đã verified chưa
    if (domain.status !== "VERIFIED") {
      return reply.status(403).send({
        error: "Domain chưa được xác thực",
        details: "Vui lòng xác thực domain trước khi tạo inbox. Thêm TXT record vào DNS và nhấn 'Xác thực ngay'.",
        code: "DOMAIN_NOT_VERIFIED"
      });
    }

    const user = request.user as { userId: string; role: string };
    if (domain.ownerId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized to create inbox for this domain" });
    }

    const existing = await prisma.inbox.findUnique({ where: { domainId_localPart: { domainId, localPart } } });
    if (existing && !existing.deletedAt) {
      return reply.status(409).send({ error: "Inbox exists", inbox: existing });
    }

    const inbox = existing
      ? await prisma.inbox.update({
        where: { id: existing.id },
        data: { deletedAt: null, expiresAt: expiresAt ? new Date(expiresAt) : null },
      })
      : await prisma.inbox.create({
        data: {
          domainId,
          localPart,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

    return { inbox };
  });
}
