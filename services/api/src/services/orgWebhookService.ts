import { PrismaClient, WebhookStatus } from '@prisma/client';
import { randomBytes, createHmac } from 'crypto';
import { recordAudit } from '../utils/audit';

const prisma = new PrismaClient();

export interface CreateOrgWebhookRequest {
  name: string;
  url: string;
  events: string[];
  organizationId?: string;
  secret?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  description?: string;
}

export interface UpdateOrgWebhookRequest {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  description?: string;
  status?: WebhookStatus;
}

export interface OrgWebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  organizationId?: string;
  userId?: string;
}

export interface OrgWebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  duration: number;
}

/**
 * Organization Webhook Service for managing organization webhooks and event delivery
 */
export class OrgWebhookService {
  /**
   * Generate a webhook secret
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    userId: string,
    request: CreateOrgWebhookRequest
  ): Promise<{ webhook: any; secret: string }> {
    // Validate user permissions
    if (request.organizationId) {
      const { PermissionService } = await import('./permissionService');
      const canCreate = await PermissionService.checkOrganizationPermission(
        userId,
        request.organizationId,
        'manage'
      );

      if (!canCreate) {
        throw new Error('Not authorized to create webhooks for this organization');
      }
    }

    const secret = request.secret || this.generateSecret();

    const webhook = await prisma.webhook.create({
      data: {
        organizationId: request.organizationId,
        name: request.name,
        url: request.url,
        secret,
        events: request.events,
        timeout: request.timeout || 30000, // 30 seconds default
        retryAttempts: request.retryAttempts || 3,
        retryDelay: request.retryDelay || 60, // 60 seconds default
        description: request.description,
        createdBy: userId,
      },
    });

    await recordAudit(userId, 'WEBHOOK_CREATED', {
      webhookId: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: request.events,
      organizationId: request.organizationId,
    });

    return { webhook, secret };
  }

  /**
   * Get webhooks for user or organization
   */
  async getWebhooks(
    userId: string,
    organizationId?: string,
    status?: WebhookStatus
  ): Promise<any[]> {
    const where: any = {};

    if (organizationId) {
      // Check if user is member of organization
      const { PermissionService } = await import('./permissionService');
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        organizationId,
        'view'
      );

      if (!canView) {
        throw new Error('Not authorized to view webhooks for this organization');
      }

      where.organizationId = organizationId;
    } else {
      // Only show personal webhooks for non-organization requests
      where.organizationId = null;
    }

    if (status) {
      where.status = status;
    }

    const webhooks = await prisma.webhook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, email: true },
        },
        _count: {
          select: {
            deliveries: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                }
              }
            }
          }
        }
      },
    });

    return webhooks.map(webhook => ({
      ...webhook,
      deliveriesLast24h: webhook._count.deliveries,
      _count: undefined,
    }));
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(userId: string, webhookId: string): Promise<any | null> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, email: true },
        },
      },
    });

    if (!webhook) {
      return null;
    }

    // Check permissions
    if (webhook.organizationId) {
      const { PermissionService } = await import('./permissionService');
      const canView = await PermissionService.checkOrganizationPermission(
        userId,
        webhook.organizationId,
        'view'
      );

      if (!canView) {
        throw new Error('Not authorized to view this webhook');
      }
    } else if (webhook.createdBy !== userId) {
      throw new Error('Not authorized to view this webhook');
    }

    return webhook;
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    userId: string,
    webhookId: string,
    request: UpdateOrgWebhookRequest
  ): Promise<any> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Check permissions
    if (webhook.organizationId) {
      const { PermissionService } = await import('./permissionService');
      const canEdit = await PermissionService.checkOrganizationPermission(
        userId,
        webhook.organizationId,
        'manage'
      );

      if (!canEdit) {
        throw new Error('Not authorized to edit this webhook');
      }
    } else if (webhook.createdBy !== userId) {
      throw new Error('Not authorized to edit this webhook');
    }

    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.url !== undefined && { url: request.url }),
        ...(request.events !== undefined && { events: request.events }),
        ...(request.secret !== undefined && { secret: request.secret }),
        ...(request.timeout !== undefined && { timeout: request.timeout }),
        ...(request.retryAttempts !== undefined && { retryAttempts: request.retryAttempts }),
        ...(request.retryDelay !== undefined && { retryDelay: request.retryDelay }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.status !== undefined && { status: request.status }),
      },
    });

    await recordAudit(userId, 'WEBHOOK_UPDATED', {
      webhookId: updatedWebhook.id,
      name: updatedWebhook.name,
      organizationId: updatedWebhook.organizationId,
      changes: Object.keys(request),
    });

    return updatedWebhook;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Check permissions
    if (webhook.organizationId) {
      const { PermissionService } = await import('./permissionService');
      const canDelete = await PermissionService.checkOrganizationPermission(
        userId,
        webhook.organizationId,
        'manage'
      );

      if (!canDelete) {
        throw new Error('Not authorized to delete this webhook');
      }
    } else if (webhook.createdBy !== userId) {
      throw new Error('Not authorized to delete this webhook');
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    await recordAudit(userId, 'WEBHOOK_DELETED', {
      webhookId: webhook.id,
      name: webhook.name,
      organizationId: webhook.organizationId,
    });
  }

  /**
   * Trigger event delivery to webhooks
   */
  async triggerEvent(event: OrgWebhookEvent): Promise<void> {
    // Find webhooks that should receive this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        status: WebhookStatus.ACTIVE,
        events: {
          has: event.type,
        },
        OR: [
          { organizationId: event.organizationId },
          { organizationId: null }, // Global webhooks
        ],
      },
    });

    // Queue deliveries for each matching webhook
    const deliveries = webhooks.map(webhook =>
      this.queueDelivery(webhook, event)
    );

    // Process deliveries in parallel
    await Promise.allSettled(deliveries);
  }

  /**
   * Queue webhook delivery
   */
  private async queueDelivery(webhook: any, event: OrgWebhookEvent): Promise<void> {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType: event.type,
        payload: event,
        attempt: 1,
        status: 'pending',
        scheduledAt: new Date(),
      },
    });

    // Process delivery asynchronously
    this.processDelivery(delivery.id, webhook).catch(error => {
      console.error(`Failed to process webhook delivery ${delivery.id}:`, error);
    });
  }

  /**
   * Process webhook delivery
   */
  private async processDelivery(deliveryId: string, webhook: any): Promise<OrgWebhookDeliveryResult> {
    let result: OrgWebhookDeliveryResult;

    try {
      const delivery = await prisma.webhookDelivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const startTime = Date.now();

      // Prepare request payload
      const payload = {
        id: delivery.id,
        event: delivery.eventType,
        data: delivery.payload,
        timestamp: new Date().toISOString(),
      };

      // Generate signature
      const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

      // Make webhook request using node-fetch
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TempMailPro-Webhooks/1.0',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-ID': delivery.id,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeout || 30000),
      });

      const responseText = await response.text();
      const duration = Date.now() - startTime;

      result = {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        response: responseText,
        duration,
      };

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          statusCode: response.status,
          response: responseText,
          duration,
          status: result.success ? 'delivered' : 'failed',
          deliveredAt: result.success ? new Date() : undefined,
          error: result.success ? undefined : `HTTP ${response.status}`,
        },
      });

      // Update webhook status if too many failures
      if (!result.success) {
        await this.handleWebhookFailure(webhook);
      }

    } catch (error: any) {
      const duration = Date.now() - Date.now();

      result = {
        success: false,
        error: error.message,
        duration,
      };

      // Update delivery record with error
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          error: error.message,
          duration,
        },
      });

      // Schedule retry if configured
      if (webhook.retryAttempts && webhook.retryAttempts > 1) {
        await this.scheduleRetry(deliveryId, webhook);
      }
    }

    return result;
  }

  /**
   * Schedule webhook delivery retry
   */
  private async scheduleRetry(deliveryId: string, webhook: any): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.attempt >= webhook.retryAttempts) {
      return;
    }

    const retryAt = new Date(Date.now() + webhook.retryDelay * 1000);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'retrying',
        scheduledAt: retryAt,
        attempt: delivery.attempt + 1,
      },
    });

    // Schedule retry
    setTimeout(() => {
      this.processDelivery(deliveryId, webhook).catch(error => {
        console.error(`Retry failed for webhook delivery ${deliveryId}:`, error);
      });
    }, webhook.retryDelay * 1000);
  }

  /**
   * Handle webhook failure
   */
  private async handleWebhookFailure(webhook: any): Promise<void> {
    // Get recent failures
    const recentFailures = await prisma.webhookDelivery.count({
      where: {
        webhookId: webhook.id,
        status: 'failed',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    // Disable webhook if too many failures
    if (recentFailures >= 10) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          status: WebhookStatus.FAILED,
        },
      });
    }
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    // Remove sha256= prefix if present
    const providedSignature = signature.replace('sha256=', '');

    // Use constant-time comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedBuffer.length; i++) {
      result |= expectedBuffer[i] ^ providedBuffer[i];
    }

    return result === 0;
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookDeliveries(
    userId: string,
    webhookId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    // Verify webhook access
    const webhook = await this.getWebhookById(userId, webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return deliveries;
  }

  /**
   * Replay failed webhook delivery
   */
  async replayDelivery(userId: string, deliveryId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Check permissions
    if (delivery.webhook.organizationId) {
      const { PermissionService } = await import('./permissionService');
      const canManage = await PermissionService.checkOrganizationPermission(
        userId,
        delivery.webhook.organizationId,
        'manage'
      );

      if (!canManage) {
        throw new Error('Not authorized to replay this delivery');
      }
    }

    // Create new delivery with same payload
    await this.queueDelivery(delivery.webhook, delivery.payload as OrgWebhookEvent);

    await recordAudit(userId, 'WEBHOOK_DELIVERY_REPLAYED', {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      eventType: delivery.eventType,
    });
  }
}

export const orgWebhookService = new OrgWebhookService();