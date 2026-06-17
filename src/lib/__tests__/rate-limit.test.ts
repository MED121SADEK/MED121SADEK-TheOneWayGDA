import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getRouteLimit, ROUTE_LIMITS, type RateLimitResult } from '../rate-limit'

// ── Mock Redis to force in-memory fallback ────────────────
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockRejectedValue(new Error('Redis not configured')),
    incr: vi.fn().mockRejectedValue(new Error('no redis')),
    expire: vi.fn().mockRejectedValue(new Error('no redis')),
  })),
}))

let rateLimit: typeof import('../rate-limit')
let simpleRateLimit: typeof import('../rate-limit')['simpleRateLimit']

beforeEach(async () => {
  vi.resetModules()
  // Ensure Redis env vars are absent so in-memory fallback is used
  delete process.env.REDIS_URL
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN

  rateLimit = await import('../rate-limit')
  simpleRateLimit = rateLimit.simpleRateLimit
})

// ── Tests ──────────────────────────────────────────────────

describe('getRouteLimit', () => {
  it('should return the default limit (120) for unmatched paths', () => {
    expect(getRouteLimit('/api/unknown')).toBe(120)
  })

  it('should match login route', () => {
    expect(getRouteLimit('/api/auth/login')).toBe(30)
  })

  it('should match register route', () => {
    expect(getRouteLimit('/api/auth/register')).toBe(10)
  })

  it('should match forgot-password route', () => {
    expect(getRouteLimit('/api/auth/forgot-password')).toBe(5)
  })

  it('should match copilot route', () => {
    expect(getRouteLimit('/api/ai/copilot')).toBe(60)
  })

  it('should match assistant route', () => {
    expect(getRouteLimit('/api/ai/assistant')).toBe(60)
  })

  it('should match workflow route', () => {
    expect(getRouteLimit('/api/ai/workflow')).toBe(30)
  })

  it('should match scan route', () => {
    expect(getRouteLimit('/api/scan')).toBe(20)
  })

  it('should match community posts route', () => {
    expect(getRouteLimit('/api/community/posts')).toBe(60)
  })

  it('should use longest-prefix match for nested auth routes', () => {
    // /api/auth/me should match /api/auth (300) not /api/auth/login (30)
    expect(getRouteLimit('/api/auth/me')).toBe(300)
  })

  it('should use longest-prefix match for nested AI routes', () => {
    // /api/ai/copilot/suggest-automation should match /api/ai/copilot (60) not /api/ai (120)
    expect(getRouteLimit('/api/ai/copilot/suggest-automation')).toBe(60)
  })

  it('should match generic /api/auth for other auth sub-routes', () => {
    expect(getRouteLimit('/api/auth/activity')).toBe(300)
    expect(getRouteLimit('/api/auth/stats')).toBe(300)
  })

  it('should match generic /api/ai for unspecified AI sub-routes', () => {
    expect(getRouteLimit('/api/ai/extensions')).toBe(120)
    expect(getRouteLimit('/api/ai/governance')).toBe(120)
  })
})

describe('rateLimit (in-memory fallback)', () => {
  it('should allow requests within the limit', async () => {
    const result = await rateLimit.rateLimit('1.2.3.4', '/api/auth/login')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('should block requests when limit is exceeded', async () => {
    const ip = '10.0.0.99'
    const limit = 3 // Very low limit for testing

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      const result = await rateLimit.rateLimit(ip, '/api/auth/login', limit)
      expect(result.allowed).toBe(true)
    }

    // Next request should be blocked
    const blocked = await rateLimit.rateLimit(ip, '/api/auth/login', limit)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeDefined()
    expect(blocked.remaining).toBe(0)
  })

  it('should return correct remaining count', async () => {
    const ip = '10.0.0.50'
    const limit = 5

    const r1 = await rateLimit.rateLimit(ip, '/api/test', limit)
    expect(r1.remaining).toBe(limit - 1)

    const r2 = await rateLimit.rateLimit(ip, '/api/test', limit)
    expect(r2.remaining).toBe(limit - 2)
  })

  it('should set resetAt to a future timestamp', async () => {
    const result = await rateLimit.rateLimit('1.1.1.1', '/api/test')
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000) // Allow slight clock skew
  })

  it('should normalize /api/v1/* paths to /api/* for rate limit matching', async () => {
    // Both paths should use the same bucket (copilot limit = 60)
    const ip = '10.0.0.200'

    const v1Result = await rateLimit.rateLimit(ip, '/api/v1/ai/copilot')
    const plainResult = await rateLimit.rateLimit(ip, '/api/ai/copilot')

    // The v1 path should be normalized and share the same limit
    // Since we already made 1 call via v1, the remaining should be one less
    expect(v1Result.remaining).toBeGreaterThan(plainResult.remaining)
  })

  it('should track different IPs independently', async () => {
    const limit = 2

    // Exhaust IP A
    await rateLimit.rateLimit('ip-a', '/api/test', limit)
    await rateLimit.rateLimit('ip-a', '/api/test', limit)

    // IP B should still be allowed
    const ipBResult = await rateLimit.rateLimit('ip-b', '/api/test', limit)
    expect(ipBResult.allowed).toBe(true)

    // IP A should be blocked
    const ipAResult = await rateLimit.rateLimit('ip-a', '/api/test', limit)
    expect(ipAResult.allowed).toBe(false)
  })

  it('should track different routes independently for same IP', async () => {
    const ip = '10.0.0.77'
    const limit = 1

    await rateLimit.rateLimit(ip, '/api/route-a', limit)
    const blockedA = await rateLimit.rateLimit(ip, '/api/route-a', limit)
    expect(blockedA.allowed).toBe(false)

    // Different route should still be allowed
    const routeB = await rateLimit.rateLimit(ip, '/api/route-b', limit)
    expect(routeB.allowed).toBe(true)
  })
})

describe('simpleRateLimit (in-memory fallback)', () => {
  it('should allow requests within limit', async () => {
    const result = await simpleRateLimit('1.2.3.4', 10)
    expect(result.allowed).toBe(true)
  })

  it('should block requests when limit is exceeded', async () => {
    const ip = '10.0.0.88'
    for (let i = 0; i < 5; i++) {
      await simpleRateLimit(ip, 5)
    }
    const blocked = await simpleRateLimit(ip, 5)
    expect(blocked.allowed).toBe(false)
  })

  it('should use a separate bucket from rateLimit()', async () => {
    const ip = '10.0.0.33'

    // Exhaust simpleRateLimit
    for (let i = 0; i < 2; i++) {
      await simpleRateLimit(ip, 2)
    }

    // rateLimit with a path should still be allowed (different bucket)
    const result = await rateLimit.rateLimit(ip, '/api/test', 2)
    expect(result.allowed).toBe(true)
  })
})