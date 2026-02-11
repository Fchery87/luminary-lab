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
