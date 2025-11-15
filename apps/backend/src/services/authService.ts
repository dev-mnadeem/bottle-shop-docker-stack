import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_TTL, BCRYPT_ROUNDS } from '../config/constants';
import { env } from '../config/env';
import { AuthError, ConflictError } from '../middleware/error';
import type { User, UserRole } from '../entities/User';
import type { CacheStore } from '../ports/cacheStore';
import type { UserRepository } from '../ports/userRepository';

export interface TokenClaims {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
  jti: string;
}

const DENY_LIST_PREFIX = 'jwt:revoked:';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly store: CacheStore,
  ) {}

  async register(email: string, password: string): Promise<User> {
    const normalised = email.trim().toLowerCase();
    if (await this.users.findByEmail(normalised)) {
      throw new ConflictError('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return this.users.create({ email: normalised, passwordHash, role: 'user' });
  }

  async login(email: string, password: string): Promise<{ token: string; expiresIn: string }> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    // The same error for "no such user" and "wrong password" so the endpoint
    // cannot be used to enumerate registered addresses.
    if (!user) throw new AuthError('Invalid credentials');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new AuthError('Invalid credentials');
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL,
      jwtid: randomUUID(),
    });
    return { token, expiresIn: ACCESS_TOKEN_TTL };
  }

  /**
   * Access tokens are short-lived and self-contained, so logout records the jti
   * on a deny list that expires exactly when the token would have. The list lives
   * in the shared store: with two replicas behind Nginx, a per-process Set would
   * leave the token working on whichever replica did not handle the logout.
   */
  async revoke(claims: TokenClaims): Promise<void> {
    const remaining = Math.max(1, claims.exp - Math.floor(Date.now() / 1000));
    await this.store.set(`${DENY_LIST_PREFIX}${claims.jti}`, '1', remaining);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return (await this.store.get(`${DENY_LIST_PREFIX}${jti}`)) === '1';
  }

  verify(token: string): TokenClaims {
    let decoded: jwt.JwtPayload;
    try {
      // `algorithms` is pinned: without it a token with alg=none or a different
      // family would be accepted by the library's defaults.
      decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      throw new AuthError('Invalid or expired token');
    }

    const { sub, email, role, exp, jti } = decoded;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof exp !== 'number' ||
      typeof jti !== 'string'
    ) {
      throw new AuthError('Malformed token');
    }
    return { userId: sub, email, role: role === 'admin' ? 'admin' : 'user', exp, jti };
  }
}
