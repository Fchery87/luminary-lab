/**
 * Caching layer with Redis support and memory fallback
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation groups
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

// In-memory cache for local development / fallback
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Get value from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const entry = memoryCache.get(key);
  
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Set value in cache
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 3600, tags = [] } = options;
  
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + (ttl * 1000),
    tags
  });
}

/**
 * Delete value from cache
 */
export async function delCached(key: string): Promise<void> {
  memoryCache.delete(key);
}

/**
 * Invalidate all cache entries with given tag
 */
export async function invalidateTag(tag: string): Promise<void> {
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.tags.includes(tag)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => memoryCache.delete(key));
}

/**
 * Clear all cache entries
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
}

/**
 * Get or set pattern - fetch value or compute if missing
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  await setCached(key, value, options);
  return value;
}

/**
 * Cleanup expired cache entries
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
