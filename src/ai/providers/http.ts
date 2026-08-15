import { ProviderError, ProviderRateLimitError } from '../../core/errors.js';

export interface RequestJsonOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Minimal fetch wrapper shared by HTTP-backed providers.
 * Throws ProviderError subclasses with the correct retryable flag.
 */
export async function requestJson<T>(
  url: string,
  providerName: string,
  options: RequestJsonOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const signals: AbortSignal[] = [];
  if (options.signal) signals.push(options.signal);
  if (typeof AbortSignal.timeout === 'function') {
    signals.push(AbortSignal.timeout(timeoutMs));
  }
  const signal =
    signals.length > 0
      ? typeof AbortSignal.any === 'function'
        ? AbortSignal.any(signals)
        : signals[0]
      : undefined;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? 'POST',
      headers: { 'content-type': 'application/json', ...options.headers },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal,
    });
  } catch (error) {
    throw new ProviderError(`${providerName} network failure: ${(error as Error).message}`, {
      retryable: true,
      cause: error,
    });
  }

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw mapHttpError(res.status, text, providerName, res.headers);
  }

  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError(`${providerName} returned non-JSON response.`, {
      retryable: false,
      details: { status: res.status, body: text.slice(0, 200) },
    });
  }
}

export function mapHttpError(
  status: number,
  body: string,
  providerName: string,
  headers?: Headers,
): ProviderError {
  const message = body ? body.slice(0, 500) : `${providerName} HTTP ${status}`;
  const retryAfterHeader = headers?.get('retry-after');
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 || undefined : undefined;

  if (status === 429) {
    return new ProviderRateLimitError(`${providerName} rate limit (HTTP 429): ${message}`, {
      retryAfterMs,
      details: { status, body },
      cause: new Error(message),
    });
  }
  if (status >= 500) {
    return new ProviderError(`${providerName} server error (HTTP ${status}): ${message}`, {
      retryable: true,
      statusCode: status,
      details: { status, body },
      cause: new Error(message),
    });
  }
  return new ProviderError(
    `${providerName} request failed (HTTP ${status}): ${message}`,
    {
      retryable: status === 408 || status === 425,
      statusCode: status,
      details: { status, body },
      cause: new Error(message),
    },
  );
}
