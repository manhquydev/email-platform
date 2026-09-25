import Redis from 'ioredis';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
  compress?: boolean; // Compress large values
  memoryOnly?: boolean; // Store only in memory cache
}

interface CacheEntry<T> {
  data: T;
  expires: number;
  tags: string[];
  compressed: boolean;
  size: number;
}

/**
 * High-performance caching service with Redis + in-memory L1 cache
 * Implements multi-level caching for optimal performance
 */
export class CacheService {
  private redis: Redis;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MEMORY_CACHE_SIZE = 1000;
  private readonly MEMORY_CACHE_TTL = 60000; // 1 minute
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Connection pooling
      family: 4,
      keepAlive: true,
      // Memory optimization
      keyPrefix: 'tempmail:',
      // Serialization
      enableReadyCheck: false,
      maxLoadingTimeout: 0,
    });

    // Cleanup memory cache periodically
    setInterval(() => this.cleanupMemoryCache(), 30000);

    // Error handling
    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });
  }

  /**
   * Generate cache key with optional namespace
   */
  private generateKey(key: string, namespace?: string): string {
    if (namespace) {
      return `${namespace}:${key}`;
    }
    return key;
  }

  /**
   * Get value from cache (L1 memory first, then Redis)
   */
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.generateKey(key, namespace);

    // Check L1 cache first
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && memoryEntry.expires > Date.now()) {
      return memoryEntry.data;
    }

    // Remove expired memory entry
    if (memoryEntry) {
      this.memoryCache.delete(fullKey);
    }

    try {
      // Check Redis (L2 cache)
      const redisValue = await this.redis.getBuffer(fullKey);
      if (!redisValue) {
        return null;
      }

      // Deserialize
      let entry: CacheEntry<T>;
      try {
        entry = JSON.parse(redisValue.toString());
      } catch {
        // Legacy format fallback
        return JSON.parse(redisValue.toString());
      }

      // Decompress if needed
      if (entry.compressed) {
        entry.data = JSON.parse(
          (await gunzipAsync(Buffer.from(entry.data as string))).toString()
        );
      }

      // Store in L1 cache
      this.setInMemoryCache(fullKey, entry);

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.generateKey(key, options.namespace);
    const ttl = options.ttl || 3600; // Default 1 hour
    const now = Date.now();

    // Prepare cache entry
    let data = value;
    let compressed = false;
    let size = JSON.stringify(value).length;

    // Compress large values
    if (options.compress !== false && size > this.COMPRESSION_THRESHOLD) {
      data = (await gzipAsync(JSON.stringify(value))).toString('base64');
      compressed = true;
      size = (data as string).length;
    }

    const entry: CacheEntry<T> = {
      data: value,
      expires: now + ttl * 1000,
      tags: options.tags || [],
      compressed,
      size,
    };

    // Store in L1 cache
    if (!options.memoryOnly) {
      this.setInMemoryCache(fullKey, entry);
    }

    // Store in Redis if not memory-only
    if (!options.memoryOnly) {
      try {
        const serialized = JSON.stringify({
          data,
          expires: entry.expires,
          tags: entry.tags,
          compressed,
          size,
        });

        await this.redis.setex(fullKey, ttl, serialized);

        // Add to tag indexes for invalidation
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, fullKey);
            await this.redis.expire(`tag:${tag}`, ttl);
          }
        }
      } catch (error) {
        console.error('Cache set error:', error);
        // Fallback to memory-only
        this.setInMemoryCache(fullKey, entry);
      }
    }
  }

  /**
   * Store in L1 memory cache with LRU eviction
   */
  private setInMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    // Evict if over limit
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, entry);
  }

  /**
   * Delete from cache
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.generateKey(key, namespace);

    // Remove from L1 cache
    this.memoryCache.delete(fullKey);

    // Remove from Redis
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);

      if (keys.length > 0) {
        // Remove from memory cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }

        // Remove from Redis
        await this.redis.del(...keys, `tag:${tag}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(namespace?: string): Promise<void> {
    const pattern = namespace ? `${namespace}:*` : '*';

    // Clear memory cache
    if (namespace) {
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
    }

    // Clear Redis
    try {
      const keys = await this.redis.keys(this.generateKey(pattern, namespace));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.generateKey(key, namespace));

    // Check memory cache first
    const results: (T | null)[] = [];
    const redisKeys: string[] = [];
    const keyMap = new Map<string, number>();

    fullKeys.forEach((fullKey, index) => {
      const memoryEntry = this.memoryCache.get(fullKey);
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        results[index] = memoryEntry.data;
      } else {
        results[index] = null;
        redisKeys.push(fullKey);
        keyMap.set(fullKey, index);
      }
    });

    // Get remaining from Redis
    if (redisKeys.length > 0) {
      try {
        const redisValues = await this.redis.mget(...redisKeys);

        for (let i = 0; i < redisKeys.length; i++) {
          const fullKey = redisKeys[i];
          const value = redisValues[i];
          const index = keyMap.get(fullKey)!;

          if (value) {
            try {
              let entry: CacheEntry<T> = JSON.parse(value);

              if (entry.compressed) {
                entry.data = JSON.parse(
                  (await gunzipAsync(Buffer.from(entry.data as string))).toString()
                );
              }

              results[index] = entry.data;
              this.setInMemoryCache(fullKey, entry);
            } catch {
              // Legacy format
              results[index] = JSON.parse(value);
            }
          }
        }
      } catch (error) {
        console.error('Cache mget error:', error);
      }
    }

    return results;
  }

  /**
   * Set multiple values
   */
  async mset<T = any>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>,
    namespace?: string
  ): Promise<void> {
    const promises = entries.map(entry =>
      this.set(entry.key, entry.value, { ...entry.options, namespace })
    );

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    memoryLimit: number;
    redisConnected: boolean;
    hitRate?: number;
  }> {
    return {
      memorySize: this.memoryCache.size,
      memoryLimit: this.MEMORY_CACHE_SIZE,
      redisConnected: this.redis.status === 'ready',
    };
  }

  /**
   * Cleanup expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Close connections
   */
  async disconnect(): Promise<void> {
    this.memoryCache.clear();
    await this.redis.quit();
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;

// Export class for testing
export { CacheService, CacheOptions, CacheEntry };