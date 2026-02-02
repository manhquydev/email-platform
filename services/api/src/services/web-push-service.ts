import webpush from 'web-push';
import { prisma } from '../lib/prisma';

// Initialize web-push with VAPID keys from environment
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:support@ephemera.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('[WebPush] VAPID keys not found. Push notifications will not work.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  data?: Record<string, any>;
}

export class WebPushService {
  /**
   * Send a push notification to a specific user
   * @param userId User ID to send to
   * @param payload Notification payload
   */
  static async sendToUser(userId: string, payload: PushPayload) {
    if (!publicKey || !privateKey) return { success: false, error: 'VAPID not configured' };

    // Get all subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      return { success: true, delivered: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );

          // Update last successful send
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastSuccessfulSend: new Date() }
          });

          return true;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid, remove it
            await prisma.pushSubscription.delete({
              where: { id: sub.id }
            });
            return false; // Pruned
          }
          throw error;
        }
      })
    );

    const delivered = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    return { success: true, delivered, total: subscriptions.length };
  }
}
