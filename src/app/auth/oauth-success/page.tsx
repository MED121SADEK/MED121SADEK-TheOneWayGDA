'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OAuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      // Get user info from the session
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            localStorage.setItem('oneway-auth-token', token)
            localStorage.setItem('oneway-user', JSON.stringify(data.user))
            router.push('/dashboard')
          } else {
            router.push('/auth/login?oauth_error=no_user')
          }
        })
        .catch(() => {
          // Even if /me fails, store token and redirect
          localStorage.setItem('oneway-auth-token', token)
          router.push('/dashboard')
        })
    } else {
      router.push('/auth/login?oauth_error=no_token')
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient">
      <div className="text-center space-y-4">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}