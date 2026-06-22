import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/auth/oauth-exchange
 *
 * Reads the short-lived httpOnly cookie set by the OAuth callback,
 * validates the session, and returns the token + user data so the
 * client can store them in localStorage.
 *
 * This avoids leaking the session token in the URL query string.
 */
export async function POST(request: NextRequest) {
  try {
    const oauthToken = request.cookies.get('oneway-oauth-token')?.value

    if (!oauthToken) {
      return NextResponse.json({ error: 'No OAuth token found' }, { status: 401 })
    }

    const session = await db.userSession.findUnique({
      where: { token: oauthToken },
      include: { user: true },
    })

    if (!session || new Date(session.expiresAt) < new Date()) {
      // Clean up expired session
      if (session) await db.userSession.delete({ where: { token: oauthToken } })
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const { password: _pw, ...safeUser } = session.user

    const response = NextResponse.json({
      token: oauthToken,
      user: safeUser,
    })

    // Delete the short-lived cookie — no longer needed
    response.cookies.delete('oneway-oauth-token')

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OAuth exchange failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}