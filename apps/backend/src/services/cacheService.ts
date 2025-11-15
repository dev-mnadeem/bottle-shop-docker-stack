import { CACHE_LOCK_RETRY_MAX_MS, CACHE_LOCK_TTL_MS } from '../config/constants';
import type { CacheStore } from '../ports/cacheStore';

export interface CacheResult<T> {
  value: T;
  hit: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read-through cache with single-flight protection.
 *
 * Without the lock, a key expiring under load lets every concurrent request run
 * the same query at the same moment — the classic stampede. One caller takes the
 * lock and loads, the rest wait a jittered interval and re-read the key.
 */
export class CacheService {
  constructor(private readonly store: CacheStore) {}

  async withCache<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
    tagSetKey?: string,
  ): Promise<CacheResult<T>> {
    const cached = await this.read<T>(key);
    if (cached) return { value: cached.value, hit: true };

    const lockKey = `${key}:lock`;
    if (await this.store.acquireLock(lockKey, CACHE_LOCK_TTL_MS)) {
      try {
        return { value: await this.fill(key, ttlSeconds, loader, tagSetKey), hit: false };
      } finally {
        await this.store.del([lockKey]);
      }
    }

    // Someone else is loading. Jitter avoids every waiter waking together.
    await sleep(50 + Math.floor(Math.random() * CACHE_LOCK_RETRY_MAX_MS));
    const second = await this.read<T>(key);
    if (second) return { value: second.value, hit: true };

    return { value: await this.fill(key, ttlSeconds, loader, tagSetKey), hit: false };
  }

  private async fill<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
    tagSetKey?: string,
  ): Promise<T> {
    const value = await loader();
    await this.store.set(key, JSON.stringify(value), ttlSeconds);
    if (tagSetKey) await this.store.tag(tagSetKey, key);
    return value;
  }

  /**
   * Wrapped so that a cached `null` (a remembered "not found") is a hit. Returning
   * the bare value made a stored null indistinguishable from an absent key, so
   * every request for an unknown slug went back to the database.
   */
  private async read<T>(key: string): Promise<{ value: T } | undefined> {
    const raw = await this.store.get(key);
    if (raw === null) return undefined;
    try {
      return { value: JSON.parse(raw) as T };
    } catch {
      // A corrupt entry is treated as a miss rather than a 500.
      await this.store.del([key]);
      return undefined;
    }
  }

  /** Drop every key recorded under `tagSetKey`, then the tag set itself. */
  async invalidateTag(tagSetKey: string): Promise<void> {
    const keys = await this.store.tagged(tagSetKey);
    await this.store.del([...keys, tagSetKey]);
  }

  async forget(key: string): Promise<void> {
    await this.store.del([key]);
  }
}
