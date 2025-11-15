import type { Request } from 'express';

/**
 * pino-http types `req.id` as string | number | object. The generator in
 * logger.ts only ever produces a string, so this narrows it once instead of
 * stringifying an unknown shape at every call site.
 */
export function requestId(req: Request): string | undefined {
  const { id } = req;
  return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : undefined;
}
