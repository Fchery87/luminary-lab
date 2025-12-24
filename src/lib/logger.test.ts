import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { logger } from '@/lib/logger';

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('functionality', () => {
    test('should not throw when logging debug messages', () => {
      expect(() => {
        logger.debug('Debug message', { key: 'value' });
      }).not.toThrow();
    });

    test('should not throw when logging info messages', () => {
      expect(() => {
        logger.info('Info message');
      }).not.toThrow();
    });

    test('should not throw when logging warn messages', () => {
      expect(() => {
        logger.warn('Warning message');
      }).not.toThrow();
    });

    test('should not throw when logging error messages', () => {
      expect(() => {
        logger.error('Error message', { error: 'details' });
      }).not.toThrow();
    });

    test('should handle logs with context', () => {
      expect(() => {
        logger.info('Test', { userId: '123', action: 'login' });
      }).not.toThrow();
    });

    test('should handle logs without context', () => {
      expect(() => {
        logger.info('Test without context');
      }).not.toThrow();
    });
  });

  describe('mode behavior', () => {
    test('should work in development mode', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development', NEXT_PUBLIC_SENTRY_DSN: '' };

      expect(() => {
        logger.debug('Development debug');
        logger.info('Development info');
        logger.warn('Development warn');
        logger.error('Development error');
      }).not.toThrow();
    });

    test('should work in production mode', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_SENTRY_DSN: '',
      };

      expect(() => {
        logger.debug('Production debug');
        logger.info('Production info');
        logger.warn('Production warn');
        logger.error('Production error');
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: 'development', NEXT_PUBLIC_SENTRY_DSN: '' };
    });

    test('should handle empty context', () => {
      expect(() => {
        logger.info('Test', {});
      }).not.toThrow();
    });

    test('should handle special characters in message', () => {
      const specialMessage = 'Test with <script> & "quotes" and \'apostrophes\'';
      expect(() => {
        logger.info(specialMessage);
      }).not.toThrow();
    });

    test('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });

    test('should handle complex context objects', () => {
      const complexContext = {
        user: { id: 123, name: 'Test', roles: ['admin', 'user'] },
        metadata: { timestamp: Date.now(), version: '1.0.0' },
        nested: { deeply: { value: { here: true } } },
      };
      expect(() => {
        logger.info('Complex test', complexContext);
      }).not.toThrow();
    });

    test('should handle undefined context', () => {
      expect(() => {
        logger.info('Test with undefined context', undefined as any);
      }).not.toThrow();
    });

    test('should handle null context', () => {
      expect(() => {
        logger.info('Test with null context', null as any);
      }).not.toThrow();
    });
  });

  describe('log levels', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: 'development', NEXT_PUBLIC_SENTRY_DSN: '' };
    });

    test('should support debug level', () => {
      expect(() => logger.debug('Debug')).not.toThrow();
    });

    test('should support info level', () => {
      expect(() => logger.info('Info')).not.toThrow();
    });

    test('should support warn level', () => {
      expect(() => logger.warn('Warn')).not.toThrow();
    });

    test('should support error level', () => {
      expect(() => logger.error('Error')).not.toThrow();
    });
  });

  describe('Sentry integration', () => {
    test('should handle logs when Sentry DSN is not configured', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_SENTRY_DSN: '',
      };

      expect(() => {
        logger.error('Error without Sentry');
      }).not.toThrow();
    });

    test('should attempt Sentry integration when DSN is configured', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_SENTRY_DSN: 'https://test@sentry.io/123',
      };

      // This should not throw even if Sentry isn't actually loaded
      // The lazy import in the code handles errors gracefully
      expect(() => {
        logger.error('Error with Sentry configured');
      }).not.toThrow();
    });
  });
});
