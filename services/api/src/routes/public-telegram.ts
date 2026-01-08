// services/api/src/routes/public-telegram.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  generateInboxLinkToken,
  getTokenStatus,
  getInboxLinks,
} from "../services/inbox-telegram-service";
import { recordAudit } from "../utils/audit";

export async function publicTelegramRoutes(app: FastifyInstance) {
  const publicRateLimit = { max: 20, timeWindow: "1 minute" };

  // Generate linking token
  app.post("/public/telegram/generate-token", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const body = z.object({
      inboxEmail: z.string().email(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: "Invalid email format" });
    }

    try {
      const result = await generateInboxLinkToken(body.data.inboxEmail);

      await recordAudit(null, "INBOX_TELEGRAM_TOKEN_GENERATED", {
        inboxEmail: body.data.inboxEmail,
        ip: request.ip,
      });

      return result;
    } catch (error: any) {
      // Return 404 for "Inbox not found", 400 for other errors
      const status = error.message === "Inbox not found" ? 404 : 400;
      return reply.status(status).send({ error: error.message });
    }
  });

  // Check token status (for polling)
  app.get("/public/telegram/status/:token", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const params = z.object({ token: z.string() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid token" });
    }

    const status = await getTokenStatus(params.data.token);
    return status;
  });

  // Get linked accounts for inbox
  app.get("/public/telegram/:inboxEmail/links", {
    config: { rateLimit: publicRateLimit }
  }, async (request, reply) => {
    const params = z.object({
      inboxEmail: z.string().email(),
    }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid email" });
    }

    const links = await getInboxLinks(params.data.inboxEmail);
    return { links };
  });
}
