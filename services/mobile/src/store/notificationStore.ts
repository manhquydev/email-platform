import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';

interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
}

interface NotificationState {
  unreadCount: number;
  settings: NotificationSettings;
  isLoading: boolean;

  // Actions
  setUnreadCount: (count: number) => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

const SETTINGS_KEY = 'notification_settings';

const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  soundEnabled: true,
  badgeEnabled: true,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  settings: defaultSettings,
  isLoading: false,

  setUnreadCount: async (count: number) => {
    set({ unreadCount: count });

    // Update badge if enabled
    if (get().settings.badgeEnabled) {
      await Notifications.setBadgeCountAsync(count);
    }
  },

  updateSettings: async (newSettings: Partial<NotificationSettings>) => {
    const settings = { ...get().settings, ...newSettings };
    set({ settings });

    // Persist settings
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Update badge visibility
    if (!settings.badgeEnabled) {
      await Notifications.setBadgeCountAsync(0);
    } else {
      await Notifications.setBadgeCountAsync(get().unreadCount);
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as NotificationSettings;
        set({ settings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  },

  fetchUnreadCount: async () => {
    set({ isLoading: true });
    try {
      const response = await api.request<{ unreadCount: number }>(
        '/messages/unread-count'
      );
      const count = response.unreadCount ?? 0;
      await get().setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
