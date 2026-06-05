'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  CreditCard, CheckCircle2, XCircle, Clock, Search, Loader2,
  Mail, Calendar, Crown,
} from 'lucide-react'

interface PendingSubscription {
  id: string
  userId: string
  plan: string
  stripeSubscriptionId: string | null
  currentPeriodStart: string
  currentPeriodEnd: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
    role: string
  }
}

const planBadgeVariant: Record<string, { className: string; label: string }> = {
  pro: { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Pro' },
  enterprise: { className: 'bg-violet-500/15 text-violet-400 border-violet-500/25', label: 'Enterprise' },
  starter: { className: 'bg-sky-500/15 text-sky-400 border-sky-500/25', label: 'Starter' },
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<PendingSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('oneway-auth-token')
      if (!token) return

      const res = await fetch('/api/admin/subscriptions/pending', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) return

      const data = await res.json()
      setSubscriptions(data.pending || data.subscriptions || data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = async (subId: string) => {
    setActionLoading(subId)
    try {
      const token = localStorage.getItem('oneway-auth-token')
      const res = await fetch(`/api/admin/subscriptions/${subId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (res.ok) {
        showToast('success', data.message || 'Subscription approved successfully')
        fetchSubscriptions()
      } else {
        showToast('error', data.error || 'Failed to approve subscription')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (subId: string) => {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return // user cancelled

    setActionLoading(subId)
    try {
      const token = localStorage.getItem('oneway-auth-token')
      const res = await fetch(`/api/admin/subscriptions/${subId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Subscription request did not meet our requirements.' }),
      })

      const data = await res.json()

      if (res.ok) {
        showToast('success', data.message || 'Subscription rejected')
        fetchSubscriptions()
      } else {
        showToast('error', data.error || 'Failed to reject subscription')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = subscriptions.filter(s =>
    s.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.user.name && s.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateStripeId = (id: string | null) => {
    if (!id) return 'N/A'
    return id.length > 20 ? `${id.slice(0, 12)}...${id.slice(-6)}` : id
  }

  const getPlanBadge = (plan: string) => {
    const normalized = plan.toLowerCase()
    const variant = planBadgeVariant[normalized]
    if (variant) {
      return variant
    }
    return { className: 'bg-primary/15 text-primary border-primary/25', label: plan }
  }

  const getAvatarColor = (name: string | null) => {
    if (!name) return 'bg-muted text-muted-foreground'
    const colors = [
      'bg-rose-500/15 text-rose-400',
      'bg-amber-500/15 text-amber-400',
      'bg-emerald-500/15 text-emerald-400',
      'bg-cyan-500/15 text-cyan-400',
      'bg-violet-500/15 text-violet-400',
      'bg-pink-500/15 text-pink-400',
      'bg-orange-500/15 text-orange-400',
      'bg-teal-500/15 text-teal-400',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-gradient noise-overlay">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="size-6 text-primary" />
              Subscription Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Review and approve subscription requests</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-xs gap-1.5">
              <Clock className="size-3 text-amber-500" />
              {subscriptions.length} Pending
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pending Subscriptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5 text-amber-500" />
              Pending Subscriptions
            </CardTitle>
            <CardDescription>
              {filtered.length} subscription{filtered.length !== 1 ? 's' : ''} waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="size-10 text-emerald-500/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No matching results' : 'No pending subscriptions — all caught up!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((sub) => {
                  const planBadge = getPlanBadge(sub.plan)
                  const initial = sub.user.name?.charAt(0)?.toUpperCase() || sub.user.email.charAt(0).toUpperCase()
                  const avatarColor = getAvatarColor(sub.user.name)

                  return (
                    <motion.div
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 p-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className={`size-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${avatarColor}`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{sub.user.name || 'No name provided'}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${planBadge.className}`}>
                              <Crown className="size-3" />
                              {planBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="size-3" />
                            <span className="truncate">{sub.user.email}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                              <Calendar className="size-3" />
                              Purchased {formatDate(sub.createdAt)}
                            </p>
                            <p className="text-xs text-muted-foreground/50 font-mono truncate">
                              ID: {truncateStripeId(sub.stripeSubscriptionId)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(sub.id)}
                          disabled={actionLoading === sub.id}
                        >
                          {actionLoading === sub.id ? (
                            <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle2 className="size-3.5 mr-1.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => handleReject(sub.id)}
                          disabled={actionLoading === sub.id}
                        >
                          <XCircle className="size-3.5 mr-1.5" />
                          Reject
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
