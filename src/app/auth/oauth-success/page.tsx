'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OAuthSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Token is now in a short-lived httpOnly cookie — exchange it via API
    fetch('/api/auth/oauth-exchange', { method: 'POST', credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.token && data.user) {
          localStorage.setItem('oneway-auth-token', data.token)
          localStorage.setItem('oneway-user', JSON.stringify(data.user))
          router.push('/dashboard')
        } else {
          router.push('/auth/login?oauth_error=no_user')
        }
      })
      .catch(() => {
        router.push('/auth/login?oauth_error=exchange_failed')
      })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient">
      <div className="text-center space-y-4">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}