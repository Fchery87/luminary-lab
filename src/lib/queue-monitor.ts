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
      lastUpdated: Date.now(),
    });

    // Log warning if queue is backing up
    if (status.waiting > 100) {
      logger.warn('Queue backing up', {
        queue: queueName,
        waiting: status.waiting,
        active: status.active,
      });
    }

    // Record metrics
    metricsCollector.record('queue.waiting', status.waiting, 'count', {
      queue: queueName,
    });
    metricsCollector.record('queue.active', status.active, 'count', {
      queue: queueName,
    });
    metricsCollector.record('queue.failed', status.failed, 'count', {
      queue: queueName,
    });
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
      timestamp: Date.now(),
    });

    // Track processing time
    if (!this.processingTimes.has(queueName)) {
      this.processingTimes.set(queueName, []);
    }
    this.processingTimes.get(queueName)!.push(duration);

    metricsCollector.record('queue.job_duration', duration, 'ms', {
      queue: queueName,
    });
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
      timestamp: Date.now(),
    });

    logger.error('Job failed', new Error(error), {
      queue: queueName,
      jobId,
      duration,
    });

    metricsCollector.record('queue.job_failed', 1, 'count', {
      queue: queueName,
    });
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
    filter?: {
      queueName?: string;
      type?: QueueEvent['type'];
      limit?: number;
    }
  ): QueueEvent[] {
    let filtered = this.events;

    if (filter?.queueName) {
      filtered = filtered.filter((e) => e.queueName === filter.queueName);
    }

    if (filter?.type) {
      filtered = filtered.filter((e) => e.type === filter.type);
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
      avgProcessingTime:
        (health.reduce((sum, q) => sum + q.avgProcessingTime, 0) /
          health.length) ||
        0,
      queues: queues as Record<string, QueueHealth>,
    };
  }

  clear(): void {
    this.queues.clear();
    this.events = [];
    this.processingTimes.clear();
  }
}

export const queueMonitor = new QueueMonitor();
