import { env } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;
const MAX_BACKOFF_MS = 3_000;

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = typeof window === 'undefined' ? env.internalApiBaseUrl : env.apiBaseUrl;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/**
 * Small fetch wrapper with a per-attempt timeout and bounded retries.
 *
 * The AbortController is created inside each attempt. A single controller shared
 * across attempts stays aborted once the first timeout fires, so every retry
 * fails instantly and the backoff accomplishes nothing.
 */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...init } = options;
  const url = resolveUrl(path);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { 'content-type': 'application/json', ...init.headers },
      });

      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = undefined;
        }
        // A 4xx is the server's final answer. Retrying it just burns the client's
        // rate-limit budget, so only transport failures are retried.
        throw new ApiError(`Request failed with ${res.status}`, res.status, body);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError) throw err;
      if (attempt === retries) break;
      await sleep(Math.min(2 ** attempt * 500, MAX_BACKOFF_MS));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
