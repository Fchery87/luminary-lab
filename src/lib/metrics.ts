/**
 * Performance metrics collection
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private readonly maxMetrics = 1000;

  /**
   * Record a metric
   */
  record(
    name: string,
    value: number,
    unit: string = "ms",
    tags: Record<string, string> = {},
  ): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    });

    // Keep memory bounded
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record query duration
   */
  recordQueryTime(
    query: string,
    duration: number,
    tags: Record<string, string> = {},
  ): void {
    this.record("query.duration", duration, "ms", { query, ...tags });
  }

  /**
   * Record API endpoint duration
   */
  recordEndpointTime(
    endpoint: string,
    duration: number,
    status: number,
    tags: Record<string, string> = {},
  ): void {
    this.record("endpoint.duration", duration, "ms", {
      endpoint,
      status: status.toString(),
      ...tags,
    });
  }

  /**
   * Record cache hit/miss
   */
  recordCacheEvent(
    hit: boolean,
    key: string,
    tags: Record<string, string> = {},
  ): void {
    this.record("cache.event", hit ? 1 : 0, "hit", {
      key,
      hit: hit ? "hit" : "miss",
      ...tags,
    });
  }

  /**
   * Get metrics summary
   */
  getSummary(name?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const filtered = name
      ? this.metrics.filter((m) => m.name === name)
      : this.metrics;

    if (filtered.length === 0) return null;

    const values = filtered.map((m) => m.value).sort((a, b) => a - b);

    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[Math.floor(values.length * 0.95)],
    };
  }

  /**
   * Get all metrics
   */
  getAll(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

export const metricsCollector = new MetricsCollector();

/**
 * Measure execution time of async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags: Record<string, string> = {},
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, "ms", tags);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, "ms", { ...tags, error: "true" });
    throw error;
  }
}

/**
 * Measure execution time of sync function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  tags: Record<string, string> = {},
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, "ms", tags);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, "ms", { ...tags, error: "true" });
    throw error;
  }
}
