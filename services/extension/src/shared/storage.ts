import { StorageData } from './types';

export const storage = {
  get: async <K extends keyof StorageData>(key: K): Promise<StorageData[K] | null> => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },

  set: async <K extends keyof StorageData>(key: K, value: StorageData[K]): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },

  remove: async (key: keyof StorageData): Promise<void> => {
    await chrome.storage.local.remove(key);
  },

  // Helper for auth
  getAuth: async () => {
    const auth = await storage.get('auth');
    return auth || { token: null, user: null, isAuthenticated: false };
  },

  setAuth: async (token: string, user: any) => {
    await storage.set('auth', { token, user, isAuthenticated: true });
  },

  clearAuth: async () => {
    await storage.set('auth', { token: null, user: null, isAuthenticated: false });
  }
};
