import { StorageData } from './types';
import { normalizeInboxes } from './utils';
import browser from 'webextension-polyfill';

export const storage = {
  get: async <K extends keyof StorageData>(key: K): Promise<StorageData[K] | null> => {
    const result = await browser.storage.local.get(key);
    return (result[key] as StorageData[K]) || null;
  },

  set: async <K extends keyof StorageData>(key: K, value: StorageData[K]): Promise<void> => {
    await browser.storage.local.set({ [key]: value });
  },

  remove: async (key: keyof StorageData): Promise<void> => {
    await browser.storage.local.remove(key);
  },

  // Helper for inboxes with normalization
  setInboxes: async (inboxes: any[]): Promise<void> => {
    const normalized = normalizeInboxes(inboxes);
    await storage.set('inboxes', normalized);

    // Notify other parts of the extension that inboxes have changed
    browser.runtime.sendMessage({ type: 'INBOXES_UPDATED', inboxes: normalized }).catch(() => {
      // Ignore errors if no listeners are active
    });
  },

  // Helper for auth
  getAuth: async () => {
    const auth = await storage.get('auth');
    return auth || { token: null, user: null, isAuthenticated: false, isAnonymous: false };
  },

  setAuth: async (token: string, user: any, isAnonymous = false) => {
    await storage.set('auth', { token, user, isAuthenticated: true, isAnonymous });
  },

  clearAuth: async () => {
    await storage.set('auth', { token: null, user: null, isAuthenticated: false, isAnonymous: false });
  },

  // Settings helpers
  getSettings: async () => {
    const settings = await storage.get('settings');
    return settings || { theme: 'light', autoCopy: true, notificationsEnabled: true };
  },

  updateSettings: async (updates: Partial<StorageData['settings']>) => {
    const current = await storage.getSettings();
    await storage.set('settings', { ...current, ...updates });
  },

  // Device ID for anonymous tracking - uses cryptographically secure random
  getDeviceId: async () => {
    let deviceId = await storage.get('deviceId');
    if (!deviceId) {
      // Use crypto.randomUUID() for secure random ID generation
      deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
      await storage.set('deviceId', deviceId);
    }
    return deviceId;
  }
};
