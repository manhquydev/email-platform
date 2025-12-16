import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";
import { AbuseReportStatus, RuleScope, RuleType } from "@prisma/client";

export async function abuseRoutes(app: FastifyInstance) {
  app.get("/abuse/rules", { preHandler: app.requireAdmin }, async () => {
    const rules = await prisma.rule.findMany({ orderBy: { createdAt: "desc" } });
    return { data: rules };
  });

  app.post("/abuse/rules", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = z
      .object({
        type: z.nativeEnum(RuleType),
        scope: z.nativeEnum(RuleScope),
        value: z.string().min(1),
        note: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    const rule = await prisma.rule.create({
      data: {
        ...body.data,
        value: body.data.value.toLowerCase(),
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      },
    });
    await recordAudit((request.user as any)?.userId ?? null, "RULE_CREATED", { ruleId: rule.id });
    return { rule };
  });

  app.delete("/abuse/rules/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const existing = await prisma.rule.findUnique({ where: { id: params.data.id } });
    if (!existing) {
      return reply.status(404).send({ error: "Rule not found" });
    }
    await prisma.rule.delete({ where: { id: params.data.id } });
    await recordAudit((request.user as any)?.userId ?? null, "RULE_DELETED", { ruleId: params.data.id });
    return { ok: true };
  });

  app.get("/abuse/reports", { preHandler: app.requireAdmin }, async () => {
    const reports = await prisma.abuseReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { message: { include: { inbox: { include: { domain: true } } } } },
    });
    return { data: reports };
  });

  app.post("/abuse/reports", async (request, reply) => {
    const body = z
      .object({
        messageId: z.string().uuid().optional(),
        reporter: z.string().email().optional(),
        reason: z.string().min(4),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    let messageId: string | undefined = body.data.messageId;
    if (messageId) {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) {
        return reply.status(404).send({ error: "Message not found" });
      }
    }

    let reporter = body.data.reporter;
    try {
      const decoded = await request.jwtVerify();
      reporter = reporter ?? (decoded as any)?.email;
    } catch {
      // anonymous allowed
    }

    const report = await prisma.abuseReport.create({
      data: {
        messageId,
        reporter,
        reason: body.data.reason,
        status: AbuseReportStatus.OPEN,
      },
    });
    await recordAudit((request.user as any)?.userId ?? null, "ABUSE_REPORTED", { reportId: report.id, messageId });
    return { report };
  });

  // Update abuse report status
  app.patch("/abuse/reports/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z
      .object({
        status: z.nativeEnum(AbuseReportStatus),
      })
      .safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const report = await prisma.abuseReport.findUnique({ where: { id: params.data.id } });
    if (!report) {
      return reply.status(404).send({ error: "Report not found" });
    }

    const updated = await prisma.abuseReport.update({
      where: { id: params.data.id },
      data: { status: body.data.status },
    });

    await recordAudit(
      (request.user as any)?.userId ?? null,
      "ABUSE_REPORT_UPDATED",
      { reportId: params.data.id, newStatus: body.data.status }
    );

    return { report: updated };
  });
}
