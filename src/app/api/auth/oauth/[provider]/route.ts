import { NextRequest, NextResponse } from 'next/server'
import { getProvider, generateState, getAuthorizationUrl } from '@/lib/oauth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params

  const provider = getProvider(providerName)
  if (!provider) {
    return NextResponse.json({ error: `Unsupported or unconfigured provider: ${providerName}` }, { status: 400 })
  }

  const state = generateState()

  // Store state in a cookie for verification
  const response = NextResponse.redirect(getAuthorizationUrl(provider, state))
  response.cookies.set('oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  response.cookies.set('oauth-provider', providerName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}