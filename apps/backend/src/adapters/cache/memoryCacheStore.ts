import type { CacheStore } from '../../ports/cacheStore';

interface Entry {
  value: string;
  expiresAt: number;
}

/**
 * Single-process fallback. It keeps the app runnable with no Redis (tests, and a
 * plain `pnpm dev` on a laptop) at the cost of the guarantees the Redis adapter
 * gives: counters and deny lists are per-process, so this must never be the store
 * behind more than one replica.
 */
export class MemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, Entry>();
  private readonly sets = new Map<string, Set<string>>();

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.live(key)?.value ?? null);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return Promise.resolve();
  }

  del(keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
    return Promise.resolve();
  }

  acquireLock(key: string, ttlMs: number): Promise<boolean> {
    if (this.live(key)) return Promise.resolve(false);
    this.entries.set(key, { value: '1', expiresAt: Date.now() + ttlMs });
    return Promise.resolve(true);
  }

  tag(setKey: string, member: string): Promise<void> {
    const existing = this.sets.get(setKey) ?? new Set<string>();
    existing.add(member);
    this.sets.set(setKey, existing);
    return Promise.resolve();
  }

  tagged(setKey: string): Promise<string[]> {
    return Promise.resolve([...(this.sets.get(setKey) ?? [])]);
  }

  incrementWithTtl(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number }> {
    const existing = this.live(key);
    const count = Number(existing?.value ?? 0) + 1;
    const expiresAt = existing?.expiresAt ?? Date.now() + ttlSeconds * 1000;
    this.entries.set(key, { value: String(count), expiresAt });
    return Promise.resolve({ count, ttl: Math.ceil((expiresAt - Date.now()) / 1000) });
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  close(): Promise<void> {
    this.entries.clear();
    this.sets.clear();
    return Promise.resolve();
  }
}
