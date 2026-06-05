'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowRight, Loader2, Clock, ShieldCheck } from 'lucide-react'

export default function CheckoutSuccessPage() {
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const token = localStorage.getItem('oneway-auth-token')
        if (token) {
          const res = await fetch('/api/billing', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setSubscriptionStatus(data.subscription?.status || null)
          }
        }
      } catch {
        // fallback: just show success
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  const isPending = subscriptionStatus === 'pending_approval'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="card-premium overflow-hidden">
          <div className={`px-6 pt-8 pb-4 text-center ${
            isPending
              ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10'
              : 'bg-gradient-to-br from-emerald-500/10 via-primary/5 to-violet-500/10'
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={`inline-flex items-center justify-center size-16 rounded-full mb-4 ${
                isPending ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`}
            >
              {isPending ? (
                <Clock className="size-8 text-amber-400" />
              ) : (
                <CheckCircle2 className="size-8 text-emerald-400" />
              )}
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isPending ? 'Payment Received!' : 'Payment Successful!'}
            </h1>
          </div>

          <CardContent className="pt-6 pb-8 text-center space-y-4">
            {isPending ? (
              <>
                <p className="text-muted-foreground">
                  Your payment has been processed successfully. Your subscription is now <span className="font-semibold text-amber-500">pending admin approval</span>.
                </p>

                <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/15">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <ShieldCheck className="size-4 text-amber-500" />
                    <span className="text-muted-foreground">
                      Our team will review and activate your subscription shortly
                    </span>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="size-4 text-amber-500" />
                    <span className="text-muted-foreground text-xs">
                      You will receive an email notification once approved
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Your subscription has been activated. Welcome to the premium experience!
                </p>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-muted-foreground">
                      Your new plan features are now available
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3 pt-2">
              <Button asChild className="w-full rounded-full" size="lg">
                <Link href="/billing">
                  View My Subscription
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full text-muted-foreground">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
