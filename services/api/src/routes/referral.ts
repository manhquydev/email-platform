/**
 * Referral Routes - Anonymous referral program
 * Phase 6: Open-Core & Community
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { referralService } from "../services/referral.service";

const applyReferralSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid referral code format'),
});

export async function referralRoutes(app: FastifyInstance) {
  // Get user's referral code
  app.get("/api/referral/code", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const referral = await referralService.getOrCreateCode(user.userId);
    return referral;
  });

  // Apply referral code
  app.post("/api/referral/apply", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const { code } = applyReferralSchema.parse(request.body);

    const result = await referralService.applyReferral(user.userId, code);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return result;
  });

  // Get referral stats
  app.get("/api/referral/stats", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const stats = await referralService.getStats(user.userId);
    return stats;
  });

  // Claim pending rewards
  app.post("/api/referral/claim", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const result = await referralService.claimRewards(user.userId);
    return result;
  });
}
