import cacheService from '../services/cache-service';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  key?: string;
  namespace?: string;
  useUserContext?: boolean;
  invalidateOn?: string[];
}

/**
 * Decorator for caching query results
 * Automatically caches method results and invalidates based on configuration
 */
export function QueryCache(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const cacheKey = generateCacheKey(
        target.constructor.name,
        propertyName,
        args,
        options
      );

      // Check cache first
      if (options.useUserContext && this.user?.id) {
        options.namespace = `user:${this.user.id}`;
      }

      const cached = await cacheService.get(cacheKey, options.namespace);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheService.set(cacheKey, result, {
        ttl: options.ttl || 300, // 5 minutes default
        tags: options.tags,
        namespace: options.namespace,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator for invalidating cache on mutation
 */
export function CacheInvalidate(tags: string[], namespace?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute original method first
      const result = await originalMethod.apply(this, args);

      // Invalidate cache tags
      for (const tag of tags) {
        await cacheService.invalidateTag(tag);
      }

      // Also invalidate namespace if provided
      if (namespace && this.user?.id) {
        await cacheService.clear(`${namespace}:${this.user.id}`);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Generate cache key based on method and arguments
 */
function generateCacheKey(
  className: string,
  methodName: string,
  args: any[],
  options: CacheOptions
): string {
  if (options.key) {
    return options.key;
  }

  // Create a deterministic key from arguments
  const argsHash = createHash(JSON.stringify(args));
  return `${className}:${methodName}:${argsHash}`;
}

/**
 * Create simple hash for cache keys
 */
function createHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Export utility functions for manual cache management
export const CacheUtils = {
  /**
   * Invalidate all user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await cacheService.clear(`user:${userId}`);
  },

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<void> {
    await cacheService.invalidateTag(tag);
  },

  /**
   * Warm cache with common queries
   */
  async warmCache<T>(
    queries: Array<{ key: string; query: () => Promise<T>; options?: CacheOptions }>
  ): Promise<void> {
    const promises = queries.map(async ({ key, query, options }) => {
      try {
        const result = await query();
        await cacheService.set(key, result, {
          ttl: options?.ttl || 3600,
          tags: options?.tags,
          namespace: options?.namespace,
        });
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error);
      }
    });

    await Promise.all(promises);
  },

  /**
   * Get cache statistics
   */
  async getStats() {
    return cacheService.getStats();
  },
};