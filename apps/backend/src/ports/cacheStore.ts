/**
 * The cache the API talks to. Two adapters implement it: Redis (shared by every
 * replica) and an in-process Map (used by tests and by a single-process dev run
 * with no Redis available).
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  /** SET NX with expiry. Returns true if this caller won the lock. */
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  /** Record `member` under `setKey` so a write can invalidate the whole family. */
  tag(setKey: string, member: string): Promise<void>;
  /** Read back everything recorded under `setKey`. */
  tagged(setKey: string): Promise<string[]>;
  /**
   * Atomically increment `key`, applying `ttlSeconds` on first write.
   * Returns the new counter and the remaining TTL in seconds.
   */
  incrementWithTtl(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number }>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}
