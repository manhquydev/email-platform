/**
 * Identity Bundle Routes - Aliases, Breach Monitoring, Privacy Score
 * Phase 4: Identity Suite Bundles
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { aliasService } from "../services/alias.service";
import { breachMonitorService } from "../services/breach-monitor.service";
import { privacyScoreService } from "../services/privacy-score.service";
import { prisma } from "../lib/prisma";

const createAliasSchema = z.object({
  localPart: z.string().min(1).max(64).optional(),
  domainId: z.string().uuid(),
  forwardTo: z.string().email(),
  label: z.string().max(100).optional(),
});

const updateAliasSchema = z.object({
  forwardTo: z.string().email().optional(),
});

const breachMonitorSchema = z.object({
  email: z.string().email(),
});

export async function identityBundleRoutes(app: FastifyInstance) {
  // ========== ALIASES ==========

  // Create alias
  app.post("/api/aliases", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const body = createAliasSchema.parse(request.body);

    // Check tier limits
    const aliasStats = await aliasService.getStats(user.userId);
    const tierLimits = { FREE: 3, STARTER: 20, PROFESSIONAL: 50, BUSINESS: 100, ENTERPRISE: -1 };
    const limit = tierLimits[user.tier as keyof typeof tierLimits] || 3;

    if (limit !== -1 && aliasStats.total >= limit) {
      return reply.status(403).send({
        error: "Alias limit reached",
        limit,
        current: aliasStats.total,
        upgrade: "Upgrade your plan for more aliases",
      });
    }

    const alias = await aliasService.create({
      userId: user.userId,
      localPart: body.localPart,
      domainId: body.domainId,
      forwardTo: body.forwardTo,
      label: body.label,
    });

    return reply.status(201).send(alias);
  });

  // List aliases
  app.get("/api/aliases", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const aliases = await aliasService.listByUser(user.userId);
    return { data: aliases, total: aliases.length };
  });

  // Get alias
  app.get<{ Params: { id: string } }>("/api/aliases/:id", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const alias = await aliasService.getById(request.params.id, user.userId);

    if (!alias) {
      return reply.status(404).send({ error: "Alias not found" });
    }

    return alias;
  });

  // Update alias
  app.patch<{ Params: { id: string } }>("/api/aliases/:id", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const body = updateAliasSchema.parse(request.body);

    if (body.forwardTo) {
      const alias = await aliasService.updateForwardTo(request.params.id, user.userId, body.forwardTo);
      if (!alias) {
        return reply.status(404).send({ error: "Alias not found" });
      }
      return alias;
    }

    return reply.status(400).send({ error: "No updates provided" });
  });

  // Toggle alias active
  app.post<{ Params: { id: string } }>("/api/aliases/:id/toggle", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const alias = await aliasService.toggleActive(request.params.id, user.userId);

    if (!alias) {
      return reply.status(404).send({ error: "Alias not found" });
    }

    return alias;
  });

  // Delete alias
  app.delete<{ Params: { id: string } }>("/api/aliases/:id", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const deleted = await aliasService.delete(request.params.id, user.userId);

    if (!deleted) {
      return reply.status(404).send({ error: "Alias not found" });
    }

    return reply.status(204).send();
  });

  // ========== BREACH MONITORING ==========

  // Enable breach monitoring
  app.post("/api/breach-monitor", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const body = breachMonitorSchema.parse(request.body);

    // Check tier - breach monitoring requires GUARD tier or higher
    const allowedTiers = ["PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
    if (!allowedTiers.includes(user.tier)) {
      return reply.status(403).send({
        error: "Breach monitoring requires Guard tier or higher",
        currentTier: user.tier,
        upgrade: "Upgrade to Guard for breach monitoring",
      });
    }

    await breachMonitorService.enableMonitoring(user.userId, body.email);

    return { success: true, email: body.email, message: "Breach monitoring enabled" };
  });

  // Disable breach monitoring
  app.delete<{ Params: { email: string } }>("/api/breach-monitor/:email", {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    await breachMonitorService.disableMonitoring(user.userId, decodeURIComponent(request.params.email));
    return reply.status(204).send();
  });

  // Get breach status
  app.get("/api/breach-monitor/status", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const status = await breachMonitorService.getUserBreachStatus(user.userId);
    const severity = breachMonitorService.calculateBreachSeverity(status.breaches);

    return {
      ...status,
      severity,
      severityLevel: severity === 0 ? "safe" : severity < 30 ? "low" : severity < 60 ? "medium" : "high",
    };
  });

  // Get breach history
  app.get("/api/breach-monitor/history", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const history = await breachMonitorService.getBreachHistory(user.userId);
    return { data: history };
  });

  // Check specific email (one-time check)
  app.post("/api/breach-monitor/check", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const body = breachMonitorSchema.parse(request.body);
    const result = await breachMonitorService.checkAndStoreBreaches(user.userId, body.email);
    return result;
  });

  // ========== PRIVACY SCORE ==========

  // Get privacy score
  app.get("/api/privacy-score", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const score = await privacyScoreService.calculateScore(user.userId);
    return score;
  });

  // Get privacy dashboard
  app.get("/api/privacy-score/dashboard", {
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as any;
    const dashboard = await privacyScoreService.getDashboard(user.userId);
    return dashboard;
  });

  // ========== BUNDLE INFO ==========

  // Get available bundles
  app.get("/api/bundles", async () => {
    return {
      bundles: [
        {
          id: "shield",
          name: "Shield",
          price: 5,
          currency: "USD",
          period: "month",
          features: [
            "50 email aliases",
            "Email forwarding",
            "No ads",
            "Basic support",
          ],
          limits: { aliases: 50, breachMonitoring: false, prioritySupport: false },
        },
        {
          id: "guard",
          name: "Guard",
          price: 15,
          currency: "USD",
          period: "month",
          features: [
            "Everything in Shield",
            "Breach monitoring",
            "Unlimited AI operations",
            "Priority support",
          ],
          limits: { aliases: 100, breachMonitoring: true, prioritySupport: true },
          popular: true,
        },
        {
          id: "pro",
          name: "Pro",
          price: 30,
          currency: "USD",
          period: "month",
          features: [
            "Everything in Guard",
            "Data broker removal",
            "Dedicated support",
            "Custom domain",
          ],
          limits: { aliases: -1, breachMonitoring: true, prioritySupport: true, dataBrokerRemoval: true },
        },
      ],
    };
  });
}
