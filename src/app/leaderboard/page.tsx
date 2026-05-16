'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, Globe, Trophy, Zap, DollarSign, Activity, BarChart3, Server,
  Clock, RefreshCw, Loader2, Crown, TrendingUp, Timer, Database, Cpu, Shield, Hash,
} from 'lucide-react'

/* ───────────────────────── Types ───────────────────────── */
interface LeaderboardEntry {
  id: string
  name: string
  provider: string
  description: string
  modelType: string
  contextWindow: number
  parameters: string
  score: number
  maxScore: number
  normalizedScore: number
  source: string
  pricing: { inputPrice: number; outputPrice: number } | null
  liveMetrics: {
    avgLatency: number | null
    avgTps: number | null
    sampleSize: number
  }
}

interface PricingEntry {
  modelId: string
  modelName: string
  provider: string
  modelType: string
  contextWindow: number
  parameters: string
  inputPrice: number
  outputPrice: number
  batchInputPrice: number
  batchOutputPrice: number
  costPer1MCombined: number
}

interface MetricsSummary {
  modelId: string
  modelName: string
  provider: string
  avgLatency: number
  avgTps: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  sampleCount: number
  uptime: number
  timeSeries: { testedAt: string; latencyMs: number; tps: number }[]
}

interface BenchmarkSummary {
  name: string
  topPerformer: string
  topProvider: string
  topScore: number
  maxScore: number
  averageScore: number
  participantCount: number
  scores: { modelId: string; modelName: string; provider: string; score: number; maxScore: number; normalized: number; source: string }[]
}

interface CronJob {
  id: string
  name: string
  type: string
  interval: string
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: string | null
  lastError: string | null
  runCount: number
  errorCount: number
  isActive: boolean
}

interface CacheStat {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/* ───────────────────────── Helpers ───────────────────────── */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 65) return 'text-sky-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-muted-foreground'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 65) return 'bg-sky-500/10 border-sky-500/20'
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-muted/30 border-border/30'
}

function getLatencyColor(latency: number | null): string {
  if (!latency) return 'text-muted-foreground'
  if (latency <= 200) return 'text-emerald-400'
  if (latency <= 500) return 'text-sky-400'
  if (latency <= 800) return 'text-amber-400'
  return 'text-rose-400'
}

function getLatencyBg(latency: number | null): string {
  if (!latency) return 'bg-muted/30 border-border/30'
  if (latency <= 200) return 'bg-emerald-500/10 border-emerald-500/20'
  if (latency <= 500) return 'bg-sky-500/10 border-sky-500/20'
  if (latency <= 800) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-rose-500/10 border-rose-500/20'
}

function getMedal(rank: number) {
  if (rank === 1) return <span className="text-lg" title="1st Place">🥇</span>
  if (rank === 2) return <span className="text-lg" title="2nd Place">🥈</span>
  if (rank === 3) return <span className="text-lg" title="3rd Place">🥉</span>
  return <span className="text-sm font-mono text-muted-foreground w-6 text-center inline-block">{rank}</span>
}

function getProviderColor(provider: string): string {
  const p = provider.toLowerCase()
  if (p.includes('openai')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (p.includes('anthropic') || p.includes('claude')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  if (p.includes('google') || p.includes('gemini')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  if (p.includes('meta') || p.includes('llama')) return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  if (p.includes('deepseek')) return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  if (p.includes('mistral')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  if (p.includes('qwen')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  if (p.includes('cohere')) return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
  return 'bg-primary/10 text-primary border-primary/20'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ───────────────────────── MAIN PAGE ───────────────────────── */
export default function LeaderboardPage() {
  const { t, locale, setLocale, dir } = useTranslation()
  const [activeTab, setActiveTab] = useState('leaderboard')

  /* ── Leaderboard state ── */
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbLoading, setLbLoading] = useState(true)
  const [lbFilters, setLbFilters] = useState<{ benchmarks: string[]; providers: string[]; modelTypes: string[] }>({ benchmarks: [], providers: [], modelTypes: [] })
  const [lbMeta, setLbMeta] = useState<{ totalModels: number; lastUpdated: string }>({ totalModels: 0, lastUpdated: '' })
  const [lbFromCache, setLbFromCache] = useState(false)
  const [benchmark, setBenchmark] = useState('GPQA')
  const [provider, setProvider] = useState('all')
  const [modelType, setModelType] = useState('all')
  const [sortField, setSortField] = useState('score')
  const [sortOrder, setSortOrder] = useState('desc')

  /* ── Pricing state ── */
  const [pricing, setPricing] = useState<PricingEntry[]>([])
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingSort, setPricingSort] = useState('inputPrice')

  /* ── Metrics state ── */
  const [metrics, setMetrics] = useState<MetricsSummary[]>([])
  const [metricsLoading, setMetricsLoading] = useState(true)

  /* ── Benchmarks state ── */
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([])
  const [benchmarksLoading, setBenchmarksLoading] = useState(true)

  /* ── System state ── */
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cacheStats, setCacheStats] = useState<Record<string, CacheStat>>({})
  const [systemLoading, setSystemLoading] = useState(true)

  /* ── Action states ── */
  const [seeding, setSeeding] = useState(false)
  const [testing, setTesting] = useState(false)

  /* ───────────────────────── Data Fetchers ───────────────────────── */
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true)
    try {
      const params = new URLSearchParams({ benchmark, sort: sortField, order: sortOrder })
      if (provider !== 'all') params.set('provider', provider)
      if (modelType !== 'all') params.set('modelType', modelType)
      const res = await fetch(`/api/leaderboard?${params}`)
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
      setLbFilters(data.filters || { benchmarks: [], providers: [], modelTypes: [] })
      setLbMeta(data.meta || { totalModels: 0, lastUpdated: '' })
      setLbFromCache(!!data.fromCache)
    } catch (err) {
      console.error('Leaderboard fetch error:', err)
    } finally {
      setLbLoading(false)
    }
  }, [benchmark, provider, modelType, sortField, sortOrder])

  const fetchPricing = useCallback(async () => {
    setPricingLoading(true)
    try {
      const res = await fetch(`/api/leaderboard/pricing?sortBy=${pricingSort}`)
      const data = await res.json()
      setPricing(data.pricing || [])
    } catch (err) {
      console.error('Pricing fetch error:', err)
    } finally {
      setPricingLoading(false)
    }
  }, [pricingSort])

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const res = await fetch('/api/leaderboard/metrics')
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (err) {
      console.error('Metrics fetch error:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  const fetchBenchmarks = useCallback(async () => {
    setBenchmarksLoading(true)
    try {
      const res = await fetch('/api/leaderboard/benchmarks')
      const data = await res.json()
      setBenchmarks(data.benchmarks || [])
    } catch (err) {
      console.error('Benchmarks fetch error:', err)
    } finally {
      setBenchmarksLoading(false)
    }
  }, [])

  const fetchSystem = useCallback(async () => {
    setSystemLoading(true)
    try {
      const res = await fetch('/api/leaderboard/cron')
      const data = await res.json()
      setCronJobs(data.jobs || [])
      setCacheStats(data.cacheStats || {})
    } catch (err) {
      console.error('System fetch error:', err)
    } finally {
      setSystemLoading(false)
    }
  }, [])

  /* ── Initial load ── */
  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])
  useEffect(() => { fetchPricing() }, [fetchPricing])
  useEffect(() => { fetchMetrics() }, [fetchMetrics])
  useEffect(() => { fetchBenchmarks() }, [fetchBenchmarks])
  useEffect(() => { fetchSystem() }, [fetchSystem])

  /* ── Actions ── */
  const handleSeed = async () => {
    setSeeding(true)
    try {
      await fetch('/api/leaderboard', { method: 'POST' })
      await Promise.all([fetchLeaderboard(), fetchPricing(), fetchMetrics(), fetchBenchmarks(), fetchSystem()])
    } catch { /* silent */ }
    setSeeding(false)
  }

  const handleRunTests = async () => {
    setTesting(true)
    try {
      await fetch('/api/leaderboard/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      await Promise.all([fetchLeaderboard(), fetchMetrics()])
    } catch { /* silent */ }
    setTesting(false)
  }

  const handleClearCache = async () => {
    try {
      await fetch('/api/leaderboard/cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear-cache' }) })
      await Promise.all([fetchLeaderboard(), fetchPricing(), fetchMetrics(), fetchBenchmarks()])
    } catch { /* silent */ }
  }

  /* ───────────────────────── RENDER ───────────────────────── */
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* ═══ STICKY NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">
              {t('lb.title') || 'AI Model Leaderboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-1.5 text-xs h-8">
              {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
              <span className="hidden sm:inline">{t('lb.seedData') || 'Seed Data'}</span>
            </Button>
            <Button size="sm" onClick={handleRunTests} disabled={testing} className="gap-1.5 text-xs h-8">
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
              <span className="hidden sm:inline">{t('lb.runTests') || 'Run Tests'}</span>
            </Button>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <Globe className="size-3 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localeNames.map(l => (
                  <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* ── Status Badges ── */}
        <motion.div {...fadeUp} className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20">
            <Zap className="size-3" />
            {t('lb.liveIntelligence') || 'Live Intelligence'}
          </Badge>
          {lbFromCache && (
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Database className="size-3" />
              {t('lb.cached') || 'Cached'}
            </Badge>
          )}
          {lbMeta.totalModels > 0 && (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
              <Hash className="size-3" />
              {lbMeta.totalModels} {t('lb.models') || 'Models'}
            </Badge>
          )}
          {lbMeta.lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {t('lb.updated') || 'Updated'}: {timeAgo(lbMeta.lastUpdated)}
            </span>
          )}
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full sm:w-auto">
            <TabsTrigger value="leaderboard" className="gap-1.5 text-xs">
              <Trophy className="size-3.5" />
              <span className="hidden sm:inline">{t('lb.leaderboard') || 'Leaderboard'}</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5 text-xs">
              <DollarSign className="size-3.5" />
              <span className="hidden sm:inline">{t('lb.pricing') || 'Pricing'}</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs">
              <Activity className="size-3.5" />
              <span className="hidden sm:inline">{t('lb.liveMetrics') || 'Live Metrics'}</span>
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              <span className="hidden sm:inline">{t('lb.benchmarks') || 'Benchmarks'}</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs">
              <Server className="size-3.5" />
              <span className="hidden sm:inline">{t('lb.system') || 'System'}</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════
              TAB 1: LEADERBOARD
              ═══════════════════════════════════════════ */}
          <TabsContent value="leaderboard" className="space-y-4">
            {/* Filters */}
            <motion.div {...fadeUp} className="flex flex-wrap items-center gap-3">
              <Select value={benchmark} onValueChange={setBenchmark}>
                <SelectTrigger className="h-9 w-44 text-xs">
                  <BarChart3 className="size-3.5 mr-1.5 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lbFilters.benchmarks.map(b => (
                    <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <Cpu className="size-3.5 mr-1.5 text-primary" />
                  <SelectValue placeholder={t('lb.allProviders') || 'All Providers'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t('lb.allProviders') || 'All Providers'}</SelectItem>
                  {lbFilters.providers.map(p => (
                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <Crown className="size-3.5 mr-1.5 text-primary" />
                  <SelectValue placeholder={t('lb.allTypes') || 'All Types'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t('lb.allTypes') || 'All Types'}</SelectItem>
                  {lbFilters.modelTypes.map(tp => (
                    <SelectItem key={tp} value={tp} className="text-xs">{tp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <TrendingUp className="size-3.5 mr-1.5 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score" className="text-xs">{t('lb.sortScore') || 'Score'}</SelectItem>
                  <SelectItem value="name" className="text-xs">{t('lb.sortName') || 'Name'}</SelectItem>
                  <SelectItem value="provider" className="text-xs">{t('lb.sortProvider') || 'Provider'}</SelectItem>
                  <SelectItem value="price" className="text-xs">{t('lb.sortPrice') || 'Price'}</SelectItem>
                  <SelectItem value="latency" className="text-xs">{t('lb.sortLatency') || 'Latency'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}>
                {sortOrder === 'desc' ? '↓' : '↑'} {sortOrder === 'desc' ? (t('lb.descending') || 'Desc') : (t('lb.ascending') || 'Asc')}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={fetchLeaderboard}>
                <RefreshCw className="size-3.5 mr-1" />
                {t('lb.refresh') || 'Refresh'}
              </Button>
            </motion.div>

            {/* Table */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {lbLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-8 text-primary animate-spin" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Trophy className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">{t('lb.noModels') || 'No models found'}</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {t('lb.noModelsDesc') || 'Try changing filters or seed the database.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/30">
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground w-12">#</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{t('lb.model') || 'Model'}</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">{t('lb.provider') || 'Provider'}</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">{t('lb.score') || 'Score'}</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">{t('lb.latency') || 'Latency'}</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">{t('lb.tps') || 'TPS'}</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground hidden xl:table-cell">{t('lb.inputPrice') || 'In $/1M'}</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground hidden xl:table-cell">{t('lb.contextWindow') || 'Context'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {leaderboard.map((entry, i) => (
                            <motion.tr
                              key={entry.id}
                              {...fadeUp}
                              transition={{ ...fadeUp.transition, delay: i * 0.025 }}
                              className="border-b border-border/20 hover:bg-muted/20 transition-colors group"
                            >
                              <td className="py-3 px-4">
                                {getMedal(i + 1)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm group-hover:text-primary transition-colors">{entry.name}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5">{entry.modelType} · {entry.parameters}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden lg:table-cell">
                                <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border ${getProviderColor(entry.provider)}`}>
                                  {entry.provider}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className={`inline-flex items-center justify-center min-w-[60px] px-2.5 py-1 rounded-lg border ${getScoreBg(entry.normalizedScore)}`}>
                                  <span className={`font-bold text-sm ${getScoreColor(entry.normalizedScore)}`}>
                                    {entry.normalizedScore}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-1">/{entry.maxScore}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center hidden md:table-cell">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getLatencyBg(entry.liveMetrics.avgLatency)}`}>
                                  <Timer className="size-3" />
                                  <span className={`text-xs font-mono ${getLatencyColor(entry.liveMetrics.avgLatency)}`}>
                                    {entry.liveMetrics.avgLatency ? `${entry.liveMetrics.avgLatency}ms` : '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center hidden md:table-cell">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {entry.liveMetrics.avgTps || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center hidden xl:table-cell">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {entry.pricing ? formatPrice(entry.pricing.inputPrice) : '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center hidden xl:table-cell">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {formatNumber(entry.contextWindow)}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 2: PRICING
              ═══════════════════════════════════════════ */}
          <TabsContent value="pricing" className="space-y-4">
            <motion.div {...fadeUp} className="flex items-center gap-3">
              <Select value={pricingSort} onValueChange={setPricingSort}>
                <SelectTrigger className="h-9 w-44 text-xs">
                  <TrendingUp className="size-3.5 mr-1.5 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inputPrice" className="text-xs">{t('lb.sortInputPrice') || 'Input Price'}</SelectItem>
                  <SelectItem value="outputPrice" className="text-xs">{t('lb.sortOutputPrice') || 'Output Price'}</SelectItem>
                  <SelectItem value="value" className="text-xs">{t('lb.sortBestValue') || 'Best Value'}</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{pricing.length} {t('lb.modelsPriced') || 'models priced'}</span>
            </motion.div>

            {pricingLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : pricing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <DollarSign className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">{t('lb.noPricing') || 'No pricing data'}</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">{t('lb.seedPricingDesc') || 'Seed the database to populate pricing.'}</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" {...stagger}>
                <AnimatePresence>
                  {pricing.map((p, i) => (
                    <motion.div key={p.modelId} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.03 }}>
                      <Card className="h-full bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{p.modelName}</h4>
                              <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border mt-1 ${getProviderColor(p.provider)}`}>
                                {p.provider}
                              </Badge>
                            </div>
                            {i === 0 && <Crown className="size-5 text-amber-400 flex-shrink-0" />}
                          </div>
                          <Separator className="opacity-50" />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('lb.input') || 'Input'}</p>
                              <p className="text-sm font-mono font-semibold text-emerald-400">{formatPrice(p.inputPrice)}</p>
                              <p className="text-[10px] text-muted-foreground">/1M tokens</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('lb.output') || 'Output'}</p>
                              <p className="text-sm font-mono font-semibold text-sky-400">{formatPrice(p.outputPrice)}</p>
                              <p className="text-[10px] text-muted-foreground">/1M tokens</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                            <span>{p.modelType}</span>
                            <span className="flex items-center gap-1"><Hash className="size-3" />{formatNumber(p.contextWindow)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 3: LIVE METRICS
              ═══════════════════════════════════════════ */}
          <TabsContent value="metrics" className="space-y-4">
            {metricsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : metrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Activity className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">{t('lb.noMetrics') || 'No metrics data'}</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {t('lb.runTestsDesc') || 'Run tests to collect live performance metrics.'}
                </p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" {...stagger}>
                <AnimatePresence>
                  {metrics.map((m, i) => (
                    <motion.div key={m.modelId} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.03 }}>
                      <Card className="h-full bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all group">
                        <CardHeader className="pb-3 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">{m.modelName}</CardTitle>
                              <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border mt-1 ${getProviderColor(m.provider)}`}>
                                {m.provider}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`size-2 rounded-full ${m.uptime >= 98 ? 'bg-emerald-500' : m.uptime >= 90 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                              <span className="text-xs font-mono text-muted-foreground">{m.uptime}%</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Latency */}
                            <div className={`rounded-lg border p-3 ${getLatencyBg(m.avgLatency)}`}>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('lb.avgLatency') || 'Avg Latency'}</p>
                              <p className={`text-lg font-bold font-mono ${getLatencyColor(m.avgLatency)}`}>{m.avgLatency}ms</p>
                            </div>
                            {/* TPS */}
                            <div className="rounded-lg border p-3 bg-primary/5 border-primary/15">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('lb.avgTps') || 'Avg TPS'}</p>
                              <p className="text-lg font-bold font-mono text-primary">{m.avgTps}</p>
                            </div>
                          </div>
                          {/* Min / Max / P95 */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 rounded-md bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">{t('lb.min') || 'Min'}</p>
                              <p className="text-xs font-mono font-semibold">{m.minLatency}ms</p>
                            </div>
                            <div className="text-center p-2 rounded-md bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">{t('lb.max') || 'Max'}</p>
                              <p className="text-xs font-mono font-semibold">{m.maxLatency}ms</p>
                            </div>
                            <div className="text-center p-2 rounded-md bg-muted/30">
                              <p className="text-[10px] text-muted-foreground">P95</p>
                              <p className="text-xs font-mono font-semibold">{m.p95Latency}ms</p>
                            </div>
                          </div>
                          {/* Latency distribution bar */}
                          {m.maxLatency > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground">{t('lb.latencyDist') || 'Latency Distribution'}</p>
                              <div className="flex h-2 rounded-full overflow-hidden bg-muted/40">
                                <div
                                  className="bg-emerald-500 h-full"
                                  style={{ width: `${Math.min(100, (m.minLatency / m.maxLatency) * 100)}%` }}
                                  title={`Min: ${m.minLatency}ms`}
                                />
                                <div
                                  className="bg-sky-500 h-full"
                                  style={{ width: `${Math.max(0, Math.min(100, ((m.avgLatency - m.minLatency) / m.maxLatency) * 100))}%` }}
                                  title={`Avg: ${m.avgLatency}ms`}
                                />
                                <div
                                  className="bg-amber-500 h-full"
                                  style={{ width: `${Math.max(0, Math.min(100, ((m.p95Latency - m.avgLatency) / m.maxLatency) * 100))}%` }}
                                  title={`P95: ${m.p95Latency}ms`}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-muted-foreground">
                                <span>{m.minLatency}ms</span>
                                <span>{m.avgLatency}ms</span>
                                <span>{m.maxLatency}ms</span>
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">{t('lb.samples') || 'Samples'}: {m.sampleCount}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 4: BENCHMARKS
              ═══════════════════════════════════════════ */}
          <TabsContent value="benchmarks" className="space-y-4">
            {benchmarksLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : benchmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">{t('lb.noBenchmarks') || 'No benchmarks data'}</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">{t('lb.seedBenchDesc') || 'Seed the database to populate benchmarks.'}</p>
              </div>
            ) : (
              <motion.div className="space-y-4" {...stagger}>
                <AnimatePresence>
                  {benchmarks.map((bm, i) => (
                    <motion.div key={bm.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.04 }}>
                      <Card className="bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all">
                        <CardHeader className="pb-2 pt-4 px-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="size-4.5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-semibold">{bm.name}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {bm.participantCount} {t('lb.participants') || 'participants'} · {t('lb.avgScore') || 'Avg'}: {bm.averageScore}
                                </p>
                              </div>
                            </div>
                            <Badge className="gap-1 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 self-start">
                              <Crown className="size-3" />
                              {bm.topPerformer}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                          <div className="space-y-2">
                            {bm.scores.slice(0, 5).map((s, j) => (
                              <div key={s.modelId} className="flex items-center gap-3">
                                <span className="w-6 text-center flex-shrink-0">{getMedal(j + 1)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate">{s.modelName}</span>
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border flex-shrink-0 ${getProviderColor(s.provider)}`}>
                                      {s.provider}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Progress value={s.normalized} className="h-1.5 flex-1" />
                                    <span className={`text-xs font-mono font-semibold ${getScoreColor(s.normalized)}`}>{s.normalized}</span>
                                    <span className="text-[10px] text-muted-foreground">({s.score}/{s.maxScore})</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 5: SYSTEM
              ═══════════════════════════════════════════ */}
          <TabsContent value="system" className="space-y-6">
            {systemLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : (
              <motion.div className="space-y-6" {...stagger}>
                {/* Cron Jobs */}
                <motion.div {...fadeUp}>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Clock className="size-4.5 text-primary" />
                        {t('lb.cronJobs') || 'Cron Jobs'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      {cronJobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t('lb.noCronJobs') || 'No cron jobs registered.'}</p>
                      ) : (
                        <div className="space-y-3">
                          {cronJobs.map(job => (
                            <div key={job.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/30">
                              <div className={`size-2.5 rounded-full flex-shrink-0 ${job.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{job.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.type}</Badge>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{job.interval}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                  {job.lastRunAt && <span>{t('lb.lastRun') || 'Last'}: {timeAgo(job.lastRunAt)}</span>}
                                  {job.nextRunAt && <span>{t('lb.nextRun') || 'Next'}: {timeAgo(job.nextRunAt)}</span>}
                                  <span>{t('lb.runs') || 'Runs'}: {job.runCount}</span>
                                  {job.errorCount > 0 && <span className="text-rose-400">{t('lb.errors') || 'Errors'}: {job.errorCount}</span>}
                                </div>
                                {job.lastError && (
                                  <p className="text-[10px] text-rose-400 mt-1 truncate">{job.lastError}</p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0 flex-shrink-0 ${
                                  job.lastStatus === 'success'
                                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                    : job.lastStatus === 'error'
                                      ? 'border-rose-500/30 text-rose-400 bg-rose-500/5'
                                      : 'border-border text-muted-foreground'
                                }`}
                              >
                                {job.lastStatus || 'pending'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Cache Stats */}
                <motion.div {...fadeUp}>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Database className="size-4.5 text-primary" />
                          {t('lb.cacheStats') || 'Cache Statistics'}
                        </CardTitle>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleClearCache}>
                          <RefreshCw className="size-3" />
                          {t('lb.clearCache') || 'Clear Cache'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(cacheStats).map(([key, stat]) => (
                          <div key={key} className="rounded-lg border border-border/30 p-3 bg-muted/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium capitalize">{key}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {stat.size} {t('lb.entries') || 'entries'}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{t('lb.hitRate') || 'Hit Rate'}</span>
                                <span className="font-mono">{stat.hitRate ? `${(stat.hitRate * 100).toFixed(1)}%` : '0%'}</span>
                              </div>
                              <Progress value={stat.hitRate ? stat.hitRate * 100 : 0} className="h-1.5" />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{t('lb.hits') || 'Hits'}: {stat.hits}</span>
                              <span>{t('lb.misses') || 'Misses'}: {stat.misses}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Infrastructure Info */}
                <motion.div {...fadeUp}>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Server className="size-4.5 text-primary" />
                        {t('lb.infrastructure') || 'Infrastructure'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { icon: Cpu, label: t('lb.runtime') || 'Runtime', value: 'Next.js 16 + Bun' },
                          { icon: Database, label: t('lb.database') || 'Database', value: 'SQLite + Prisma ORM' },
                          { icon: Shield, label: t('lb.caching') || 'Caching', value: 'In-Memory LRU' },
                          { icon: Zap, label: t('lb.framework') || 'Framework', value: 'React 19 + TypeScript' },
                          { icon: BarChart3, label: t('lb.benchmarksCount') || 'Benchmarks', value: String(benchmarks.length) },
                          { icon: Activity, label: t('lb.monitoredModels') || 'Monitored Models', value: String(metrics.length) },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/30">
                            <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <item.icon className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground">{item.label}</p>
                              <p className="text-sm font-medium truncate">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
