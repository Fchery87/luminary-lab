/**
 * HTTP response caching middleware for API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached } from "./cache";

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key?: string; // Custom cache key (default: method + URL)
  varyBy?: string[]; // Headers to vary cache by (user-id, etc)
}

/**
 * Generate cache key from request
 */
function generateCacheKey(
  request: NextRequest,
  customKey?: string,
  varyBy: string[] = [],
): string {
  if (customKey) {
    return customKey;
  }

  const url = request.nextUrl.pathname + request.nextUrl.search;
  const method = request.method;

  let key = `${method}:${url}`;

  // Add vary headers to key
  for (const header of varyBy) {
    const value = request.headers.get(header);
    if (value) {
      key += `:${header}=${value}`;
    }
  }

  return key;
}

/**
 * Middleware to cache successful responses
 */
export async function cacheResponse(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  config: CacheConfig,
): Promise<NextResponse> {
  const cacheKey = generateCacheKey(request, config.key, config.varyBy);

  // Try to get from cache
  const cached = await getCached<{
    body: string;
    headers: Record<string, string>;
  }>(cacheKey);
  if (cached) {
    return new NextResponse(cached.body, {
      headers: cached.headers,
    });
  }

  // Call handler
  const response = await handler();

  // Only cache successful responses
  if (response.status === 200 && request.method === "GET") {
    const body = await response.text();
    const headers: Record<string, string> = {};

    // Copy relevant headers
    response.headers.forEach((value, key) => {
      if (["content-type", "content-length"].includes(key)) {
        headers[key] = value;
      }
    });

    await setCached(cacheKey, { body, headers }, { ttl: config.ttl });
  }

  return response;
}

/**
 * Set cache headers on response
 */
export function setClientCacheHeaders(
  response: NextResponse,
  ttl: number = 3600,
  isPublic: boolean = true,
): NextResponse {
  const cacheControl = isPublic
    ? `public, max-age=${ttl}, immutable`
    : `private, max-age=${ttl}`;

  response.headers.set("Cache-Control", cacheControl);
  return response;
}
