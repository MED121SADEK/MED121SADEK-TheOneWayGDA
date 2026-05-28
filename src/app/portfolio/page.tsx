'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Eye, EyeOff, Star, Bell, BellRing,
  BarChart3, PieChart, Target, Zap, Shield, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, Globe, Lock, Search, X,
  AlertTriangle, CheckCircle2, Info, Crown, Activity,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface Holding {
  id: string
  portfolioId: string
  modelId: string
  modelName: string
  provider: string
  score: number
  prevScore: number
  addedAt: string
  lastUpdated: string
}

interface Alert {
  id: string
  portfolioId: string
  modelId: string
  modelName: string
  alertType: string
  message: string
  isRead: boolean
  createdAt: string
}

interface Portfolio {
  id: string
  ownerId: string
  ownerName: string | null
  name: string
  description: string | null
  isPublic: boolean
  totalValue: number
  holdings: number
  createdAt: string
  updatedAt: string
}

interface AvailableModel {
  modelId: string
  name: string
  provider: string
  score: number
}

// ═══════════════════════════════════════════════════════
// Provider color map
// ═══════════════════════════════════════════════════════

const PROVIDER_COLORS: Record<string, string> = {
  'Anthropic': 'oklch(0.72 0.19 300)',
  'OpenAI': 'oklch(0.75 0.15 150)',
  'Google': 'oklch(0.75 0.18 75)',
  'DeepSeek': 'oklch(0.7 0.22 25)',
  'Meta': 'oklch(0.65 0.2 300)',
  'Mistral': 'oklch(0.7 0.15 260)',
  'Alibaba': 'oklch(0.78 0.18 85)',
  'Cohere': 'oklch(0.72 0.2 330)',
  'xAI': 'oklch(0.7 0.22 45)',
  '01.AI': 'oklch(0.75 0.15 175)',
}

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || 'oklch(0.65 0.15 260)'
}

function getProviderInitials(provider: string): string {
  return provider.slice(0, 2).toUpperCase()
}

// ═══════════════════════════════════════════════════════
// Mock performance chart data
// ═══════════════════════════════════════════════════════

function generatePerformanceData() {
  type DataPoint = { date: string; portfolio: number; claude: number; gpt4o: number; deepseek: number }
  const base = 82
  const data: DataPoint[] = []
  for (let i = 30; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: base + Math.sin(i * 0.15) * 3 + Math.random() * 2 + i * 0.12,
      claude: 89 + Math.sin(i * 0.2) * 2.5 + Math.random() * 1.5,
      gpt4o: 87 + Math.cos(i * 0.18) * 1.8 + Math.random() * 1.2,
      deepseek: 88 + Math.sin(i * 0.25 + 1) * 2.2 + Math.random() * 1.8,
    })
  }
  return data
}

function generateScoreDistribution(holdings: Holding[]): { name: string; score: number; fill: string }[] {
  return holdings.map((h) => ({
    name: h.modelName,
    score: h.score,
    fill: getProviderColor(h.provider),
  }))
}

function generateMiniSparkline(score: number, prevScore: number): number[] {
  const base = prevScore
  const diff = score - prevScore
  const points = [base, base + diff * 0.2, base + diff * 0.5, base + diff * 0.3, base + diff * 0.8, score]
  return points.map((p) => Math.round(p * 100) / 100)
}

// ═══════════════════════════════════════════════════════
// Alert type icons and colors
// ═══════════════════════════════════════════════════════

function getAlertStyle(type: string) {
  switch (type) {
    case 'score_increase':
      return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
    case 'score_decrease':
      return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' }
    case 'pricing_change':
      return { icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' }
    case 'overtake':
      return { icon: Crown, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' }
    case 'new_benchmark':
      return { icon: Zap, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' }
    default:
      return { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border' }
  }
}

// ═══════════════════════════════════════════════════════
// Mini Sparkline Component
// ═══════════════════════════════════════════════════════

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 80
  const height = 28

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#34d399' : '#f87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════
// Custom Recharts Tooltip
// ═══════════════════════════════════════════════════════

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════

export default function PortfolioPage() {
  // ── State ──
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [addHoldingOpen, setAddHoldingOpen] = useState(false)
  const [selectedModelToAdd, setSelectedModelToAdd] = useState<string>('')

  // Create form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(false)

  const performanceData = generatePerformanceData()

  // ── Fetch portfolios ──
  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      const json = await res.json()
      if (json.success) {
        setPortfolios(json.data)
        if (json.data.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(json.data[0])
        }
      }
    } catch {
      // silent fallback to demo data
    }
  }, [selectedPortfolio])

  // ── Fetch holdings & alerts when portfolio changes ──
  const fetchPortfolioDetails = useCallback(async () => {
    if (!selectedPortfolio) return
    try {
      const [hRes, aRes] = await Promise.all([
        fetch(`/api/portfolio/${selectedPortfolio.id}/holdings`),
        fetch(`/api/portfolio/${selectedPortfolio.id}/alerts`),
      ])
      const hJson = await hRes.json()
      const aJson = await aRes.json()
      if (hJson.success) {
        setHoldings(hJson.data)
        setAvailableModels(hJson.availableModels || [])
      }
      if (aJson.success) {
        setAlerts(aJson.data)
      }
    } catch {
      // silent fallback
    }
  }, [selectedPortfolio])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchPortfolios()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    const load = async () => {
      await fetchPortfolioDetails()
    }
    load()
  }, [fetchPortfolioDetails])

  // ── Handlers ──
  const handleCreatePortfolio = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: 'demo@theonewaygda.com',
          ownerName: 'Demo User',
          name: newName,
          description: newDesc,
          isPublic: newIsPublic,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setPortfolios((prev) => [json.data, ...prev])
        setSelectedPortfolio(json.data)
        setCreateOpen(false)
        setNewName('')
        setNewDesc('')
        setNewIsPublic(false)
      }
    } catch {
      // silent
    }
  }

  const handleAddHolding = async () => {
    if (!selectedModelToAdd || !selectedPortfolio) return
    const model = availableModels.find((m) => m.modelId === selectedModelToAdd)
    if (!model) return
    try {
      const res = await fetch(`/api/portfolio/${selectedPortfolio.id}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.modelId,
          modelName: model.name,
          provider: model.provider,
          score: model.score,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchPortfolioDetails()
        fetchPortfolios()
        setAddHoldingOpen(false)
        setSelectedModelToAdd('')
      }
    } catch {
      // silent
    }
  }

  const handleMarkAlertsRead = async () => {
    if (!selectedPortfolio) return
    try {
      await fetch(`/api/portfolio/${selectedPortfolio.id}/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
    } catch {
      // silent
    }
  }

  // ── Computed ──
  const unreadAlerts = alerts.filter((a) => !a.isRead).length
  const avgScore = holdings.length > 0
    ? holdings.reduce((sum, h) => sum + h.score, 0) / holdings.length
    : 0
  const totalChange = holdings.reduce((sum, h) => sum + (h.score - h.prevScore), 0)
  const positiveCount = holdings.filter((h) => h.score >= h.prevScore).length
  const negativeCount = holdings.length - positiveCount

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        {/* ── Hero Gradient Background ── */}
        <div className="fixed inset-0 pointer-events-none hero-gradient opacity-50" />
        <div className="fixed inset-0 pointer-events-none bg-gradient-radial-from-primary\/5 bg-gradient-radial" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* ═══════════════════════════════════════════
              HEADER
          ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">
                    AI Model Portfolio
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Track AI models like stocks — monitor scores, set alerts, and build your dream portfolio.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-glow gap-2">
                      <Plus className="h-4 w-4" />
                      Create Portfolio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Create New Portfolio
                      </DialogTitle>
                      <DialogDescription>
                        Build your AI model tracking portfolio. Choose which models to follow and get alerts when scores change.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="pf-name">Portfolio Name</Label>
                        <Input
                          id="pf-name"
                          placeholder="e.g. Top Reasoning Models"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pf-desc">Description</Label>
                        <Input
                          id="pf-desc"
                          placeholder="What's this portfolio about?"
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Public Portfolio</Label>
                          <p className="text-xs text-muted-foreground">Others can view your portfolio</p>
                        </div>
                        <Switch checked={newIsPublic} onCheckedChange={setNewIsPublic} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreatePortfolio} disabled={!newName.trim()}>Create Portfolio</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════
              PORTFOLIO SELECTOR
          ═══════════════════════════════════════════ */}
          {portfolios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex flex-wrap gap-2">
                {portfolios.map((pf) => (
                  <button
                    key={pf.id}
                    onClick={() => setSelectedPortfolio(pf)}
                    className={`
                      group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium
                      transition-all duration-200 hover:border-primary/40
                      ${selectedPortfolio?.id === pf.id
                        ? 'border-primary/60 bg-primary/10 text-foreground shadow-[0_0_20px_oklch(0.62_0.22_262.881/0.1)]'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    {pf.isPublic ? (
                      <Globe className="h-3.5 w-3.5 opacity-60" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 opacity-60" />
                    )}
                    <span>{pf.name}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {pf.holdings}
                    </Badge>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              SUMMARY CARDS ROW
          ═══════════════════════════════════════════ */}
          {selectedPortfolio && (
            <motion.div
              key={selectedPortfolio.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Score */}
                <Card className="glass-card glow-border overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Avg. Score
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                      {avgScore.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {totalChange >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className={`text-xs font-medium ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)} pts
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">vs prev</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Holdings */}
                <Card className="glass-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Holdings
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                        <PieChart className="h-4 w-4" style={{ color: 'oklch(0.72 0.15 175)' }} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                      {holdings.length}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-emerald-400">{positiveCount} up</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs text-red-400">{negativeCount} down</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performer */}
                <Card className="glass-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Top Model
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                        <Crown className="h-4 w-4 text-amber-400" />
                      </div>
                    </div>
                    <div className="text-lg font-bold tracking-tight truncate">
                      {holdings[0]?.modelName || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Score: {holdings[0]?.score.toFixed(1) || '—'}
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card className="glass-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Alerts
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
                        {unreadAlerts > 0 ? (
                          <BellRing className="h-4 w-4" style={{ color: 'oklch(0.7 0.22 300)' }} />
                        ) : (
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                      {unreadAlerts}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      unread notification{unreadAlerts !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              MAIN CONTENT TABS
          ═══════════════════════════════════════════ */}
          {selectedPortfolio && (
            <motion.div
              key={`tabs-${selectedPortfolio.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-card/50 border border-border backdrop-blur-sm">
                  <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    <Activity className="h-3.5 w-3.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="holdings" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    <Star className="h-3.5 w-3.5" />
                    Holdings
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative">
                    <Bell className="h-3.5 w-3.5" />
                    Alerts
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                        {unreadAlerts}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* ═══════════════════════════
                    OVERVIEW TAB
                ═══════════════════════════ */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Performance Chart */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">Portfolio Performance</CardTitle>
                          <CardDescription className="text-xs mt-1">30-day composite score trend</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
                          +5.2% this month
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[280px] sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.62 0.22 262.881)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.62 0.22 262.881)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="claudeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.72 0.19 300)" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="oklch(0.72 0.19 300)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              domain={['dataMin - 2', 'dataMax + 2']}
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Area
                              type="monotone"
                              dataKey="claude"
                              name="Claude 4 Opus"
                              stroke="oklch(0.72 0.19 300)"
                              fill="url(#claudeGrad)"
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                            <Area
                              type="monotone"
                              dataKey="portfolio"
                              name="Portfolio Avg"
                              stroke="oklch(0.62 0.22 262.881)"
                              fill="url(#portfolioGrad)"
                              strokeWidth={2.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Holdings Overview + Score Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Holdings Quick List */}
                    <Card className="glass-card overflow-hidden lg:col-span-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">Holdings Overview</CardTitle>
                          <Dialog open={addHoldingOpen} onOpenChange={setAddHoldingOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                                <Plus className="h-3 w-3" /> Add Model
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add Model to Portfolio</DialogTitle>
                                <DialogDescription>Select an AI model to track in your portfolio.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                  <Label>Select Model</Label>
                                  <Select value={selectedModelToAdd} onValueChange={setSelectedModelToAdd}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a model..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableModels
                                        .filter((m) => !holdings.find((h) => h.modelId === m.modelId))
                                        .map((model) => (
                                          <SelectItem key={model.modelId} value={model.modelId}>
                                            <span className="flex items-center gap-2">
                                              <span className="font-medium">{model.name}</span>
                                              <span className="text-muted-foreground text-xs">({model.provider})</span>
                                              <Badge variant="secondary" className="ml-auto text-[10px]">{model.score}</Badge>
                                            </span>
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setAddHoldingOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddHolding} disabled={!selectedModelToAdd}>Add to Portfolio</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ScrollArea className="max-h-[320px]">
                          <div className="space-y-2">
                            {holdings.map((h, idx) => {
                              const change = h.score - h.prevScore
                              const isUp = change >= 0
                              const sparkData = generateMiniSparkline(h.score, h.prevScore)
                              return (
                                <motion.div
                                  key={h.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                                >
                                  <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarFallback
                                      className="text-[10px] font-bold"
                                      style={{
                                        backgroundColor: `${getProviderColor(h.provider)}20`,
                                        color: getProviderColor(h.provider),
                                      }}
                                    >
                                      {getProviderInitials(h.provider)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate">{h.modelName}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">{h.provider}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-sm font-semibold">{h.score.toFixed(1)}</span>
                                      <span className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {isUp ? '+' : ''}{change.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>

                                  <MiniSparkline data={sparkData} positive={isUp} />

                                  <div className="text-right shrink-0">
                                    <div className="text-xs font-semibold">{h.score.toFixed(1)}</div>
                                    <div className="text-[10px] text-muted-foreground">#{idx + 1}</div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Score Distribution Bar Chart */}
                    <Card className="glass-card overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Score Distribution</CardTitle>
                        <CardDescription className="text-xs">Current benchmark scores</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={generateScoreDistribution(holdings)}
                              layout="vertical"
                              margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                              <XAxis
                                type="number"
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: 'oklch(0.65 0.02 280)' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                tick={{ fontSize: 9, fill: 'oklch(0.65 0.02 280)' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
                                {holdings.map((h, idx) => (
                                  <rect key={idx} fill={getProviderColor(h.provider)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ═══════════════════════════
                    HOLDINGS TAB
                ═══════════════════════════ */}
                <TabsContent value="holdings" className="space-y-6">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">All Holdings</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {holdings.length} models tracked in this portfolio
                          </CardDescription>
                        </div>
                        <Dialog open={addHoldingOpen} onOpenChange={setAddHoldingOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5">
                              <Plus className="h-3.5 w-3.5" /> Add Model
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Add Model to Portfolio</DialogTitle>
                              <DialogDescription>Select an AI model to track in your portfolio.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <Label>Select Model</Label>
                                <Select value={selectedModelToAdd} onValueChange={setSelectedModelToAdd}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a model..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableModels
                                      .filter((m) => !holdings.find((h) => h.modelId === m.modelId))
                                      .map((model) => (
                                        <SelectItem key={model.modelId} value={model.modelId}>
                                          <span className="flex items-center gap-2">
                                            <span className="font-medium">{model.name}</span>
                                            <span className="text-muted-foreground text-xs">({model.provider})</span>
                                            <Badge variant="secondary" className="ml-auto text-[10px]">{model.score}</Badge>
                                          </span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setAddHoldingOpen(false)}>Cancel</Button>
                              <Button onClick={handleAddHolding} disabled={!selectedModelToAdd}>Add to Portfolio</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="text-xs font-semibold">#</TableHead>
                              <TableHead className="text-xs font-semibold">Model</TableHead>
                              <TableHead className="text-xs font-semibold hidden sm:table-cell">Provider</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Score</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Change</TableHead>
                              <TableHead className="text-xs font-semibold hidden md:table-cell">Trend</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {holdings.map((h, idx) => {
                              const change = h.score - h.prevScore
                              const isUp = change >= 0
                              const sparkData = generateMiniSparkline(h.score, h.prevScore)
                              return (
                                <TableRow key={h.id} className="border-border/50 hover:bg-primary/5 transition-colors">
                                  <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-7 w-7">
                                        <AvatarFallback
                                          className="text-[9px] font-bold"
                                          style={{
                                            backgroundColor: `${getProviderColor(h.provider)}20`,
                                            color: getProviderColor(h.provider),
                                          }}
                                        >
                                          {getProviderInitials(h.provider)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="font-medium text-sm">{h.modelName}</span>
                                        <div className="text-[10px] text-muted-foreground sm:hidden">{h.provider}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline" className="text-[10px]">{h.provider}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="font-semibold text-sm">{h.score.toFixed(1)}</span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {change === 0 ? (
                                        <Minus className="h-3 w-3" />
                                      ) : isUp ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                      ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                      )}
                                      {isUp ? '+' : ''}{change.toFixed(1)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex justify-center">
                                      <MiniSparkline data={sparkData} positive={isUp} />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ═══════════════════════════
                    PERFORMANCE TAB
                ═══════════════════════════ */}
                <TabsContent value="performance" className="space-y-6">
                  {/* Main Area Chart */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">30-Day Performance</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Composite score trend for portfolio and individual models
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.62 0.22 262.881)' }} />
                            <span className="text-[10px] text-muted-foreground">Portfolio</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.72 0.19 300)' }} />
                            <span className="text-[10px] text-muted-foreground">Claude</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.75 0.15 150)' }} />
                            <span className="text-[10px] text-muted-foreground">GPT-4o</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.7 0.22 25)' }} />
                            <span className="text-[10px] text-muted-foreground">DeepSeek</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[350px] sm:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="perfPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.62 0.22 262.881)" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="oklch(0.62 0.22 262.881)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="perfClaudeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.72 0.19 300)" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="oklch(0.72 0.19 300)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="perfGptGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.75 0.15 150)" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="oklch(0.75 0.15 150)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="perfDsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.7 0.22 25)" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="oklch(0.7 0.22 25)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              domain={['dataMin - 3', 'dataMax + 3']}
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="deepseek" name="DeepSeek R1" stroke="oklch(0.7 0.22 25)" fill="url(#perfDsGrad)" strokeWidth={1.5} />
                            <Area type="monotone" dataKey="gpt4o" name="GPT-4o" stroke="oklch(0.75 0.15 150)" fill="url(#perfGptGrad)" strokeWidth={1.5} />
                            <Area type="monotone" dataKey="claude" name="Claude 4 Opus" stroke="oklch(0.72 0.19 300)" fill="url(#perfClaudeGrad)" strokeWidth={1.5} />
                            <Area type="monotone" dataKey="portfolio" name="Portfolio Avg" stroke="oklch(0.62 0.22 262.881)" fill="url(#perfPortfolioGrad)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Change Comparison Line Chart */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">Score Changes</CardTitle>
                      <CardDescription className="text-xs">Positive vs negative score changes per model</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={holdings.map((h) => ({
                              name: h.modelName.split(' ').slice(-1)[0],
                              change: Math.round((h.score - h.prevScore) * 10) / 10,
                              fill: h.score >= h.prevScore ? '#34d399' : '#f87171',
                            }))}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: 'oklch(0.65 0.02 280)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="change" name="Score Change" radius={[4, 4, 0, 0]}>
                              {holdings.map((h, idx) => (
                                <rect key={idx} fill={h.score >= h.prevScore ? '#34d399' : '#f87171'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Progress Bars */}
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Model Rankings</CardTitle>
                      <CardDescription className="text-xs">Score relative to 100-point scale</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-4">
                        {holdings.map((h, idx) => (
                          <motion.div
                            key={h.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.06 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                                <span className="text-sm font-medium">{h.modelName}</span>
                              </div>
                              <span className="text-sm font-semibold">{h.score.toFixed(1)}</span>
                            </div>
                            <Progress
                              value={h.score}
                              className="h-2"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ═══════════════════════════
                    ALERTS TAB
                ═══════════════════════════ */}
                <TabsContent value="alerts" className="space-y-6">
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Score changes, pricing updates, and model events
                          </CardDescription>
                        </div>
                        {unreadAlerts > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7"
                            onClick={handleMarkAlertsRead}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark All Read
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ScrollArea className="max-h-[500px]">
                        <div className="space-y-2">
                          <AnimatePresence>
                            {alerts.map((alert, idx) => {
                              const style = getAlertStyle(alert.alertType)
                              const IconComp = style.icon
                              const timeAgo = getTimeAgo(alert.createdAt)
                              return (
                                <motion.div
                                  key={alert.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ delay: idx * 0.03 }}
                                  className={`
                                    flex items-start gap-3 rounded-lg border p-3 transition-all
                                    ${alert.isRead ? 'bg-card/30 border-border/30' : `${style.bg} ${style.border}`}
                                  `}
                                >
                                  <div className={`
                                    flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                                    ${style.bg}
                                  `}>
                                    <IconComp className={`h-4 w-4 ${style.color}`} />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-medium truncate">{alert.modelName}</span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] px-1.5 py-0 shrink-0"
                                        style={{ borderColor: `color-mix(in oklch, ${style.color} 40%, transparent)`, color: style.color }}
                                      >
                                        {alert.alertType.replace(/_/g, ' ')}
                                      </Badge>
                                      {!alert.isRead && (
                                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo}</span>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              NO PORTFOLIO STATE
          ═══════════════════════════════════════════ */}
          {portfolios.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                <PieChart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Portfolios Yet</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Create your first AI model portfolio to start tracking benchmark scores, 
                setting alerts, and analyzing performance trends.
              </p>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 btn-glow">
                    <Plus className="h-4 w-4" />
                    Create Your First Portfolio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Portfolio</DialogTitle>
                    <DialogDescription>
                      Build your AI model tracking portfolio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="pf-name-empty">Portfolio Name</Label>
                      <Input
                        id="pf-name-empty"
                        placeholder="e.g. Top Reasoning Models"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pf-desc-empty">Description</Label>
                      <Input
                        id="pf-desc-empty"
                        placeholder="What's this portfolio about?"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Public Portfolio</Label>
                        <p className="text-xs text-muted-foreground">Others can view your portfolio</p>
                      </div>
                      <Switch checked={newIsPublic} onCheckedChange={setNewIsPublic} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreatePortfolio} disabled={!newName.trim()}>Create Portfolio</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// ═══════════════════════════════════════════════════════
// Utility: Time ago
// ═══════════════════════════════════════════════════════

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
