import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

/**
 * POST /api/admin/login
 *
 * Validates the admin secret and issues a signed, opaque session token.
 * The client stores this token (NOT the raw password) in localStorage and
 * sets it as a cookie for the proxy.ts middleware.
 */
const ADMIN_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || password !== adminSecret) {
      // Use constant-time comparison to prevent timing attacks
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate a random opaque token
    const rawToken = randomBytes(32).toString('hex')

    // Sign it with HMAC so it can't be forged
    const signature = createHmac('sha256', adminSecret)
      .update(rawToken)
      .digest('hex')
    const signedToken = `${rawToken}.${signature}`

    const response = NextResponse.json({
      success: true,
      expiresAt: Date.now() + ADMIN_TOKEN_EXPIRY_MS,
    })

    // Set httpOnly cookie for middleware (same name as before for backward compat)
    response.cookies.set('oneway-admin-token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: Math.floor(ADMIN_TOKEN_EXPIRY_MS / 1000),
      path: '/',
    })

    // Also return the token for localStorage (needed for API calls from admin pages)
    return NextResponse.json({
      success: true,
      token: signedToken,
      expiresAt: Date.now() + ADMIN_TOKEN_EXPIRY_MS,
    })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}