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
 * Context for audit logging - includes request metadata
 */
export interface AuditContext {
  userId: string | null;
  action: string | AuditAction;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
}

/**
 * Extract audit context from Fastify request
 */
export function getAuditContext(request: FastifyRequest, userId?: string | null): Partial<AuditContext> {
  return {
    userId: userId ?? (request as any).user?.userId ?? null,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? undefined,
    requestId: request.id,
  };
}

/**
 * Record an audit log entry with full request context
 */
export const recordAudit = async (ctx: AuditContext): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId ?? undefined,
        action: ctx.action,
        meta: ctx.meta as any,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
        success: ctx.success ?? true,
      },
    });
  } catch (error) {
    // Don't let audit failures break the main flow
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
  const ctx = getAuditContext(request);
  await recordAudit({
    ...ctx,
    action,
    meta,
    success,
  });
};
