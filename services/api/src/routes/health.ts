import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, status: "ok", service: "api" }));
  app.get("/ready", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, status: "ok", db: true };
  });
}
