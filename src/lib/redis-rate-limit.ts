/**
 * Redis-based distributed rate limiting
 * Provides consistent rate limiting across multiple server instances
 */

import { Redis } from "ioredis";
import { RateLimitResponse } from "./rate-limit";

let redisSingleton: Redis | null = null;

function getRedis(): Redis {
  if (redisSingleton) return redisSingleton;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set in environment variables");
  }

  redisSingleton = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 3000,
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000);
    },
  });

  redisSingleton.on("error", (error) => {
    console.error("[Redis Rate Limit] Connection error:", error.message);
  });

  return redisSingleton;
}

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Check rate limit using Redis sliding window algorithm
 * Uses sorted sets to track request timestamps
 */
export async function checkRedisRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResponse> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const key = `ratelimit:${identifier}`;

  const multi = redis.multi();

  // Remove entries outside the window
  multi.zremrangebyscore(key, 0, windowStart);

  // Add current request
  multi.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);

  // Count entries in window
  multi.zcard(key);

  // Set expiry on the key
  multi.pexpire(key, windowSeconds * 1000);

  const results = await multi.exec();

  if (!results) {
    throw new Error("Redis transaction failed");
  }

  const currentCount = results[2][1] as number;
  const allowed = currentCount <= limit;
  const resetTime = now + windowSeconds * 1000;

  return {
    success: allowed,
    limit,
    remaining: Math.max(0, limit - currentCount),
    resetTime,
    retryAfter: allowed
      ? undefined
      : Math.ceil((resetTime - now) / 1000),
  };
}

/**
 * Check upload rate limit (10 uploads per hour)
 */
export async function checkUploadRateLimitRedis(
  userId: string,
): Promise<RateLimitResponse> {
  return checkRedisRateLimit(`upload:${userId}`, 10, 3600);
}

/**
 * Check upload bytes rate limit (5GB per hour)
 */
export async function checkUploadBytesRateLimitRedis(
  userId: string,
  bytes: number,
): Promise<RateLimitResponse> {
  const limitGB = 5;
  const limitBytes = limitGB * 1024 * 1024 * 1024;
  const windowSeconds = 3600;

  const redis = getRedis();
  const now = Date.now();
  const key = `uploadbytes:${userId}`;

  // Get current usage
  const currentBytes = parseInt((await redis.get(key)) || "0", 10);
  const ttl = await redis.ttl(key);

  // If key doesn't exist or expired, start fresh
  if (ttl < 0) {
    if (bytes > limitBytes) {
      return {
        success: false,
        limit: limitBytes,
        remaining: 0,
        resetTime: now + windowSeconds * 1000,
        retryAfter: windowSeconds,
      };
    }

    await redis.setex(key, windowSeconds, bytes.toString());

    return {
      success: true,
      limit: limitBytes,
      remaining: limitBytes - bytes,
      resetTime: now + windowSeconds * 1000,
    };
  }

  // Check if adding bytes exceeds limit
  if (currentBytes + bytes > limitBytes) {
    return {
      success: false,
      limit: limitBytes,
      remaining: Math.max(0, limitBytes - currentBytes),
      resetTime: now + ttl * 1000,
      retryAfter: ttl,
    };
  }

  // Increment bytes
  await redis.incrby(key, bytes);

  return {
    success: true,
    limit: limitBytes,
    remaining: limitBytes - (currentBytes + bytes),
    resetTime: now + ttl * 1000,
  };
}

/**
 * Check general API rate limit (100 requests per minute per user)
 */
export async function checkApiRateLimit(
  userId: string,
): Promise<RateLimitResponse> {
  return checkRedisRateLimit(`api:${userId}`, 100, 60);
}

/**
 * Check auth endpoint rate limit (5 requests per minute per IP)
 */
export async function checkAuthRateLimit(
  ipAddress: string,
): Promise<RateLimitResponse> {
  return checkRedisRateLimit(`auth:${ipAddress}`, 5, 60);
}
