import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateToken } from "../utils/token";

export async function domainRoutes(app: FastifyInstance) {
  app.get("/domains", { preHandler: app.authenticate }, async (request, reply) => {
    const query = z
      .object({
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional(),
        offset: z.coerce.number().min(0).optional(),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    const where = query.data.search
      ? {
        name: {
          contains: query.data.search,
          mode: "insensitive" as const,
        },
      }
      : undefined;

    const [domains, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.data.limit ?? 100,
        skip: query.data.offset ?? 0,
      }),
      prisma.domain.count({ where }),
    ]);
    return { data: domains, meta: { total } };
  });

  app.post("/domains", { preHandler: app.requireAdmin }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(3),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { name } = parsed.data;
    const existing = await prisma.domain.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({ error: "Domain already exists", domain: existing });
    }

    const domain = await prisma.domain.create({ data: { name, verificationToken: generateToken() } });

    return { domain };
  });

  app.post("/domains/:id/verify", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ token: z.string().min(6) }).safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const domain = await prisma.domain.findUnique({ where: { id: params.data.id } });
    if (!domain) {
      return reply.status(404).send({ error: "Domain not found" });
    }

    // [MODIFIED] Real DNS verification
    // 1. Check if token matches (legacy/local check or direct match in text)
    // 2. Perform DNS lookup

    // Allows admin to "force code" if they want, but usually we check DNS
    // If the body token matches the DB token, that just means the user *knows* the token.
    // We need to verify that the token IS ON THE DNS.
    // However, the previous logic was `domain.verificationToken !== body.data.token`
    // which effectively checked if the USER submitted the correct token. 
    // But the Point is to check if the DOMAIN OWNER put it in DNS.

    try {
      const { verifyDomainOwnership } = await import("../utils/dns");
      const isVerified = await verifyDomainOwnership(domain.name, domain.verificationToken);

      if (!isVerified) {
        // Fallback: If we are in "DEV" mode or specific env, maybe we allow strict equality?
        // But for Production Readiness as requested, we enforce DNS.
        // We return specific error
        return reply.status(400).send({
          error: "DNS verification failed",
          details: `Could not find TXT record containing '${domain.verificationToken}' on ${domain.name}`
        });
      }
    } catch (err) {
      request.log.error(err, "DNS verification error");
      return reply.status(500).send({ error: "Internal DNS error" });
    }

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: { status: "VERIFIED" },
    });

    return { domain: updated };
  });
}
