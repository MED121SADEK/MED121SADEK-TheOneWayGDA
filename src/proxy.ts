import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js 16 Proxy — security, rate limiting, request tracking
 *
 * Migration from middleware.ts → proxy.ts (Next.js 16 convention).
 * The proxy function uses the same NextRequest/NextResponse API
 * as the deprecated middleware export.
 *
 * Features:
 *  - WAF (Web Application Firewall) — blocks SQLi, XSS, path traversal
 *  - Per-route rate limiting (4 tiers + default)
 *  - Admin route protection via cookie
 *  - Per-request security headers
 *  - Request ID tracking
 *  - Rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After)
 *
 * Adaptations from middleware.ts:
 *  - Function renamed from `middleware` → `proxy` (Next.js 16 requirement)
 *  - Export uses named `proxy` export (also supports `default` fallback)
 *  - API is identical — no functional changes needed
 *  - config.matcher preserved exactly as-is
 */

// ── WAF Patterns ────────────────────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=)/i,
  /(?:\.\.\/|\.\.\\)/,
]

// ── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000

/** Per-route rate limit tiers */
const ROUTE_LIMITS: Record<string, number> = {
  default: 120,
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

function checkRateLimit(
  ip: string,
  path: string
): { allowed: boolean; remaining: number; resetAt: number } {
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

  // Cleanup stale entries every 100 requests to prevent memory leaks
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(k)
    }
  }

  return { allowed: entry.count <= max, remaining, resetAt }
}

// ── Helper: generate short request ID ───────────────────────────────────────
function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8)
}

// ── Helper: extract client IP ───────────────────────────────────────────────
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

// ── Proxy Handler ───────────────────────────────────────────────────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = getClientIp(request)

  // ── Protect admin routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('oneway-admin-token')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── API route processing ──────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''

    // WAF check (only for write methods — GET/HEAD are safe)
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

    // Rate limiting (skip for health check endpoints)
    if (!pathname.startsWith('/api/health')) {
      const rl = checkRateLimit(ip, pathname)
      if (!rl.allowed) {
        const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retryAfter: retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSeconds),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
            },
          }
        )
      }

      // Attach rate limit headers and request ID
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
      response.headers.set('X-Request-Id', generateRequestId())
      return response
    }

    return NextResponse.next()
  }

  // ── Standard page response (minimal overhead) ─────────────────────────────
  const response = NextResponse.next()
  response.headers.set('X-Request-Id', generateRequestId())

  // Security headers (complement the static headers in next.config.ts)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

// ── Configuration ───────────────────────────────────────────────────────────
// Matcher specifies which routes the proxy should handle.
// Excludes Next.js internals and static assets for performance.
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    // Process all page routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml).*)',
  ],
}
