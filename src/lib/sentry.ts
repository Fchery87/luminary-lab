import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn("Sentry DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    environment: process.env.NODE_ENV || "development",

    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    sampleRate: 1.0,

    beforeSend(event, hint) {
      if (event.request?.url && event.request.url.includes("favicon")) {
        return null;
      }

      const error = hint.originalException as Error;
      if (error?.message?.includes("ResizeObserver loop limit exceeded")) {
        return null;
      }

      return event;
    },

    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    beforeSendTransaction(event) {
      return event;
    },

    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],

    release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

    debug: process.env.NODE_ENV === "development",
  });
}

export function captureDatabaseError(error: Error, query: string, params?: unknown): void {
  Sentry.captureException(error, {
    extra: {
      query,
      params,
      type: "database_error",
    },
    tags: {
      component: "database",
    },
  });
}

export function captureQueueError(error: Error, jobId: string, queue: string): void {
  Sentry.captureException(error, {
    extra: {
      jobId,
      queue,
      type: "queue_error",
    },
    tags: {
      component: "queue",
    },
  });
}

export function captureAuthError(error: Error, userId?: string): void {
  Sentry.captureException(error, {
    extra: {
      userId,
      type: "auth_error",
    },
    tags: {
      component: "auth",
    },
  });
}

export function setUserContext(userId: string, email: string): void {
  Sentry.setUser({
    id: userId,
    email,
  });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}

export function addBreadcrumb(category: string, message: string, level: Sentry.SeverityLevel = "info"): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    timestamp: Date.now() / 1000,
  });
}

export function createSpan(name: string, op: string, callback: () => void): void {
  Sentry.startSpan({ name, op }, callback);
}
