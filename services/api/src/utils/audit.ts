import { prisma } from "../lib/prisma";
import { FastifyRequest } from "fastify";

/**
 * Audit action types for consistent logging
 */
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET_REQUEST = 'auth.password.reset_request',
  PASSWORD_RESET_COMPLETE = 'auth.password.reset_complete',

  // 2FA
  TWO_FACTOR_ENABLED = 'auth.2fa.enabled',
  TWO_FACTOR_DISABLED = 'auth.2fa.disabled',
  TWO_FACTOR_VERIFIED = 'auth.2fa.verified',
  TWO_FACTOR_FAILED = 'auth.2fa.failed',

  // API Keys
  API_KEY_CREATED = 'api_key.created',
  API_KEY_DELETED = 'api_key.deleted',

  // Admin Actions
  ADMIN_USER_DISABLED = 'admin.user.disabled',
  ADMIN_USER_ENABLED = 'admin.user.enabled',
  ADMIN_USER_ROLE_CHANGE = 'admin.user.role_change',
  ADMIN_USER_DELETED = 'admin.user.deleted',

  // Security Events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  ACCOUNT_LOCKED = 'security.account_locked',
}

/**
 * Record an audit log entry (legacy signature for backwards compatibility)
 */
export const recordAudit = async (
  userId: string | null,
  action: string,
  meta?: Record<string, unknown>
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        meta: meta as any,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
};

/**
 * Helper to record audit from a Fastify request
 */
export const recordAuditFromRequest = async (
  request: FastifyRequest,
  action: string | AuditAction,
  meta?: Record<string, unknown>,
  success: boolean = true
): Promise<void> => {
  const userId = (request as any).user?.userId ?? null;
  const ip = request.ip;
  const userAgent = request.headers['user-agent'] ?? undefined;
  const requestId = request.id;

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        meta: { ...meta, ip, userAgent, requestId, success } as any,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
};
