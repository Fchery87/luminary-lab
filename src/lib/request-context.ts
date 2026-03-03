/**
 * Request context storage for structured logging
 * Stores request-scoped data like request ID, user ID, duration
 */

let globalContext: RequestContext | undefined;

export interface RequestContext {
  requestId: string;
  userId?: string;
  endpoint?: string;
  startTime: number;
  tags?: Record<string, string>;
}

export function createRequestContext(
  requestId: string,
  userId?: string,
  endpoint?: string,
): RequestContext {
  return {
    requestId,
    userId,
    endpoint,
    startTime: Date.now(),
    tags: {},
  };
}

export function getRequestContext(): RequestContext | undefined {
  return globalContext;
}

export function setRequestContext(context: RequestContext): void {
  globalContext = context;
}

export function addContextTag(key: string, value: string): void {
  const context = globalContext;
  if (context) {
    context.tags ??= {};
    context.tags[key] = value;
  }
}

export function getContextDuration(): number {
  const context = globalContext;
  if (!context) return 0;
  return Date.now() - context.startTime;
}

export async function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  const previousContext = globalContext;
  globalContext = context;
  try {
    return await fn();
  } finally {
    globalContext = previousContext;
  }
}
