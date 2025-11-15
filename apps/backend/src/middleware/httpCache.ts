import { createHash } from 'node:crypto';
import { PRODUCT_CACHE_CONTROL } from '../config/constants';
import type { Response } from 'express';

export interface CacheMeta {
  cacheHit: boolean;
  queryMs?: number;
}

/**
 * Serialises once, derives a weak ETag from that exact bytes, and answers 304 when
 * the client already holds it. `Server-Timing` reports where the time went so the
 * cache can be verified from a browser devtools panel rather than taken on trust.
 */
export function sendCacheable(res: Response, body: unknown, meta: CacheMeta): void {
  const raw = JSON.stringify(body);
  const etag = `W/"${createHash('sha1').update(raw).digest('base64')}"`;

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', PRODUCT_CACHE_CONTROL);

  const timing = [`cache;desc="${meta.cacheHit ? 'HIT' : 'MISS'}"`];
  if (typeof meta.queryMs === 'number') timing.unshift(`db;dur=${meta.queryMs}`);
  res.setHeader('Server-Timing', timing.join(', '));

  const ifNoneMatch = res.req.headers['if-none-match'];
  if (typeof ifNoneMatch === 'string' && ifNoneMatch.split(',').some((t) => t.trim() === etag)) {
    res.status(304).end();
    return;
  }

  res.type('application/json').send(raw);
}
