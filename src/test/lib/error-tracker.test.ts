import { describe, it, expect, beforeEach } from 'vitest';
import { errorTracker } from '@/lib/error-tracker';
import { logger } from '@/lib/logger';
import { metricsCollector } from '@/lib/metrics';

describe('error-tracker', () => {
  beforeEach(() => {
    errorTracker.clear();
    logger.clear();
    metricsCollector.clear();
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
