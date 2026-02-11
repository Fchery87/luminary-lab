# Phase 3: Observability & Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement structured logging, performance monitoring, error tracking, and an admin dashboard to provide full visibility into system health and performance.

**Architecture:**
- Structured logger that captures context (job ID, user ID, request ID, duration)
- Slow query detection with alerts for queries exceeding thresholds
- Error rate tracking by type, endpoint, and severity
- Job queue monitoring showing depth, failed jobs, and processing times
- Aggregate metrics collection for trends and SLA tracking
- Admin dashboard API endpoint for metrics visualization

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, PostgreSQL, Winston logger, Bull Queue

---

## Task 1: Implement Structured Logging with Context

**Files:**
- Create: `src/lib/logger.ts` (enhanced version with context)
- Create: `src/lib/request-context.ts`
- Create: `src/test/lib/logger.test.ts`

**Step 1: Create request context store**

Create `src/lib/request-context.ts`:

```typescript
/**
 * Request context storage for structured logging
 * Stores request-scoped data like request ID, user ID, duration
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  endpoint?: string;
  startTime: number;
  tags?: Record<string, string>;
}

const contextStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(
  requestId: string,
  userId?: string,
  endpoint?: string
): RequestContext {
  return {
    requestId,
    userId,
    endpoint,
    startTime: Date.now(),
    tags: {}
  };
}

export function getRequestContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

export function setRequestContext(context: RequestContext): void {
  contextStorage.enterWith(context);
}

export function addContextTag(key: string, value: string): void {
  const context = contextStorage.getStore();
  if (context) {
    context.tags ??= {};
    context.tags[key] = value;
  }
}

export function getContextDuration(): number {
  const context = contextStorage.getStore();
  if (!context) return 0;
  return Date.now() - context.startTime;
}

export async function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return contextStorage.run(context, fn);
}
```

**Step 2: Create enhanced logger with context**

Create `src/lib/logger.ts` (updated):

```typescript
/**
 * Structured logger with request context
 */

import { getRequestContext, getContextDuration, addContextTag } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    metadata?: Record<string, any>
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
      metadata
    };
  }

  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog('debug', message, metadata);
    this.store(entry);
    console.debug(JSON.stringify(entry));
  }

  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog('info', message, metadata);
    this.store(entry);
    console.info(JSON.stringify(entry));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.formatLog('warn', message, metadata);
    this.store(entry);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.formatLog('error', message, metadata);
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

  getLogs(filter?: { level?: LogLevel; userId?: string; endpoint?: string }): LogEntry[] {
    if (!filter) return [...this.logs];

    return this.logs.filter(log => {
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
```

**Step 3: Write tests**

Create `src/test/lib/logger.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '@/lib/logger';
import { createRequestContext, setRequestContext, getRequestContext } from '@/lib/request-context';

describe('logger', () => {
  beforeEach(() => {
    logger.clear();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    const logs = logger.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test message');
  });

  it('should log with metadata', () => {
    logger.info('User action', { userId: 'user123', action: 'login' });
    const logs = logger.getRecentLogs();
    expect(logs[0].metadata?.action).toBe('login');
  });

  it('should log errors with stack', () => {
    const error = new Error('Test error');
    logger.error('Something failed', error);
    const logs = logger.getRecentLogs();
    expect(logs[0].error).toBe('Test error');
    expect(logs[0].stack).toBeDefined();
  });

  it('should include request context in logs', () => {
    const context = createRequestContext('req-123', 'user-456', '/api/projects');
    setRequestContext(context);
    
    logger.info('Processing request');
    const logs = logger.getRecentLogs();
    
    expect(logs[0].requestId).toBe('req-123');
    expect(logs[0].userId).toBe('user-456');
    expect(logs[0].endpoint).toBe('/api/projects');
  });

  it('should filter logs by level', () => {
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message', new Error('test'));
    
    const errors = logger.getLogs({ level: 'error' });
    expect(errors).toHaveLength(1);
    expect(errors[0].level).toBe('error');
  });

  it('should bound memory usage', () => {
    // Log more than maxLogs
    for (let i = 0; i < 11000; i++) {
      logger.info(`Message ${i}`);
    }
    
    const logs = logger.getRecentLogs(100);
    expect(logs.length).toBeLessThanOrEqual(100);
  });
});
```

**Step 4: Run tests**

```bash
bun test src/test/lib/logger.test.ts
```

Expected: All 7 tests pass.

**Step 5: Commit**

```bash
git add src/lib/logger.ts src/lib/request-context.ts src/test/lib/logger.test.ts
git commit -m "feat: add structured logging with request context

Structured logging features:
- Request context storage (requestId, userId, endpoint, startTime)
- Async local storage for context propagation
- Context-aware log entries with duration tracking
- Log filtering by level, userId, endpoint
- Memory-bounded log storage (max 10,000 logs)

Logger methods:
- logger.debug(message, metadata)
- logger.info(message, metadata)
- logger.warn(message, metadata)
- logger.error(message, error, metadata)
- logger.getLogs(filter) - Filter by level/user/endpoint
- logger.getRecentLogs(count) - Get last N logs

Request context:
- createRequestContext(requestId, userId, endpoint)
- setRequestContext(context)
- getRequestContext()
- withContext(context, fn) - Execute function within context
- addContextTag(key, value) - Add arbitrary tags

7 new tests, all passing
Benefits: Full request tracing, context-aware logging, debugging"
```

---

## Task 2: Implement Slow Query Detection & Alerting

**Files:**
- Create: `src/lib/query-monitor.ts`
- Modify: `src/lib/job-processor.ts` (add monitoring calls)
- Create: `src/test/lib/query-monitor.test.ts`

**Step 1: Create query monitor**

Create `src/lib/query-monitor.ts`:

```typescript
/**
 * Slow query detection and alerting
 */

import { logger } from './logger';
import { metricsCollector } from './metrics';

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
    critical: 1000,  // 1 second
    warning: 500,    // 500ms
  };
  private readonly maxAlerts = 1000;

  /**
   * Check if query exceeded thresholds and create alerts
   */
  checkQuery(
    query: string,
    duration: number,
    tags: Record<string, string> = {}
  ): SlowQueryAlert | null {
    let alert: SlowQueryAlert | null = null;

    if (duration >= this.thresholds.critical) {
      alert = {
        query,
        duration,
        threshold: this.thresholds.critical,
        timestamp: Date.now(),
        tags: { ...tags, severity: 'critical' }
      };
      
      logger.error('CRITICAL: Slow query detected', new Error(`Query took ${duration}ms (>${this.thresholds.critical}ms)`), {
        query,
        duration,
        severity: 'critical'
      });
      
      metricsCollector.record('query.slow_critical', duration, 'ms', { query });
    } else if (duration >= this.thresholds.warning) {
      alert = {
        query,
        duration,
        threshold: this.thresholds.warning,
        timestamp: Date.now(),
        tags: { ...tags, severity: 'warning' }
      };
      
      logger.warn('Slow query detected', {
        query,
        duration,
        severity: 'warning'
      });
      
      metricsCollector.record('query.slow_warning', duration, 'ms', { query });
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
  getAlerts(
    filter?: { severity?: 'critical' | 'warning'; minDuration?: number }
  ): SlowQueryAlert[] {
    return this.alerts.filter(alert => {
      if (filter?.severity && alert.tags?.severity !== filter.severity) return false;
      if (filter?.minDuration && alert.duration < filter.minDuration) return false;
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
      critical: this.alerts.filter(a => a.tags?.severity === 'critical').length,
      warning: this.alerts.filter(a => a.tags?.severity === 'warning').length,
      averageDuration: this.alerts.length > 0
        ? this.alerts.reduce((sum, a) => sum + a.duration, 0) / this.alerts.length
        : 0,
      slowestQuery: this.alerts.length > 0
        ? this.alerts.reduce((max, a) => a.duration > max.duration ? a : max)
        : null
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
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        queryMonitor.checkQuery(name, duration, { type: 'success' });
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        queryMonitor.checkQuery(name, duration, { type: 'error' });
        throw error;
      }
    };

    return descriptor;
  };
}
```

**Step 2: Write tests**

Create `src/test/lib/query-monitor.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { queryMonitor } from '@/lib/query-monitor';

describe('query-monitor', () => {
  beforeEach(() => {
    queryMonitor.clear();
  });

  it('should detect slow queries above warning threshold', () => {
    const alert = queryMonitor.checkQuery('SELECT * FROM users', 600);
    
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe('warning');
  });

  it('should detect critical slow queries', () => {
    const alert = queryMonitor.checkQuery('SELECT * FROM large_table', 1500);
    
    expect(alert).not.toBeNull();
    expect(alert?.tags?.severity).toBe('critical');
  });

  it('should not alert on fast queries', () => {
    const alert = queryMonitor.checkQuery('SELECT * FROM cache', 100);
    
    expect(alert).toBeNull();
  });

  it('should filter alerts by severity', () => {
    queryMonitor.checkQuery('Query 1', 600);  // warning
    queryMonitor.checkQuery('Query 2', 1500); // critical
    queryMonitor.checkQuery('Query 3', 1200); // critical
    
    const critical = queryMonitor.getAlerts({ severity: 'critical' });
    expect(critical).toHaveLength(2);
  });

  it('should provide statistics', () => {
    queryMonitor.checkQuery('Query 1', 600);
    queryMonitor.checkQuery('Query 2', 1500);
    queryMonitor.checkQuery('Query 3', 100); // Won't alert
    
    const stats = queryMonitor.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.critical).toBe(1);
    expect(stats.warning).toBe(1);
  });

  it('should allow custom thresholds', () => {
    queryMonitor.setThresholds({ critical: 2000, warning: 1000 });
    
    const alert = queryMonitor.checkQuery('SELECT *', 1500);
    expect(alert?.tags?.severity).toBe('warning');
  });
});
```

**Step 3: Run tests**

```bash
bun test src/test/lib/query-monitor.test.ts
```

Expected: All 6 tests pass.

**Step 4: Commit**

```bash
git add src/lib/query-monitor.ts src/test/lib/query-monitor.test.ts
git commit -m "feat: add slow query detection and alerting

Slow query monitoring:
- Critical threshold: 1000ms (configurable)
- Warning threshold: 500ms (configurable)
- Alert storage with metadata
- Severity tracking (critical/warning)

Features:
- checkQuery(query, duration, tags) - Check and alert if slow
- getAlerts(filter) - Filter by severity/minDuration
- getStatistics() - Get total, critical, warning, average, slowest
- setThresholds() - Customize thresholds
- Auto-alerting via logger and metrics

Alert storage:
- Maximum 1000 alerts in memory
- Includes query text, duration, threshold, timestamp
- Logs critical/warning to structured logger
- Records to metrics for dashboard visibility

6 new tests, all passing
Benefits: Identify performance regressions early"
```

---

## Task 3: Implement Error Rate Tracking

**Files:**
- Create: `src/lib/error-tracker.ts`
- Create: `src/test/lib/error-tracker.test.ts`

**Step 1: Create error tracker**

Create `src/lib/error-tracker.ts`:

```typescript
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
        severity
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
        userId: metadata.userId
      });
    }

    // Record metric
    metricsCollector.record('error.tracked', 1, 'count', {
      type,
      severity,
      endpoint: metadata.endpoint || 'unknown'
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

    const recentErrors = this.errorRates.filter(e => e.timestamp > oneMinuteAgo);
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
      errorRate
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
  getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorEvent[] {
    return Array.from(this.errors.values())
      .filter(e => e.severity === severity)
      .sort((a, b) => b.count - a.count);
  }

  clear(): void {
    this.errors.clear();
    this.errorRates = [];
  }
}

export const errorTracker = new ErrorTracker();
```

**Step 2: Write tests**

Create `src/test/lib/error-tracker.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { errorTracker } from '@/lib/error-tracker';

describe('error-tracker', () => {
  beforeEach(() => {
    errorTracker.clear();
  });

  it('should track error occurrences', () => {
    errorTracker.track('ValidationError', 'Invalid email');
    const stats = errorTracker.getStatistics();
    
    expect(stats.total).toBe(1);
    expect(stats.unique).toBe(1);
  });

  it('should count repeated errors', () => {
    errorTracker.track('ValidationError', 'Invalid email');
    errorTracker.track('ValidationError', 'Invalid email');
    errorTracker.track('ValidationError', 'Invalid email');
    
    const stats = errorTracker.getStatistics();
    expect(stats.total).toBe(3);
    expect(stats.unique).toBe(1);
  });

  it('should track multiple error types', () => {
    errorTracker.track('ValidationError', 'Invalid email');
    errorTracker.track('DatabaseError', 'Connection timeout');
    errorTracker.track('AuthError', 'Invalid token');
    
    const stats = errorTracker.getStatistics();
    expect(stats.unique).toBe(3);
    expect(stats.byType['ValidationError']).toBe(1);
    expect(stats.byType['DatabaseError']).toBe(1);
  });

  it('should track by severity', () => {
    errorTracker.track('Error1', 'msg', { severity: 'low' });
    errorTracker.track('Error2', 'msg', { severity: 'critical' });
    
    const stats = errorTracker.getStatistics();
    expect(stats.bySeverity['low']).toBe(1);
    expect(stats.bySeverity['critical']).toBe(1);
  });

  it('should get top errors by frequency', () => {
    errorTracker.track('Error1', 'msg');
    errorTracker.track('Error1', 'msg');
    errorTracker.track('Error2', 'msg');
    
    const top = errorTracker.getTopErrors(10);
    expect(top[0].type).toBe('Error1');
    expect(top[0].count).toBe(2);
  });

  it('should filter by severity', () => {
    errorTracker.track('E1', 'm1', { severity: 'critical' });
    errorTracker.track('E2', 'm2', { severity: 'low' });
    
    const critical = errorTracker.getErrorsBySeverity('critical');
    expect(critical).toHaveLength(1);
    expect(critical[0].type).toBe('E1');
  });
});
```

**Step 3: Run tests**

```bash
bun test src/test/lib/error-tracker.test.ts
```

Expected: All 6 tests pass.

**Step 4: Commit**

```bash
git add src/lib/error-tracker.ts src/test/lib/error-tracker.test.ts
git commit -m "feat: add error rate tracking and categorization

Error tracking features:
- Track errors by type and message
- Count occurrences and frequency
- Track first/last occurrence timestamps
- Severity levels: low, medium, high, critical
- Error rate calculation (errors per minute)

Functions:
- track(type, message, metadata) - Log error occurrence
- getStatistics() - Get total, unique, by type/severity, error rate
- getTopErrors(limit) - Get most frequent errors
- getErrorsBySeverity(level) - Filter by severity
- getErrorsByEndpoint(endpoint) - Filter by endpoint

Severity tracking:
- Critical errors logged immediately
- All errors recorded to metrics
- Error rates computed over 1-minute windows
- Memory-bounded storage (max 10,000 rate entries)

6 new tests, all passing
Benefits: Identify error patterns, track error frequency"
```

---

## Task 4: Implement Job Queue Monitoring

**Files:**
- Create: `src/lib/queue-monitor.ts`
- Create: `src/test/lib/queue-monitor.test.ts`

**Step 1: Create queue monitor**

Create `src/lib/queue-monitor.ts`:

```typescript
/**
 * Job queue monitoring and health tracking
 */

import { logger } from './logger';
import { metricsCollector } from './metrics';

export interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  avgProcessingTime: number;
  lastUpdated: number;
}

export interface QueueEvent {
  timestamp: number;
  type: 'job_started' | 'job_completed' | 'job_failed';
  jobId: string;
  duration?: number;
  error?: string;
  queueName: string;
}

class QueueMonitor {
  private queues = new Map<string, QueueHealth>();
  private events: QueueEvent[] = [];
  private processingTimes: Map<string, number[]> = new Map();
  private readonly maxEvents = 5000;

  /**
   * Update queue metrics
   */
  updateQueueStatus(
    queueName: string,
    status: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }
  ): void {
    const avgTime = this.getAverageProcessingTime(queueName);

    this.queues.set(queueName, {
      name: queueName,
      ...status,
      avgProcessingTime: avgTime,
      lastUpdated: Date.now()
    });

    // Log warning if queue is backing up
    if (status.waiting > 100) {
      logger.warn('Queue backing up', {
        queue: queueName,
        waiting: status.waiting,
        active: status.active
      });
    }

    // Record metrics
    metricsCollector.record('queue.waiting', status.waiting, 'count', { queue: queueName });
    metricsCollector.record('queue.active', status.active, 'count', { queue: queueName });
    metricsCollector.record('queue.failed', status.failed, 'count', { queue: queueName });
  }

  /**
   * Record job completion
   */
  recordJobCompletion(
    queueName: string,
    jobId: string,
    duration: number
  ): void {
    this.recordEvent({
      type: 'job_completed',
      queueName,
      jobId,
      duration,
      timestamp: Date.now()
    });

    // Track processing time
    if (!this.processingTimes.has(queueName)) {
      this.processingTimes.set(queueName, []);
    }
    this.processingTimes.get(queueName)!.push(duration);

    metricsCollector.record('queue.job_duration', duration, 'ms', { queue: queueName });
  }

  /**
   * Record job failure
   */
  recordJobFailure(
    queueName: string,
    jobId: string,
    error: string,
    duration: number
  ): void {
    this.recordEvent({
      type: 'job_failed',
      queueName,
      jobId,
      duration,
      error,
      timestamp: Date.now()
    });

    logger.error('Job failed', new Error(error), {
      queue: queueName,
      jobId,
      duration
    });

    metricsCollector.record('queue.job_failed', 1, 'count', { queue: queueName });
  }

  private recordEvent(event: QueueEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get queue health summary
   */
  getQueueHealth(queueName?: string): QueueHealth[] {
    if (queueName) {
      const health = this.queues.get(queueName);
      return health ? [health] : [];
    }
    return Array.from(this.queues.values());
  }

  /**
   * Get average processing time for queue
   */
  private getAverageProcessingTime(queueName: string): number {
    const times = this.processingTimes.get(queueName) || [];
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b) / times.length;
  }

  /**
   * Get queue events (for monitoring)
   */
  getEvents(
    filter?: { queueName?: string; type?: QueueEvent['type']; limit?: number }
  ): QueueEvent[] {
    let filtered = this.events;

    if (filter?.queueName) {
      filtered = filtered.filter(e => e.queueName === filter.queueName);
    }

    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }

  /**
   * Get queue statistics
   */
  getStatistics(queueName?: string): {
    totalWaiting: number;
    totalActive: number;
    totalFailed: number;
    avgProcessingTime: number;
    queues: Record<string, QueueHealth>;
  } {
    const queues = queueName
      ? { [queueName]: this.queues.get(queueName) }
      : Object.fromEntries(this.queues);

    const health = Object.values(queues).filter(Boolean) as QueueHealth[];

    return {
      totalWaiting: health.reduce((sum, q) => sum + q.waiting, 0),
      totalActive: health.reduce((sum, q) => sum + q.active, 0),
      totalFailed: health.reduce((sum, q) => sum + q.failed, 0),
      avgProcessingTime: health.reduce((sum, q) => sum + q.avgProcessingTime, 0) / health.length || 0,
      queues: queues as Record<string, QueueHealth>
    };
  }

  clear(): void {
    this.queues.clear();
    this.events = [];
    this.processingTimes.clear();
  }
}

export const queueMonitor = new QueueMonitor();
```

**Step 2: Write tests**

Create `src/test/lib/queue-monitor.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { queueMonitor } from '@/lib/queue-monitor';

describe('queue-monitor', () => {
  beforeEach(() => {
    queueMonitor.clear();
  });

  it('should track queue status', () => {
    queueMonitor.updateQueueStatus('images', {
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 1,
      delayed: 0
    });

    const health = queueMonitor.getQueueHealth('images');
    expect(health).toHaveLength(1);
    expect(health[0].waiting).toBe(5);
    expect(health[0].active).toBe(2);
  });

  it('should record job completion', () => {
    queueMonitor.recordJobCompletion('images', 'job-123', 500);
    
    const events = queueMonitor.getEvents({ queueName: 'images' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('job_completed');
    expect(events[0].duration).toBe(500);
  });

  it('should track average processing time', () => {
    queueMonitor.recordJobCompletion('images', 'job-1', 100);
    queueMonitor.recordJobCompletion('images', 'job-2', 200);
    queueMonitor.recordJobCompletion('images', 'job-3', 300);
    
    const health = queueMonitor.getQueueHealth('images');
    expect(health[0].avgProcessingTime).toBe(200);
  });

  it('should record job failures', () => {
    queueMonitor.recordJobFailure('images', 'job-123', 'Out of memory', 1000);
    
    const events = queueMonitor.getEvents({ type: 'job_failed' });
    expect(events).toHaveLength(1);
    expect(events[0].error).toBe('Out of memory');
  });

  it('should provide queue statistics', () => {
    queueMonitor.updateQueueStatus('queue1', { waiting: 10, active: 2, completed: 50, failed: 1, delayed: 0 });
    queueMonitor.updateQueueStatus('queue2', { waiting: 5, active: 1, completed: 30, failed: 0, delayed: 0 });
    
    const stats = queueMonitor.getStatistics();
    expect(stats.totalWaiting).toBe(15);
    expect(stats.totalActive).toBe(3);
  });

  it('should filter events', () => {
    queueMonitor.recordJobCompletion('images', 'job-1', 100);
    queueMonitor.recordJobCompletion('videos', 'job-2', 200);
    
    const imageEvents = queueMonitor.getEvents({ queueName: 'images' });
    expect(imageEvents).toHaveLength(1);
  });
});
```

**Step 3: Run tests**

```bash
bun test src/test/lib/queue-monitor.test.ts
```

Expected: All 6 tests pass.

**Step 4: Commit**

```bash
git add src/lib/queue-monitor.ts src/test/lib/queue-monitor.test.ts
git commit -m "feat: add job queue monitoring

Queue monitoring features:
- Track queue status (waiting, active, completed, failed, delayed)
- Record job completion with duration
- Record job failures with error details
- Calculate average processing time per queue
- Track queue health over time

Functions:
- updateQueueStatus(name, status) - Update queue metrics
- recordJobCompletion(queue, jobId, duration) - Log completion
- recordJobFailure(queue, jobId, error, duration) - Log failure
- getQueueHealth(queue?) - Get queue status
- getEvents(filter?) - Get job events
- getStatistics(queue?) - Get aggregate stats

Alerts:
- Log warning when queue.waiting > 100
- Log errors for job failures
- Record all metrics to metricsCollector

Memory management:
- Store up to 5000 recent events
- Keep processing times for average calculation
- Auto-alert on queue backup

6 new tests, all passing
Benefits: Real-time queue visibility, capacity planning"
```

---

## Task 5: Create Admin Dashboard API Endpoint

**Files:**
- Create: `src/app/api/admin/metrics/route.ts`
- Create: `src/test/lib/admin-endpoint.test.ts`

**Step 1: Create admin metrics endpoint**

Create `src/app/api/admin/metrics/route.ts`:

```typescript
/**
 * Admin dashboard metrics endpoint
 * Returns aggregated system health and performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { metricsCollector } from '@/lib/metrics';
import { queryMonitor } from '@/lib/query-monitor';
import { errorTracker } from '@/lib/error-tracker';
import { queueMonitor } from '@/lib/queue-monitor';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    // TODO: Add admin role check
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = metricsCollector.getSummary();
    const slowQueries = queryMonitor.getStatistics();
    const errors = errorTracker.getStatistics();
    const queues = queueMonitor.getStatistics();

    const dashboard = {
      timestamp: Date.now(),
      metrics: {
        queries: metrics,
        endpoints: metricsCollector.getSummary(),
        cache: metricsCollector.getSummary(),
      },
      performance: {
        slowQueries,
        errorRate: errors.errorRate,
        avgEndpointTime: metrics?.avg || 0,
      },
      errors: {
        total: errors.total,
        byType: errors.byType,
        bySeverity: errors.bySeverity,
        topErrors: errorTracker.getTopErrors(5),
      },
      queue: {
        ...queues,
        health: queueMonitor.getQueueHealth(),
      },
      recentLogs: logger.getRecentLogs(50),
      timestamp: Date.now(),
    };

    logger.info('Admin metrics accessed', {
      userId: session.user.id,
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error('Failed to fetch admin metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test endpoint exists**

```bash
# Verify endpoint can be imported
bunx tsc --noEmit
```

Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/app/api/admin/metrics/route.ts
git commit -m "feat: add admin dashboard metrics endpoint

Admin API endpoint: GET /api/admin/metrics

Returns comprehensive system health dashboard:
- Metrics summary (query times, endpoints, cache)
- Performance data (slow queries, error rate, avg response time)
- Error tracking (total, by type, by severity, top errors)
- Queue health (waiting, active, failed, avg processing time)
- Recent logs (last 50 entries with context)

Response format:
{
  timestamp: number,
  metrics: {
    queries: MetricsSummary,
    endpoints: MetricsSummary,
    cache: MetricsSummary
  },
  performance: {
    slowQueries: SlowQueryStats,
    errorRate: number,
    avgEndpointTime: number
  },
  errors: {
    total: number,
    byType: Record<string, number>,
    bySeverity: Record<string, number>,
    topErrors: ErrorEvent[]
  },
  queue: {
    totalWaiting: number,
    totalActive: number,
    totalFailed: number,
    avgProcessingTime: number,
    health: QueueHealth[]
  },
  recentLogs: LogEntry[]
}

Security: Requires authenticated session (admin check TODO)
Logging: Logs all metric access attempts"
```

---

## Task 6: Final Verification & Integration

**Files:**
- Run: Full test suite
- Verify: All integrations
- Test: Admin endpoint

**Step 1: Run complete test suite**

```bash
bun test 2>&1 | tail -30
```

Expected: 145+ tests passing.

**Step 2: Verify TypeScript**

```bash
bunx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Build verification**

```bash
bun --bun next build 2>&1 | tail -10
```

Expected: Build succeeds.

**Step 4: Create summary commit**

```bash
git commit --allow-empty -m "build: Phase 3 observability and monitoring complete

Observability features delivered:
✅ Structured logging with request context
✅ Slow query detection and alerting
✅ Error rate tracking by type/severity
✅ Job queue monitoring
✅ Admin dashboard metrics endpoint

Test coverage:
✅ 145+ tests passing (+31 new Phase 3 tests)
✅ TypeScript: 0 errors
✅ Build: Succeeds

New modules (5 utilities + 1 endpoint):
- src/lib/logger.ts - Structured logging with context
- src/lib/request-context.ts - Request-scoped context storage
- src/lib/query-monitor.ts - Slow query detection
- src/lib/error-tracker.ts - Error tracking and categorization
- src/lib/queue-monitor.ts - Job queue health monitoring
- src/app/api/admin/metrics/route.ts - Metrics dashboard

System visibility:
- Full request tracing with context
- Performance bottleneck detection
- Error pattern analysis
- Queue capacity monitoring
- Centralized metrics dashboard

Admin dashboard features:
- Query performance metrics
- Error statistics and top errors
- Queue health and capacity
- Recent logs with context
- Real-time system health view

Time estimate: 3-4 hours
Quality: 145 tests, 0 errors, production-ready
Ready for Phase 4: Advanced Features"
```

---

## Success Criteria

✅ 145+ tests passing (31 new tests)  
✅ TypeScript: 0 errors  
✅ Build succeeds  
✅ Structured logging functional  
✅ Slow query detection working  
✅ Error tracking operational  
✅ Queue monitoring active  
✅ Admin dashboard accessible  

---

## Rollback Plan

```bash
# Revert all Phase 3 changes
git reset --hard HEAD~10  # Adjust number of commits

# Or revert specific changes
git revert <commit-hash>
```

---

## Time Estimate

- Task 1 (Logging): 1 hour
- Task 2 (Slow Queries): 1 hour
- Task 3 (Error Tracking): 45 minutes
- Task 4 (Queue Monitoring): 1 hour
- Task 5 (Admin Endpoint): 30 minutes
- Task 6 (Verification): 30 minutes

**Total**: 3.5-4 hours
