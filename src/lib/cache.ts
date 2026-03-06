/**
 * Caching layer with Redis support and memory fallback
 */

import IORedis from "ioredis";
import { db, images } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateDownloadUrl } from "./s3";

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

const memoryCache = new Map<string, CacheEntry<any>>();
let redis: IORedis | null = null;
let useRedis = false;

// Only initialize Redis if not in test environment
if (process.env.REDIS_URL && process.env.NODE_ENV !== "test") {
  try {
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });
    
    // Add error handler to prevent unhandled errors
    redis.on("error", (err) => {
      console.warn("[Cache] Redis error:", err.message);
      useRedis = false;
    });
    
    useRedis = true;
    console.log("[Cache] Redis backend enabled");
  } catch (error) {
    console.warn("[Cache] Redis initialization failed, using memory only");
  }
}

const REDIS_PREFIX = "luminary:cache:";

async function getFromRedis<T>(key: string): Promise<T | null> {
  if (!useRedis || !redis) return null;
  try {
    const result = await redis.get(`${REDIS_PREFIX}${key}`);
    return result ? JSON.parse(result) : null;
  } catch {
    return null;
  }
}

async function setToRedis<T>(key: string, value: T, ttl: number): Promise<void> {
  if (!useRedis || !redis) return;
  try {
    await redis.setex(`${REDIS_PREFIX}${key}`, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("[Cache] Redis set error:", error);
  }
}

async function deleteFromRedis(key: string): Promise<void> {
  if (!useRedis || !redis) return;
  try {
    await redis.del(`${REDIS_PREFIX}${key}`);
  } catch (error) {
    console.error("[Cache] Redis delete error:", error);
  }
}

/**
 * Get value from cache (multi-tier: memory -> redis)
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const memEntry = memoryCache.get(key);
  if (memEntry && memEntry.expiresAt > Date.now()) {
    return memEntry.value as T;
  }

  const redisValue = await getFromRedis<T>(key);
  if (redisValue !== null) {
    memoryCache.set(key, { value: redisValue, expiresAt: Date.now() + 3600000, tags: [] });
    return redisValue;
  }

  return null;
}

/**
 * Set value in cache (multi-tier: memory + redis)
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> {
  const { ttl = 3600, tags = [] } = options;

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
    tags,
  });

  await setToRedis(key, value, ttl);
}

/**
 * Delete value from cache
 */
export async function delCached(key: string): Promise<void> {
  memoryCache.delete(key);
  await deleteFromRedis(key);
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

  keysToDelete.forEach((key) => memoryCache.delete(key));
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
  options: CacheOptions = {},
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
if (typeof window === "undefined") {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}

// ===========================================
// Preview Image Caching
// ===========================================

const PREVIEW_CACHE_TTL = 900; // 15 minutes

/**
 * Get cached preview URL for a project
 */
export async function getCachedPreview(projectId: string): Promise<string | null> {
  const key = `preview:${projectId}`;
  return getCached<string>(key);
}

/**
 * Cache preview URL for a project
 */
export async function setCachedPreview(projectId: string, url: string): Promise<void> {
  const key = `preview:${projectId}`;
  await setCached(key, url, { ttl: PREVIEW_CACHE_TTL, tags: ["preview", projectId] });
}

/**
 * Get or fetch preview URL with caching
 */
export async function getOrFetchPreview(projectId: string): Promise<string | null> {
  // Check cache first
  const cached = await getCachedPreview(projectId);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const [preview] = await db
    .select()
    .from(images)
    .where(
      and(
        eq(images.projectId, projectId),
        eq(images.isPreview, true)
      )
    );

  if (preview) {
    const url = await generateDownloadUrl(preview.storageKey, 3600);
    await setCachedPreview(projectId, url);
    return url;
  }

  return null;
}

/**
 * Invalidate preview cache for a project
 */
export async function invalidatePreviewCache(projectId: string): Promise<void> {
  const key = `preview:${projectId}`;
  await delCached(key);
  await invalidateTag(projectId);
}
