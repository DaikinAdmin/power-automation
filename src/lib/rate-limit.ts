/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: In-process only — does not share state across multiple Node.js
 * processes / replicas. Suitable for single-instance deployments; for
 * multi-instance production use, replace the Map with a Redis-backed store.
 *
 * A stale-entry cleanup job runs every 5 minutes to prevent unbounded growth.
 */

interface Entry {
  count: number;
  resetAt: number; // unix ms
}

const store = new Map<string, Entry>();

// Purge expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60_000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets (0 when allowed) */
  retryAfterMs: number;
}

/**
 * Check whether the given key is within the allowed rate.
 *
 * @param key      Unique identifier for the rate-limit bucket (e.g. IP address)
 * @param limit    Max requests per window (default 10)
 * @param windowMs Window size in ms (default 60 000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/** Extract a best-effort IP address from a Next.js Request / NextRequest. */
export function getClientIp(request: { headers: { get(key: string): string | null } }): string {
  return (
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
