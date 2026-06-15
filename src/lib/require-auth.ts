/**
 * ═══════════════════════════════════════════════════════════════════
 *  AUTH GUARD PATTERN
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This module provides two reusable guards for protecting API routes
 *  that require session-token authentication (mechanism #1 — see
 *  auth.ts for the full architecture overview).
 *
 *  ── How it works ──
 *  1. Extract the Bearer token from the request headers
 *     (Authorization header first, then x-auth-token for legacy support,
 *      then ?token= query param for SSE/EventSource streams)
 *  2. Call verifySession(token) which does a DB lookup on UserSession
 *  3. Return the user object { userId, email, role, name } or null
 *
 *  ── Usage patterns ──
 *
 *  Pattern A — manual null check:
 *    const user = await requireAuth(request)
 *    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *
 *  Pattern B — early return with requireAuthOrRespond:
 *    const { user, response } = await requireAuthOrRespond(request)
 *    if (response) return response
 *
 *  ── What this does NOT cover ──
 *  - Admin cookie auth (handled by proxy.ts middleware for /admin/*)
 *  - Visitor email auth (public, no session needed)
 *  - Role-based authorization (check user.role yourself after auth)
 * ═══════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export type AuthUser = Awaited<ReturnType<typeof verifySession>>

/**
 * Verify the request has a valid, non-expired session.
 * Returns the user object if valid, null if not.
 *
 * Checks:
 * 1. Authorization: Bearer <token> header
 * 2. x-auth-token header (legacy support)
 * 3. Token exists and is not expired in the database
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  let token: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    // Legacy: x-auth-token header
    token = request.headers.get('x-auth-token')
  }

  // For SSE streams, token may still be in query params (EventSource limitation)
  if (!token) {
    const url = new URL(request.url)
    token = url.searchParams.get('token')
  }

  if (!token) return null

  return verifySession(token)
}

/**
 * Shorthand: returns a 401 response if auth fails.
 * Use when you want early return pattern:
 *   const user = await requireAuthOrRespond(request)
 *   if (!user) return // response already sent
 */
export async function requireAuthOrRespond(
  request: NextRequest
): Promise<{ user: AuthUser; response: null } | { user: null; response: NextResponse }> {
  const user = await requireAuth(request)
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="oneway"' } }
      ),
    }
  }
  return { user, response: null }
}