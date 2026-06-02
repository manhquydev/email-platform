// Telegram Authentication Routes
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
import { verifyTelegramAuth, isAuthDateFresh, TelegramAuthData } from "../utils/telegram-auth";
import { recordAudit } from "../utils/audit";
import { appConfig } from "../config";
import { RefreshTokenService } from "../services/refresh-token.service";
import { createAccessToken, createCsrfToken } from "./auth/auth-tokens";
import { setAuthCookies } from "./auth/auth-cookies";
import { COOKIE_MAX_AGE_DEFAULT } from "./auth/auth-config";

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

const completeRegistrationSchema = z.object({
  tempToken: z.string(),
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

export async function telegramAuthRoutes(app: FastifyInstance) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    app.log.warn("TELEGRAM_BOT_TOKEN not set - Telegram auth routes disabled");
    return;
  }

  // POST /auth/telegram - Login or start registration via Telegram
  // Supports optional preHandler to capture anonymous session for ownership transfer
  app.post("/auth/telegram", {
    preHandler: async (request, reply, done) => {
      // Try to authenticate but don't require it - captures anonymous session
      try {
        await app.authenticate(request, reply);
      } catch {
        // Ignore auth errors - anonymous access is allowed
      }
      done();
    },
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" },
    },
  }, async (request, reply) => {
    const parsed = telegramAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid Telegram data", details: parsed.error.flatten() });
    }

    const authData = parsed.data as TelegramAuthData;

    // Verify HMAC signature
    if (!verifyTelegramAuth(authData, botToken)) {
      await recordAudit(null, "TELEGRAM_AUTH_FAILED", { reason: "invalid_signature", ip: request.ip });
      return reply.status(401).send({ error: "Invalid authentication data" });
    }

    // Check auth_date freshness (24 hours max)
    if (!isAuthDateFresh(authData.auth_date)) {
      await recordAudit(null, "TELEGRAM_AUTH_FAILED", { reason: "expired_auth_date", ip: request.ip });
      return reply.status(401).send({ error: "Authentication expired. Please try again." });
    }

    const telegramId = String(authData.id);
    const anonymousId = (request.user as any)?.anonymousId; // May be undefined

    // Check if user exists with this Telegram ID
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      // Update Telegram profile data
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          telegramUsername: authData.username || null,
          telegramFirstName: authData.first_name,
          telegramPhotoUrl: authData.photo_url || null,
          telegramAuthDate: new Date(authData.auth_date * 1000),
        },
      });

      // Transfer ownership of anonymous inboxes if user was in anonymous session
      if (anonymousId) {
        const transferred = await prisma.inbox.updateMany({
          where: {
            anonymousAccountId: anonymousId,
            ownerId: null,
          },
          data: {
            ownerId: existingUser.id,
            anonymousAccountId: null,
          },
        });
        if (transferred.count > 0) {
          app.log.info({ userId: existingUser.id, transferred: transferred.count }, "Transferred anonymous inboxes to user");
        }
      }

      // Check if account is disabled
      if (existingUser.isDisabled) {
        return reply.status(403).send({ error: "Account is disabled. Contact administrator." });
      }

      // Establish a normal session: short-lived revocable access token (jti + type) plus an
      // opaque refresh-token cookie, instead of a non-revocable 30-day JWT.
      const token = createAccessToken(app, existingUser);
      const { token: refreshToken } = await RefreshTokenService.createToken(
        existingUser.id, 7, request.headers["user-agent"], request.ip
      );
      const csrfToken = createCsrfToken();
      setAuthCookies(reply, request, refreshToken, csrfToken, COOKIE_MAX_AGE_DEFAULT);

      await recordAudit(existingUser.id, "TELEGRAM_LOGIN", { ip: request.ip });

      return {
        token,
        csrfToken,
        user: { id: existingUser.id, email: existingUser.email, role: existingUser.role },
      };
    }

    // New user - return temp token for email collection
    // Use a separate signing approach for temp tokens (not tied to user auth payload type)
    const tempToken = app.jwt.sign(
      {
        telegramAuth: true,
        telegramId,
        telegramUsername: authData.username,
        telegramFirstName: authData.first_name,
        telegramPhotoUrl: authData.photo_url,
        userId: "pending", // Placeholder to satisfy type
        role: "USER" as const,
      },
      { expiresIn: "10m" }
    );

    return {
      requiresEmail: true,
      tempToken,
      telegramUser: {
        id: telegramId,
        username: authData.username,
        firstName: authData.first_name,
        photoUrl: authData.photo_url,
      },
    };
  });

  // POST /auth/telegram/complete - Complete registration with email
  app.post("/auth/telegram/complete", {
    config: {
      rateLimit: { max: 5, timeWindow: "1 minute" },
    },
  }, async (request, reply) => {
    const parsed = completeRegistrationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { tempToken, email, password } = parsed.data;

    // Verify temp token
    let decoded: { telegramAuth?: boolean; telegramId?: string; telegramUsername?: string; telegramFirstName?: string; telegramPhotoUrl?: string };
    try {
      decoded = app.jwt.verify(tempToken) as typeof decoded;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    if (!decoded.telegramAuth || !decoded.telegramId) {
      return reply.status(400).send({ error: "Invalid token type" });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return reply.status(409).send({ error: "Email already registered. Please login and link your Telegram account." });
    }

    // Check if telegramId already linked (race condition)
    const existingTelegram = await prisma.user.findUnique({ where: { telegramId: decoded.telegramId } });
    if (existingTelegram) {
      return reply.status(409).send({ error: "Telegram account already linked to another user" });
    }

    // Create user
    const passwordHash = password ? await hashPassword(password) : await hashPassword(crypto.randomUUID());

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        emailVerified: appConfig.requireEmailVerification ? null : new Date(),
        telegramId: decoded.telegramId,
        telegramUsername: decoded.telegramUsername || null,
        telegramFirstName: decoded.telegramFirstName || null,
        telegramPhotoUrl: decoded.telegramPhotoUrl || null,
        telegramAuthDate: new Date(),
      },
    });

    const token = createAccessToken(app, user);
    const { token: refreshToken } = await RefreshTokenService.createToken(
      user.id, 7, request.headers["user-agent"], request.ip
    );
    const csrfToken = createCsrfToken();
    setAuthCookies(reply, request, refreshToken, csrfToken, COOKIE_MAX_AGE_DEFAULT);

    await recordAudit(user.id, "TELEGRAM_REGISTER", { email, telegramId: decoded.telegramId });

    return {
      token,
      csrfToken,
      user: { id: user.id, email: user.email, role: user.role },
      message: appConfig.requireEmailVerification
        ? "Registration successful. Please verify your email."
        : "Registration successful.",
    };
  });

  // POST /auth/telegram/link - Link Telegram to existing account
  app.post("/auth/telegram/link", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = telegramAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid Telegram data" });
    }

    const authData = parsed.data as TelegramAuthData;
    const userId = (request.user as { userId: string }).userId;

    // Verify HMAC
    if (!verifyTelegramAuth(authData, botToken)) {
      return reply.status(401).send({ error: "Invalid authentication data" });
    }

    if (!isAuthDateFresh(authData.auth_date)) {
      return reply.status(401).send({ error: "Authentication expired" });
    }

    const telegramId = String(authData.id);

    // Check if this Telegram is already linked to another user
    const existingLink = await prisma.user.findUnique({ where: { telegramId } });
    if (existingLink && existingLink.id !== userId) {
      return reply.status(409).send({ error: "Telegram account already linked to another user" });
    }

    // Link Telegram to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        telegramUsername: authData.username || null,
        telegramFirstName: authData.first_name,
        telegramPhotoUrl: authData.photo_url || null,
        telegramAuthDate: new Date(authData.auth_date * 1000),
      },
    });

    await recordAudit(userId, "TELEGRAM_LINKED", { telegramId });

    return { ok: true, message: "Telegram account linked successfully" };
  });

  // DELETE /auth/telegram/unlink - Unlink Telegram from account
  app.delete("/auth/telegram/unlink", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, passwordHash: true, passkeyCredentials: { select: { id: true } } },
    });

    if (!user || !user.telegramId) {
      return reply.status(400).send({ error: "No Telegram account linked" });
    }

    // Safety: ensure user has another auth method (password or passkey)
    const hasPassword = user.passwordHash && user.passwordHash.length > 0;
    const hasPasskey = user.passkeyCredentials && user.passkeyCredentials.length > 0;

    if (!hasPassword && !hasPasskey) {
      return reply.status(400).send({ error: "Cannot unlink Telegram. You need at least one other login method." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramPhotoUrl: null,
        telegramAuthDate: null,
      },
    });

    await recordAudit(userId, "TELEGRAM_UNLINKED", {});

    return { ok: true, message: "Telegram account unlinked" };
  });

  // GET /auth/telegram/status - Check Telegram link status
  app.get("/auth/telegram/status", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramPhotoUrl: true,
        telegramAuthDate: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return {
      linked: !!user.telegramId,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
      telegramPhotoUrl: user.telegramPhotoUrl,
      linkedAt: user.telegramAuthDate,
    };
  });
}
