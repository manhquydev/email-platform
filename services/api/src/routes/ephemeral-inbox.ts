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
});

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

const messagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function ephemeralInboxRoutes(app: FastifyInstance) {
  // Create new ephemeral inbox (no auth required)
  // SECURITY: Strict rate limiting - 5 creations per IP per hour
  app.post("/ephemeral/inbox", {
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
    const inbox = await ephemeralInboxService.create(body.expiryHours);

    return reply.status(201).send({
      id: inbox.id,
      token: inbox.token,
      address: inbox.address,
      expiresAt: inbox.expiresAt.toISOString(),
      expiresIn: Math.floor((inbox.expiresAt.getTime() - Date.now()) / 1000),
    });
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
