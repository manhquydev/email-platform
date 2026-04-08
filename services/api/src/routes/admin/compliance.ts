import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAuditFromRequest } from "../../utils/audit";

const ediscoverySchema = z.object({
  organizationId: z.string().uuid(),
  keywords: z.array(z.string().min(1)).optional(),
  senders: z.array(z.string().email()).optional(),
  recipients: z.array(z.string().email()).optional(),
  custodians: z.array(z.string().uuid()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(200),
});

const exportParamsSchema = z.object({
  userId: z.string().uuid(),
});

export async function complianceRoutes(app: FastifyInstance) {
  app.get("/compliance/status", { preHandler: app.requireAdmin }, async () => {
    return {
      module: "compliance",
      enabled: true,
      capabilities: {
        ediscoverySearch: true,
        gdprExport: true,
        legalHold: false,
      },
      notes: [
        "Legal hold endpoints are reserved for the next phase and currently return 501.",
      ],
    };
  });

  // Legal hold APIs are part of roadmap but not available until schema/tables are added.
  app.post("/compliance/holds", { preHandler: app.requireAdmin }, async (request, reply) => {
    await recordAuditFromRequest(
      request,
      "COMPLIANCE_LEGAL_HOLD_CREATE_NOT_IMPLEMENTED",
      {},
      false
    );
    return reply.status(501).send({
      error: "Legal hold is not implemented yet",
    });
  });

  app.delete("/compliance/holds/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    await recordAuditFromRequest(
      request,
      "COMPLIANCE_LEGAL_HOLD_RELEASE_NOT_IMPLEMENTED",
      { holdId: (request.params as { id?: string }).id ?? null },
      false
    );
    return reply.status(501).send({
      error: "Legal hold is not implemented yet",
    });
  });

  app.post("/compliance/ediscovery/search", { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsed = ediscoverySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const where: any = {
      inbox: {
        organizationId: data.organizationId,
      },
    };

    if (data.custodians && data.custodians.length > 0) {
      where.inbox.ownerId = { in: data.custodians };
    }

    if (data.senders && data.senders.length > 0) {
      where.fromAddress = { in: data.senders };
    }

    if (data.recipients && data.recipients.length > 0) {
      where.toAddress = { in: data.recipients };
    }

    if (data.startDate || data.endDate) {
      where.receivedAt = {};
      if (data.startDate) where.receivedAt.gte = new Date(data.startDate);
      if (data.endDate) where.receivedAt.lte = new Date(data.endDate);
    }

    const messages = await prisma.message.findMany({
      where,
      select: {
        id: true,
        subject: true,
        fromAddress: true,
        toAddress: true,
        receivedAt: true,
        textBody: true,
        inbox: {
          select: {
            id: true,
            localPart: true,
            domain: { select: { name: true } },
            owner: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: data.limit,
    });

    let filtered = messages;
    if (data.keywords && data.keywords.length > 0) {
      const keywords = data.keywords.map((k) => k.toLowerCase());
      filtered = messages.filter((m) => {
        const haystack = `${m.subject ?? ""} ${m.textBody ?? ""}`.toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword));
      });
    }

    await recordAuditFromRequest(request, "COMPLIANCE_EDISCOVERY_SEARCH", {
      organizationId: data.organizationId,
      limit: data.limit,
      resultCount: filtered.length,
    });

    return { data: filtered, meta: { count: filtered.length } };
  });

  app.post("/compliance/export/:userId", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = exportParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.data.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        createdAt: true,
        emailVerified: true,
        inboxes: {
          where: { deletedAt: null },
          select: {
            id: true,
            localPart: true,
            createdAt: true,
            domain: { select: { name: true } },
            messages: {
              where: { deletedAt: null },
              orderBy: { receivedAt: "desc" },
              take: 100,
              select: {
                id: true,
                subject: true,
                fromAddress: true,
                toAddress: true,
                receivedAt: true,
              },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            action: true,
            createdAt: true,
            success: true,
            outcome: true,
            ip: true,
            userAgent: true,
            requestId: true,
            meta: true,
          },
        },
      },
    });

    if (!user) {
      await recordAuditFromRequest(
        request,
        "COMPLIANCE_GDPR_EXPORT_FAILED",
        { targetUserId: params.data.userId, reason: "USER_NOT_FOUND" },
        false
      );
      return reply.status(404).send({ error: "User not found" });
    }

    await recordAuditFromRequest(request, "COMPLIANCE_GDPR_EXPORT", {
      targetUserId: params.data.userId,
      inboxCount: user.inboxes.length,
      auditCount: user.auditLogs.length,
    });

    return {
      generatedAt: new Date().toISOString(),
      user,
    };
  });
}
