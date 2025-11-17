import { ZodError } from 'zod';
import { logger } from '../logger';
import { requestId } from './requestId';
import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message, 'NotFound');
  }
}

export class AuthError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'Unauthorized');
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message, 'Forbidden');
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message, 'Conflict');
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too Many Requests') {
    super(429, message, 'TooManyRequests');
  }
}

interface ErrorBody {
  error: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const id = requestId(req);

  // A handler that threw after the response started cannot be rewritten; handing
  // it to Express lets the connection be torn down instead of crashing on a
  // second set of headers.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: 'ValidationError',
      message: 'Request failed validation',
      requestId: id,
      details: err.flatten(),
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ error: err.code, message: err.message, requestId: id } satisfies ErrorBody);
    return;
  }

  // Anything unrecognised is a bug. It is logged in full and reported as a bare
  // 500 — internal messages and stack traces are not sent to the client.
  logger.error({ err, requestId: id }, 'unhandled error');
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong',
    requestId: id,
  } satisfies ErrorBody);
}
