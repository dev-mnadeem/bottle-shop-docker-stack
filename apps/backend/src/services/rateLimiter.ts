import type { CacheStore } from '../ports/cacheStore';

export interface RateLimitVerdict {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window counter held in the shared store. The window is shared across
 * replicas on purpose: Nginx round-robins between two backends, so a per-process
 * counter would hand every client twice the budget it is supposed to get.
 */
export class RateLimiter {
  constructor(private readonly store: CacheStore) {}

  async hit(
    bucket: string,
    identity: string,
    max: number,
    windowSeconds: number,
  ): Promise<RateLimitVerdict> {
    const { count, ttl } = await this.store.incrementWithTtl(
      `ratelimit:${bucket}:${identity}`,
      windowSeconds,
    );
    return {
      allowed: count <= max,
      limit: max,
      remaining: Math.max(0, max - count),
      resetSeconds: Math.max(1, ttl),
    };
  }
}
