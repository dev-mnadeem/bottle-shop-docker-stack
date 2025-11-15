import 'reflect-metadata';
import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import {
  GLOBAL_RATE_LIMIT_MAX,
  GLOBAL_RATE_LIMIT_WINDOW_SECONDS,
  JSON_BODY_LIMIT,
  REQUEST_TIMEOUT_MS,
  TIMEOUT_RETRY_AFTER_SECONDS,
} from './config/constants';
import { corsOrigins, env } from './config/env';
import { httpLogger } from './logger';
import { metricsMiddleware } from './metrics';
import { errorHandler, NotFoundError } from './middleware/error';
import { isOperationalPath, rateLimit } from './middleware/ratelimit';
import { requestTimeout } from './middleware/timeout';
import { registerRoutes } from './routes';
import type { Container } from './container';

/** Nginx is the only proxy in front of the API, so exactly one hop is trusted. */
const TRUSTED_PROXY_HOPS = 1;

export function buildExpressApp(container: Container): Application {
  const app = express();

  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      // In production only the configured origins are allowed. `true` here would
      // reflect whatever Origin the caller sent, which is not an allowlist.
      origin: env.NODE_ENV === 'production' ? corsOrigins : true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(httpLogger);
  app.use(requestTimeout(REQUEST_TIMEOUT_MS, TIMEOUT_RETRY_AFTER_SECONDS));
  app.use(metricsMiddleware());

  app.use(
    rateLimit(container.limiter, {
      bucket: 'global',
      max: GLOBAL_RATE_LIMIT_MAX,
      windowSeconds: GLOBAL_RATE_LIMIT_WINDOW_SECONDS,
      skip: isOperationalPath,
    }),
  );

  registerRoutes(app, container);

  app.use((req, _res, next) => next(new NotFoundError(`No route for ${req.method} ${req.path}`)));
  app.use(errorHandler);

  return app;
}
