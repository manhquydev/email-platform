import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { Inbox, Message } from '@/types';

const CACHE_KEYS = {
  INBOXES: 'cache_inboxes',
  MESSAGES: (inboxId: string) => `cache_messages_${inboxId}`,
  MESSAGE: (id: string) => `cache_message_${id}`,
  LAST_SYNC: 'cache_last_sync',
};

const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Offline cache manager for storing data locally
 */
export const OfflineCache = {
  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  },

  /**
   * Save data to cache
   */
  async set<T>(key: string, data: T): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  },

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const item: CacheItem<T> = JSON.parse(stored);

      // Check if cache is expired
      if (Date.now() - item.timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch {
      return null;
    }
  },

  /**
   * Cache inboxes list
   */
  async cacheInboxes(inboxes: Inbox[]): Promise<void> {
    await this.set(CACHE_KEYS.INBOXES, inboxes);
  },

  /**
   * Get cached inboxes
   */
  async getInboxes(): Promise<Inbox[] | null> {
    return this.get<Inbox[]>(CACHE_KEYS.INBOXES);
  },

  /**
   * Cache messages for an inbox
   */
  async cacheMessages(inboxId: string, messages: Message[]): Promise<void> {
    await this.set(CACHE_KEYS.MESSAGES(inboxId), messages);
  },

  /**
   * Get cached messages for an inbox
   */
  async getMessages(inboxId: string): Promise<Message[] | null> {
    return this.get<Message[]>(CACHE_KEYS.MESSAGES(inboxId));
  },

  /**
   * Cache a single message
   */
  async cacheMessage(message: Message): Promise<void> {
    await this.set(CACHE_KEYS.MESSAGE(message.id), message);
  },

  /**
   * Get cached message
   */
  async getMessage(id: string): Promise<Message | null> {
    return this.get<Message>(CACHE_KEYS.MESSAGE(id));
  },

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  },

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<number | null> {
    const stored = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return stored ? parseInt(stored, 10) : null;
  },

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  },
};
