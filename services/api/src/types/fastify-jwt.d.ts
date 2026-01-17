import "@fastify/jwt";
import { SubscriptionTier, UserRole } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
      type?: "access" | "refresh";
      // Telegram temp token fields (for registration flow)
      telegramAuth?: boolean;
      telegramId?: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramPhotoUrl?: string;
    };
    user: {
      userId: string;
      role: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
      type?: "access" | "refresh";
      iat: number;
      exp: number;
    };
  }
}

// Helper types for request handlers
export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
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
