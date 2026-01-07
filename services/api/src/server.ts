import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { register as promRegister, collectDefaultMetrics, Histogram } from "prom-client";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import { appConfig } from "./config";
import { errorHandler } from "./utils/errorHandler";
import { authRoutes } from "./routes/auth";
import { domainRoutes } from "./routes/domains";
import { inboxRoutes } from "./routes/inboxes";
import { messageRoutes } from "./routes/messages";
import { healthRoutes } from "./routes/health";
import { abuseRoutes } from "./routes/abuse";
import { publicRoutes } from "./routes/public";
import { publicInboxRoutes } from "./routes/public-inbox";
import { publicTelegramRoutes } from "./routes/public-telegram";
import { outboundRoutes } from "./routes/outbound";
import { adminRoutes } from "./routes/admin";
import { billingRoutes } from "./routes/billing";
import { filterRoutes } from "./routes/filters";
import { authenticatorRoutes } from "./routes/authenticator";
import { telegramRoutes } from "./routes/telegram";
import { webhookRoutes } from "./routes/webhooks";
import { forwardingRoutes } from "./routes/forwarding";
import { subscriptionRoutes } from "./routes/subscription";
import { setupBotCommands } from "./services/telegramBot";
import { webauthnRoutes } from "./routes/webauthn";
import { magicLinkRoutes } from "./routes/magic-link";
import { notificationRoutes } from "./routes/notifications";
import { uploadRoutes } from "./routes/upload";
import { apiKeysRoutes } from "./routes/api-keys";
import { setupSwagger } from "./plugins/swagger";
import crypto from "crypto";
import { prisma } from "./lib/prisma";

// ... existing imports ...

// Register routes
// ... existing registrations ...
// Register routes inside buildServer

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

  // Raw body needed for Stripe webhooks
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rawBody = require("fastify-raw-body");
  // @ts-ignore: fastify-raw-body types not loaded via require
  // app.register(rawBody, {
  //   field: "rawBody", // request.rawBody
  //   global: false, // Only for specific routes
  //   encoding: "utf8",
  //   runFirst: true,
  // });

  app.register(helmet, {
    global: true,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
  app.register(multipart, { attachFieldsToBody: false, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

  app.register(fastifyStatic, {
    root: path.resolve(appConfig.storageDir, "uploads"),
    prefix: "/public/uploads/",
    decorateReply: false
  });

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
  // Check if metrics are already registered to avoid errors in tests
  try {
    collectDefaultMetrics();
  } catch (e) {
    // Ignore double registration
  }

  let httpRequestDuration: Histogram<string>;
  try {
    httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
    });
  } catch (e) {
    // Get existing metric if already registered
    httpRequestDuration = promRegister.getSingleMetric("http_request_duration_seconds") as Histogram<string>;
  }

  app.addHook("onResponse", (request, reply, done) => {
    const route = request.routeOptions.url || request.url;
    if (route) {
      httpRequestDuration
        .labels(request.method, route, reply.statusCode.toString())
        .observe(reply.elapsedTime / 1000);
    }
    done();
  });



  // ... [middle of file] ...

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    // Check API Key
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey === 'string') {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash: hash },
        include: { user: true }
      });

      if (keyRecord) {
        request.user = {
          userId: keyRecord.userId,
          role: keyRecord.user.role,
          tier: keyRecord.user.tier,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600 // Valid for current request
        };
        // Async update lastUsed
        prisma.apiKey.update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } }).catch(() => { });
        return;
      }
      return reply.status(401).send({ error: "Invalid API Key" });
    }

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
    // If authenticate fails, it sends response and stops? 
    // Wait, app.authenticate returns Promise<void>. 
    // It calls reply.send() if error, but does it stop execution?
    // It returns, but the caller must check?
    // In authenticate implementation: return reply.status(401).send(...)
    // If reply is sent, Fastify usually handles it.

    // Check if response is already sent
    if (reply.sent) return;

    const user = (request as any).user;
    if (!user || user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Admin access required" });
    }
  });

  setupSwagger(app);

  app.register(authRoutes);
  app.register(publicRoutes);
  app.register(publicInboxRoutes);
  app.register(publicTelegramRoutes);
  app.register(domainRoutes);
  app.register(inboxRoutes);
  app.register(messageRoutes);
  app.register(healthRoutes);
  app.register(abuseRoutes);
  app.register(adminRoutes);
  app.register(billingRoutes);
  app.register(filterRoutes);
  app.register(authenticatorRoutes);
  app.register(telegramRoutes);
  app.register(forwardingRoutes);
  app.register(webauthnRoutes);
  app.register(magicLinkRoutes);

  app.register(subscriptionRoutes);
  app.register(apiKeysRoutes);
  app.register(notificationRoutes, { prefix: "/notifications" });
  app.register(uploadRoutes, { prefix: "/uploads" });
  app.register(webhookRoutes);

  if (appConfig.outboundEnabled) {
    app.register(outboundRoutes);
  }

  return app;
};

export const startHttpServer = async (): Promise<FastifyInstance> => {
  const app = buildServer();
  await app.listen({ port: appConfig.httpPort, host: "0.0.0.0" });
  app.log.info(`HTTP API running on :${appConfig.httpPort}`);

  // Setup Telegram bot commands menu
  setupBotCommands().catch(err => {
    app.log.error('Failed to setup Telegram bot commands:', err);
  });

  return app;
};
