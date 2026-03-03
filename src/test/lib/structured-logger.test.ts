import { describe, it, expect, beforeEach } from "vitest";
import { logger } from "@/lib/logger";
import { createRequestContext, setRequestContext } from "@/lib/request-context";

describe("logger", () => {
  beforeEach(() => {
    logger.clear();
  });

  it("should log info messages", () => {
    logger.info("Test message");
    const logs = logger.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe("info");
    expect(logs[0].message).toBe("Test message");
  });

  it("should log with metadata", () => {
    logger.info("User action", { userId: "user123", action: "login" });
    const logs = logger.getRecentLogs();
    expect(logs[0].metadata?.action).toBe("login");
  });

  it("should log errors with stack", () => {
    const error = new Error("Test error");
    logger.error("Something failed", error);
    const logs = logger.getRecentLogs();
    expect(logs[0].error).toBe("Test error");
    expect(logs[0].stack).toBeDefined();
  });

  it("should include request context in logs", () => {
    const context = createRequestContext(
      "req-123",
      "user-456",
      "/api/projects",
    );
    setRequestContext(context);

    logger.info("Processing request");
    const logs = logger.getRecentLogs();

    expect(logs[0].requestId).toBe("req-123");
    expect(logs[0].userId).toBe("user-456");
    expect(logs[0].endpoint).toBe("/api/projects");
  });

  it("should filter logs by level", () => {
    logger.info("Info message");
    logger.warn("Warn message");
    logger.error("Error message", new Error("test"));

    const errors = logger.getLogs({ level: "error" });
    expect(errors).toHaveLength(1);
    expect(errors[0].level).toBe("error");
  });

  it("should bound memory usage", () => {
    // Log more than maxLogs
    for (let i = 0; i < 11000; i++) {
      logger.info(`Message ${i}`);
    }

    const logs = logger.getRecentLogs(100);
    expect(logs.length).toBeLessThanOrEqual(100);
  });
});
