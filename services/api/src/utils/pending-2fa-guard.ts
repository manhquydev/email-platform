import { FastifyReply } from "fastify";
import { sendApiError } from "./errorHandler";

type JwtLikePayload = {
  pending2FA?: boolean;
};

export const isPendingTwoFactorToken = (payload: JwtLikePayload | null | undefined): boolean => {
  return payload?.pending2FA === true;
};

export const handlePendingTwoFactorToken = (
  payload: JwtLikePayload | null | undefined,
  reply: FastifyReply,
  options?: { sendError?: boolean }
): boolean => {
  if (!isPendingTwoFactorToken(payload)) {
    return false;
  }

  if (options?.sendError !== false) {
    sendApiError(reply, 401, "Two-factor verification required", { code: "TWO_FACTOR_REQUIRED" });
  }

  return true;
};
