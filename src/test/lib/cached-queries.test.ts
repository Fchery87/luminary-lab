import { describe, it, expect, beforeEach } from "vitest";
import {
  invalidateUserCache,
  invalidatePresetsCache,
} from "@/lib/cached-queries";
import * as cache from "@/lib/cache";

describe("cached-queries", () => {
  beforeEach(async () => {
    await cache.clearCache();
  });

  it("should support user cache invalidation", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    // Simulate caching user data with tag
    await cache.setCached(
      `user:${userId}:subscription`,
      { id: "sub123", status: "active" },
      { tags: [userId, "subscription"] },
    );

    // Verify cached
    const cached = await cache.getCached(`user:${userId}:subscription`);
    expect(cached).not.toBeNull();

    // Invalidate
    await invalidateUserCache(userId);

    // Verify cache is cleared
    const afterInvalidate = await cache.getCached(
      `user:${userId}:subscription`,
    );
    expect(afterInvalidate).toBeNull();
  });

  it("should invalidate presets cache", async () => {
    // Simulate caching presets
    await cache.setCached(
      "system:presets:all",
      [{ id: "preset1", name: "Portrait" }],
      { tags: ["presets"] },
    );

    // Verify cached
    const cached = await cache.getCached("system:presets:all");
    expect(cached).not.toBeNull();

    // Invalidate
    await invalidatePresetsCache();

    // Verify cleared
    const afterInvalidate = await cache.getCached("system:presets:all");
    expect(afterInvalidate).toBeNull();
  });

  it("should handle multiple user cache entries", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440001";

    // Cache multiple entries with same user tag
    await cache.setCached(
      `user:${userId}:subscription`,
      { id: "sub123" },
      { tags: [userId] },
    );

    await cache.setCached(
      `user:${userId}:preferences`,
      { theme: "dark" },
      { tags: [userId] },
    );

    // Verify both cached
    expect(await cache.getCached(`user:${userId}:subscription`)).not.toBeNull();
    expect(await cache.getCached(`user:${userId}:preferences`)).not.toBeNull();

    // Invalidate all
    await invalidateUserCache(userId);

    // Verify both cleared
    expect(await cache.getCached(`user:${userId}:subscription`)).toBeNull();
    expect(await cache.getCached(`user:${userId}:preferences`)).toBeNull();
  });
});
