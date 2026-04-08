import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { appConfig } from "../config";
import { recordAudit } from "../utils/audit";

const verifyCaptcha = (token?: string) => {
  if (!appConfig.requireCaptchaForPublicInbox) return true;
  if (!appConfig.captchaSecret) return false;
  return token === appConfig.captchaSecret;
};

export async function publicRoutes(app: FastifyInstance) {
  app.post("/public/inboxes", async (request, reply) => {
    if (!appConfig.publicInboxEnabled) {
      return reply.status(403).send({ error: "Public inbox creation is disabled by policy" });
    }

    const body = z
      .object({
        domain: z.string().min(3),
        localPart: z.string().min(1),
        expiresAt: z.string().datetime().optional(),
        captchaToken: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    if (!verifyCaptcha(body.data.captchaToken)) {
      return reply.status(403).send({ error: "CAPTCHA verification failed" });
    }

    const domain = await prisma.domain.findUnique({ where: { name: body.data.domain } });
    if (!domain || domain.status !== "VERIFIED") {
      return reply.status(400).send({ error: "Domain not ready for public inboxes" });
    }

    const existing = await prisma.inbox.findUnique({
      where: { domainId_localPart: { domainId: domain.id, localPart: body.data.localPart } },
    });
    if (existing && !existing.deletedAt) {
      return reply.status(409).send({ error: "Inbox exists" });
    }

    const inbox = existing
      ? await prisma.inbox.update({
          where: { id: existing.id },
          data: { deletedAt: null, expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null },
        })
      : await prisma.inbox.create({
          data: {
            domainId: domain.id,
            localPart: body.data.localPart,
            expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
          },
        });

    await recordAudit(null, "PUBLIC_INBOX_CREATED", {
      domain: domain.name,
      localPart: inbox.localPart,
    });

    return { inbox };
  });
}
