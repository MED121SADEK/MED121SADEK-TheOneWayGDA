'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft, CreditCard, RotateCcw } from 'lucide-react'

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="card-premium overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 px-6 pt-8 pb-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center size-16 rounded-full bg-amber-500/10 mb-4"
            >
              <XCircle className="size-8 text-amber-400" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Canceled</h1>
          </div>

          <CardContent className="pt-6 pb-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Your payment was not completed. No charges have been made.
            </p>

            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-muted-foreground">
                You can try again whenever you&apos;re ready. Your account will remain on the Free plan.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button asChild className="w-full rounded-full" size="lg">
                <Link href="/billing">
                  <RotateCcw className="size-4 mr-2" />
                  Try Again
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
