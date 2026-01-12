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
import { recordAudit } from "../utils/audit";
import { TIER_LIMITS } from "./billing";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
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

    const token = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier }, { expiresIn: "30d" });

    await recordAudit(user.id, "USER_REGISTERED", { email: user.email });

    return {
      token,
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

    await recordAudit(user.id, "EMAIL_VERIFIED", { email: user.email });

    return { ok: true, message: "Email verified successfully" };
  });

  // Resend verification email
  app.post("/auth/resend-verification", async (request, reply) => {
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

    await recordAudit(user.id, "RESEND_VERIFICATION", { email: user.email });

    return { ok: true, message: "Verification email sent successfully" };
  });

  app.post("/auth/login", async (request, reply) => {
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
      await recordAudit(null, "LOGIN_FAILED", { email, ip: request.ip, reason: "user_not_found" });
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await recordAudit(user.id, "LOGIN_FAILED", { email: user.email, ip: request.ip, reason: "invalid_password" });
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Check email verification (dynamic setting from DB)
    const requireVerification = await isEmailVerificationRequired();
    if (requireVerification && !user.emailVerified) {
      await recordAudit(user.id, "LOGIN_FAILED", { email: user.email, ip: request.ip, reason: "email_not_verified" });
      return reply.status(403).send({ error: "Email not verified. Please check your email." });
    }

    // Check if account is disabled
    if (user.isDisabled) {
      await recordAudit(user.id, "LOGIN_FAILED", { email: user.email, ip: request.ip, reason: "account_disabled" });
      return reply.status(403).send({ error: "Account is disabled. Contact administrator." });
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Return partial response - client needs to provide TOTP
      const tempToken = app.jwt.sign({ userId: user.id, pending2FA: true } as any, { expiresIn: "5m" });
      return { requires2FA: true, tempToken };
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier }, { expiresIn: "30d" });

    await recordAudit(user.id, "LOGIN", { email: user.email, ip: request.ip });

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  app.post("/auth/change-password", { preHandler: app.authenticate }, async (request, reply) => {
    const bodySchema = z.object({
      newPassword: z.string().min(6),
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

    await recordAudit(userId, "PASSWORD_CHANGED", {});

    return { ok: true };
  });

  // 2FA: Verify TOTP after login (strict rate limit to prevent brute force)
  app.post("/auth/2fa/verify", {
    config: {
      rateLimit: {
        max: 5,
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

    const token = app.jwt.sign({ userId: user.id, role: user.role, tier: user.tier }, { expiresIn: "30d" });

    await recordAudit(user.id, "LOGIN_2FA", { email: user.email, ip: request.ip });

    return { token, user: { id: user.id, email: user.email, role: user.role } };
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

    await recordAudit(userId, "2FA_ENABLED", {});

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

    await recordAudit(userId, "2FA_DISABLED", {});

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
        credits: true,
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

    await recordAudit(userId, "PROFILE_UPDATED", {});
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

    await recordAudit(userId, "PROFILE_UPDATED", { fields: Object.keys(updateData) });
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
}
