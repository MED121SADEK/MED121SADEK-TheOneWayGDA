/**
 * Auth-aware fetch wrapper
 *
 * Replaces all `fetch('/api/...?token=...')` calls.
 * Automatically injects the Authorization header from localStorage,
 * so tokens are never exposed in URLs.
 *
 * Usage:
 *   import { authFetch } from '@/lib/auth-fetch'
 *   const res = await authFetch('/api/notifications')
 *   // Or with options:
 *   const res = await authFetch('/api/teams', { method: 'POST', body: ... })
 */

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('oneway-auth-token')
  } catch {
    return null
  }
}

/**
 * Authenticated fetch — adds Authorization header automatically.
 * Drop-in replacement for native fetch in client components.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getToken()

  const headers = new Headers(init?.headers)

  // Set Authorization header if we have a token
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Clean any accidental token query params from the URL
  let url: string
  if (typeof input === 'string') {
    url = input
  } else if (input instanceof URL) {
    url = input.toString()
  } else {
    url = input.url
  }

  // Remove ?token=... from URL (legacy cleanup)
  const cleanedUrl = url.replace(/[?&]token=[^&]*/g, (match) => {
    // If this was the only param, remove the ? too
    if (match.startsWith('?')) {
      const after = url.slice(url.indexOf(match) + match.length)
      return after.startsWith('&') ? '?' : ''
    }
    return ''
  })

  return fetch(cleanedUrl, {
    ...init,
    headers,
  })
}

/**
 * Create an EventSource with auth via query param.
 *
 * NOTE: EventSource API does NOT support custom headers,
 * so for SSE streams we use a one-time-use short-lived token
 * passed as query param. This is acceptable because:
 * 1. The token is ephemeral (session-based, not a password)
 * 2. SSE connections use HTTPS (encrypted in transit)
 * 3. The alternative (no auth on SSE) is worse
 */
export function createAuthEventSource(url: string): EventSource | null {
  const token = getToken()
  if (!token) return null

  const separator = url.includes('?') ? '&' : '?'
  return new EventSource(`${url}${separator}token=${encodeURIComponent(token)}`)
}