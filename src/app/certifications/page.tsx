'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft, Award, Shield, Star, Crown, Trophy, Loader2,
  TrendingUp, ExternalLink, Calendar, BarChart3, Filter, Zap,
  CheckCircle2, Clock, Eye, ChevronRight,
} from 'lucide-react'

/* ── Types ── */
interface CertificationEntry {
  id: string
  modelId: string
  modelName: string
  provider: string
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
  category: string
  overallScore: number
  benchmarks: string
  status: string
  validFrom: string | null
  validUntil: string | null
  certificateUrl: string | null
  createdAt: string
}

interface CertStats {
  total: number
  byLevel: { level: string; count: number }[]
  byCategory: { category: string; count: number }[]
  byProvider: { provider: string; count: number }[]
}

/* ── Level Config ── */
const LEVEL_CONFIG = {
  platinum: {
    label: 'Platinum',
    minScore: 95,
    icon: <Crown className="size-5" />,
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    bg: 'bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-pink-500/15',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    glow: 'shadow-violet-500/20',
    description: 'Elite performance — the pinnacle of AI capability',
    color: '#c084fc',
  },
  gold: {
    label: 'Gold',
    minScore: 90,
    icon: <Trophy className="size-5" />,
    gradient: 'from-amber-400 via-yellow-500 to-orange-400',
    bg: 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-orange-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'shadow-amber-500/20',
    description: 'Exceptional quality — top-tier AI performance',
    color: '#fbbf24',
  },
  silver: {
    label: 'Silver',
    minScore: 80,
    icon: <Shield className="size-5" />,
    gradient: 'from-slate-300 via-gray-300 to-zinc-400',
    bg: 'bg-gradient-to-br from-slate-400/15 via-gray-300/10 to-zinc-400/15',
    border: 'border-slate-400/30',
    text: 'text-slate-300',
    badgeBg: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    glow: 'shadow-slate-400/20',
    description: 'Strong reliability — consistently high performance',
    color: '#94a3b8',
  },
  bronze: {
    label: 'Bronze',
    minScore: 70,
    icon: <Award className="size-5" />,
    gradient: 'from-orange-600 via-amber-700 to-yellow-700',
    bg: 'bg-gradient-to-br from-orange-600/15 via-amber-700/10 to-yellow-700/15',
    border: 'border-orange-700/30',
    text: 'text-orange-400',
    badgeBg: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
    glow: 'shadow-orange-600/20',
    description: 'Solid foundation — meets baseline standards',
    color: '#ea580c',
  },
} as const

const CATEGORY_ICONS: Record<string, string> = {
  reasoning: '🧠', coding: '💻', creative: '🎨', math: '📐',
  safety: '🛡️', multilingual: '🌍', general: '⚡',
}

/* ── Helpers ── */
function getProviderColor(provider: string): string {
  const p = provider.toLowerCase()
  if (p.includes('openai')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (p.includes('anthropic') || p.includes('claude')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  if (p.includes('google') || p.includes('gemini')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  if (p.includes('meta') || p.includes('llama')) return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  if (p.includes('deepseek')) return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  if (p.includes('mistral')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  if (p.includes('alibaba') || p.includes('qwen')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  return 'bg-primary/10 text-primary border-primary/20'
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

/* ── Main Page ── */
export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<CertificationEntry[]>([])
  const [stats, setStats] = useState<CertStats>({ total: 0, byLevel: [], byCategory: [], byProvider: [] })
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLevel !== 'all') params.set('level', filterLevel)
      if (filterCategory !== 'all') params.set('category', filterCategory)
      const res = await fetch(`/api/certifications?${params}`)
      const data = await res.json()
      setCertifications(data.certifications || [])
      setStats(data.stats || { total: 0, byLevel: [], byCategory: [], byProvider: [] })
    } catch (err) {
      console.error('Certifications fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filterLevel, filterCategory])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredCerts = certifications.filter(c => {
    if (filterLevel !== 'all' && c.level !== filterLevel) return false
    if (filterCategory !== 'all' && c.category !== filterCategory) return false
    return true
  })

  const availableCategories = [...new Set(certifications.map(c => c.category))]

  return (
    <div className="min-h-screen flex flex-col noise-overlay">
      {/* ── Background gradient ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 hero-gradient opacity-60" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">AI Certification</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <Zap className="size-3" />
              Live
            </Badge>
            {stats.total > 0 && (
              <Badge variant="outline" className="text-xs">
                <Shield className="size-3 mr-1" />
                {stats.total} Certified
              </Badge>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 relative z-10">

        {/* ── Hero ── */}
        <motion.section {...fadeUp} className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <Award className="size-4" />
            <span>The Gold Standard for AI Evaluation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="gradient-text-premium">AI Model Certification</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our rigorous certification program evaluates AI models across multiple benchmarks,
            awarding Bronze, Silver, Gold, and Platinum badges based on performance.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/protocol">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="size-4" />
                Open Benchmark Protocol
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* ── Certification Levels ── */}
        <motion.section {...stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['platinum', 'gold', 'silver', 'bronze'] as const).map((level, i) => {
            const config = LEVEL_CONFIG[level]
            const count = stats.byLevel.find(l => l.level === level)?.count || 0
            return (
              <motion.div key={level} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
                <Card className={`relative overflow-hidden ${config.bg} ${config.border} backdrop-blur-sm hover:shadow-lg hover:${config.glow} transition-all group cursor-pointer`}
                  onClick={() => { setFilterLevel(filterLevel === level ? 'all' : level); setActiveTab('certified') }}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}>
                        {config.icon}
                      </div>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-xs font-mono bg-background/50">
                          {count} certified
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${config.text}`}>{config.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Min. Score</span>
                        <span className={`font-bold font-mono ${config.text}`}>{config.minScore}+</span>
                      </div>
                      <Progress value={(config.minScore / 100) * 100} className={`h-1.5 [&>div]:bg-gradient-to-r ${config.gradient}`} />
                    </div>
                  </CardContent>
                  {/* Decorative glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"
                    style={{ background: config.color }} />
                </Card>
              </motion.div>
            )
          })}
        </motion.section>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="certified" className="gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5" />
              <span className="hidden sm:inline">Certified Models</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-xs">
              <TrendingUp className="size-3.5" />
              <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Overview (Level Cards Grid) ── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Certified', value: stats.total, icon: <Shield className="size-4 text-primary" /> },
                { label: 'Platinum', value: stats.byLevel.find(l => l.level === 'platinum')?.count || 0, icon: <Crown className="size-4 text-violet-400" /> },
                { label: 'Gold', value: stats.byLevel.find(l => l.level === 'gold')?.count || 0, icon: <Trophy className="size-4 text-amber-400" /> },
                { label: 'Avg Score', value: certifications.length > 0 ? (certifications.reduce((s, c) => s + c.overallScore, 0) / certifications.length).toFixed(1) : '—', icon: <Star className="size-4 text-emerald-400" /> },
              ].map((stat, i) => (
                <Card key={i} className="bg-card/60 backdrop-blur-sm border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/50">{stat.icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold font-mono">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Top Certified Models — Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : filteredCerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No certifications found</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">No models match the current filters.</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" {...stagger}>
                <AnimatePresence>
                  {filteredCerts.slice(0, 6).map((cert, i) => {
                    const config = LEVEL_CONFIG[cert.level as keyof typeof LEVEL_CONFIG]
                    const benchmarks: Record<string, number> = cert.benchmarks ? JSON.parse(cert.benchmarks) : {}
                    return (
                      <motion.div key={cert.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.04 }}>
                        <Card className={`h-full bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all group overflow-hidden`}>
                          <CardContent className="p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{cert.modelName}</h4>
                                <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border mt-1.5 inline-flex ${getProviderColor(cert.provider)}`}>
                                  {cert.provider}
                                </Badge>
                              </div>
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${config.badgeBg}`}>
                                {config.icon}
                                {config.label}
                              </div>
                            </div>

                            {/* Category + Score */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span>{CATEGORY_ICONS[cert.category] || '⚡'}</span>
                                <span className="capitalize">{cert.category}</span>
                              </div>
                              <div className="text-right">
                                <span className={`text-2xl font-bold font-mono ${config.text}`}>{cert.overallScore}</span>
                                <span className="text-xs text-muted-foreground">/100</span>
                              </div>
                            </div>

                            {/* Benchmark Scores */}
                            {Object.entries(benchmarks).length > 0 && (
                              <div className="space-y-2">
                                <Separator className="opacity-40" />
                                <div className="grid grid-cols-1 gap-1.5">
                                  {Object.entries(benchmarks).slice(0, 3).map(([name, score]) => (
                                    <div key={name} className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground truncate w-24">{name}</span>
                                      <Progress value={score} className={`h-1 flex-1 [&>div]:bg-gradient-to-r ${config.gradient}`} />
                                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{score}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="size-3" />
                                {formatDate(cert.validFrom)} — {formatDate(cert.validUntil)}
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2">
                                View <ChevronRight className="size-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* ── Tab: Certified Models Table ── */}
          <TabsContent value="certified" className="space-y-4">
            {/* Filters */}
            <motion.div {...fadeUp} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4" />
                <span>Filters:</span>
              </div>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Levels</SelectItem>
                  <SelectItem value="platinum" className="text-xs">Platinum (95+)</SelectItem>
                  <SelectItem value="gold" className="text-xs">Gold (90+)</SelectItem>
                  <SelectItem value="silver" className="text-xs">Silver (80+)</SelectItem>
                  <SelectItem value="bronze" className="text-xs">Bronze (70+)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs capitalize">{CATEGORY_ICONS[cat] || '⚡'} {cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filterLevel !== 'all' || filterCategory !== 'all') && (
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setFilterLevel('all'); setFilterCategory('all') }}>
                  Clear filters
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                Showing {filteredCerts.length} of {certifications.length}
              </span>
            </motion.div>

            {/* Table */}
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
                ) : filteredCerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Shield className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No certifications found</h3>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/30">
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Model</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Provider</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Level</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Score</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Valid</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Cert</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filteredCerts.map((cert, i) => {
                            const config = LEVEL_CONFIG[cert.level as keyof typeof LEVEL_CONFIG]
                            return (
                              <motion.tr key={cert.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.025 }}
                                className="border-b border-border/20 hover:bg-muted/20 transition-colors group">
                                <td className="py-3 px-4">
                                  <span className="text-sm font-mono text-muted-foreground w-6 text-center inline-block">{i + 1}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-sm group-hover:text-primary transition-colors">{cert.modelName}</span>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell">
                                  <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border ${getProviderColor(cert.provider)}`}>
                                    {cert.provider}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 hidden sm:table-cell">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {CATEGORY_ICONS[cert.category]} {cert.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${config.badgeBg}`}>
                                    {config.icon}
                                    {config.label}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`text-lg font-bold font-mono ${config.text}`}>{cert.overallScore}</span>
                                  <span className="text-[10px] text-muted-foreground">/100</span>
                                </td>
                                <td className="py-3 px-4 hidden lg:table-cell">
                                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock className="size-3" />
                                    {formatDate(cert.validFrom)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                    <ExternalLink className="size-3" />
                                    <span className="hidden xl:inline">View</span>
                                  </Button>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Statistics ── */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Level */}
              <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="size-4 text-primary" />
                    Certifications by Level
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {(['platinum', 'gold', 'silver', 'bronze'] as const).map(level => {
                    const config = LEVEL_CONFIG[level]
                    const count = stats.byLevel.find(l => l.level === level)?.count || 0
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                    return (
                      <div key={level} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={config.text}>{config.icon}</span>
                            <span className="font-medium">{config.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{count}</span>
                            <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <Progress value={pct} className={`h-2 [&>div]:bg-gradient-to-r ${config.gradient}`} />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* By Category */}
              <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    Certifications by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {stats.byCategory.map(cat => {
                    const pct = stats.total > 0 ? (cat.count / stats.total) * 100 : 0
                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{CATEGORY_ICONS[cat.category] || '⚡'}</span>
                            <span className="font-medium capitalize">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{cat.count}</span>
                            <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* By Provider */}
              <Card className="bg-card/60 backdrop-blur-sm border-border/40 md:col-span-2">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Certifications by Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {stats.byProvider.map(prov => (
                      <div key={prov.provider} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border ${getProviderColor(prov.provider)}`}>
                          {prov.provider}
                        </Badge>
                        <span className="text-lg font-bold font-mono ml-auto">{prov.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Bottom CTA ── */}
        <motion.section {...fadeUp} className="text-center py-8 space-y-4">
          <Separator className="opacity-30" />
          <h3 className="text-xl font-bold">Ready to certify your AI model?</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Submit benchmark results through our Open Benchmark Protocol to get your model evaluated and certified.
          </p>
          <Link href="/protocol">
            <Button className="gap-2 btn-glow">
              <Zap className="size-4" />
              Submit Benchmarks
            </Button>
          </Link>
        </motion.section>
      </div>
    </div>
  )
}
