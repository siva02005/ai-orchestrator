import { describe, expect, it } from 'vitest';
import { retry, backoffDelay, isRetryable, sleep } from '../src/core/retry.js';
import { ProviderError, ProviderRateLimitError, AppError } from '../src/core/errors.js';

describe('retry system', () => {
  it('returns value on first success without retrying', async () => {
    let calls = 0;
    const { value, attempts } = await retry(async () => {
      calls += 1;
      return 'ok';
    });
    expect(value).toBe('ok');
    expect(attempts).toBe(1);
    expect(calls).toBe(1);
  });

  it('retries retryable failures up to maxAttempts', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new ProviderError('boom', { retryable: true });
        },
        { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 },
      ),
    ).rejects.toThrow('boom');
    expect(calls).toBe(3);
  });

  it('succeeds after transient failures', async () => {
    let calls = 0;
    const { value, attempts } = await retry(
      async () => {
        calls += 1;
        if (calls < 3) throw new ProviderError('flaky', { retryable: true });
        return 'recovered';
      },
      { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 2 },
    );
    expect(value).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new AppError({ code: 'BAD_REQUEST', message: 'bad input' });
        },
        { maxAttempts: 4, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('bad input');
    expect(calls).toBe(1);
  });

  it('respects a custom shouldRetry predicate', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new Error('special');
        },
        { maxAttempts: 2, baseDelayMs: 1, shouldRetry: (e) => (e as Error).message === 'special' },
      ),
    ).rejects.toThrow('special');
    expect(calls).toBe(2);
  });

  it('notifies onRetry with backoff info', async () => {
    const seen: number[] = [];
    await expect(
      retry(
        async () => {
          throw new ProviderError('x', { retryable: true });
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 2,
          onRetry: (info) => seen.push(info.attempt),
        },
      ),
    ).rejects.toThrow();
    expect(seen).toEqual([1, 2]);
  });

  it('uses retryAfterMs from rate-limit errors', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new ProviderRateLimitError('slow down', { retryAfterMs: 2 });
        },
        { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
      ),
    ).rejects.toThrow('slow down');
    expect(calls).toBe(2);
  });

  it('isRetryable classifies network-style errors', () => {
    const net = new Error('fetch failed');
    expect(isRetryable(net)).toBe(true);
    expect(isRetryable(new Error('a 503 happened'))).toBe(true);
    expect(isRetryable(new Error('nothing wrong here'))).toBe(false);
    expect(isRetryable(new AppError({ code: 'BAD_REQUEST', message: 'nope' }))).toBe(false);
  });

  it('backoffDelay stays within bounds', () => {
    expect(backoffDelay(0, 100, 1000)).toBeGreaterThanOrEqual(0);
    expect(backoffDelay(0, 100, 1000)).toBeLessThan(100);
    expect(backoffDelay(10, 100, 1000)).toBeLessThanOrEqual(1000);
  });

  it('sleep resolves after delay and rejects on abort', async () => {
    await sleep(1);
    const ac = new AbortController();
    ac.abort();
    await expect(sleep(1000, ac.signal)).rejects.toThrow();
  });
});
