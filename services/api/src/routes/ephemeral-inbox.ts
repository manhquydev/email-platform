/**
 * Ephemeral Inbox Routes - Public zero-friction inboxes
 * Phase 5: Public Ephemeral Inbox
 *
 * SECURITY: Rate limiting applied to prevent abuse
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ephemeralInboxService } from "../services/ephemeral-inbox.service";

const createSchema = z.object({
  expiryHours: z.number().min(1).max(24).optional(),
  localPart: z.string().min(3).max(30).optional(),  // Custom alias
  domainId: z.string().uuid().optional(),            // Domain selection
});

const checkAliasSchema = z.object({
  localPart: z.string().min(3).max(30),
  domainId: z.string().uuid(),
});

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

const messagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function ephemeralInboxRoutes(app: FastifyInstance) {
  // Create new ephemeral inbox (optional auth - captures anonymous session)
  // SECURITY: Strict rate limiting - 5 creations per IP per hour
  app.post("/ephemeral/inbox", {
    // Optional preHandler: Try to authenticate but don't require it
    // This captures anonymous session ID for ownership transfer on login
    preHandler: async (request, reply, done) => {
      try {
        await app.authenticate(request, reply);
      } catch {
        // Ignore auth errors - anonymous access is allowed
      }
      done();
    },
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
        keyGenerator: (request: any) => {
          // Use IP for rate limiting public endpoints
          return request.ip || request.headers['x-forwarded-for'] || 'unknown';
        },
      },
    },
  }, async (request, reply) => {
    const body = createSchema.parse(request.body || {});
    const anonymousId = (request.user as any)?.anonymousId;

    try {
      const inbox = await ephemeralInboxService.create({
        expiryHours: body.expiryHours,
        localPart: body.localPart,
        domainId: body.domainId,
        anonymousAccountId: anonymousId,  // Track anonymous session
      });

      return reply.status(201).send({
        id: inbox.id,
        token: inbox.token,
        address: inbox.address,
        expiresAt: inbox.expiresAt.toISOString(),
        expiresIn: Math.floor((inbox.expiresAt.getTime() - Date.now()) / 1000),
      });
    } catch (error: any) {
      // Handle validation/uniqueness errors
      if (error.message?.includes('alias') || error.message?.includes('domain')) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get inbox by session token
  app.get<{ Params: { token: string } }>("/ephemeral/inbox/:token", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const inbox = await ephemeralInboxService.getByToken(token);

    if (!inbox) {
      return reply.status(404).send({
        error: "Inbox not found or expired",
        expired: true,
      });
    }

    return {
      id: inbox.id,
      address: inbox.address,
      expiresAt: inbox.expiresAt.toISOString(),
      expiresIn: Math.floor((inbox.expiresAt.getTime() - Date.now()) / 1000),
      messageCount: inbox.messageCount,
      createdAt: inbox.createdAt.toISOString(),
    };
  });

  // Extend inbox expiry
  // SECURITY: Rate limiting - 10 extends per token per hour
  app.post<{ Params: { token: string } }>("/ephemeral/inbox/:token/extend", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
        keyGenerator: (request: any) => `extend:${request.params.token}`,
      },
    },
  }, async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = createSchema.parse(request.body || {});

    const inbox = await ephemeralInboxService.extendExpiry(token, body.expiryHours);

    if (!inbox) {
      return reply.status(404).send({
        error: "Inbox not found or expired",
        expired: true,
      });
    }

    return {
      id: inbox.id,
      address: inbox.address,
      expiresAt: inbox.expiresAt.toISOString(),
      expiresIn: Math.floor((inbox.expiresAt.getTime() - Date.now()) / 1000),
      extended: true,
    };
  });

  // Get messages for ephemeral inbox
  app.get<{ Params: { token: string }; Querystring: { limit?: number; offset?: number } }>(
    "/ephemeral/inbox/:token/messages",
    async (request, reply) => {
      const { token } = tokenParamsSchema.parse(request.params);
      const { limit, offset } = messagesQuerySchema.parse(request.query);

      // Check inbox exists and not expired
      const inbox = await ephemeralInboxService.getByToken(token);
      if (!inbox) {
        return reply.status(404).send({
          error: "Inbox not found or expired",
          expired: true,
        });
      }

      const { data, total } = await ephemeralInboxService.getMessages(token, limit, offset);

      return {
        data,
        meta: { total, limit, offset },
        inbox: {
          address: inbox.address,
          expiresIn: Math.floor((inbox.expiresAt.getTime() - Date.now()) / 1000),
        },
      };
    }
  );

  // Get available public domains for ephemeral inboxes
  app.get("/ephemeral/domains", async () => {
    const domains = await ephemeralInboxService.getPublicDomains();
    return { domains };
  });

  // Check alias availability for a domain
  app.post("/ephemeral/check-alias", {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (request: any) => request.ip || 'unknown',
      },
    },
  }, async (request, reply) => {
    const body = checkAliasSchema.parse(request.body);
    const result = await ephemeralInboxService.checkAliasAvailability(
      body.localPart,
      body.domainId
    );
    return result;
  });

  // Get ephemeral inbox stats (admin/monitoring)
  app.get("/ephemeral/stats", async () => {
    const stats = await ephemeralInboxService.getStats();
    return stats;
  });

  // Health check for ephemeral service
  app.get("/ephemeral/health", async () => {
    return { status: "ok", service: "ephemeral-inbox" };
  });
}
