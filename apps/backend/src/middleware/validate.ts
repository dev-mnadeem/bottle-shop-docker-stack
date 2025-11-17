import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export type RequestPart = 'body' | 'query' | 'params';

/**
 * Replaces the raw request part with the parsed result, so handlers receive
 * coerced, trimmed, typed values and unknown keys are already stripped.
 */
export function validate(schema: ZodTypeAny, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 4 defines `query` as a getter on some versions, so assign via
    // defineProperty rather than plain assignment.
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    next();
  };
}
