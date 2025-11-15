import { logger } from '../logger';
import type { NextFunction, Request, Response } from 'express';

/**
 * Abandons a request that has taken too long.
 *
 * The 503 is only sent when nothing has been written yet, and the response is
 * marked so a handler that finishes afterwards does not try to send a second
 * one — writing twice raises ERR_HTTP_HEADERS_SENT and takes down the request.
 */
export function requestTimeout(ms: number, retryAfterSeconds: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (res.headersSent || res.writableEnded) return;
      logger.warn({ requestId: req.id, path: req.path }, 'request timed out');
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Request timed out',
        requestId: req.id,
      });
    }, ms);

    // unref so a pending timer never holds the process open during shutdown.
    timer.unref();
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}
