import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { verifyPassword, hashPassword } from "../utils/password";
import { encrypt, decrypt } from "../utils/encryption";
import { appConfig } from "../config";
import { outboundService } from "../services/outbound";
import { isEmailVerificationRequired } from "../utils/system-settings";
import { recordAuditFromRequest, AuditAction } from "../utils/audit";
import { TIER_LIMITS } from "./billing";
import { tokenRevocationService } from "../services/token-revocation.service";
import { RefreshTokenService } from "../services/refresh-token.service";
import { twoFactorBackoff } from "../middleware/rate-limit-config";

// Password validation with complexity requirements
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// JWT expiry configuration
const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Longer-lived refresh token


export async function authRoutes(app: FastifyInstance) {
  // Stricter rate limit for registration (prevent spam accounts)
  app.post("/auth/register", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 hour"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: passwordSchema,
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already exists" });
    }

    const passwordHash = await hashPassword(password);

    // Check dynamic setting from DB (not static ENV)
    const requireVerification = await isEmailVerificationRequired();

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        // Auto-verify if email verification is disabled
        emailVerified: requireVerification ? null : new Date(),
        verificationToken: requireVerification ? verificationToken : null,
        verificationTokenExpiresAt: requireVerification ? verificationTokenExpiresAt : null,
      },
    });

    // Send verification email (only if verification is required)
    if (requireVerification) {
      try {
        const verifyUrl = `${appConfig.webUrl}/verify-email?token=${verificationToken}`;
        await outboundService.sendVerificationEmail(email, verifyUrl);
        request.log.info({ email }, "Verification email sent successfully");
      } catch (err) {
        request.log.error(err, "Failed to send verification email");
        // We don't fail the request, but user might need to resend verification later
      }
    }

    // SECURITY: Add jti (JWT ID) for token revocation support
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();
    const accessToken = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier, type: "access", jti: accessJti }, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh", jti: refreshJti }, { expiresIn: REFRESH_TOKEN_EXPIRY });

    await recordAuditFromRequest(request, "auth.register", { email: user.email });

    return {
      token: accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: { id: user.id, email: user.email, role: user.role },
      message: requireVerification
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful. You can now login."
    };
  });

  app.post("/auth/verify-email", async (request, reply) => {
    const bodySchema = z.object({
      token: z.string(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { token } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired verification token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    // Send welcome email
    try {
      await outboundService.sendWelcomeEmail(user.email);
      request.log.info({ email: user.email }, "Welcome email sent successfully");
    } catch (err) {
      request.log.error(err, "Failed to send welcome email");
    }

    await recordAuditFromRequest(request, "auth.email_verified", { email: user.email, userId: user.id });

    return { ok: true, message: "Email verified successfully" };
  });

  // Resend verification email - prevent SMTP abuse
  app.post("/auth/resend-verification", {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not
      return { ok: true, message: "If the email exists, a verification link has been sent." };
    }

    if (user.emailVerified) {
      return reply.status(400).send({ error: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    try {
      const verifyUrl = `${appConfig.webUrl}/verify-email?token=${verificationToken}`;
      await outboundService.sendVerificationEmail(email, verifyUrl);
      request.log.info({ email }, "Resent verification email");
    } catch (err) {
      request.log.error(err, "Failed to resend verification email");
      return reply.status(500).send({ error: "Failed to send verification email" });
    }

    await recordAuditFromRequest(request, "auth.resend_verification", { email: user.email, userId: user.id });

    return { ok: true, message: "Verification email sent successfully" };
  });

  // Login rate limit - prevent brute force
  app.post("/auth/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "5 minutes"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Log failed attempt for unknown user (prevent enumeration, but log for security analysis)
      await recordAuditFromRequest(request, AuditAction.LOGIN_FAILED, { email, reason: "user_not_found" }, false);
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Account lockout check - 5 failed attempts = 15 min lockout
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      await recordAuditFromRequest(request, AuditAction.LOGIN_FAILED, { email: user.email, reason: "account_locked", userId: user.id }, false);
      return reply.status(423).send({
        error: `Account is temporarily locked. Try again in ${remainingMins} minute(s).`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        }
      });

      await recordAuditFromRequest(request, AuditAction.LOGIN_FAILED, { email: user.email, reason: shouldLock ? "account_locked_max_attempts" : "invalid_password", failedAttempts: newFailedAttempts, userId: user.id }, false);

      if (shouldLock) {
        return reply.status(423).send({
          error: "Too many failed attempts. Account locked for 15 minutes.",
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
        });
      }

      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Successful password - reset lockout counters
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });
    }

    // Check email verification (dynamic setting from DB)
    const requireVerification = await isEmailVerificationRequired();
    if (requireVerification && !user.emailVerified) {
      await recordAuditFromRequest(request, AuditAction.LOGIN_FAILED, { email: user.email, reason: "email_not_verified", userId: user.id }, false);
      return reply.status(403).send({ error: "Email not verified. Please check your email." });
    }

    // Check if account is disabled
    if (user.isDisabled) {
      await recordAuditFromRequest(request, AuditAction.LOGIN_FAILED, { email: user.email, reason: "account_disabled", userId: user.id }, false);
      return reply.status(403).send({ error: "Account is disabled. Contact administrator." });
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Return partial response - client needs to provide TOTP
      const tempToken = app.jwt.sign({ userId: user.id, pending2FA: true } as any, { expiresIn: "5m" });
      return { requires2FA: true, tempToken };
    }

    // SECURITY: Add jti (JWT ID) for token revocation support
    const loginAccessJti = crypto.randomUUID();
    const loginRefreshJti = crypto.randomUUID();
    const accessToken = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier, type: "access", jti: loginAccessJti }, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh", jti: loginRefreshJti }, { expiresIn: REFRESH_TOKEN_EXPIRY });

    await recordAuditFromRequest(request, AuditAction.LOGIN_SUCCESS, { email: user.email, userId: user.id });

    return {
      token: accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, role: user.role }
    };
  });

  app.post("/auth/change-password", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      newPassword: passwordSchema,
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { newPassword } = parsed.data;
    const userId = (request.user as any).userId;

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await recordAuditFromRequest(request, AuditAction.PASSWORD_CHANGE, {});

    return { ok: true };
  });

  // 2FA: Verify TOTP after login (strict rate limit to prevent brute force)
  // SECURITY: Enhanced with exponential backoff (Phase 3)
  app.post("/auth/2fa/verify", {
    config: {
      rateLimit: {
        max: 3, // Reduced from 5 to 3 for stricter security
        timeWindow: "5 minutes",
        keyGenerator: (request) => {
          // Rate limit by temp token to prevent user enumeration
          const body = request.body as { tempToken?: string };
          return body?.tempToken?.slice(0, 50) || request.ip;
        },
      },
    },
  }, async (request, reply) => {
    const bodySchema = z.object({
      tempToken: z.string(),
      code: z.string().length(6),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { tempToken, code } = parsed.data;

    // SECURITY: Check exponential backoff before processing (Phase 3)
    const backoffKey = tempToken.slice(0, 50);
    const backoffStatus = await twoFactorBackoff.isInBackoff(backoffKey);
    if (backoffStatus.blocked) {
      const waitSeconds = Math.ceil(backoffStatus.waitTime / 1000);
      return reply.status(429).send({
        error: `Too many failed attempts. Please wait ${waitSeconds} seconds.`,
        retryAfter: waitSeconds,
      });
    }

    let decoded: { userId: string; pending2FA?: boolean };
    try {
      decoded = app.jwt.verify(tempToken) as { userId: string; pending2FA?: boolean };
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }

    if (!decoded.pending2FA) {
      return reply.status(400).send({ error: "Invalid 2FA flow" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.twoFactorSecret) {
      return reply.status(401).send({ error: "Invalid user" });
    }

    // Decrypt TOTP secret
    const decryptedSecret = decrypt(user.twoFactorSecret);

    // Verify TOTP code
    const isValid = authenticator.verify({ token: code, secret: decryptedSecret });

    // Check backup codes if TOTP fails
    if (!isValid) {
      let backupIndex = -1;
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        const isMatch = await verifyPassword(code, user.twoFactorBackupCodes[i]);
        if (isMatch) {
          backupIndex = i;
          break;
        }
      }

      if (backupIndex === -1) {
        return reply.status(401).send({ error: "Invalid code" });
      }

      // Remove used backup code
      const newBackupCodes = [...user.twoFactorBackupCodes];
      newBackupCodes.splice(backupIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: newBackupCodes },
      });
    }

    // SECURITY: Add jti (JWT ID) for token revocation support
    const twoFaAccessJti = crypto.randomUUID();
    const twoFaRefreshJti = crypto.randomUUID();
    const accessToken = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier, type: "access", jti: twoFaAccessJti }, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh", jti: twoFaRefreshJti }, { expiresIn: REFRESH_TOKEN_EXPIRY });

    await recordAuditFromRequest(request, AuditAction.TWO_FACTOR_VERIFIED, { email: user.email, userId: user.id });

    return {
      token: accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, role: user.role }
    };
  });

  // SECURITY: Logout endpoint - revoke current token (Phase 2 JWT Security)
  app.post("/auth/logout", { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as any;
    const jti = user?.jti;

    if (jti) {
      // Revoke the current access token (15 min TTL matches token expiry)
      await tokenRevocationService.revokeToken(jti, 900);
    }

    await recordAuditFromRequest(request, "auth.logout", { userId: user.userId });

    return { ok: true, message: "Logged out successfully" };
  });

  // SECURITY: Logout all devices - revoke all user tokens (Phase 2 JWT Security)
  app.post("/auth/logout-all", { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as any;

    // Revoke all refresh tokens in database
    await RefreshTokenService.revokeAllUserTokens(user.userId);

    // Also revoke via Redis for immediate effect on access tokens
    await tokenRevocationService.revokeAllUserTokens(user.userId, 86400);

    await recordAuditFromRequest(request, "auth.logout_all", { userId: user.userId });

    return { ok: true, message: "All sessions terminated" };
  });

  // 2FA: Setup - Generate secret and QR code
  app.post("/auth/2fa/setup", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return reply.status(400).send({ error: "2FA is already enabled" });
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "Email Platform", secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Encrypt and store secret temporarily (not enabled yet)
    const encryptedSecret = encrypt(secret);
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret },
    });

    return { secret, qrCode: qrCodeDataUrl };
  });

  // 2FA: Enable - Verify code and activate 2FA
  app.post("/auth/2fa/enable", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      code: z.string().length(6),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { code } = parsed.data;
    const userId = (request.user as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      return reply.status(400).send({ error: "2FA setup not initiated" });
    }

    if (user.twoFactorEnabled) {
      return reply.status(400).send({ error: "2FA is already enabled" });
    }

    // Verify provided code (decrypt secret first)
    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.verify({ token: code, secret: decryptedSecret });
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid verification code" });
    }

    // Generate backup codes (use bcrypt for security)
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push(await hashPassword(code));
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    await recordAuditFromRequest(request, AuditAction.TWO_FACTOR_ENABLED, {});

    return { ok: true, backupCodes };
  });

  // 2FA: Disable
  app.post("/auth/2fa/disable", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      password: z.string().min(6),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { password } = parsed.data;
    const userId = (request.user as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Verify password before disabling 2FA
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: "Invalid password" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await recordAuditFromRequest(request, AuditAction.TWO_FACTOR_DISABLED, {});

    return { ok: true };
  });

  // Get current user profile
  app.get("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        twoFactorEnabled: true,
        tier: true,
        subscriptionEndsAt: true,
        retentionDays: true,
        _count: { select: { domains: true, inboxes: true } }
      }
    });

    if (!user) {
      return reply.status(401).send({ error: "User not found" });
    }

    // Calculate storage used (sum of all attachments in user's inboxes)
    const storageStats = await prisma.attachment.aggregate({
      where: {
        message: {
          inbox: {
            ownerId: userId,
            deletedAt: null // Only count active inboxes? Or all? Usually storage counts everything until permanently deleted.
          },
          deletedAt: null // Only count non-deleted messages?
        }
      },
      _sum: {
        size: true
      }
    });

    const storageUsed = storageStats._sum.size || 0;
    const limit = TIER_LIMITS[user.tier] || TIER_LIMITS["FREE"];

    return {
      user: {
        ...user,
        usage: {
          domains: user._count.domains,
          inboxes: user._count.inboxes,
          storage: storageUsed
        },
        limits: limit
      }
    };
  });

  // Update profile
  app.patch("/auth/profile", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().max(100).optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const userId = (request.user as any).userId;
    const { name } = parsed.data;

    await prisma.user.update({
      where: { id: userId },
      data: { name }
    });

    await recordAuditFromRequest(request, "auth.profile_updated", {});
    return { ok: true };
  });


  // Update user settings (PATCH /auth/me)
  app.patch("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().max(100).optional(),
      retentionDays: z.number().int().min(1).max(365).nullable().optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const userId = (request.user as any).userId;
    const { name, retentionDays } = parsed.data;

    // Build update data - only include fields that are explicitly provided
    const updateData: { name?: string; retentionDays?: number | null } = {};
    if (name !== undefined) updateData.name = name;
    if (retentionDays !== undefined) updateData.retentionDays = retentionDays;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        retentionDays: true,
      }
    });

    await recordAuditFromRequest(request, "auth.profile_updated", { fields: Object.keys(updateData) });
    return { ok: true, user };
  });

  // Delete account
  app.delete("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = (request.user as any).userId;

    // Soft delete or hard delete? Usually hard delete for "Delete Account" request
    // But we have cascade deletes, so it should be fine.
    await prisma.user.delete({
      where: { id: userId }
    });

    return { ok: true };
  });

  // Forgot Password - Request password reset email
  app.post("/auth/forgot-password", {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid email" });
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const successResponse = { ok: true, message: "If an account exists, a password reset link has been sent." };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isDisabled) {
      return successResponse;
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token hash in verificationToken field (reusing existing field)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: tokenHash,
        verificationTokenExpiresAt: expiresAt,
      }
    });

    // Send reset email
    try {
      const resetUrl = `${appConfig.webUrl}/reset-password?token=${rawToken}`;
      await outboundService.sendPasswordResetEmail(email, resetUrl);
      request.log.info({ email }, "Password reset email sent");
    } catch (err) {
      request.log.error(err, "Failed to send password reset email");
    }

    await recordAuditFromRequest(request, AuditAction.PASSWORD_RESET_REQUEST, { userId: user.id });

    return successResponse;
  });

  // Reset Password - Complete password reset with token
  app.post("/auth/reset-password", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "5 minutes"
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      token: z.string().min(1),
      newPassword: passwordSchema,
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    const { token, newPassword } = parsed.data;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: tokenHash,
        verificationTokenExpiresAt: { gt: new Date() },
      }
    });

    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    if (user.isDisabled) {
      return reply.status(403).send({ error: "Account is disabled" });
    }

    // Update password and clear token
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      }
    });

    await recordAuditFromRequest(request, AuditAction.PASSWORD_RESET_COMPLETE, { userId: user.id });

    return { ok: true, message: "Password has been reset successfully" };
  });
}
