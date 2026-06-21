import { NextRequest, NextResponse } from 'next/server'
import { getProvider, exchangeCodeForToken, getUserInfo } from '@/lib/oauth'
import { generateToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params

  // Verify state
  const storedState = request.cookies.get('oauth-state')?.value
  const storedProvider = request.cookies.get('oauth-provider')?.value
  const url = new URL(request.url)
  const returnedState = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=${encodeURIComponent(error)}`)
  }

  if (!storedState || !returnedState || storedState !== returnedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=no_code`)
  }

  const provider = getProvider(providerName)
  if (!provider) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=unsupported_provider`)
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(provider, code)

    // Get user info
    const userInfo = await getUserInfo(provider, tokenData.access_token)

    if (!userInfo.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=no_email`)
    }

    const normalizedEmail = userInfo.email.toLowerCase().trim()

    // Check if an OAuth account already exists for this provider
    const existingOAuth = await db.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: providerName,
          providerId: userInfo.id,
        },
      },
      include: { user: true },
    })

    let userId: string
    let userRole: string
    let isNewUser = false

    if (existingOAuth) {
      // Existing OAuth user — update tokens
      userId = existingOAuth.userId
      userRole = existingOAuth.user.role

      await db.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || existingOAuth.refreshToken,
          expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          email: normalizedEmail,
          name: userInfo.name,
          avatarUrl: userInfo.avatarUrl,
        },
      })
    } else {
      // Check if user exists with this email
      const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })

      if (existingUser) {
        // Link OAuth to existing user
        userId = existingUser.id
        userRole = existingUser.role

        await db.oAuthAccount.create({
          data: {
            userId,
            provider: providerName,
            providerId: userInfo.id,
            email: normalizedEmail,
            name: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          },
        })
      } else {
        // New user — create with 'user' role (immediate access)
        isNewUser = true
        const randomPassword = `oauth_${Date.now()}_${Math.random().toString(36).slice(2)}`

        const newUser = await db.user.create({
          data: {
            email: normalizedEmail,
            name: userInfo.name,
            image: userInfo.avatarUrl,
            password: '', // OAuth users don't have a password
            role: 'pending',
            preferences: JSON.stringify({ theme: 'dark', language: 'en', notifications: true, aiSensitivity: 0.7 }),
          },
        })

        userId = newUser.id
        userRole = 'pending'

        await db.oAuthAccount.create({
          data: {
            userId,
            provider: providerName,
            providerId: userInfo.id,
            email: normalizedEmail,
            name: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          },
        })

        // Create activity log
        await db.userActivity.create({
          data: {
            userId,
            type: 'registration_pending',
            details: JSON.stringify({ method: `oauth_${providerName}`, name: userInfo.name }),
          },
        })

        // Create visitor entry
        await db.visitor.upsert({
          where: { email: normalizedEmail },
          update: { name: userInfo.name, status: 'pending' },
          create: { email: normalizedEmail, name: userInfo.name, status: 'pending' },
        })

        // Send admin notification email
        try {
          const { sendAdminAccessRequestEmail } = await import('@/lib/email')
          sendAdminAccessRequestEmail(userInfo.name, normalizedEmail, userId, null).catch(() => {})
        } catch { /* ignore */ }
      }
    }

    // For pending users, redirect to status page (same as email registration)
    if (userRole === 'pending') {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/status?email=${encodeURIComponent(normalizedEmail)}`
      )
    }

    // For rejected users
    if (userRole === 'rejected') {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=rejected`
      )
    }

    // Approved user — create session
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.userSession.create({
      data: {
        userId,
        token,
        userAgent: request.headers.get('user-agent') || null,
        expiresAt,
      },
    })

    await db.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    })

    await db.userActivity.create({
      data: {
        userId,
        type: 'login',
        details: JSON.stringify({ method: `oauth_${providerName}` }),
      },
    })

    // Set session token in httpOnly cookie (avoids leaking in URL, browser history, logs)
    const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/oauth-success`)

    const response = NextResponse.redirect(redirectUrl.toString())
    response.cookies.set('oneway-oauth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // 60 seconds — client must read and transfer to localStorage
      path: '/',
    })
    response.cookies.delete('oauth-state')
    response.cookies.delete('oauth-provider')
    return response
  } catch (err) {
    console.error(`[OAuth ${providerName}] Error:`, err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/login?oauth_error=server_error`
    )
  }
}