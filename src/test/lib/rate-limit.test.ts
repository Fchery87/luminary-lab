import {
  checkUploadRateLimit,
  checkUploadBytesRateLimit,
} from "@/lib/rate-limit";
import { describe, it, expect, beforeEach } from "vitest";

describe("rate-limit", () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    // We'll need to add this capability to the module if needed
  });

  describe("checkUploadRateLimit", () => {
    it("should allow first upload", async () => {
      const userId = "test-user-" + Date.now() + Math.random();
      const result = await checkUploadRateLimit(userId);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it("should track uploads and decrement remaining", async () => {
      const userId = "test-user-track-" + Date.now();

      const result1 = await checkUploadRateLimit(userId);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(9);

      const result2 = await checkUploadRateLimit(userId);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(8);
    });

    it("should return metadata", async () => {
      const userId = "test-user-meta-" + Date.now();
      const result = await checkUploadRateLimit(userId);

      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("resetTime");
      expect(result).toHaveProperty("success");
    });

    it("should enforce limit", async () => {
      const userId = "test-user-limit-" + Date.now();

      // Hit limit
      for (let i = 0; i < 10; i++) {
        await checkUploadRateLimit(userId);
      }

      // Next should fail
      const result = await checkUploadRateLimit(userId);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("checkUploadBytesRateLimit", () => {
    it("should allow upload within limit", async () => {
      const userId = "test-user-bytes-" + Date.now();
      const result = await checkUploadBytesRateLimit(userId, 100 * 1024 * 1024); // 100MB

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5 * 1024 * 1024 * 1024); // 5GB
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should reject upload exceeding limit", async () => {
      const userId = "test-user-bytes-exceed-" + Date.now();
      const sixGb = 6 * 1024 * 1024 * 1024;

      const result = await checkUploadBytesRateLimit(userId, sixGb);
      expect(result.success).toBe(false);
    });

    it("should track cumulative bytes", async () => {
      const userId = "test-user-bytes-cumul-" + Date.now();
      const size1 = 1024 * 1024 * 1024; // 1GB
      const size2 = 2 * 1024 * 1024 * 1024; // 2GB

      const result1 = await checkUploadBytesRateLimit(userId, size1);
      expect(result1.success).toBe(true);
      const remaining1 = result1.remaining;

      const result2 = await checkUploadBytesRateLimit(userId, size2);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(remaining1 - size2);
    });
  });
});
