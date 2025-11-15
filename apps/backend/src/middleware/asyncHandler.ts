import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not await a handler, so a rejected promise from an `async`
 * middleware is an unhandled rejection rather than a 500 — the request simply
 * hangs until it times out. Every async handler goes through this wrapper, which
 * forwards the rejection to the error middleware.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
