/**
 * Slow query detection and alerting
 */

import { logger } from "./logger";
import { metricsCollector } from "./metrics";

export interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class QueryMonitor {
  private alerts: SlowQueryAlert[] = [];
  private thresholds = {
    critical: 1000, // 1 second
    warning: 500, // 500ms
  };
  private readonly maxAlerts = 1000;

  /**
   * Check if query exceeded thresholds and create alerts
   */
  checkQuery(
    query: string,
    duration: number,
    tags: Record<string, string> = {},
  ): SlowQueryAlert | null {
    let alert: SlowQueryAlert | null = null;

    if (duration >= this.thresholds.critical) {
      alert = {
        query,
        duration,
        threshold: this.thresholds.critical,
        timestamp: Date.now(),
        tags: { ...tags, severity: "critical" },
      };

      logger.error(
        "CRITICAL: Slow query detected",
        new Error(`Query took ${duration}ms (>${this.thresholds.critical}ms)`),
        {
          query,
          duration,
          severity: "critical",
        },
      );

      metricsCollector.record("query.slow_critical", duration, "ms", { query });
    } else if (duration >= this.thresholds.warning) {
      alert = {
        query,
        duration,
        threshold: this.thresholds.warning,
        timestamp: Date.now(),
        tags: { ...tags, severity: "warning" },
      };

      logger.warn("Slow query detected", {
        query,
        duration,
        severity: "warning",
      });

      metricsCollector.record("query.slow_warning", duration, "ms", { query });
    }

    if (alert) {
      this.storeAlert(alert);
    }

    return alert;
  }

  private storeAlert(alert: SlowQueryAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
  }

  /**
   * Get recent slow query alerts
   */
  getAlerts(filter?: {
    severity?: "critical" | "warning";
    minDuration?: number;
  }): SlowQueryAlert[] {
    return this.alerts.filter((alert) => {
      if (filter?.severity && alert.tags?.severity !== filter.severity)
        return false;
      if (filter?.minDuration && alert.duration < filter.minDuration)
        return false;
      return true;
    });
  }

  /**
   * Get statistics on slow queries
   */
  getStatistics(): {
    total: number;
    critical: number;
    warning: number;
    averageDuration: number;
    slowestQuery: SlowQueryAlert | null;
  } {
    return {
      total: this.alerts.length,
      critical: this.alerts.filter((a) => a.tags?.severity === "critical")
        .length,
      warning: this.alerts.filter((a) => a.tags?.severity === "warning").length,
      averageDuration:
        this.alerts.length > 0
          ? this.alerts.reduce((sum, a) => sum + a.duration, 0) /
            this.alerts.length
          : 0,
      slowestQuery:
        this.alerts.length > 0
          ? this.alerts.reduce((max, a) =>
              a.duration > max.duration ? a : max,
            )
          : null,
    };
  }

  clear(): void {
    this.alerts = [];
  }

  setThresholds(thresholds: { critical?: number; warning?: number }): void {
    if (thresholds.critical) this.thresholds.critical = thresholds.critical;
    if (thresholds.warning) this.thresholds.warning = thresholds.warning;
  }
}

export const queryMonitor = new QueryMonitor();

/**
 * Decorator to monitor query execution time
 */
export function monitorQuery(name: string) {
  return function <T extends any[], R>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        queryMonitor.checkQuery(name, duration, { type: "success" });
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        queryMonitor.checkQuery(name, duration, { type: "error" });
        throw error;
      }
    };

    return descriptor;
  };
}
