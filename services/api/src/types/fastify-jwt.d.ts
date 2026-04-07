import "@fastify/jwt";
import { SubscriptionTier, UserRole } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id?: string; // Legacy compatibility: mirror userId in access token payload
      userId: string;
      email?: string;
      role?: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
      type?: "access" | "refresh";
      jti?: string; // SECURITY: JWT ID for token revocation (Phase 2)
      // Telegram temp token fields (for registration flow)
      telegramAuth?: boolean;
      telegramId?: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramPhotoUrl?: string;
    };
    user: {
      id?: string;
      userId: string;
      email?: string;
      role?: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
      type?: "access" | "refresh";
      jti?: string; // SECURITY: JWT ID for token revocation (Phase 2)
      iat: number;
      exp: number;
    };
  }
}

// Helper types for request handlers
export interface AuthenticatedUser {
  id?: string;
  userId: string;
  email?: string;
  role?: UserRole;
  tier?: SubscriptionTier;
  pending2FA?: boolean;
      type?: "access" | "refresh";
  iat: number;
  exp: number;
}

export interface AdminUser extends AuthenticatedUser {
  role: "ADMIN";
}

// Type guard for admin users
export function isAdminUser(user: AuthenticatedUser): user is AdminUser {
  return user.role === "ADMIN";
}
