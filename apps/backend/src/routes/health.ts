import express from 'express';
import { env } from '../config/env';
import type { Container } from '../container';

export function healthRouter(container: Container): express.Router {
  const router = express.Router();

  /** Liveness: the process is up. Deliberately checks no dependency. */
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      commitSha: env.COMMIT_SHA ?? null,
    });
  });

  /**
   * Readiness: can this replica actually serve? A container that is alive but
   * cannot reach Postgres should be taken out of the load balancer, which is a
   * different question from whether to restart it.
   */
  router.get('/ready', (_req, res, next): void => {
    Promise.all([container.checkDatabase(), container.store.ping()])
      .then(([database, cache]) => {
        const ready = database && cache;
        res
          .status(ready ? 200 : 503)
          .json({ status: ready ? 'ready' : 'degraded', database, cache });
      })
      .catch(next);
  });

  return router;
}
