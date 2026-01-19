import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const BACKGROUND_FETCH_TASK = 'background-email-fetch';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.ephemera.app';

/**
 * Background task to fetch unread count and update badge
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Get auth token
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch unread count from API
    const response = await fetch(`${API_BASE}/messages/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const data = await response.json();
    const unreadCount = data.unreadCount ?? 0;

    // Update app badge
    await Notifications.setBadgeCountAsync(unreadCount);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundFetch(): Promise<boolean> {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('Background fetch is restricted');
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('Background fetch is denied');
      return false;
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('Background fetch registered');
    return true;
  } catch (error) {
    console.error('Failed to register background fetch:', error);
    return false;
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Background fetch unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister background fetch:', error);
  }
}

/**
 * Check if background fetch is registered
 */
export async function isBackgroundFetchRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
}
