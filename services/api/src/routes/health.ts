import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { realtimePubSub } from "../services/realtime-pubsub";
import { outboundService } from "../services/outbound";
import { register as promRegister } from "prom-client";
import { appConfig } from "../config";

const requireAdminAccess = async (app: FastifyInstance, request: any, reply: any, endpointName: string) => {
  await app.authenticate(request, reply);
  if (reply.sent) return false;

  const role = request.user?.role;
  if (role !== "ADMIN") {
    await reply.status(403).send({ error: `${endpointName} endpoint requires admin access` });
    return false;
  }

  return true;
};

export async function healthRoutes(app: FastifyInstance) {
  // Prometheus metrics endpoint (internal only - block in Caddy)
  app.get("/metrics", async (request, reply) => {
    if (!appConfig.publicMetricsEndpoint) {
      const allowed = await requireAdminAccess(app, request, reply, "Metrics");
      if (!allowed) return;
    }

    reply.header("Content-Type", promRegister.contentType);
    return promRegister.metrics();
  });

  // Liveness probe: Is the process running?
  app.get("/health", async () => ({
    ok: true,
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  }));

  // Readiness probe: Are all external dependencies available?
  app.get("/ready", async (request, reply) => {
    if (!appConfig.publicReadyEndpoint) {
      const allowed = await requireAdminAccess(app, request, reply, "Readiness");
      if (!allowed) return;
    }

    const status: Record<string, any> = {
      database: "checking",
      redis: "checking",
      smtp: "checking"
    };

    let isAllOk = true;

    // 1. Check Database (Prisma/Postgres)
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.database = "ok";
    } catch (err) {
      status.database = "error";
      isAllOk = false;
    }

    // 2. Check Redis (PubSub)
    try {
      status.redis = realtimePubSub.getIsConnected() ? "ok" : "error";
      if (status.redis === "error") isAllOk = false;
    } catch (err) {
      status.redis = "error";
      isAllOk = false;
    }

    // 3. Check Outbound SMTP (Nodemailer)
    try {
      const isSmtpOk = await outboundService.verifyConnection();
      status.smtp = isSmtpOk ? "ok" : "error";
      // We don't mark as not ready IF smtp fails but other core services are ok,
      // unless you want SMTP to be a hard dependency for readiness.
      // For this project, email platform NEEDS SMTP to be useful.
      if (!isSmtpOk) isAllOk = false;
    } catch (err) {
      status.smtp = "error";
      isAllOk = false;
    }

    const response = {
      ok: isAllOk,
      status: isAllOk ? "ready" : "degraded",
      details: status,
      timestamp: new Date().toISOString()
    };

    if (!isAllOk) {
      return reply.status(503).send(response);
    }

    return response;
  });
}
