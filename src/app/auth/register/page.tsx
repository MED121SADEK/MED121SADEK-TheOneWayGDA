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
import { ArrowLeft, Loader2, Mail, Lock, User, Shield, Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingState, setPendingState] = useState<{ email: string; name: string | null } | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPendingState(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      })

      const data = await res.json()

      if (!res.ok && data.status !== 'pending') {
        setError(data.error || 'Registration failed')
        return
      }

      // Show pending review screen
      setPendingState({ email: data.email || email, name: data.user?.name || name?.trim() || null })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
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
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div {...fadeUp} className="w-full max-w-md">

          <AnimatePresence mode="wait">
            {pendingState ? (
              /* ─── Pending Review Screen ─── */
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
                    <CardTitle className="text-2xl font-bold">Access Request Submitted</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-2">
                      Thank you, {pendingState.name || 'User'}!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-5">
                    {/* Review message */}
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-5 py-4">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        Your access request is still <span className="font-semibold text-amber-500">under review</span>. Our team is evaluating your application. You will receive an email notification at <span className="font-medium text-foreground">{pendingState.email}</span> as soon as a decision is made.
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-sm text-foreground/80">Your request has been received and is in our queue</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="size-4 rounded-full border-2 border-amber-500/40 mt-0.5 shrink-0 flex items-center justify-center">
                            <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                          </div>
                          <p className="text-sm text-foreground/80">Our team will review your application</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="size-4 rounded-full border-2 border-muted-foreground/20 mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">You&apos;ll receive a confirmation email once approved</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/auth/login')}
                      >
                        Back to Sign In
                      </Button>
                      <Link href="/" className="text-center">
                        <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                          Return to Homepage
                        </span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* ─── Registration Form ─── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="size-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Submit your application to join TheOneWayGDA platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                      {error && (
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10"
                            disabled={loading}
                          />
                        </div>
                      </div>

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
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10"
                            required
                            disabled={loading}
                            minLength={6}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="confirm"
                            type="password"
                            placeholder="Repeat your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        disabled={loading || !email.trim() || !password || password !== confirmPassword}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Submitting Request...
                          </>
                        ) : (
                          'Submit Access Request'
                        )}
                      </Button>

                      <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{' '}
                          <Link href="/auth/login" className="text-primary hover:underline font-medium">
                            Sign in
                          </Link>
                        </p>
                      </div>

                      <div className="flex items-center justify-center pt-1">
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary/60">
                          <Shield className="size-2.5" />
                          Your data is encrypted and secure
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
