/**
 * Two different bases on purpose.
 *
 * The browser must use a URL it can actually resolve — in the Compose stack that
 * is the same-origin `/api` path served by Nginx. Server-side rendering runs
 * inside the container network, where `localhost` is the frontend container
 * itself, so it uses the internal service name instead.
 */
export const env = {
  /** Used by client components. Must be reachable from the visitor's browser. */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  /** Used during SSR. Must be reachable from the frontend process. */
  internalApiBaseUrl:
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
} as const;
