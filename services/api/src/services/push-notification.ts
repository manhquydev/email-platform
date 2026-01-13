import webpush from 'web-push';
import { prisma } from '../lib/prisma';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

class PushNotificationService {
  private initialized = false;

  init(): void {
    if (this.initialized) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[PushNotification] VAPID keys not configured, push disabled');
      return;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    this.initialized = true;
    console.log('[PushNotification] Service initialized');
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.initialized) return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload,
            {
              TTL: 60 * 60, // 1 hour
              urgency: 'normal',
            }
          );
        } catch (err: any) {
          // Remove invalid subscriptions (410 Gone, 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            console.log(`[PushNotification] Removed invalid subscription ${sub.id}`);
          } else {
            throw err;
          }
        }
      })
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[PushNotification] ${failed.length}/${subscriptions.length} failed`);
    }
  }

  async sendEmailNotification(
    userId: string,
    email: { from: string | null; subject: string | null; inboxId: string }
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: email.from || 'New Email',
      body: email.subject || 'You have a new email',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `email-${email.inboxId}`,
      data: {
        type: 'email.new',
        inboxId: email.inboxId,
        url: `/dashboard?inboxId=${email.inboxId}`,
      },
    });
  }

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const pushNotification = new PushNotificationService();
