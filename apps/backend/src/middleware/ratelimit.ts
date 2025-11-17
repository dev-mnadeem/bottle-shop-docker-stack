import { asyncHandler } from './asyncHandler';
import { requestId } from './requestId';
import type { RateLimiter } from '../services/rateLimiter';
import type { Request, RequestHandler } from 'express';

export interface RateLimitOptions {
  bucket: string;
  max: number;
  windowSeconds: number;
  /** Paths that never consume budget (see the note below). */
  skip?: (req: Request) => boolean;
}

export function rateLimit(limiter: RateLimiter, options: RateLimitOptions): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (options.skip?.(req)) {
      next();
      return;
    }
    {
      // `req.ip` already honours the configured trust-proxy hop count. Reading
      // X-Forwarded-For directly would let any client pick its own bucket by
      // sending a header.
      const identity = req.ip ?? 'unknown';
      const verdict = await limiter.hit(
        options.bucket,
        identity,
        options.max,
        options.windowSeconds,
      );

      res.setHeader('RateLimit-Limit', String(verdict.limit));
      res.setHeader('RateLimit-Remaining', String(verdict.remaining));
      res.setHeader('RateLimit-Reset', String(verdict.resetSeconds));

      if (!verdict.allowed) {
        res.setHeader('Retry-After', String(verdict.resetSeconds));
        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
          requestId: requestId(req),
        });
        return;
      }
      next();
    }
  });
}

/**
 * Liveness and metrics are excluded from the global limit. A Prometheus scrape
 * and a container healthcheck poll on a fixed interval from a fixed address, so
 * leaving them in the counter means monitoring eventually rate-limits the
 * application it is monitoring — and the healthcheck that starts failing is what
 * makes the orchestrator restart a perfectly healthy container.
 */
export const OPERATIONAL_PATHS = new Set(['/health', '/ready', '/metrics']);

export function isOperationalPath(req: Request): boolean {
  return OPERATIONAL_PATHS.has(req.path);
}
