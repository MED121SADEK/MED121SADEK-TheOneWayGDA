'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Mail, Lock, Shield, Clock, XCircle, MailCheck } from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

type BlockedState = {
  type: 'pending' | 'rejected'
  email: string
  name?: string | null
  message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blockedState, setBlockedState] = useState<BlockedState | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBlockedState(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      // Handle pending / rejected users
      if (data.status === 'pending' || data.status === 'rejected') {
        setBlockedState({
          type: data.status,
          email: data.email,
          name: data.name,
          message: data.message,
        })
        return
      }

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Store token
      localStorage.setItem('oneway-auth-token', data.token)
      localStorage.setItem('oneway-user', JSON.stringify(data.user))

      // Also update the visitor session
      localStorage.setItem('oneway-visitor-session', JSON.stringify({
        email: data.user.email,
        name: data.user.name || data.user.email.split('@')[0],
      }))

      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearBlocked = () => {
    setBlockedState(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            <span className="text-xs">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="font-bold gradient-text-premium text-sm">TheOneWayGDA</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div {...fadeUp} className="w-full max-w-md">

          <AnimatePresence mode="wait">
            {blockedState?.type === 'pending' ? (
              /* ─── Pending Review ─── */
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <Clock className="size-8 text-amber-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Still Under Review</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Your account has not been approved yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-5">
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-5 py-4">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {blockedState.message}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <MailCheck className="size-3.5" />
                      <span>Notification will be sent to {blockedState.email}</span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={clearBlocked}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : blockedState?.type === 'rejected' ? (
              /* ─── Rejected ─── */
              <motion.div
                key="rejected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                      <XCircle className="size-8 text-rose-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Access Declined</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Your application was not approved at this time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-5">
                    <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 px-5 py-4">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {blockedState.message}
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={clearBlocked}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* ─── Normal Login Form ─── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Shield className="size-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Sign in to access your dashboard and workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                      {error && (
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            required
                            disabled={loading}
                            minLength={6}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={loading || !email.trim() || !password}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>

                      <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground">
                          Don&apos;t have an account?{' '}
                          <Link href="/auth/register" className="text-primary hover:underline font-medium">
                            Request access
                          </Link>
                        </p>
                      </div>

                      <div className="flex items-center justify-center pt-1">
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary/60">
                          <Shield className="size-2.5" />
                          AES-256 Encrypted
                        </Badge>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  )
}
