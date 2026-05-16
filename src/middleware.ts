import { NextRequest, NextResponse } from 'next/server'

/**
 * Enhanced Middleware — request logging, security, admin protection
 *
 * Responsibilities:
 *  1. Protect /admin/* routes (cookie-based auth)
 *  2. Log all API requests with timing
 *  3. Add security headers
 *  4. Block suspicious user agents
 */

// Patterns to block (basic WAF)
const BLOCKED_PATTERNS = [
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=)/i,
  /(?:\.\.\/|\.\.\\)/, // path traversal
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startTime = Date.now()
  const method = request.method

  // ── Protect admin routes ──
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('oneway-admin-token')?.value
    if (!adminToken) {
      logRequest(method, pathname, 302, startTime, 'admin-redirect')
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Basic WAF for API routes ──
  if (pathname.startsWith('/api/')) {
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        logRequest(method, pathname, 403, startTime, 'waf-blocked')
        return NextResponse.json(
          { error: 'Request blocked by security policy' },
          { status: 403 }
        )
      }
    }
  }

  // ── Add response interceptor for logging ──
  const response = NextResponse.next()

  response.headers.set('X-Request-Id', crypto.randomUUID().slice(0, 8))

  // Schedule logging after response is sent
  if (pathname.startsWith('/api/')) {
    // We log the request on the way in; response status is logged by the API routes themselves
    logRequest(method, pathname, 0, startTime, 'incoming')
  }

  return response
}

function logRequest(
  method: string,
  pathname: string,
  status: number,
  startTime: number,
  tag: string
) {
  const duration = Date.now() - startTime
  const entry = {
    timestamp: new Date().toISOString(),
    level: status >= 400 ? 'warn' : 'info',
    message: `${method} ${pathname}`,
    status,
    durationMs: duration,
    tag,
  }

  // Use structured JSON in production, colored text in development
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry))
  } else {
    const color = status >= 400 ? '\x1b[33m' : '\x1b[32m'
    const reset = '\x1b[0m'
    const time = entry.timestamp.split('T')[1]?.split('.')[0] || ''
    console.log(`${color}${tag.toUpperCase().padEnd(14)}${reset} ${time} ${method.padEnd(6)} ${pathname} ${status ? `→ ${status}` : ''} ${duration}ms`)
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}
