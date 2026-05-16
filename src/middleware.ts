import { NextRequest, NextResponse } from 'next/server'

/**
 * Optimized Middleware — security, rate limiting, request logging
 *
 * Optimizations:
 *  - Skips static assets entirely (no processing overhead)
 *  - Reduced matcher scope for faster page loads
 *  - Per-route rate limit tiers
 *  - Cache headers for static-like responses
 */

// Patterns to block (basic WAF)
const BLOCKED_PATTERNS = [
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=)/i,
  /(?:\.\.\/|\.\.\\)/,
]

// In-memory rate limit store (per IP, per minute window)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000

// Per-route rate limits
const ROUTE_LIMITS: Record<string, number> = {
  'default': 120,
  '/api/auth': 300,
  '/api/ai': 60,       // AI routes are expensive — lower limit
  '/api/workflow': 30, // Workflow execution is very expensive
  '/api/leaderboard': 200,
}

function getRateLimit(path: string): number {
  for (const [route, limit] of Object.entries(ROUTE_LIMITS)) {
    if (route === 'default') continue
    if (path.startsWith(route)) return limit
  }
  return ROUTE_LIMITS.default
}

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number; resetAt: number } {
  const max = getRateLimit(path)
  const key = `${ip}:${path.startsWith('/api/ai') || path.startsWith('/api/workflow') ? 'heavy' : 'standard'}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitStore.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, max - entry.count)
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS

  // Cleanup old entries every 100 requests
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
