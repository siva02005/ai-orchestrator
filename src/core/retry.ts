import { AppError, ProviderRateLimitError } from './errors.js';

/**
 * =====================================================================
 * RETRY SYSTEM (Phase 6)
 * =====================================================================
 * Generic retry with exponential backoff + full jitter. Only retries
 * errors classified as retryable. Non-retryable errors propagate
 * immediately. Used by agent runs, provider calls and job execution.
 * =====================================================================
 */

export interface RetryOptions {
  /** Total number of attempts (1 = no retries). Default 3. */
  maxAttempts?: number;
  /** Base delay in ms for the first retry. Default 500. */
  baseDelayMs?: number;
  /** Upper bound for the backoff delay. Default 8000. */
  maxDelayMs?: number;
  /** Timeout for the whole operation in ms. Default 120000. */
  timeoutMs?: number;
  /** Abort signal (e.g. client disconnect). */
  signal?: AbortSignal;
  /** Custom predicate to decide whether a failure is retryable. */
  shouldRetry?: (error: unknown) => boolean;
  /** Called after each failed attempt. */
  onRetry?: (info: { attempt: number; maxAttempts: number; delayMs: number; error: unknown }) => void;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
  totalDelayMs: number;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal.reason));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError(signal?.reason));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function abortError(reason?: unknown): Error {
  const err = new Error('Operation aborted by caller.');
  err.name = 'AbortError';
  return err;
}

/** Full jitter backoff: delay in [0, min(cap, base * 2^attempt)). */
export function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) return error.retryable;
  if (error instanceof Error) {
    // Network-level failures (fetch rejects), timeouts, aborts.
    if (error.name === 'AbortError') return true;
    const msg = `${error.message} ${error.name}`;
    return /fetch failed|network|ECONN|ETIMEDOUT|timeout|socket hang up|5\d\d/i.test(msg);
  }
  return false;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const signal = options.signal;
  const shouldRetry = options.shouldRetry ?? isRetryable;

  let attempts = 0;
  let totalDelayMs = 0;
  let lastError: unknown;

  const deadline = Date.now() + timeoutMs;

  while (attempts < maxAttempts) {
    attempts += 1;
    if (signal?.aborted) throw abortError(signal.reason);
    try {
      const value = await fn();
      return { value, attempts, totalDelayMs };
    } catch (error) {
      lastError = error;

      const rateLimitInfo = extractRateLimit(error);
      const shouldRetryAgain = attempts < maxAttempts && shouldRetry(error);

      if (!shouldRetryAgain) throw error;

      if (Date.now() >= deadline) throw error;

      const cappedBase = rateLimitInfo?.retryAfterMs ?? baseDelayMs;
      const jittered = rateLimitInfo?.retryAfterMs ?? backoffDelay(attempts - 1, cappedBase, maxDelayMs);
      const delayMs = Math.min(Math.max(0, deadline - Date.now()), jittered);
      totalDelayMs += delayMs;

      options.onRetry?.({ attempt: attempts, maxAttempts, delayMs, error });

      await sleep(delayMs, signal);
    }
  }

  throw lastError;
}

function extractRateLimit(error: unknown): { retryAfterMs?: number } | undefined {
  if (error instanceof ProviderRateLimitError) {
    const details = error.details as { retryAfterMs?: number } | undefined;
    if (details && typeof details.retryAfterMs === 'number') {
      return { retryAfterMs: details.retryAfterMs };
    }
  }
  return undefined;
}
