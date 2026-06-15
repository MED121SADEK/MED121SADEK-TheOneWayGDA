import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Optimized Middleware — security, rate limiting, request logging
 *
 * P1-5: Rate limiting now uses distributed Redis (via @upstash/redis) with
 * automatic in-memory fallback when Redis is not configured.
 *
 * Other concerns:
 *  - WAF: basic SQLi / XSS / path-traversal blocking on write methods
 *  - Admin route protection via cookie check
 *  - Security headers on page routes
 *  - Request ID on all responses
 */

// Patterns to block (basic WAF)
const BLOCKED_PATTERNS = [
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=)/i,
  /(?:\.\.\/|\.\.\\)/,
]

export async function middleware(request: NextRequest) {
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

    // Distributed rate limiting (skip for health checks)
    if (!pathname.startsWith('/api/health')) {
      const rl = await rateLimit(ip, pathname)

      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.', retryAfter: rl.retryAfter },
          {
            status: 429,
            headers: {
              'Retry-After': String(rl.retryAfter ?? 60),
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