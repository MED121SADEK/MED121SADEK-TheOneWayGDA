import { NextResponse } from 'next/server'

/**
 * API Caching utilities for Next.js route handlers.
 */

interface CacheOptions {
  maxAge?: number       // s-maxage in seconds
  staleWhileRevalidate?: number // SWR window in seconds
  clientMaxAge?: number  // max-age for client cache
  immutable?: boolean    // immutable cache
  noStore?: boolean      // no-cache, no-store
}

const PRESETS: Record<string, CacheOptions> = {
  none: { noStore: true },
  short: { maxAge: 60, staleWhileRevalidate: 300, clientMaxAge: 30 },
  medium: { maxAge: 300, staleWhileRevalidate: 600, clientMaxAge: 60 },
  long: { maxAge: 3600, staleWhileRevalidate: 86400, clientMaxAge: 300 },
  immutable: { maxAge: 31536000, immutable: true },
  clientOnly: { clientMaxAge: 60, noStore: true },
}

/**
 * Set cache headers on a NextResponse.
 */
export function setCacheHeaders(response: NextResponse, options: CacheOptions = {}) {
  if (options.noStore) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  const directives: string[] = []

  if (options.immutable) {
    directives.push('public', 'max-age=31536000', 'immutable')
  } else {
    if (options.maxAge) {
      directives.push('s-maxage=' + options.maxAge)
    }
    if (options.staleWhileRevalidate) {
      directives.push('stale-while-revalidate=' + options.staleWhileRevalidate)
    }
    if (options.clientMaxAge) {
      directives.push('max-age=' + options.clientMaxAge)
    } else {
      directives.push('max-age=0')
    }
    directives.push('public')
  }

  response.headers.set('Cache-Control', directives.join(', '))
  return response
}

/**
 * Create a cached JSON response.
 */
export function cachedJson(data: unknown, preset: string = 'short', init?: ResponseInit) {
  const options = PRESETS[preset] || PRESETS.short
  const response = NextResponse.json(data, init)
  return setCacheHeaders(response, options)
}
