/**
 * P1-5: Distributed Rate Limiting
 *
 * Unified rate limiter backed by Upstash Redis (HTTP REST) with automatic
 * in-memory fallback. Designed to work in both Edge Runtime (middleware)
 * and Node.js Runtime (API routes).
 *
 * When REDIS_URL is set → limits are shared across all serverless instances.
 * When Redis is unavailable/unconfigured → gracefully degrades to in-memory
 * (single-instance only — suitable for local development).
 *
 * Strategy:
 *   - Raw Redis INCR + EXPIRE for per-route rate limiting (no fixed-window
 *     class needed; each call can specify a different limit).
 *   - In-memory Map mirrors the same fixed-window semantics as the original
 *     implementation (zero behavior change when Redis is absent).
 *   - Lazy init: Redis client created on first use, result cached.
 *   - Single source of truth for all rate limit configuration.
 */

import { Redis } from '@upstash/redis'

// ─── Configuration ───────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute window

/**
 * Per-sub-route rate limits — longest prefix match wins.
 * Each sub-route gets its own bucket, preventing cross-route exhaustion.
 */
export const ROUTE_LIMITS: Record<string, number> = {
  default: 120,
  // Auth: strict on login/register to prevent brute-force
  '/api/auth/login': 30,
  '/api/auth/register': 10,
  '/api/auth/forgot-password': 5,
  '/api/auth/reset-password': 5,
  '/api/auth': 300,             // Other auth (me, stats, activity)
  // AI: per-endpoint bucketing so copilot/assistant/workflow don't share limits
  '/api/ai/copilot': 60,
  '/api/ai/assistant': 60,
  '/api/ai/workflow': 30,      // Pipeline execution is expensive
  '/api/workflow/flagship': 30,
  '/api/ai': 120,               // Other AI (extensions, governance, SDK, etc.)
  '/api/leaderboard': 200,
  '/api/scan': 20,               // Document scanning (calls AI vision)
  '/api/community/posts': 60,     // Community writes
  '/api/search': 120,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  /** Seconds until the window resets — only set when rate limited */
  retryAfter?: number
}

// ─── Route matching ──────────────────────────────────────────────────────────

/** Longest-prefix matching: finds the most specific route limit. */
export function getRouteLimit(path: string): number {
  let bestLen = 0
  let bestLimit = ROUTE_LIMITS.default
  for (const [route, limit] of Object.entries(ROUTE_LIMITS)) {
    if (route === 'default') continue
    if (path.startsWith(route) && route.length > bestLen) {
      bestLen = route.length
      bestLimit = limit
    }
  }
  return bestLimit
}

// ─── Redis client (lazy, singleton) ──────────────────────────────────────────

let _redis: Redis | null = null
let _redisAvailable: boolean | null = null
let _redisInitPromise: Promise<void> | null = null

/**
 * Lazy-initializes the Redis client.
 * Returns the client if available, null otherwise.
 * The availability result is cached after the first call.
 */
async function getRedis(): Promise<Redis | null> {
  if (_redisAvailable !== null) return _redisAvailable ? _redis : null
  if (_redisInitPromise) {
    await _redisInitPromise
    return _redisAvailable ? _redis : null
  }

  _redisInitPromise = (async () => {
    try {
      const redisUrl = process.env.REDIS_URL
      if (!redisUrl) {
        _redisAvailable = false
        return
      }

      // Support both Upstash (REST URL + token) and generic Redis (single URL)
      const restUrl = process.env.UPSTASH_REDIS_REST_URL
      const restToken = process.env.UPSTASH_REDIS_REST_TOKEN

      _redis = new Redis({
        url: restUrl || redisUrl,
        token: restToken || undefined,
      })

      // Verify connectivity
      await _redis.ping()

      _redisAvailable = true
      return
    } catch (err) {
      console.warn(
        '[RateLimit] Redis unavailable — using in-memory fallback:',
        err instanceof Error ? err.message : err,
      )
      _redis = null
      _redisAvailable = false
    }
  })()

  await _redisInitPromise
  return _redisAvailable ? _redis : null
}

// ─── Redis rate limit (INCR + EXPIRE) ────────────────────────────────────────

async function redisCheck(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  // INCR returns the new value (1 on first call)
  const count = await redis.incr(key)

  // Set TTL on first increment so the key auto-expires
  if (count === 1) {
    // Fire-and-forget the EXPIRE — if it fails, the key will persist
    // until the next cleanup cycle (acceptable for rate limiting)
    redis.expire(key, windowSec).catch(() => {})
  }

  const remaining = Math.max(0, limit - count)
  const now = Date.now()
  const resetAt = now + windowSec * 1000
  const allowed = count <= limit

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : windowSec,
  }
}

// ─── In-memory fallback ──────────────────────────────────────────────────────

const memoryStore = new Map<string, { count: number; windowStart: number }>()

function memoryCheck(key: string, limit: number, now: number): RateLimitResult {
  let entry = memoryStore.get(key)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    memoryStore.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS
  const allowed = entry.count <= limit

  // Lazy cleanup when store grows large
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) memoryStore.delete(k)
    }
  }

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given identifier (IP) and route path.
 *
 * - Redis available → INCR + EXPIRE (shared across all instances)
 * - Redis unavailable → in-memory Map (single-instance, dev mode)
 *
 * @param identifier  Client IP address
 * @param path        Request pathname (used for per-route bucketing)
 * @param customLimit Override the per-route limit (e.g. ApiKey.rateLimit)
 * @param windowMs    Override the window duration (default: 60s)
 */
export async function rateLimit(
  identifier: string,
  path: string,
  customLimit?: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): Promise<RateLimitResult> {
  const limit = customLimit ?? getRouteLimit(path)
  const key = `rl:${identifier}:${path.substring(0, 80)}`

  const redis = await getRedis()
  if (redis) {
    try {
      return await redisCheck(redis, key, limit, Math.ceil(windowMs / 1000))
    } catch (err) {
      console.warn('[RateLimit] Redis check failed, falling back to memory:', err instanceof Error ? err.message : err)
    }
  }

  return memoryCheck(key, limit, Date.now())
}

/**
 * Simple rate limit for non-route-scoped usage (e.g. visitor registration).
 * Uses a single bucket per identifier.
 *
 * @param identifier  Client IP address
 * @param limit       Max requests per window
 * @param windowMs    Window duration (default: 60s)
 */
export async function simpleRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): Promise<RateLimitResult> {
  const key = `rl:simple:${identifier}`

  const redis = await getRedis()
  if (redis) {
    try {
      return await redisCheck(redis, key, limit, Math.ceil(windowMs / 1000))
    } catch (err) {
      console.warn('[RateLimit] Redis simple check failed, falling back to memory:', err instanceof Error ? err.message : err)
    }
  }

  return memoryCheck(key, limit, Date.now())
}

/**
 * Check if Redis is available. Useful for health checks and diagnostics.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const redis = await getRedis()
  return redis !== null
}