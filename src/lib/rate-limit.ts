/**
 * Rate limiting utilities for protecting API endpoints
 * Uses Redis for distributed rate limiting in production
 * Falls back to memory-based implementation if Redis unavailable
 */

import {
  checkRedisRateLimit,
  checkUploadRateLimitRedis,
  checkUploadBytesRateLimitRedis,
  checkApiRateLimit as checkApiRateLimitRedis,
  checkAuthRateLimit as checkAuthRateLimitRedis,
} from "./redis-rate-limit";

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory fallback for local development
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResponse {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);

    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: record.resetAt,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetAt,
  };
}

function getMemoryBytesRateLimit(
  key: string,
  bytes: number,
  limitBytes: number,
  windowMs: number,
): RateLimitResponse {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    if (bytes > limitBytes) {
      return {
        success: false,
        limit: limitBytes,
        remaining: 0,
        resetTime: now + windowMs,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    record = { count: bytes, resetAt: now + windowMs };
    rateLimitStore.set(key, record);

    return {
      success: true,
      limit: limitBytes,
      remaining: limitBytes - bytes,
      resetTime: record.resetAt,
    };
  }

  if (record.count + bytes > limitBytes) {
    return {
      success: false,
      limit: limitBytes,
      remaining: Math.max(0, limitBytes - record.count),
      resetTime: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += bytes;

  return {
    success: true,
    limit: limitBytes,
    remaining: limitBytes - record.count,
    resetTime: record.resetAt,
  };
}

/**
 * Check if Redis is available for rate limiting
 */
function shouldUseRedis(): boolean {
  return !!process.env.REDIS_URL && process.env.NODE_ENV === "production";
}

/**
 * Check upload rate limit (10 uploads per hour)
 */
export async function checkUploadRateLimit(
  userId: string,
): Promise<RateLimitResponse> {
  if (shouldUseRedis()) {
    try {
      return await checkUploadRateLimitRedis(userId);
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
    }
  }
  return getMemoryRateLimit(`upload:${userId}`, 10, 60 * 60 * 1000);
}

/**
 * Check upload bytes rate limit (5GB per hour)
 */
export async function checkUploadBytesRateLimit(
  userId: string,
  bytes: number,
): Promise<RateLimitResponse> {
  if (shouldUseRedis()) {
    try {
      return await checkUploadBytesRateLimitRedis(userId, bytes);
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
    }
  }
  const limitGB = 5;
  const limitBytes = limitGB * 1024 * 1024 * 1024;
  return getMemoryBytesRateLimit(
    `uploadbytes:${userId}`,
    bytes,
    limitBytes,
    60 * 60 * 1000,
  );
}

/**
 * Check general API rate limit (100 requests per minute per user)
 */
export async function checkApiRateLimit(
  userId: string,
): Promise<RateLimitResponse> {
  if (shouldUseRedis()) {
    try {
      return await checkApiRateLimitRedis(userId);
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
    }
  }
  return getMemoryRateLimit(`api:${userId}`, 100, 60 * 1000);
}

/**
 * Check auth endpoint rate limit (5 requests per minute per IP)
 */
export async function checkAuthRateLimit(
  ipAddress: string,
): Promise<RateLimitResponse> {
  if (shouldUseRedis()) {
    try {
      return await checkAuthRateLimitRedis(ipAddress);
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
    }
  }
  return getMemoryRateLimit(`auth:${ipAddress}`, 5, 60 * 1000);
}

/**
 * Generic rate limit check with configurable parameters
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResponse> {
  if (shouldUseRedis()) {
    try {
      return await checkRedisRateLimit(identifier, limit, windowSeconds);
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
    }
  }
  return getMemoryRateLimit(identifier, limit, windowSeconds * 1000);
}

/**
 * Cleanup old rate limit entries (call periodically)
 * Only needed for memory-based rate limiting
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes in development
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

// Re-export from redis-rate-limit for direct access
export {
  checkRedisRateLimit,
  checkUploadRateLimitRedis,
  checkUploadBytesRateLimitRedis,
} from "./redis-rate-limit";
