import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHarness } from './helpers';
import { MemoryCacheStore } from '../adapters/cache/memoryCacheStore';
import { CacheService } from '../services/cacheService';
import { RateLimiter } from '../services/rateLimiter';

describe('health and readiness', () => {
  it('reports liveness without touching a dependency', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('reports readiness with each dependency named', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ready', database: true, cache: true });
  });

  it('returns 503 from /ready when the database is unreachable', async () => {
    const harness = createHarness();
    harness.container.checkDatabase = () => Promise.resolve(false);
    const res = await request(harness.app).get('/ready').expect(503);
    expect(res.body.status).toBe('degraded');
  });

  it('exposes Prometheus metrics', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('echoes an inbound x-request-id so one id spans the whole hop chain', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/health').set('x-request-id', 'trace-123').expect(200);
    expect(res.headers['x-request-id']).toBe('trace-123');
  });

  it('answers an unknown route with a structured 404', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toBe('NotFound');
  });
});

describe('CacheService', () => {
  it('serves the second read from the cache without calling the loader again', async () => {
    const cache = new CacheService(new MemoryCacheStore());
    let calls = 0;
    const loader = () => {
      calls += 1;
      return Promise.resolve({ value: calls });
    };

    const first = await cache.withCache('k', 60, loader);
    const second = await cache.withCache('k', 60, loader);

    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(calls).toBe(1);
  });

  it('runs the loader once for concurrent misses on the same key', async () => {
    const cache = new CacheService(new MemoryCacheStore());
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return calls;
    };

    await Promise.all(Array.from({ length: 8 }, () => cache.withCache('hot', 60, loader)));
    expect(calls).toBe(1);
  });

  it('drops every key recorded under a tag', async () => {
    const store = new MemoryCacheStore();
    const cache = new CacheService(store);
    await cache.withCache('a', 60, () => Promise.resolve(1), 'tag');
    await cache.withCache('b', 60, () => Promise.resolve(2), 'tag');

    await cache.invalidateTag('tag');

    expect(await store.get('a')).toBeNull();
    expect(await store.get('b')).toBeNull();
  });

  it('treats an unparseable entry as a miss instead of throwing', async () => {
    const store = new MemoryCacheStore();
    await store.set('broken', '{not json', 60);
    const cache = new CacheService(store);

    const result = await cache.withCache('broken', 60, () => Promise.resolve('fresh'));
    expect(result).toEqual({ value: 'fresh', hit: false });
  });
});

describe('RateLimiter', () => {
  it('counts down and then refuses', async () => {
    const limiter = new RateLimiter(new MemoryCacheStore());
    const verdicts = [];
    for (let i = 0; i < 4; i += 1) {
      verdicts.push(await limiter.hit('test', '1.2.3.4', 3, 60));
    }

    expect(verdicts.map((v) => v.allowed)).toEqual([true, true, true, false]);
    expect(verdicts[2]!.remaining).toBe(0);
    expect(verdicts[3]!.resetSeconds).toBeGreaterThan(0);
  });

  it('keeps separate budgets per identity', async () => {
    const limiter = new RateLimiter(new MemoryCacheStore());
    await limiter.hit('test', 'a', 1, 60);
    const other = await limiter.hit('test', 'b', 1, 60);
    expect(other.allowed).toBe(true);
  });

  it('keeps separate budgets per bucket', async () => {
    const limiter = new RateLimiter(new MemoryCacheStore());
    await limiter.hit('global', 'a', 1, 60);
    expect((await limiter.hit('leads', 'a', 1, 60)).allowed).toBe(true);
  });
});
