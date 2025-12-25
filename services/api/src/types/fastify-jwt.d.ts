import "@fastify/jwt";
import { SubscriptionTier } from "@prisma/client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: string;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
    }; // payload type is used for signing and verifying
    user: {
      userId: string;
      role: string;
      tier?: SubscriptionTier;
      pending2FA?: boolean;
      iat: number;
      exp: number;
    }; // user type is return type of `request.user` object
  }
}
