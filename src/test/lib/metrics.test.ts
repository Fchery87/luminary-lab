import { describe, it, expect, beforeEach } from "vitest";
import { metricsCollector, measureAsync, measureSync } from "@/lib/metrics";

describe("metrics", () => {
  beforeEach(() => {
    metricsCollector.clear();
  });

  it("should record metric", () => {
    metricsCollector.record("test.metric", 42, "ms");

    const all = metricsCollector.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe(42);
    expect(all[0].name).toBe("test.metric");
  });

  it("should record with tags", () => {
    metricsCollector.record("query", 100, "ms", { endpoint: "/api/test" });

    const all = metricsCollector.getAll();
    expect(all[0].tags?.endpoint).toBe("/api/test");
  });

  it("should measure async execution", async () => {
    const result = await measureAsync("test.async", async () => {
      await new Promise((r) => setTimeout(r, 50));
      return "result";
    });

    expect(result).toBe("result");
    const summary = metricsCollector.getSummary("test.async");
    expect(summary?.avg).toBeGreaterThanOrEqual(40);
  });

  it("should measure sync execution", () => {
    const result = measureSync("test.sync", () => {
      return 42;
    });

    expect(result).toBe(42);
    const summary = metricsCollector.getSummary("test.sync");
    expect(summary?.count).toBe(1);
  });

  it("should calculate summary stats", () => {
    for (let i = 0; i < 10; i++) {
      metricsCollector.record("test", i * 10, "ms");
    }

    const summary = metricsCollector.getSummary("test");
    expect(summary?.count).toBe(10);
    expect(summary?.avg).toBe(45);
    expect(summary?.min).toBe(0);
    expect(summary?.max).toBe(90);
  });

  it("should record cache events", () => {
    metricsCollector.recordCacheEvent(true, "key1");
    metricsCollector.recordCacheEvent(false, "key2");

    const all = metricsCollector.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].tags?.hit).toBe("hit");
    expect(all[1].tags?.hit).toBe("miss");
  });
});
