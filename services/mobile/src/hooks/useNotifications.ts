import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { registerForPushNotifications } from '@/utils/notifications';
import { pushApi } from '@/api/push';
import { useAuthStore } from '@/store/authStore';

interface NotificationData {
  type?: 'email.received' | 'email.deleted' | 'email.read';
  messageId?: string;
  inboxId?: string;
  subject?: string;
}

/**
 * Hook to handle push notifications registration and events
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Handle notification received while app is in foreground
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      const data = notification.request.content.data as NotificationData;

      // Invalidate queries to refresh data
      if (data.type === 'email.received') {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['inboxes'] });

        // If we have an inboxId, invalidate that specific inbox
        if (data.inboxId) {
          queryClient.invalidateQueries({
            queryKey: ['messages', data.inboxId],
          });
        }
      }
    },
    [queryClient]
  );

  // Handle notification tap (user interaction)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content
        .data as NotificationData;

      // Navigate to the relevant screen based on notification type
      if (data.type === 'email.received' && data.messageId) {
        router.push(`/message/${data.messageId}`);
      } else if (data.inboxId) {
        router.push(`/inbox/${data.inboxId}`);
      }
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register for push notifications
    const registerPush = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        tokenRef.current = token;
        try {
          await pushApi.subscribe(token);
        } catch (error) {
          console.error('Failed to subscribe to push:', error);
        }
      }
    };

    registerPush();

    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener(handleNotificationReceived);

    // Listen for notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, handleNotificationReceived, handleNotificationResponse]);

  // Unsubscribe when logging out
  useEffect(() => {
    if (!isAuthenticated && tokenRef.current) {
      pushApi.unsubscribe(tokenRef.current).catch(() => {});
      tokenRef.current = null;
    }
  }, [isAuthenticated]);
}
