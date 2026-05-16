'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, Globe, Key, Loader2, Plus, Trash2, Copy, Check,
  BarChart3, Zap, DollarSign, Shield, Code, BookOpen,
  AlertTriangle, ExternalLink, Clock, Activity, Terminal,
} from 'lucide-react'

/* ─── Types ─── */
interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string
  rateLimit: number
  lastUsed: string | null
  requestCount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

interface UsageData {
  totalRequests: number
  totalTokens: number
  totalCost: number
  byCategory: Record<string, number>
  dailyUsage: { date: string; requests: number; tokens: number }[]
  topOperations: { operation: string; count: number; tokens: number }[]
  period: string
}

/* ─── Helpers ─── */
function getSession(): { token: string; user: { id: string; email: string; role: string } } | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) }
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

function parseScopes(scopes: string): string[] {
  try { return JSON.parse(scopes) } catch { return ['read'] }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ─── MAIN ─── */
export default function DevelopersPage() {
  const router = useRouter()
  const { locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [usagePeriod, setUsagePeriod] = useState<'week' | 'month'>('week')

  // Create key dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createScopes, setCreateScopes] = useState<string[]>(['read'])
  const [createRateLimit, setCreateRateLimit] = useState('100')
  const [createExpires, setCreateExpires] = useState('never')
  const [creating, setCreating] = useState(false)

  // Success dialog (shows full key)
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string; prefix: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!session) { router.push('/auth/login'); return }
    fetchKeys()
  }, [router])

  const fetchKeys = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.data || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [session])

  const fetchUsage = useCallback(async (period: 'week' | 'month') => {
    if (!session) return
    setUsageLoading(true)
    try {
      const res = await fetch(`/api/usage?period=${period}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsage(data.data)
      }
    } catch { /* silent */ }
    setUsageLoading(false)
  }, [session])

  const handleCreate = async () => {
    if (!session || !createName.trim()) return
    setCreating(true)
    try {
      let expiresAt: string | null = null
      if (createExpires !== 'never') {
        const d = new Date()
        if (createExpires === '30d') d.setDate(d.getDate() + 30)
        else if (createExpires === '90d') d.setDate(d.getDate() + 90)
        else if (createExpires === '1y') d.setFullYear(d.getFullYear() + 1)
        expiresAt = d.toISOString()
      }

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          name: createName.trim(),
          scopes: createScopes,
          rateLimit: parseInt(createRateLimit),
          expiresAt,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCreatedKey({ key: data.data.key, name: data.data.name, prefix: data.data.prefix })
        setCreateOpen(false)
        setSuccessOpen(true)
        setCreateName('')
        setCreateScopes(['read'])
        setCreateRateLimit('100')
        setCreateExpires('never')
        fetchKeys()
      }
    } catch { /* silent */ }
    setCreating(false)
  }

  const handleDelete = async () => {
    if (!session || !deleteId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ keyId: deleteId }),
      })
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== deleteId))
        setDeleteId(null)
      }
    } catch { /* silent */ }
    setDeleting(false)
  }

  const copyKey = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleScope = (scope: string) => {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  // Stats
  const totalKeys = keys.length
  const totalRequests = keys.reduce((sum, k) => sum + k.requestCount, 0)
  const estimatedCost = (totalRequests * 0.001).toFixed(2)

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center mesh-gradient">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Developer Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 px-3 py-1 bg-primary/15 text-primary border border-primary/25 hidden sm:flex">
              <Terminal className="size-3" />API v1
            </Badge>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <Globe className="size-3 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localeNames.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">{l.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Hero */}
        <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-primary/30 bg-primary/5 mb-3 text-xs gap-1">
              <Code className="size-3 text-primary" />Developer Tools
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">
              <span className="gradient-text-premium">API Keys & Developer Portal</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Manage your API keys, monitor usage analytics, and integrate TheOneWayGDA into your applications.
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" {...stagger}>
          {[
            { label: 'Total Keys', value: totalKeys, icon: Key, color: 'text-primary bg-primary/10 border-primary/20' },
            { label: 'Requests (Total)', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Tokens Used', value: usage ? usage.totalTokens.toLocaleString() : '—', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Est. Cost', value: usage ? `$${usage.totalCost.toFixed(2)}` : estimatedCost, icon: DollarSign, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
          ].map((stat, i) => (
            <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.05 }}>
              <Card className="card-premium">
                <CardContent className="p-4">
                  <div className={`size-9 rounded-lg ${stat.color} border flex items-center justify-center mb-2`}>
                    <stat.icon className="size-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="api-keys" onValueChange={(v) => {
          if (v === 'usage' && !usage) fetchUsage(usagePeriod)
        }}>
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="api-keys" className="gap-1.5 text-xs"><Key className="size-3.5" />API Keys</TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5 text-xs"><BarChart3 className="size-3.5" />Usage Analytics</TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5 text-xs"><BookOpen className="size-3.5" />API Docs</TabsTrigger>
          </TabsList>

          {/* ═══ API Keys Tab ═══ */}
          <TabsContent value="api-keys" className="mt-4 space-y-4">
            <motion.div {...fadeUp} className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Your API Keys ({keys.length}/10)</h2>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="size-3.5" />Create New Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Key className="size-4 text-primary" />Create API Key</DialogTitle>
                    <DialogDescription className="text-xs">Generate a new API key for programmatic access.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Key Name</Label>
                      <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., Production Key" className="text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Scopes</Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: 'read', label: 'Read', desc: 'Access public data' },
                          { value: 'write', label: 'Write', desc: 'Create & modify resources' },
                          { value: 'admin', label: 'Admin', desc: 'Full access' },
                        ].map((scope) => (
                          <label key={scope.value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={createScopes.includes(scope.value)} onCheckedChange={() => toggleScope(scope.value)} />
                            <div>
                              <span className="text-sm">{scope.label}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({scope.desc})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Rate Limit</Label>
                        <Select value={createRateLimit} onValueChange={setCreateRateLimit}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['50', '100', '250', '500', '1000'].map((v) => (
                              <SelectItem key={v} value={v} className="text-xs">{v} req/min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Expires</Label>
                        <Select value={createExpires} onValueChange={setCreateExpires}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never" className="text-xs">Never</SelectItem>
                            <SelectItem value="30d" className="text-xs">30 days</SelectItem>
                            <SelectItem value="90d" className="text-xs">90 days</SelectItem>
                            <SelectItem value="1y" className="text-xs">1 year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} className="text-xs">Cancel</Button>
                    <Button onClick={handleCreate} disabled={creating || !createName.trim()} className="gap-1.5">
                      {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Key className="size-3.5" />}
                      Create Key
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : keys.length === 0 ? (
              <motion.div {...fadeUp}>
                <Card className="card-premium">
                  <CardContent className="text-center py-16">
                    <Key className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No API keys yet</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">Create your first API key to get started with the developer API.</p>
                    <Button className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-3.5" />Create Your First Key
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div className="space-y-2" {...stagger}>
                {keys.map((key) => {
                  const scopes = parseScopes(key.scopes)
                  const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date()
                  const status = !key.isActive ? 'inactive' : isExpired ? 'expired' : 'active'
                  return (
                    <motion.div key={key.id} {...fadeUp}>
                      <Card className="card-premium hover:border-primary/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold">{key.name}</h3>
                                <Badge variant="outline" className="text-[10px] font-mono">{key.prefix}</Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    status === 'active' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                                    status === 'expired' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' :
                                    'border-rose-500/30 text-rose-400 bg-rose-500/5'
                                  }`}
                                >
                                  {status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {scopes.map((scope) => (
                                  <Badge key={scope} variant="secondary" className="text-[10px]">
                                    {scope}
                                  </Badge>
                                ))}
                                <span className="text-[10px] text-muted-foreground">{key.rateLimit} req/min</span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Activity className="size-3" />{key.requestCount} requests
                                </span>
                                {key.lastUsed && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />Last used {timeAgo(key.lastUsed)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Key className="size-3" />Created {timeAgo(key.createdAt)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-400 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300 flex-shrink-0"
                              onClick={() => setDeleteId(key.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </TabsContent>

          {/* ═══ Usage Analytics Tab ═══ */}
          <TabsContent value="usage" className="mt-4 space-y-4">
            <motion.div {...fadeUp} className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Usage Analytics</h2>
              <Select value={usagePeriod} onValueChange={(v) => {
                setUsagePeriod(v as 'week' | 'month')
                fetchUsage(v as 'week' | 'month')
              }}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week" className="text-xs">This Week</SelectItem>
                  <SelectItem value="month" className="text-xs">This Month</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {usageLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : usage ? (
              <>
                {/* Stats row */}
                <motion.div className="grid grid-cols-3 gap-3" {...stagger}>
                  {[
                    { label: 'Total Requests', value: usage.totalRequests.toLocaleString(), icon: Activity, color: 'text-emerald-400' },
                    { label: 'Total Tokens', value: usage.totalTokens.toLocaleString(), icon: Zap, color: 'text-amber-400' },
                    { label: 'Est. Cost', value: `$${usage.totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-pink-400' },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.05 }}>
                      <Card className="card-premium">
                        <CardContent className="p-4 text-center">
                          <stat.icon className={`size-5 mx-auto mb-1 ${stat.color}`} />
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Bar chart */}
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="size-4 text-primary" />Daily Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {usage.dailyUsage.length === 0 ? (
                        <div className="text-center py-8">
                          <BarChart3 className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No usage data for this period</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {usage.dailyUsage.map((day) => {
                            const maxRequests = Math.max(...usage.dailyUsage.map((d) => d.requests), 1)
                            const height = Math.max((day.requests / maxRequests) * 100, 2)
                            return (
                              <div key={day.date} className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0 font-mono">
                                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1 bg-muted/20 rounded-full h-5 overflow-hidden relative">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${height}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                                    {day.requests}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground w-20 text-right flex-shrink-0 font-mono">
                                  {day.tokens.toLocaleString()} tok
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Category breakdown */}
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="size-4 text-primary" />Category Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(usage.byCategory).length === 0 ? (
                        <div className="text-center py-8">
                          <Zap className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No categories yet</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-3 py-2">
                            <span>Category</span>
                            <span className="text-right">Requests</span>
                            <span className="text-right">Share</span>
                          </div>
                          {Object.entries(usage.byCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, count]) => {
                              const total = Object.values(usage.byCategory).reduce((s, c) => s + c, 0)
                              const pct = ((count / total) * 100).toFixed(1)
                              return (
                                <div key={category} className="grid grid-cols-3 items-center py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
                                  <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
                                  <span className="text-sm text-right font-mono">{count}</span>
                                  <span className="text-sm text-right text-muted-foreground">{pct}%</span>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : (
              <motion.div {...fadeUp}>
                <Card className="card-premium">
                  <CardContent className="text-center py-16">
                    <BarChart3 className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No usage data</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">Start making API calls to see your usage analytics.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══ API Docs Tab ═══ */}
          <TabsContent value="docs" className="mt-4 space-y-4">
            <motion.div {...fadeUp}>
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="size-4 text-primary" />Authentication
                  </CardTitle>
                  <CardDescription className="text-xs">Include your API key in the Authorization header for all requests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/30 border border-border/30 p-4">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">HTTP Header</p>
                    <pre className="text-xs font-mono text-foreground/90">Authorization: Bearer onw_your_full_api_key_here</pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep your API key secure. Never expose it in client-side code or public repositories.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {[
              {
                title: 'Models — Leaderboard',
                method: 'GET',
                path: '/api/leaderboard',
                desc: 'Retrieve the AI model leaderboard with scores, pricing, and benchmarks.',
                curl: `curl -H "Authorization: Bearer onw_YOUR_KEY" \\
  https://theoneway.app/api/leaderboard`,
                js: `const res = await fetch('/api/leaderboard', {
  headers: {
    'Authorization': 'Bearer onw_YOUR_KEY'
  }
});
const data = await res.json();`,
              },
              {
                title: 'Workflows — Plan Flagship',
                method: 'POST',
                path: '/api/workflow/flagship/plan',
                desc: 'Plan an AI-powered flagship workflow execution.',
                curl: `curl -X POST \\
  -H "Authorization: Bearer onw_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Analyze dataset trends"}' \\
  https://theoneway.app/api/workflow/flagship/plan`,
                js: `const res = await fetch('/api/workflow/flagship/plan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer onw_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: 'Analyze dataset trends'
  })
});
const data = await res.json();`,
              },
              {
                title: 'Usage — Get Stats',
                method: 'GET',
                path: '/api/usage?period=month',
                desc: 'Get your usage statistics for a given time period.',
                curl: `curl -H "Authorization: Bearer onw_YOUR_KEY" \\
  https://theoneway.app/api/usage?period=month`,
                js: `const res = await fetch('/api/usage?period=month', {
  headers: {
    'Authorization': 'Bearer onw_YOUR_KEY'
  }
});
const data = await res.json();`,
              },
            ].map((endpoint, i) => (
              <motion.div key={endpoint.path} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: (i + 1) * 0.05 }}>
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="size-4 text-primary" />{endpoint.title}
                    </CardTitle>
                    <CardDescription className="text-xs">{endpoint.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-bold ${endpoint.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'}`}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-xs font-mono text-muted-foreground">{endpoint.path}</code>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">cURL</p>
                      <pre className="text-xs font-mono bg-muted/30 border border-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {endpoint.curl}
                      </pre>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">JavaScript</p>
                      <pre className="text-xs font-mono bg-muted/30 border border-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {endpoint.js}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ Success Dialog (Full Key) ═══ */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Check className="size-5" />API Key Created
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your API key has been created. Copy it now — you will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {createdKey && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Make sure to copy your API key now. For security, it will not be shown again after you close this dialog.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Key Name</Label>
                <p className="text-sm font-medium">{createdKey.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-muted/30 border border-border/30 rounded-lg p-3 overflow-x-auto whitespace-nowrap">
                    {createdKey.key}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyKey} className="flex-shrink-0 gap-1">
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSuccessOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm Dialog ═══ */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="size-4" />Delete API Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. Any application using this key will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="text-xs">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
