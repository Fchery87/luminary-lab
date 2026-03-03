import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { setClientCacheHeaders } from "@/lib/response-cache";
import * as cache from "@/lib/cache";

describe("response-cache", () => {
  beforeEach(async () => {
    await cache.clearCache();
  });

  it("should set public cache headers", () => {
    const response = new NextResponse();
    const cached = setClientCacheHeaders(response, 3600, true);

    expect(cached.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, immutable",
    );
  });

  it("should set private cache headers when not public", () => {
    const response = new NextResponse();
    const cached = setClientCacheHeaders(response, 1800, false);

    expect(cached.headers.get("Cache-Control")).toBe("private, max-age=1800");
  });

  it("should handle custom TTL values", () => {
    const response = new NextResponse();
    const cached = setClientCacheHeaders(response, 7200, true);

    expect(cached.headers.get("Cache-Control")).toContain("max-age=7200");
  });

  it("should preserve other headers when setting cache headers", () => {
    const response = new NextResponse("test");
    response.headers.set("X-Custom", "value");

    const cached = setClientCacheHeaders(response, 3600, true);

    expect(cached.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(cached.headers.get("X-Custom")).toBe("value");
  });
});
