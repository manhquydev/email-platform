import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { register as promRegister, collectDefaultMetrics, Histogram } from "prom-client";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { appConfig } from "./config";
import { errorHandler } from "./utils/errorHandler";
import { authRoutes } from "./routes/auth";
import { domainRoutes } from "./routes/domains";
import { inboxRoutes } from "./routes/inboxes";
import { messageRoutes } from "./routes/messages";
import { healthRoutes } from "./routes/health";
import { abuseRoutes } from "./routes/abuse";
import { publicRoutes } from "./routes/public";
import { outboundRoutes } from "./routes/outbound";
import { adminRoutes } from "./routes/admin";
import { billingRoutes } from "./routes/billing";
import { filterRoutes } from "./routes/filters";
import { authenticatorRoutes } from "./routes/authenticator";
import { telegramRoutes } from "./routes/telegram";
import { forwardingRoutes } from "./routes/forwarding";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const buildServer = () => {
  const loggerConfig = process.env.NODE_ENV === "production"
    ? {
      level: "info",
      file: appConfig.storageDir + "/logs/app.log" // This requires pino-destination or similar, simpler to just use transport or rely on stdout.
    }
    : true; // Default pretty print for dev

  // Using stdout is best practice for Docker, but we can configure pino to transport to a file if requested.
  // For simplicity and standard docker practices, we will stick to stdout but strict format.

  const app = Fastify({
    trustProxy: appConfig.trustProxy,
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport: process.env.NODE_ENV !== "production" ? {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      } : undefined,
    }
  });

  app.setErrorHandler(errorHandler);

  app.register(helmet, { global: true });
  app.register(multipart, { attachFieldsToBody: true, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return cb(null, true);
      const allowed = [appConfig.webUrl, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080"];
      if (allowed.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed"), false);
    },
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
  });
  app.register(jwt, { secret: appConfig.jwtSecret });
  app.register(rateLimit, {
    max: appConfig.rateLimitMax,
    timeWindow: appConfig.rateLimitTimeWindow,
    allowList: ["127.0.0.1", "::1"],
  });
  collectDefaultMetrics();

  const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  });

  app.addHook("onResponse", (request, reply, done) => {
    const route = request.routeOptions.url || request.url;
    if (route) {
      httpRequestDuration
        .labels(request.method, route, reply.statusCode.toString())
        .observe(reply.elapsedTime / 1000);
    }
    done();
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      request.log.warn({
        err,
        authHeader: request.headers.authorization ? (request.headers.authorization.slice(0, 20) + "...") : "none",
        url: request.url,
        method: request.method
      }, "unauthorized request");
      return reply.status(401).send({ error: "Unauthorized", details: (err as any).message });
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if ((request.user as any)?.role !== "ADMIN") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  });

  app.get("/", async () => ({
    ok: true,
    service: "api",
    docs: {
      health: "/health",
      ready: "/ready",
      login: "/auth/login",
      domains: ["/domains", "/domains/:id/verify"],
      inboxes: ["/inboxes", "/inboxes/:id/messages"],
      messages: ["/messages/:id"],
      abuse: ["/abuse/rules", "/abuse/reports", "/public/inboxes"],
    },
  }));

  app.get("/metrics", async (request, reply) => {
    const metrics = await promRegister.metrics();
    reply.header("Content-Type", promRegister.contentType);
    return reply.send(metrics);
  });

  app.register(healthRoutes);
  app.register(publicRoutes);
  app.register(authRoutes);
  app.register(domainRoutes);
  app.register(inboxRoutes);
  app.register(messageRoutes);
  app.register(abuseRoutes);
  app.register(adminRoutes);
  app.register(billingRoutes);
  app.register(filterRoutes);
  app.register(authenticatorRoutes);
  app.register(telegramRoutes);
  app.register(forwardingRoutes);
  if (appConfig.outboundEnabled) {
    app.register(outboundRoutes);
  }

  return app;
};

export const startHttpServer = async (): Promise<FastifyInstance> => {
  const app = buildServer();
  await app.listen({ port: appConfig.httpPort, host: "0.0.0.0" });
  app.log.info(`HTTP API running on :${appConfig.httpPort}`);
  return app;
};
