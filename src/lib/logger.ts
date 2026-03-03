/**
 * Structured logger with request context
 */

import { getRequestContext, getContextDuration } from "./request-context";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  duration?: number;
  error?: string;
  stack?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 10000;

  private formatLog(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
  ): LogEntry {
    const context = getRequestContext();
    const duration = context ? getContextDuration() : undefined;

    return {
      level,
      message,
      timestamp: Date.now(),
      requestId: context?.requestId,
      userId: context?.userId,
      endpoint: context?.endpoint,
      duration,
      tags: context?.tags,
      metadata,
    };
  }

  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog("debug", message, metadata);
    this.store(entry);
    console.debug(JSON.stringify(entry));
  }

  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog("info", message, metadata);
    this.store(entry);
    console.info(JSON.stringify(entry));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog("warn", message, metadata);
    this.store(entry);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.formatLog("error", message, metadata);
    if (error) {
      entry.error = error.message;
      entry.stack = error.stack;
    }
    this.store(entry);
    console.error(JSON.stringify(entry));
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(filter?: {
    level?: LogLevel;
    userId?: string;
    endpoint?: string;
  }): LogEntry[] {
    if (!filter) return [...this.logs];

    return this.logs.filter((log) => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.endpoint && log.endpoint !== filter.endpoint) return false;
      return true;
    });
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
