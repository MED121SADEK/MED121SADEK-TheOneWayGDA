'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, Shield, MailCheck, AlertTriangle } from 'lucide-react'

type ActionResult = {
  success: boolean
  action: string
  message: string
  userName?: string | null
  userEmail?: string
  error?: string
}

export default function AdminActionPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ActionResult | null>(null)

  useEffect(() => {
    if (!token) {
      setResult({
        success: false,
        action: 'no_token',
        message: 'No action token provided. Please use the link from your email.',
      })
      setLoading(false)
      return
    }

    fetch(`/api/admin/action?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => setResult(data))
      .catch(() => {
        setResult({
          success: false,
          action: 'error',
          message: 'Something went wrong. Please try again or use the admin dashboard.',
        })
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient noise-overlay flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Processing your action...</p>
        </motion.div>
      </div>
    )
  }

  if (!result) return null

  const isApproved = result.action === 'approved' || result.action === 'already_approved'
  const isRejected = result.action === 'rejected'
  const isExpired = result.error === 'expired'
  const isError = !result.success && !isExpired

  return (
    <div className="min-h-screen mesh-gradient noise-overlay flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="font-bold gradient-text-premium text-sm">TheOneWayGDA</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              {/* Icon */}
              <div className="mx-auto mb-4 size-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: isApproved ? 'rgba(16,185,129,0.1)' : isRejected ? 'rgba(239,68,68,0.1)' : isExpired ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                }}
              >
                {isApproved && <CheckCircle2 className="size-8 text-emerald-500" />}
                {isRejected && <XCircle className="size-8 text-rose-500" />}
                {isExpired && <Clock className="size-8 text-amber-500" />}
                {isError && <AlertTriangle className="size-8 text-rose-500" />}
              </div>

              <CardTitle className="text-xl font-bold">
                {isApproved && 'Access Approved!'}
                {isRejected && 'Access Rejected'}
                {isExpired && 'Link Expired'}
                {isError && 'Action Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Message */}
              <div className="rounded-xl px-5 py-4 text-sm text-foreground/90 leading-relaxed text-center"
                style={{
                  background: isApproved ? 'rgba(16,185,129,0.05)' : isRejected ? 'rgba(239,68,68,0.05)' : isExpired ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : isExpired ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                {result.message}
              </div>

              {/* User info */}
              {result.userEmail && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MailCheck className="size-3.5" />
                  <span>{result.userEmail} {isApproved ? 'has been notified' : isRejected ? 'has been notified' : ''}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="w-full" onClick={() => window.location.href = '/admin/approvals'}>
                  <Shield className="size-4 mr-2" />
                  Go to Admin Approvals
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
      </div>
    </div>
  )
}
