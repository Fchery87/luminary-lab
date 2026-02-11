/**
 * Error tracking and categorization
 */

import { logger } from './logger';
import { metricsCollector } from './metrics';

export interface ErrorEvent {
  type: string;
  message: string;
  count: number;
  lastOccurred: number;
  firstOccurred: number;
  endpoint?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
  private errors = new Map<string, ErrorEvent>();
  private errorRates: { timestamp: number; count: number }[] = [];

  /**
   * Track an error occurrence
   */
  track(
    type: string,
    message: string,
    metadata: {
      endpoint?: string;
      userId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): void {
    const key = `${type}:${message}`;
    const now = Date.now();
    const severity = metadata.severity || 'medium';

    const existing = this.errors.get(key);
    if (existing) {
      existing.count++;
      existing.lastOccurred = now;
    } else {
      this.errors.set(key, {
        type,
        message,
        count: 1,
        firstOccurred: now,
        lastOccurred: now,
        endpoint: metadata.endpoint,
        userId: metadata.userId,
        severity,
      });
    }

    // Track rate
    this.errorRates.push({ timestamp: now, count: 1 });
    if (this.errorRates.length > 10000) {
      this.errorRates = this.errorRates.slice(-10000);
    }

    // Alert on critical errors
    if (severity === 'critical') {
      logger.error(`CRITICAL ERROR: ${type}`, new Error(message), {
        severity,
        endpoint: metadata.endpoint,
        userId: metadata.userId,
      });
    }

    // Record metric
    metricsCollector.record('error.tracked', 1, 'count', {
      type,
      severity,
      endpoint: metadata.endpoint || 'unknown',
    });
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    unique: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    errorRate: number; // errors per minute
  } {
    const allErrors = Array.from(this.errors.values());
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentErrors = this.errorRates.filter((e) => e.timestamp > oneMinuteAgo);
    const errorRate = recentErrors.length > 0 ? recentErrors.length : 0;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const error of allErrors) {
      byType[error.type] = (byType[error.type] || 0) + error.count;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + error.count;
    }

    return {
      total: allErrors.reduce((sum, e) => sum + e.count, 0),
      unique: allErrors.length,
      byType,
      bySeverity,
      errorRate,
    };
  }

  /**
   * Get top errors by frequency
   */
  getTopErrors(limit: number = 10): ErrorEvent[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): ErrorEvent[] {
    return Array.from(this.errors.values())
      .filter((e) => e.severity === severity)
      .sort((a, b) => b.count - a.count);
  }

  clear(): void {
    this.errors.clear();
    this.errorRates = [];
  }
}

export const errorTracker = new ErrorTracker();
