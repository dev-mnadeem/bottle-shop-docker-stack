import type { TokenClaims } from '../services/authService';

declare global {
  namespace Express {
    interface Request {
      /** Verified JWT claims. Present only after requireAuth has run. */
      auth?: TokenClaims;
    }
  }
}

export {};
