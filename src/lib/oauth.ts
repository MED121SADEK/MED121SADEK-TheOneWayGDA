/**
 * ═══════════════════════════════════════════════════════════
 *  OAuth Provider Configuration & Helpers
 *  Providers: Google, GitHub, GitLab, Microsoft
 * ═══════════════════════════════════════════════════════════
 */

import { randomBytes } from 'crypto'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || ''

export interface OAuthProvider {
  name: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  clientSecret: string
  scopes: string
  icon: string // icon component name
  brandColor: string
}

export interface OAuthUserInfo {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date | null
}

function getProviders(): Record<string, OAuthProvider> {
  return {
    google: {
      name: 'Google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      scopes: 'openid email profile',
      icon: 'Chrome',
      brandColor: '#4285F4',
    },
    github: {
      name: 'GitHub',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      scopes: 'user:email',
      icon: 'Github',
      brandColor: '#333',
    },
    gitlab: {
      name: 'GitLab',
      authorizationUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      userInfoUrl: 'https://gitlab.com/api/v4/user',
      clientId: process.env.GITLAB_CLIENT_ID || '',
      clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
      scopes: 'read_user',
      icon: 'GitBranch',
      brandColor: '#FC6D26',
    },
    microsoft: {
      name: 'Microsoft',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      scopes: 'openid email profile User.Read',
      icon: 'Monitor',
      brandColor: '#00A4EF',
    },
  }
}

export function getProvider(providerName: string): OAuthProvider | null {
  const providers = getProviders()
  const p = providers[providerName]
  if (!p || !p.clientId || !p.clientSecret) return null
  return p
}

export function generateState(): string {
  return randomBytes(32).toString('hex')
}

export function getAuthorizationUrl(provider: OAuthProvider, state: string): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: `${BASE_URL}/api/auth/oauth/${provider.name.toLowerCase()}/callback`,
    response_type: 'code',
    scope: provider.scopes,
    state,
  })

  // GitHub doesn't need access_type
  if (provider.name === 'Google') {
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
  }

  return `${provider.authorizationUrl}?${params.toString()}`
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: `${BASE_URL}/api/auth/oauth/${provider.name.toLowerCase()}/callback`,
    grant_type: 'authorization_code',
  })

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const res = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch user info (${res.status})`)
  }

  const data = await res.json()

  switch (provider.name) {
    case 'Google':
      return {
        id: String(data.id),
        email: data.email,
        name: data.name || data.given_name || null,
        avatarUrl: data.picture || null,
        accessToken,
      }
    case 'GitHub':
      // GitHub may return null email — fetch primary email separately
      let email = data.email
      if (!email) {
        try {
          const emailRes = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          })
          const emails = await emailRes.json()
          const primary = emails.find((e: { primary: boolean }) => e.primary)
          email = primary?.email || emails[0]?.email || ''
        } catch { /* ignore */ }
      }
      return {
        id: String(data.id),
        email: email.toLowerCase(),
        name: data.name || data.login || null,
        avatarUrl: data.avatar_url || null,
        accessToken,
      }
    case 'GitLab':
      return {
        id: String(data.id),
        email: (data.email || '').toLowerCase(),
        name: data.name || data.username || null,
        avatarUrl: data.avatar_url || null,
        accessToken,
      }
    case 'Microsoft':
      // Microsoft /me doesn't return email directly, need to fetch from /me/messages or use email claim
      // The email is in the 'mail' or 'userPrincipalName' field
      return {
        id: data.id,
        email: (data.mail || data.userPrincipalName || '').toLowerCase(),
        name: data.displayName || null,
        avatarUrl: null, // Microsoft Graph doesn't return photo in /me
        accessToken,
      }
    default:
      throw new Error(`Unknown provider: ${provider.name}`)
  }
}