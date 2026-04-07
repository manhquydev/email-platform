import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { type SubscriptionTier, type UserRole } from "@prisma/client";
import { ACCESS_TOKEN_EXPIRY } from "./auth-config";

type AccessTokenUser = {
  id: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
};

export function createAccessToken(app: FastifyInstance, user: AccessTokenUser) {
  return app.jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      type: "access" as const,
      jti: crypto.randomUUID(),
    },
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}
