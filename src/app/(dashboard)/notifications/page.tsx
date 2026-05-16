'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Globe, Bell, BellOff, Check, CheckCheck, Trash2,
  Users, UserPlus, Share2, AlertTriangle, Info, CreditCard, Settings,
  Loader2, ChevronRight, ExternalLink, Clock, Filter, Inbox,
} from 'lucide-react'

interface Notification {
  id: string; type: string; title: string; message: string
  actionUrl: string | null; actionLabel: string | null
  isRead: boolean; readAt: string | null; metadata: string | null; createdAt: string
}

function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) as { id: string; email: string; name: string | null; role: string } }
  } catch { return null }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'team_invite': return { icon: Users, color: 'text-purple-400 bg-purple-500/10' }
    case 'team_member_joined': return { icon: UserPlus, color: 'text-emerald-400 bg-emerald-500/10' }
    case 'resource_shared': return { icon: Share2, color: 'text-blue-400 bg-blue-500/10' }
    case 'usage_alert': return { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' }
    case 'system': return { icon: Info, color: 'text-gray-400 bg-gray-500/10' }
    case 'billing': return { icon: CreditCard, color: 'text-pink-400 bg-pink-500/10' }
    default: return { icon: Bell, color: 'text-muted-foreground bg-muted/30' }
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}
const stagger = { animate: { transition: { staggerChildren: 0.04 } } }

export default function NotificationsPage() {
  const router = useRouter()
  const { locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (!session) { router.push('/auth/login'); return }
    fetchNotifs(false)
  }, [router, session, filter])

  const fetchNotifs = useCallback(async (append: boolean) => {
    if (!session) return
    if (!append) setLoading(true)
    try {
      const params = new URLSearchParams({ token: session.token, limit: '30', offset: String(offset) })
      if (filter === 'unread') params.set('unreadOnly', 'true')
      const res = await fetch(`/api/notifications?${params}`)
      const json = await res.json()
      if (json.success) {
        setNotifications(prev => append ? [...prev, ...(json.data || [])] : (json.data || []))
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [session, filter, offset])

  const handleMarkRead = async (id: string) => {
    if (!session) return
    try {
      await fetch(`/api/notifications?token=${session.token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    } catch { /* silent */ }
  }

  const handleMarkAllRead = async () => {
    if (!session) return
    setMarkingAll(true)
    try {
      await fetch(`/api/notifications?token=${session.token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
    } catch { /* silent */ } finally { setMarkingAll(false) }
  }

  const handleDelete = async (id: string) => {
    if (!session) return
    try {
      await fetch(`/api/notifications?token=${session.token}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch { /* silent */ }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length
  const filtered = filter === 'all' ? notifications :
    filter === 'unread' ? notifications.filter(n => !n.isRead) :
    notifications.filter(n => n.type === filter)

  if (!session) return null

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="size-4" /></Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Notifications</span>
            {unreadCount > 0 && <Badge className="text-[10px] px-1.5 bg-primary text-primary-foreground">{unreadCount}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleMarkAllRead} disabled={markingAll || unreadCount === 0}>
              {markingAll ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
              Mark All Read
            </Button>
            <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'fr' | 'ar' | 'zh' | 'es' | 'de' | 'ja' | 'ko')}>
              <SelectTrigger className="h-8 w-20 text-xs"><Globe className="size-3 mr-0.5" /><SelectValue /></SelectTrigger>
              <SelectContent>{['en','fr','ar','zh','es','de','ja','ko'].map(l => <SelectItem key={l} value={l} className="text-xs">{l.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : (
          <>
            <Tabs value={filter} onValueChange={v => { setFilter(v); setOffset(0) }}>
              <TabsList>
                {['all', 'unread', 'team', 'system', 'billing'].map(f => (
                  <TabsTrigger key={f} value={f} className="text-xs capitalize gap-1">{f}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {filtered.length === 0 ? (
              <motion.div {...fadeUp}>
                <Card className="card-premium">
                  <CardContent className="flex flex-col items-center py-16">
                    <Inbox className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No notifications</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here when there\'s activity on your account.'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div className="space-y-2" {...stagger}>
                <AnimatePresence>
                  {filtered.map(notif => {
                    const { icon: NIcon, color } = getNotifIcon(notif.type)
                    return (
                      <motion.div key={notif.id} {...fadeUp} layout>
                        <Card className={`card-premium transition-all ${!notif.isRead ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
                          <CardContent className="p-4 flex items-start gap-3">
                            <button onClick={() => !notif.isRead && handleMarkRead(notif.id)} className="flex-shrink-0 mt-0.5">
                              <div className={`size-9 rounded-lg ${color} flex items-center justify-center relative`}>
                                <NIcon className="size-4" />
                                {!notif.isRead && <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-primary rounded-full border-2 border-background" />}
                              </div>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>{notif.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {notif.actionUrl && (
                                  <Link href={notif.actionUrl}>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1">
                                      {notif.actionLabel || 'View'} <ChevronRight className="size-2.5" />
                                    </Button>
                                  </Link>
                                )}
                                <button onClick={() => handleDelete(notif.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 ml-auto">
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}

            {notifications.length >= 30 && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setOffset(p => p + 30); fetchNotifs(true) }}>
                  <Loader2 className="size-3" />Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
