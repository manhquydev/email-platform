import "@fastify/jwt";
import { SubscriptionTier, UserRole } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
    };
    user: {
      userId: string;
      role: UserRole;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
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
