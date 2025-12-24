import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    environment: process.env.NODE_ENV || 'development',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture 100% of errors
    sampleRate: 1.0,

    // Filter out unnecessary errors
    beforeSend(event, hint) {
      // Filter out 404 errors in production
      if (event.request?.url && event.request.url.includes('favicon')) {
        return null;
      }

      // Filter out certain types of errors
      const error = hint.originalException as Error;
      if (error?.message?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }

      return event;
    },

    // Replay settings (automatically included with @sentry/nextjs)
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Server-side config
    beforeSendTransaction(event) {
      // Modify transaction event here
      return event;
    },

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    ignoreUrls: [
      // Ignore errors from browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],

    // Set release version
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
  });
}
