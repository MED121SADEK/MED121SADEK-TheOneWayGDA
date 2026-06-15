import { NextRequest, NextResponse } from 'next/server'

/**
 * Optimized Middleware — security, rate limiting, request logging
 *
 * Optimizations:
 *  - Skips static assets entirely (no processing overhead)
 *  - Reduced matcher scope for faster page loads
 *  - Per-sub-route rate limit buckets (no cross-route sharing)
 *  - Longest-prefix matching for precise route limits
 *  - Cache headers for static-like responses
 */

// Patterns to block (basic WAF)
const BLOCKED_PATTERNS = [
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=)/i,
  /(?:\.\.\/|\.\.\\)/,
]

// In-memory rate limit store (per IP per route prefix, per minute window)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000

// Per-sub-route rate limits — longest prefix match wins.
// Each sub-route gets its own bucket, preventing cross-route exhaustion.
const ROUTE_LIMITS: Record<string, number> = {
  'default': 120,
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

// Longest-prefix matching: finds the most specific route limit
function getRateLimit(path: string): number {
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

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number; resetAt: number } {
  const max = getRateLimit(path)
  // Key = IP + path prefix (first 80 chars) — per-route bucketing
  const key = `${ip}:${path.substring(0, 80)}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitStore.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, max - entry.count)
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS

  // Cleanup old entries periodically
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(k)
    }
  }

  return { allowed: entry.count <= max, remaining, resetAt }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') || 'unknown'

  // ── Protect admin routes ──
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('oneway-admin-token')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── API route processing ──
  if (pathname.startsWith('/api/')) {
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''

    // WAF check (only for write methods)
    if (method !== 'GET' && method !== 'HEAD') {
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(url) || pattern.test(userAgent)) {
          return NextResponse.json(
            { error: 'Request blocked by security policy' },
            { status: 403 }
          )
        }
      }
    }

    // Rate limiting (skip for GET health checks)
    if (!pathname.startsWith('/api/health')) {
      const rl = checkRateLimit(ip, pathname)
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
            },
          }
        )
      }

      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
      response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))
      return response
    }

    return NextResponse.next()
  }

  // ── Standard page response (minimal overhead) ──
  const response = NextResponse.next()
  response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  return response
}

// Optimized matcher — exclude more static paths from middleware
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    // Only process page routes, exclude all Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml).*)',
  ],
}