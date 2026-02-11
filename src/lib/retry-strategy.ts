/**
 * Exponential backoff retry strategy
 * Automatically retries operations with exponential delay and jitter
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute operation with exponential backoff retry
 * @param operation - Async function to retry
 * @param maxRetries - Max retry attempts (default: 3)
 * @param baseDelayMs - Base delay between retries (default: 1000ms)
 * @param onRetry - Callback on each retry attempt
 * @returns Result from successful operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      
      // Add jitter (±10%) to prevent thundering herd
      const jitter = Math.random() * delayMs * 0.1;
      const totalDelayMs = delayMs + jitter;
      
      onRetry?.(attempt + 1, lastError);
      
      await new Promise(resolve => setTimeout(resolve, totalDelayMs));
    }
  }

  throw lastError;
}
