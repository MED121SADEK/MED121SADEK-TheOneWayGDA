import { NextRequest, NextResponse } from 'next/server'

/**
 * Enhanced Middleware — security, rate limiting, request logging
 *
 * Responsibilities:
 *  1. Protect /admin/* routes (cookie-based auth)
 *  2. Rate limit API routes (per-IP sliding window)
 *  3. Basic WAF (SQL injection, XSS, path traversal)
 *  4. Security headers on all responses
 *  5. Structured request logging
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
const RATE_LIMIT_MAX = 120 // requests per minute per IP
const RATE_LIMIT_AUTH_MAX = 300 // higher limit for authenticated routes

function getRateLimitKey(ip: string, path: string): string {
  // Auth routes get higher limits
  const bucket = path.startsWith('/api/auth') ? 'auth' : 'api'
  return `${ip}:${bucket}`
}

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getRateLimitKey(ip, path)
  const max = path.startsWith('/api/auth') ? RATE_LIMIT_AUTH_MAX : RATE_LIMIT_MAX
  const now = Date.now()

  let entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitStore.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, max - entry.count)
  const resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS

  // Cleanup old entries every 100 requests (prevent memory leak)
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(k)
    }
  }

  return { allowed: entry.count <= max, remaining, resetAt }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startTime = Date.now()
  const method = request.method
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') || 'unknown'

  // ── Protect admin routes ──
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('oneway-admin-token')?.value
    if (!adminToken) {
      logRequest(method, pathname, 302, startTime, 'admin-redirect', ip)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── API route processing ──
  if (pathname.startsWith('/api/')) {
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''

    // WAF check
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        logRequest(method, pathname, 403, startTime, 'waf-blocked', ip)
        return NextResponse.json(
          { error: 'Request blocked by security policy' },
          { status: 403 }
        )
      }
    }

    // Rate limiting
    const rl = checkRateLimit(ip, pathname)
    if (!rl.allowed) {
      logRequest(method, pathname, 429, startTime, 'rate-limited', ip)
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

    // Continue with rate limit headers
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
    response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))
    logRequest(method, pathname, 0, startTime, 'incoming', ip)
    return response
  }

  // ── Standard page response ──
  const response = NextResponse.next()
  response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))

  // Security headers for all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

function logRequest(
  method: string,
  pathname: string,
  status: number,
  startTime: number,
  tag: string,
  ip: string,
) {
  const duration = Date.now() - startTime
  const entry = {
    timestamp: new Date().toISOString(),
    level: status >= 400 ? 'warn' : 'info',
    message: `${method} ${pathname}`,
    status,
    durationMs: duration,
    tag,
    ip: ip.slice(0, 12), // truncated for privacy
  }

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry))
  } else {
    const color = status >= 400 ? '\x1b[33m' : '\x1b[32m'
    const reset = '\x1b[0m'
    const time = entry.timestamp.split('T')[1]?.split('.')[0] || ''
    console.log(`${color}${tag.toUpperCase().padEnd(14)}${reset} ${time} ${method.padEnd(6)} ${pathname} ${status ? `→ ${status}` : ''} ${duration}ms [${entry.ip}]`)
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)',
  ],
}
