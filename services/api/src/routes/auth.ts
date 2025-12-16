import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { verifyPassword, hashPassword } from "../utils/password";
import { appConfig } from "../config";
import { outboundService } from "../services/outbound";

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        emailVerified: null,
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    // Send verification email
    try {
      const verifyUrl = `${appConfig.webUrl}/verify-email?token=${verificationToken}`;
      const emailHtml = `
        <h1>Verify your email</h1>
        <p>Thanks for creating an account. Click the link below to verify your email address:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `;

      await outboundService.sendEmail(
        appConfig.defaultAdminEmail,
        email,
        "Verify your email",
        `Verify your email: ${verifyUrl}`,
        emailHtml
      );
    } catch (err) {
      request.log.error(err, "Failed to send verification email");
      // We don't fail the request, but user might need to resend verification later
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: "30d" });
    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
      message: "Registration successful. Please check your email to verify your account."
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

    return { ok: true, message: "Email verified successfully" };
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
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return reply.status(403).send({ error: "Email not verified. Please check your email." });
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: "30d" });
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

    return { ok: true };
  });
}
