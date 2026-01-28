import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { LegalHoldManager } from "../../compliance/legal-hold";
import { EDiscovery } from "../../compliance/ediscovery";
import { AuditLogger } from "../../compliance/audit-logger";

export async function complianceRoutes(app: FastifyInstance) {
  // Middleware to ensure user is Compliance Admin or Org Owner
  // app.addHook("preHandler", app.requireComplianceRole);

  // === LEGAL HOLD ===

  // Create Hold
  app.post("/compliance/holds", { preHandler: app.requireAuth }, async (req, reply) => {
    const schema = z.object({
      organizationId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      custodians: z.array(z.string()),
      keywords: z.array(z.string()).default([]),
    });

    const data = schema.parse(req.body);
    // Verify user permissions for this org...

    const hold = await LegalHoldManager.createHold({
      ...data,
      createdBy: (req as any).user.id,
    });

    await AuditLogger.log({
      action: "CREATE_LEGAL_HOLD",
      actorId: (req as any).user.id,
      resource: "LegalHold",
      resourceId: hold.id,
      organizationId: data.organizationId,
      metadata: { name: data.name }
    });

    return hold;
  });

  // Release Hold
  app.delete("/compliance/holds/:id", { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const hold = await LegalHoldManager.releaseHold(id, (req as any).user.id);

    await AuditLogger.log({
      action: "RELEASE_LEGAL_HOLD",
      actorId: (req as any).user.id,
      resource: "LegalHold",
      resourceId: hold.id,
      metadata: { name: hold.name }
    });

    return hold;
  });

  // === EDISCOVERY ===

  // Search
  app.post("/compliance/ediscovery/search", { preHandler: app.requireAuth }, async (req, reply) => {
    const schema = z.object({
      organizationId: z.string(),
      keywords: z.array(z.string()).optional(),
      custodians: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });

    const query = schema.parse(req.body);

    // Convert dates
    const searchParams = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const results = await EDiscovery.search(query.organizationId, searchParams);

    await AuditLogger.log({
      action: "EDISCOVERY_SEARCH",
      actorId: (req as any).user.id,
      organizationId: query.organizationId,
      metadata: { query }
    });

    return results;
  });

  // === GDPR EXPORT ===

  app.post("/compliance/export/:userId", { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const requesterId = (req as any).user.id;

    // Verify permission...

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        inboxes: {
          include: {
            messages: { take: 100 } // Limit for now
          }
        },
        auditLogs: { take: 50 }
      }
    });

    if (!user) return reply.status(404).send({ error: "User not found" });

    await AuditLogger.log({
      action: "GDPR_EXPORT",
      actorId: requesterId,
      resource: "User",
      resourceId: userId
    });

    // Return as JSON for simplicity, ideally ZIP of EMLs + JSON
    return user;
  });
}
