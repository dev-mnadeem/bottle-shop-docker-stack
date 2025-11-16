import Redis from 'ioredis';
import type { CacheStore } from '../../ports/cacheStore';

/**
 * Redis-backed store. This is the adapter that makes horizontal scale work: the
 * compose stack runs two backend replicas behind Nginx, so the rate-limit counter
 * and the JWT deny list have to live outside the process or a client simply
 * alternates replicas to double its budget and a revoked token stays valid on the
 * replica that did not handle the logout.
 */
export class RedisCacheStore implements CacheStore {
  constructor(private readonly client: Redis) {}

  static fromUrl(url: string): RedisCacheStore {
    const client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    // Without a listener ioredis turns a connection blip into an unhandled
    // 'error' event, which takes the whole process down.
    client.on('error', () => undefined);
    return new RedisCacheStore(client);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const res = await this.client.set(key, '1', 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async tag(setKey: string, member: string): Promise<void> {
    await this.client.sadd(setKey, member);
  }

  tagged(setKey: string): Promise<string[]> {
    return this.client.smembers(setKey);
  }

  /**
   * INCR, conditional EXPIRE and TTL in one pipeline. Done as three awaited
   * commands this is three round-trips on the hot path of every request.
   */
  async incrementWithTtl(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number }> {
    const results = await this.client
      .multi()
      .incr(key)
      .expire(key, ttlSeconds, 'NX')
      .ttl(key)
      .exec();

    if (!results) throw new Error('redis pipeline returned no result');
    const count = Number(results[0]?.[1] ?? 0);
    const ttl = Number(results[2]?.[1] ?? ttlSeconds);
    return { count, ttl: ttl < 0 ? ttlSeconds : ttl };
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
