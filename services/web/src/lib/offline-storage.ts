/**
 * IndexedDB offline storage for email caching
 * Uses 'idb' library for Promise-based IndexedDB access
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CachedEmail {
  id: string;
  inboxId: string;
  subject: string | null;
  from: string | null;
  fromName: string | null;
  body: string | null;
  textBody: string | null;
  receivedAt: string;
  read: boolean;
  starred: boolean;
  timestamp: number; // Cache timestamp for cleanup
  synced: boolean;
}

interface OutboundEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  inboxId: string;
  createdAt: number;
  synced: boolean;
}

interface EphemeraDB extends DBSchema {
  emails: {
    key: string;
    value: CachedEmail;
    indexes: {
      'by-inbox': string;
      'by-timestamp': number;
    };
  };
  outbound: {
    key: string;
    value: OutboundEmail;
    indexes: {
      'by-synced': number; // 0 = not synced, 1 = synced
    };
  };
}

const DB_NAME = 'ephemera-offline';
const DB_VERSION = 1;
const MAX_EMAILS = 100;
const MAX_AGE_DAYS = 30;
const QUOTA_THRESHOLD = 0.8; // 80%

let dbInstance: IDBPDatabase<EphemeraDB> | null = null;

async function getDB(): Promise<IDBPDatabase<EphemeraDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EphemeraDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Emails store
      if (!db.objectStoreNames.contains('emails')) {
        const emailStore = db.createObjectStore('emails', { keyPath: 'id' });
        emailStore.createIndex('by-inbox', 'inboxId');
        emailStore.createIndex('by-timestamp', 'timestamp');
      }
      // Outbound queue store
      if (!db.objectStoreNames.contains('outbound')) {
        const outboundStore = db.createObjectStore('outbound', { keyPath: 'id' });
        outboundStore.createIndex('by-synced', 'synced');
      }
    },
  });

  return dbInstance;
}

/**
 * Cache an email for offline access
 */
export async function cacheEmail(email: Omit<CachedEmail, 'timestamp' | 'synced'>): Promise<void> {
  try {
    const db = await getDB();
    await db.put('emails', {
      ...email,
      timestamp: Date.now(),
      synced: true,
    });
    // Run cleanup after caching
    await cleanupIfNeeded();
  } catch (err) {
    console.error('[OfflineStorage] Failed to cache email:', err);
  }
}

/**
 * Cache multiple emails at once
 */
export async function cacheEmails(emails: Omit<CachedEmail, 'timestamp' | 'synced'>[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('emails', 'readwrite');
    const timestamp = Date.now();

    await Promise.all([
      ...emails.map(email => tx.store.put({ ...email, timestamp, synced: true })),
      tx.done,
    ]);

    await cleanupIfNeeded();
  } catch (err) {
    console.error('[OfflineStorage] Failed to cache emails:', err);
  }
}

/**
 * Get cached emails for an inbox
 */
export async function getCachedEmails(inboxId: string): Promise<CachedEmail[]> {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('emails', 'by-inbox', inboxId);
  } catch (err) {
    console.error('[OfflineStorage] Failed to get cached emails:', err);
    return [];
  }
}

/**
 * Get all cached emails
 */
export async function getAllCachedEmails(): Promise<CachedEmail[]> {
  try {
    const db = await getDB();
    return await db.getAll('emails');
  } catch (err) {
    console.error('[OfflineStorage] Failed to get all cached emails:', err);
    return [];
  }
}

/**
 * Get a single cached email by ID
 */
export async function getCachedEmail(id: string): Promise<CachedEmail | undefined> {
  try {
    const db = await getDB();
    return await db.get('emails', id);
  } catch (err) {
    console.error('[OfflineStorage] Failed to get cached email:', err);
    return undefined;
  }
}

/**
 * Queue an outbound email for sending when online
 */
export async function queueOutboundEmail(email: Omit<OutboundEmail, 'createdAt' | 'synced'>): Promise<void> {
  try {
    const db = await getDB();
    await db.put('outbound', {
      ...email,
      createdAt: Date.now(),
      synced: false,
    });
  } catch (err) {
    console.error('[OfflineStorage] Failed to queue outbound email:', err);
  }
}

/**
 * Get all pending outbound emails
 */
export async function getPendingOutboundEmails(): Promise<OutboundEmail[]> {
  try {
    const db = await getDB();
    const index = db.transaction('outbound').store.index('by-synced');
    return await index.getAll(IDBKeyRange.only(0));
  } catch (err) {
    console.error('[OfflineStorage] Failed to get pending outbound:', err);
    return [];
  }
}

/**
 * Mark outbound email as synced
 */
export async function markOutboundSynced(id: string): Promise<void> {
  try {
    const db = await getDB();
    const email = await db.get('outbound', id);
    if (email) {
      await db.put('outbound', { ...email, synced: true });
    }
  } catch (err) {
    console.error('[OfflineStorage] Failed to mark outbound synced:', err);
  }
}

/**
 * Delete synced outbound emails
 */
export async function clearSyncedOutbound(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('outbound', 'readwrite');
    const index = tx.store.index('by-synced');
    let cursor = await index.openCursor(IDBKeyRange.only(1));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  } catch (err) {
    console.error('[OfflineStorage] Failed to clear synced outbound:', err);
  }
}

/**
 * Cleanup old emails when quota is high or count exceeds limit
 */
async function cleanupIfNeeded(): Promise<void> {
  try {
    const db = await getDB();
    const count = await db.count('emails');

    // Check storage quota
    let quotaExceeded = false;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage && estimate.quota) {
        quotaExceeded = estimate.usage / estimate.quota > QUOTA_THRESHOLD;
      }
    }

    // Cleanup if needed
    if (count > MAX_EMAILS || quotaExceeded) {
      const maxAge = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
      const tx = db.transaction('emails', 'readwrite');
      const index = tx.store.index('by-timestamp');

      let cursor = await index.openCursor();
      let deleted = 0;
      const targetDelete = Math.max(count - MAX_EMAILS, quotaExceeded ? 20 : 0);

      while (cursor && deleted < targetDelete) {
        if (cursor.value.timestamp < maxAge || deleted < targetDelete) {
          await cursor.delete();
          deleted++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`[OfflineStorage] Cleaned up ${deleted} old emails`);
    }
  } catch (err) {
    console.error('[OfflineStorage] Cleanup failed:', err);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('emails');
    await db.clear('outbound');
    console.log('[OfflineStorage] Cache cleared');
  } catch (err) {
    console.error('[OfflineStorage] Failed to clear cache:', err);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ emailCount: number; outboundCount: number; estimatedSize: string }> {
  try {
    const db = await getDB();
    const emailCount = await db.count('emails');
    const outboundCount = await db.count('outbound');

    let estimatedSize = 'Unknown';
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) {
        estimatedSize = `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`;
      }
    }

    return { emailCount, outboundCount, estimatedSize };
  } catch (err) {
    console.error('[OfflineStorage] Failed to get stats:', err);
    return { emailCount: 0, outboundCount: 0, estimatedSize: 'Error' };
  }
}
