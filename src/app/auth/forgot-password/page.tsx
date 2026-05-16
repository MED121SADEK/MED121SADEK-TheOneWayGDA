'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Mail, Loader2, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setSent(true)
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
          <Link href="/auth/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            <span className="text-xs">Back to Login</span>
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

          {!sent ? (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <KeyRound className="size-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Enter your email and we&apos;ll send you a reset link
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
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

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading || !email.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="size-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="text-sm text-muted-foreground">
                      Remember your password?{' '}
                      <Link href="/auth/login" className="text-primary hover:underline font-medium">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  We sent a password reset link to your email
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-5 py-4">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    If an account exists with <strong className="text-primary">{email}</strong>, you will receive a password reset link shortly. The link expires in 1 hour.
                  </p>
                </div>

                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-5 py-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-amber-500">Don&apos;t see the email?</strong> Check your spam or junk folder. If you still don&apos;t see it, you can request a new link.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setSent(false); setEmail('') }}>
                    Try Different Email
                  </Button>
                  <Link href="/auth/login" className="flex-1">
                    <Button variant="default" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </div>
    </div>
  )
}
