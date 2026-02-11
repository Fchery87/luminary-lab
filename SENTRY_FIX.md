# Sentry Runtime Error Fix

## Issue
Runtime error occurred when starting the application:
```
TypeError: undefined is not a constructor (evaluating 'new Sentry.BrowserTracing()')
```

## Root Cause
The Sentry configuration attempted to use `Sentry.BrowserTracing()` which is not exported from `@sentry/nextjs`. The package includes integrations automatically, and BrowserTracing needs to be imported separately from `@sentry/tracing`.

## Solution
Updated `/src/lib/sentry.ts` with the following changes:

1. **Removed Invalid Integration Calls**
   - Removed direct instantiation of `Sentry.BrowserTracing()`
   - Removed direct instantiation of `Sentry.Replay()`
   - The `@sentry/nextjs` package handles these automatically

2. **Added Initialization Guard**
   ```typescript
   // Only initialize Sentry if DSN is configured
   if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
     Sentry.init({ ... });
   }
   ```
   - Prevents Sentry initialization errors when DSN is not set
   - Allows application to run without Sentry in development

3. **Updated Configuration**
   - Removed explicit `integrations` array (handled automatically)
   - Kept `replaysSessionSampleRate` and `replaysOnErrorSampleRate` for Replay
   - Traces sampling is now properly configured

## Updated File: `/src/lib/sentry.ts`

```typescript
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
```

## Logger Behavior

The `/src/lib/logger.ts` already has proper guards:

```typescript
private isSentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

private sendToLoggingService(entry: LogEntry) {
  // Only log if Sentry is configured
  if (!this.isSentryEnabled) {
    return;
  }
  // ... rest of the code
}
```

- Logger only sends logs if `NEXT_PUBLIC_SENTRY_DSN` is set
- Gracefully handles Sentry import failures
- Falls back to console logging if Sentry is unavailable

## Testing

All 64 tests pass successfully:
```
64 pass, 0 fail
Ran 64 tests across 4 files. [929ms]
```

## Usage

### Development (No Sentry)
```bash
# .env.local (or omit NEXT_PUBLIC_SENTRY_DSN)
# Application runs without Sentry, logs to console only
```

### Production (With Sentry)
```bash
# .env.production
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/123
NEXT_PUBLIC_APP_VERSION=1.0.0

# Application initializes Sentry and sends logs/errors
```

## Summary

✅ Fixed runtime error by removing invalid Sentry integration calls
✅ Added guard to only initialize Sentry when DSN is configured
✅ Application now works correctly with or without Sentry
✅ Logger gracefully handles Sentry availability
✅ All 64 tests pass
✅ Ready for production deployment

The application is now fully functional with proper error handling and optional Sentry integration.
