import { describe, it, expect, beforeEach } from "vitest";
import { queryMonitor } from "@/lib/query-monitor";
import { logger } from "@/lib/logger";
import { metricsCollector } from "@/lib/metrics";

describe("query-monitor", () => {
  beforeEach(() => {
    queryMonitor.clear();
    logger.clear();
    metricsCollector.clear();
  });

  it("should detect slow queries above warning threshold", () => {
    const alert = queryMonitor.checkQuery("SELECT * FROM users", 600);

    expect(alert).not.toBeNull();
    expect(alert?.tags?.severity).toBe("warning");
    expect(alert?.duration).toBe(600);
    expect(alert?.query).toBe("SELECT * FROM users");
  });

  it("should detect critical slow queries", () => {
    const alert = queryMonitor.checkQuery("SELECT * FROM large_table", 1500);

    expect(alert).not.toBeNull();
    expect(alert?.tags?.severity).toBe("critical");
    expect(alert?.duration).toBe(1500);
  });

  it("should not alert on fast queries", () => {
    const alert = queryMonitor.checkQuery("SELECT * FROM cache", 100);

    expect(alert).toBeNull();
  });

  it("should filter alerts by severity", () => {
    queryMonitor.checkQuery("Query 1", 600); // warning
    queryMonitor.checkQuery("Query 2", 1500); // critical
    queryMonitor.checkQuery("Query 3", 1200); // critical

    const critical = queryMonitor.getAlerts({ severity: "critical" });
    expect(critical).toHaveLength(2);

    const warning = queryMonitor.getAlerts({ severity: "warning" });
    expect(warning).toHaveLength(1);
  });

  it("should provide statistics", () => {
    queryMonitor.checkQuery("Query 1", 600);
    queryMonitor.checkQuery("Query 2", 1500);
    queryMonitor.checkQuery("Query 3", 100); // Won't alert

    const stats = queryMonitor.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.critical).toBe(1);
    expect(stats.warning).toBe(1);
    expect(stats.averageDuration).toBe(1050); // (600 + 1500) / 2
    expect(stats.slowestQuery).not.toBeNull();
    expect(stats.slowestQuery?.duration).toBe(1500);
  });

  it("should allow custom thresholds", () => {
    queryMonitor.setThresholds({ critical: 2000, warning: 1000 });

    const alert = queryMonitor.checkQuery("SELECT *", 1500);
    expect(alert?.tags?.severity).toBe("warning");

    const neverAlert = queryMonitor.checkQuery("SELECT quick", 500);
    expect(neverAlert).toBeNull();
  });
});
