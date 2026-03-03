import { withRetry } from "@/lib/retry-strategy";
import { describe, it, expect, vi } from "vitest";

describe("retry-strategy", () => {
  it("should succeed on first attempt", async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      return "success";
    };

    const result = await withRetry(operation, 3);
    expect(result).toBe("success");
    expect(attempts).toBe(1);
  });

  it("should retry operation until it succeeds", async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) throw new Error("Failed attempt " + attempts);
      return "success";
    };

    const result = await withRetry(operation, 5);
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("should throw after max retries exceeded", async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error("Persistent failure");
    };

    await expect(withRetry(operation, 2)).rejects.toThrow("Persistent failure");
    expect(attempts).toBe(2);
  });

  it("should call onRetry callback on failure", async () => {
    const onRetry = vi.fn();
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) throw new Error("Failed");
      return "success";
    };

    await withRetry(operation, 3, 100, onRetry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it("should use default max retries of 3", async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error("Fail");
    };

    await expect(withRetry(operation)).rejects.toThrow();
    expect(attempts).toBe(3);
  });

  it("should implement exponential backoff delays", async () => {
    const delays: number[] = [];
    let attempts = 0;
    const startTime = Date.now();

    const operation = async () => {
      const now = Date.now();
      if (attempts > 0) {
        delays.push(now - startTime);
      }
      attempts++;
      if (attempts < 3) throw new Error("Fail");
      return "success";
    };

    await withRetry(operation, 3, 50);

    // First delay should be ~50ms, second should be ~100ms (with jitter)
    expect(delays[0]).toBeGreaterThanOrEqual(40); // Allow margin for jitter
    expect(delays[1]).toBeGreaterThanOrEqual(80);
  });
});
