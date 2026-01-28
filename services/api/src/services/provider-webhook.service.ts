/**
 * Provider Webhook Service
 * Handles webhook event emission and delivery to hosting providers
 * Supports HMAC signature verification and retry logic
 */

import { prisma } from '../lib/prisma';
import crypto from 'crypto';

// Webhook event types
export type WebhookEventType =
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.suspended'
  | 'tenant.unsuspended'
  | 'tenant.terminated'
  | 'domain.added'
  | 'domain.verified'
  | 'domain.removed'
  | 'mailbox.created'
  | 'mailbox.deleted'
  | 'usage.threshold';

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export class ProviderWebhookService {
  /**
   * Emit a webhook event for a provider
   * Creates event record and triggers async delivery
   */
  static async emit(
    providerId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>
  ) {
    const provider = await prisma.hostingProvider.findUnique({
      where: { id: providerId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    // No webhook configured, skip
    if (!provider?.webhookUrl) {
      return null;
    }

    // Create event record
    const event = await prisma.providerWebhookEvent.create({
      data: {
        providerId,
        eventType,
        payload: payload as object,
      },
    });

    // Deliver async (fire and forget, errors logged)
    this.deliver(event.id, provider.webhookUrl, provider.webhookSecret).catch(
      (err) => console.error('Webhook delivery failed:', err.message)
    );

    return event;
  }

  /**
   * Deliver webhook event to provider endpoint
   * Includes HMAC signature for verification
   */
  private static async deliver(
    eventId: string,
    url: string,
    secret: string | null
  ): Promise<void> {
    const event = await prisma.providerWebhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    const webhookPayload: WebhookPayload = {
      id: event.id,
      type: event.eventType as WebhookEventType,
      data: event.payload as Record<string, unknown>,
      timestamp: event.createdAt.toISOString(),
    };

    const body = JSON.stringify(webhookPayload);

    // Generate HMAC signature if secret is configured
    const signature = secret
      ? crypto.createHmac('sha256', secret).update(body).digest('hex')
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Ephemera-Webhook/1.0',
      'X-Ephemera-Event': event.eventType,
      'X-Ephemera-Delivery': event.id,
    };

    if (signature) {
      headers['X-Ephemera-Signature'] = `sha256=${signature}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        // Mark as delivered
        await prisma.providerWebhookEvent.update({
          where: { id: eventId },
          data: {
            deliveredAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      await prisma.providerWebhookEvent.update({
        where: { id: eventId },
        data: {
          attempts: { increment: 1 },
          lastError: errorMessage,
        },
      });

      // Schedule retry if under max attempts (handled by background job)
      console.error(`Webhook delivery failed for ${eventId}:`, errorMessage);
    }
  }

  /**
   * Retry failed webhook deliveries
   * Called by background job
   */
  static async retryFailedEvents(maxAttempts: number = 5) {
    const failedEvents = await prisma.providerWebhookEvent.findMany({
      where: {
        deliveredAt: null,
        attempts: { lt: maxAttempts },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
      },
      include: {
        provider: {
          select: { webhookUrl: true, webhookSecret: true },
        },
      },
      take: 100,
    });

    for (const event of failedEvents) {
      if (event.provider.webhookUrl) {
        await this.deliver(
          event.id,
          event.provider.webhookUrl,
          event.provider.webhookSecret
        );
        // Small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { retried: failedEvents.length };
  }

  /**
   * List recent webhook events for provider
   */
  static async listEvents(
    providerId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    const { limit = 50, offset = 0 } = options;

    const [events, total] = await Promise.all([
      prisma.providerWebhookEvent.findMany({
        where: { providerId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventType: true,
          deliveredAt: true,
          attempts: true,
          lastError: true,
          createdAt: true,
        },
      }),
      prisma.providerWebhookEvent.count({ where: { providerId } }),
    ]);

    return { events, total, limit, offset };
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(providerId: string) {
    const provider = await prisma.hostingProvider.findUnique({
      where: { id: providerId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!provider?.webhookUrl) {
      throw new Error('No webhook URL configured');
    }

    // Send test event
    const testPayload = {
      test: true,
      message: 'This is a test webhook from Ephemera',
      timestamp: new Date().toISOString(),
    };

    const event = await this.emit(providerId, 'tenant.created', testPayload);
    return { sent: true, eventId: event?.id };
  }
}
