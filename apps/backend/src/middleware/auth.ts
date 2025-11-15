import { asyncHandler } from './asyncHandler';
import { AuthError, ForbiddenError } from './error';
import type { UserRole } from '../entities/User';
import type { AuthService } from '../services/authService';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const BEARER = 'Bearer ';

export function requireAuth(auth: AuthService): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER)) throw new AuthError('Missing bearer token');

    const claims = auth.verify(header.slice(BEARER.length));
    if (await auth.isRevoked(claims.jti)) throw new AuthError('Token revoked');

    req.auth = claims;
    next();
  });
}

/**
 * Role check, separate from authentication. Catalogue writes used to be reachable
 * by anyone who could register, because the route only asked whether the caller
 * held a valid token.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AuthError('Missing bearer token'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}
