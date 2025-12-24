type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isSentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  private formatLog(entry: LogEntry): string {
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${
      entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    }`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    const formattedLog = this.formatLog(entry);

    // In development, log to console with appropriate severity
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.debug(formattedLog);
          break;
        case 'info':
          console.info(formattedLog);
          break;
        case 'warn':
          console.warn(formattedLog);
          break;
        case 'error':
          console.error(formattedLog);
          break;
      }
    }

    // In production, send to logging service (Sentry)
    if (!this.isDevelopment) {
      this.sendToLoggingService(entry);
    }
  }

  private sendToLoggingService(entry: LogEntry) {
    // Only log if Sentry is configured
    if (!this.isSentryEnabled) {
      return;
    }

    // Lazy import Sentry to avoid loading it unnecessarily
    import('@sentry/nextjs').then((Sentry) => {
      switch (entry.level) {
        case 'debug':
        case 'info':
          // For info/debug, we can use Sentry's breadcrumbs or custom logging
          Sentry.addBreadcrumb({
            message: entry.message,
            level: entry.level,
            data: entry.context,
          });
          break;
        case 'warn':
          // Warnings can be captured as messages
          Sentry.captureMessage(entry.message, {
            level: 'warning',
            extra: entry.context,
          });
          break;
        case 'error':
          // Errors should be captured with additional context
          Sentry.captureException(new Error(entry.message), {
            level: 'error',
            extra: entry.context,
            tags: {
              timestamp: entry.timestamp,
            },
          });
          break;
      }
    }).catch((error) => {
      // Fallback to console if Sentry fails
      console.error('Failed to send log to Sentry:', error);
    });
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
