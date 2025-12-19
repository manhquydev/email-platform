import { PrismaClient, AuditLog } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogData {
  userId?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        meta: {
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      actions?: string[];
      userId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const where: any = {};

    // Build where clause based on filters
    if (options.actions && options.actions.length > 0) {
      where.action = { in: options.actions };
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.fromDate || options.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    // Get organization member IDs to filter logs
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true }
    });

    const memberIds = members.map(m => m.userId);
    where.userId = { in: memberIds };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      hasMore: (options.offset || 0) + (options.limit || 50) < total
    };
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      actions?: string[];
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const where: any = { userId };

    if (options.actions && options.actions.length > 0) {
      where.action = { in: options.actions };
    }

    if (options.fromDate || options.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      hasMore: (options.offset || 0) + (options.limit || 50) < total
    };
  }

  /**
   * Get system-wide audit logs (admin only)
   */
  async getSystemLogs(options: {
    limit?: number;
    offset?: number;
    actions?: string[];
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}) {
    const where: any = {};

    if (options.actions && options.actions.length > 0) {
      where.action = { in: options.actions };
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.fromDate || options.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 100,
        skip: options.offset || 0,
        include: {
          user: {
            select: { id: true, email: true, role: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      hasMore: (options.offset || 0) + (options.limit || 100) < total
    };
  }

  /**
   * Create audit trail for organization operations
   */
  async logOrganizationAction(
    organizationId: string,
    userId: string,
    action: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Log to audit table
    await this.log({
      userId,
      action,
      details: {
        ...details,
        organizationId
      },
      ipAddress,
      userAgent
    });

    // Also create organization-specific log entry if needed
    // This could be a separate table for organization-specific logs
  }
}

export const auditLogger = new AuditService();