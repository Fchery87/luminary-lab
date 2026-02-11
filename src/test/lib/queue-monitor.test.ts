import { describe, it, expect, beforeEach } from 'vitest';
import { queueMonitor } from '@/lib/queue-monitor';
import { logger } from '@/lib/logger';
import { metricsCollector } from '@/lib/metrics';

describe('queue-monitor', () => {
  beforeEach(() => {
    queueMonitor.clear();
    logger.clear();
    metricsCollector.clear();
  });

  it('should track queue status', () => {
    queueMonitor.updateQueueStatus('images', {
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 1,
      delayed: 0,
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

    // Update queue status to get health snapshot (includes avgProcessingTime)
    queueMonitor.updateQueueStatus('images', {
      waiting: 0,
      active: 0,
      completed: 3,
      failed: 0,
      delayed: 0,
    });

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
    queueMonitor.updateQueueStatus('queue1', {
      waiting: 10,
      active: 2,
      completed: 50,
      failed: 1,
      delayed: 0,
    });
    queueMonitor.updateQueueStatus('queue2', {
      waiting: 5,
      active: 1,
      completed: 30,
      failed: 0,
      delayed: 0,
    });

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
