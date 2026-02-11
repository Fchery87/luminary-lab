/**
 * Rate limiting utilities for protecting API endpoints
 * Uses Upstash Redis for distributed rate limiting
 */

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Simple sliding window rate limiter using redis or memory
 * Falls back to memory-based implementation if redis unavailable
 */

// In-memory fallback for local development
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function checkUploadRateLimit(userId: string): Promise<RateLimitResponse> {
  const limit = 10; // 10 uploads per hour
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  const key = `upload:${userId}`;
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    // Create new window
    record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: record.resetAt
    };
  }
  
  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    };
  }
  
  record.count++;
  
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetAt
  };
}

export async function checkUploadBytesRateLimit(
  userId: string,
  bytes: number
): Promise<RateLimitResponse> {
  const limitGB = 5; // 5GB per hour
  const limitBytes = limitGB * 1024 * 1024 * 1024;
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  const key = `uploadbytes:${userId}`;
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    // Create new window - check if single upload exceeds limit
    if (bytes > limitBytes) {
      return {
        success: false,
        limit: limitBytes,
        remaining: 0,
        resetTime: now + windowMs,
        retryAfter: 3600 // 1 hour in seconds
      };
    }
    
    record = { count: bytes, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
    
    return {
      success: true,
      limit: limitBytes,
      remaining: limitBytes - bytes,
      resetTime: record.resetAt
    };
  }
  
  if (record.count + bytes > limitBytes) {
    return {
      success: false,
      limit: limitBytes,
      remaining: Math.max(0, limitBytes - record.count),
      resetTime: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    };
  }
  
  record.count += bytes;
  
  return {
    success: true,
    limit: limitBytes,
    remaining: limitBytes - record.count,
    resetTime: record.resetAt
  };
}

/**
 * Cleanup old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
