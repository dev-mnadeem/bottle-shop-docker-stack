/**
 * Every tunable number in the backend lives here so that a reviewer can see the
 * operating envelope in one screen instead of grepping for literals.
 */

/** Product list page size when the client does not ask for one. */
export const DEFAULT_PAGE_SIZE = 12;

/** Hard ceiling on `?limit=`. Keeps a single request from scanning the table. */
export const MAX_PAGE_SIZE = 100;

/**
 * Only the first few pages of the unfiltered catalogue are cached. Caching every
 * `?page=` a client can type turns the cache into an unbounded write sink that a
 * crawler fills with entries nobody reads again.
 */
export const MAX_CACHEABLE_PAGE = 5;

/** TTL for the cached product list payload. */
export const PRODUCT_LIST_TTL_SECONDS = 60;

/** TTL for a cached single-product payload. Details change less often than the list. */
export const PRODUCT_DETAIL_TTL_SECONDS = 300;

/** How long one loader may hold the stampede lock before others give up waiting. */
export const CACHE_LOCK_TTL_MS = 5_000;

/** Upper bound on the random wait before a blocked reader retries the cache. */
export const CACHE_LOCK_RETRY_MAX_MS = 150;

/** Redis set that records which list keys exist, so a write can invalidate them all. */
export const PRODUCT_CACHE_TAG = 'products:keys';

/** Global rate limit: requests per IP per window. */
export const GLOBAL_RATE_LIMIT_MAX = 600;
export const GLOBAL_RATE_LIMIT_WINDOW_SECONDS = 60;

/** Lead submission is far more expensive (it writes and triages), so it is tighter. */
export const LEAD_RATE_LIMIT_MAX = 5;
export const LEAD_RATE_LIMIT_WINDOW_SECONDS = 60;

/** A request that has not finished in this long is abandoned with 503. */
export const REQUEST_TIMEOUT_MS = 5_000;

/** `Retry-After` sent with a timeout response. */
export const TIMEOUT_RETRY_AFTER_SECONDS = 5;

/** bcrypt work factor for stored password hashes. */
export const BCRYPT_ROUNDS = 12;

/** Access token lifetime. Revocation before this point goes through the deny list. */
export const ACCESS_TOKEN_TTL = '15m';

/** Largest JSON body the API will parse. */
export const JSON_BODY_LIMIT = '256kb';

/** `Cache-Control` for cacheable product responses. */
export const PRODUCT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=120';

/** Longest free-text search term accepted on `?q=`. */
export const MAX_SEARCH_TERM_LENGTH = 80;

/** Longest message body accepted on a lead. */
export const MAX_LEAD_MESSAGE_LENGTH = 2_000;
