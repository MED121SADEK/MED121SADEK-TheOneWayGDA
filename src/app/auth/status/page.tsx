'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft, Loader2, Mail, Shield, Clock, XCircle,
  CheckCircle2, RefreshCw, LogIn,
} from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

type VisitorStatus = 'pending' | 'accepted' | 'rejected' | 'unknown' | null

const POLL_INTERVAL = 15 // seconds

function StatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [status, setStatus] = useState<VisitorStatus>(null)
  const [name, setName] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const [firstCheck, setFirstCheck] = useState(true)

  const checkStatus = useCallback(async () => {
    if (!email) return
    setChecking(true)
    setError('')

    try {
      const res = await fetch(`/api/visitor?email=${encodeURIComponent(email)}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setStatus(data.status || 'unknown')
      setName(data.name || null)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setChecking(false)
      setFirstCheck(false)
    }
  }, [email])

  // Auto-poll when status is pending
  useEffect(() => {
    if (status !== 'pending') return

    setCountdown(POLL_INTERVAL)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkStatus()
          return POLL_INTERVAL
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, checkStatus])

  // Run initial check on mount if email is present
  useEffect(() => {
    if (email) {
      checkStatus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayEmail = email || '—'

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

          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="size-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Access Request Status</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Checking onboarding status for your account
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Email display */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" />
                <span>{displayEmail}</span>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
                  {error}
                </div>
              )}

              {/* Status result */}
              <AnimatePresence mode="wait">
                {status === 'pending' && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-5 py-4 flex items-start gap-3">
                      <Clock className="size-5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground/90">Still Under Review</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your access request is being reviewed by an administrator. This page will automatically refresh.
                        </p>
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      <span>Next check in {countdown}s</span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={checkStatus}
                      disabled={checking}
                    >
                      {checking ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="size-4 mr-2" />
                          Check Now
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}

                {status === 'accepted' && (
                  <motion.div
                    key="accepted"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-5 py-4 flex items-start gap-3">
                      <CheckCircle2 className="size-5 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground/90">
                          {name ? `Welcome, ${name}!` : 'Request Approved'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your access has been approved. You can now sign in to your account.
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => router.push('/auth/login')}
                    >
                      <LogIn className="size-4 mr-2" />
                      Continue to Login
                    </Button>
                  </motion.div>
                )}

                {status === 'rejected' && (
                  <motion.div
                    key="rejected"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 px-5 py-4 flex items-start gap-3">
                      <XCircle className="size-5 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground/90">Access Declined</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your application was not approved at this time. If you believe this is an error, please contact an administrator.
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/auth/login')}
                    >
                      Back to Login
                    </Button>
                  </motion.div>
                )}

                {status === 'unknown' && !checking && !firstCheck && (
                  <motion.div
                    key="unknown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-5 py-4 text-sm text-foreground/90">
                      No registration found for this email address.
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/auth/register')}
                    >
                      Request Access
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual check button (shown only when no actionable status yet) */}
              {!status && !error && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={checkStatus}
                  disabled={checking || !email}
                >
                  {checking ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4 mr-2" />
                      Check Status
                    </>
                  )}
                </Button>
              )}

              {/* Back to login link */}
              <div className="text-center pt-1">
                <Link
                  href="/auth/login"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>

        </motion.div>
      </div>
    </div>
  )
}

export default function StatusPage() {
  return (
    <Suspense>
      <StatusContent />
    </Suspense>
  )
}