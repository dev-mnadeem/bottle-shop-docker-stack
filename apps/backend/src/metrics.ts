import express from 'express';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  // Labelled by route pattern, not req.path: labelling by the raw path makes
  // /api/products/:slug one time series per slug and eventually explodes the
  // registry's cardinality.
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const cacheEvents = new Counter({
  name: 'product_cache_events_total',
  help: 'Product cache hits and misses',
  labelNames: ['result'] as const,
  registers: [registry],
});

export function metricsRouter(): express.Router {
  const router = express.Router();
  router.get('/metrics', (_req, res, next): void => {
    registry
      .metrics()
      .then((body) => {
        res.set('Content-Type', registry.contentType).send(body);
      })
      .catch(next);
  });
  return router;
}

/** Records duration against the matched Express route, falling back to a constant. */
export function metricsMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const stop = httpRequestDuration.startTimer({ method: req.method });
    res.on('finish', () => {
      // `req.route` is only populated once a handler has matched, and Express
      // types it as `any`; anything unmatched is bucketed under one label.
      const route: unknown = (req as { route?: { path?: unknown } }).route?.path;
      stop({
        route: typeof route === 'string' ? route : 'unmatched',
        status_code: String(res.statusCode),
      });
    });
    next();
  };
}
