import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { api } from './client';

interface PushSubscription {
  id: string;
  token: string;
  platform: string;
  deviceName?: string;
  createdAt: string;
}

export const pushApi = {
  /**
   * Subscribe to push notifications
   */
  subscribe: (token: string) =>
    api.request<{ subscription: PushSubscription }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName || undefined,
      }),
    }),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: (token: string) =>
    api.request<{ ok: boolean }>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /**
   * Get all push subscriptions for current user
   */
  getSubscriptions: () =>
    api.request<{ subscriptions: PushSubscription[] }>('/push/subscriptions'),
};
