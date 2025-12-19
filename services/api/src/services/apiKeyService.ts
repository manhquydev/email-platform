import { PrismaClient, ApiKeyStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';
import { randomBytes, createHash } from 'crypto';
import { recordAudit } from '../utils/audit';

const prisma = new PrismaClient();

export interface CreateApiKeyRequest {
  name: string;
  organizationId?: string;
  permissions?: string[];
  description?: string;
  rateLimit?: number;
  burstLimit?: number;
  expiresAt?: Date;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  description?: string;
  rateLimit?: number;
  burstLimit?: number;
  expiresAt?: Date;
  status?: ApiKeyStatus;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  keyLastFour: string;
  permissions: string[];
  status: ApiKeyStatus;
  rateLimit?: number;
  burstLimit?: number;
  expiresAt?: Date;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  description?: string;
  organizationId?: string;
}

/**
 * API Key Service for managing organization API keys
 */
export class ApiKeyService {
  /**
   * Generate a secure API key
   */
  private generateApiKey(): { key: string; keyPrefix: string; keyHash: string; keyLastFour: string } {
    const keyPrefix = 'tmpro_'; // TempMail Pro prefix
    const randomPart = randomBytes(32).toString('hex');
    const key = `${keyPrefix}${randomPart}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    const keyLastFour = key.slice(-4);

    return { key, keyPrefix, keyHash, keyLastFour };
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    userId: string,
    request: CreateApiKeyRequest
  ): Promise<{ apiKey: string; response: ApiKeyResponse }> {
    const { key, keyPrefix, keyHash, keyLastFour } = this.generateApiKey();

    // Validate user permissions
    if (request.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canCreate = await PermissionService.checkOrganizationPermission(
        userId,
        request.organizationId,
        'manage'
      );

      if (!canCreate) {
        throw new Error('Not authorized to create API keys for this organization');
      }
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: request.organizationId,
        name: request.name,
        keyPrefix,
        keyHash,
        keyLastFour,
        permissions: request.permissions || ['read'],
        rateLimit: request.rateLimit,
        burstLimit: request.burstLimit,
        expiresAt: request.expiresAt,
        description: request.description,
        createdBy: userId,
      },
    });

    await recordAudit(userId, 'API_KEY_CREATED', {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      organizationId: request.organizationId,
      permissions: request.permissions,
    });

    return {
      apiKey: key, // Return the full key only on creation
      response: this.formatApiKeyResponse(apiKey),
    };
  }

  /**
   * Get API keys for user or organization
   */
  async getApiKeys(
    userId: string,
    organizationId?: string,
    status?: ApiKeyStatus
  ): Promise<ApiKeyResponse[]> {
    const where: any = {};

    if (organizationId) {
      // Check if user is member of organization
      const { PermissionService } = await import('../services/permissionService');
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        organizationId,
        'view'
      );

      if (!canView) {
        throw new Error('Not authorized to view API keys for this organization');
      }

      where.organizationId = organizationId;
    } else {
      // Only show personal API keys for non-organization requests
      where.organizationId = null;
    }

    if (status) {
      where.status = status;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, email: true },
        },
      },
    });

    return apiKeys.map(this.formatApiKeyResponse);
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(userId: string, apiKeyId: string): Promise<ApiKeyResponse | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, email: true },
        },
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check permissions
    if (apiKey.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        apiKey.organizationId,
        'view'
      );

      if (!canView) {
        throw new Error('Not authorized to view this API key');
      }
    } else if (apiKey.createdBy !== userId) {
      throw new Error('Not authorized to view this API key');
    }

    return this.formatApiKeyResponse(apiKey);
  }

  /**
   * Update API key
   */
  async updateApiKey(
    userId: string,
    apiKeyId: string,
    request: UpdateApiKeyRequest
  ): Promise<ApiKeyResponse> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Check permissions
    if (apiKey.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canEdit = await PermissionService.checkOrganizationPermission(
        userId,
        apiKey.organizationId,
        'manage'
      );

      if (!canEdit) {
        throw new Error('Not authorized to edit this API key');
      }
    } else if (apiKey.createdBy !== userId) {
      throw new Error('Not authorized to edit this API key');
    }

    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.permissions !== undefined && { permissions: request.permissions }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.rateLimit !== undefined && { rateLimit: request.rateLimit }),
        ...(request.burstLimit !== undefined && { burstLimit: request.burstLimit }),
        ...(request.expiresAt !== undefined && { expiresAt: request.expiresAt }),
        ...(request.status !== undefined && { status: request.status }),
      },
    });

    await recordAudit(userId, 'API_KEY_UPDATED', {
      apiKeyId: updatedApiKey.id,
      name: updatedApiKey.name,
      organizationId: updatedApiKey.organizationId,
      changes: Object.keys(request),
    });

    return this.formatApiKeyResponse(updatedApiKey);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Check permissions
    if (apiKey.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canRevoke = await PermissionService.checkOrganizationPermission(
        userId,
        apiKey.organizationId,
        'manage'
      );

      if (!canRevoke) {
        throw new Error('Not authorized to revoke this API key');
      }
    } else if (apiKey.createdBy !== userId) {
      throw new Error('Not authorized to revoke this API key');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: ApiKeyStatus.REVOKED },
    });

    await recordAudit(userId, 'API_KEY_REVOKED', {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      organizationId: apiKey.organizationId,
    });
  }

  /**
   * Delete API key permanently
   */
  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Check permissions
    if (apiKey.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canDelete = await PermissionService.checkOrganizationPermission(
        userId,
        apiKey.organizationId,
        'manage'
      );

      if (!canDelete) {
        throw new Error('Not authorized to delete this API key');
      }
    } else if (apiKey.createdBy !== userId) {
      throw new Error('Not authorized to delete this API key');
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    await recordAudit(userId, 'API_KEY_DELETED', {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      organizationId: apiKey.organizationId,
    });
  }

  /**
   * Validate API key and get organization context
   */
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    apiKeyId?: string;
    organizationId?: string;
    permissions?: string[];
    rateLimit?: number;
    burstLimit?: number;
    userId?: string;
  }> {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 6);

    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        organization: {
          select: { id: true },
        },
        creator: {
          select: { id: true },
        },
      },
    });

    if (!key || key.keyPrefix !== keyPrefix) {
      return { valid: false };
    }

    if (key.status !== ApiKeyStatus.ACTIVE) {
      return { valid: false };
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return { valid: false };
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      apiKeyId: key.id,
      organizationId: key.organizationId,
      permissions: key.permissions as string[],
      rateLimit: key.rateLimit || undefined,
      burstLimit: key.burstLimit || undefined,
      userId: key.createdBy,
    };
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(userId: string, apiKeyId: string, days: number = 30) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Check permissions
    if (apiKey.organizationId) {
      const { PermissionService } = await import('../services/permissionService');
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        apiKey.organizationId,
        'view'
      );

      if (!canView) {
        throw new Error('Not authorized to view usage for this API key');
      }
    } else if (apiKey.createdBy !== userId) {
      throw new Error('Not authorized to view usage for this API key');
    }

    const usage = await prisma.apiUsageLog.findMany({
      where: {
        apiKeyId,
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalCalls: usage.length,
      successfulCalls: usage.filter(u => u.statusCode < 400).length,
      failedCalls: usage.filter(u => u.statusCode >= 400).length,
      avgResponseTime: usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length,
      topEndpoints: this.getTopEndpoints(usage),
      statusCodes: this.getStatusCodeDistribution(usage),
      dailyUsage: this.getDailyUsage(usage, days),
    };

    return stats;
  }

  /**
   * Record API usage
   */
  async recordApiUsage(
    apiKeyId: string,
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ) {
    await prisma.apiUsageLog.create({
      data: {
        apiKeyId,
        method,
        endpoint,
        statusCode,
        responseTime,
        ip,
        userAgent,
        requestId,
      },
    });

    // Update usage count on the API key
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        usageCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Format API key response (without sensitive data)
   */
  private formatApiKeyResponse(apiKey: any): ApiKeyResponse {
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      keyLastFour: apiKey.keyLastFour,
      permissions: apiKey.permissions as string[],
      status: apiKey.status,
      rateLimit: apiKey.rateLimit || undefined,
      burstLimit: apiKey.burstLimit || undefined,
      expiresAt: apiKey.expiresAt || undefined,
      usageCount: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt || undefined,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      createdBy: apiKey.createdBy,
      description: apiKey.description || undefined,
      organizationId: apiKey.organizationId || undefined,
    };
  }

  /**
   * Get top endpoints from usage logs
   */
  private getTopEndpoints(usage: any[], limit: number = 10) {
    const endpointCounts = usage.reduce((acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /**
   * Get status code distribution
   */
  private getStatusCodeDistribution(usage: any[]) {
    const statusCounts = usage.reduce((acc, u) => {
      const range = Math.floor(u.statusCode / 100) * 100;
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([range, count]) => ({
      range: `${range}-${parseInt(range) + 99}`,
      count,
    }));
  }

  /**
   * Get daily usage breakdown
   */
  private getDailyUsage(usage: any[], days: number) {
    const daily = {};
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      daily[dateStr] = 0;
    }

    usage.forEach(u => {
      const dateStr = u.createdAt.toISOString().split('T')[0];
      if (daily[dateStr] !== undefined) {
        daily[dateStr]++;
      }
    });

    return Object.entries(daily)
      .reverse()
      .map(([date, count]) => ({ date, count }));
  }
}

export const apiKeyService = new ApiKeyService();