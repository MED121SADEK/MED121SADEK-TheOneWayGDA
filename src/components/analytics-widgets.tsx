'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Eye, Clock, TrendingUp, Zap, ArrowUpRight,
  ArrowDownRight, Activity, Navigation, Sparkles, Download,
  RefreshCw, Loader2, Flame, Globe, Layers, MousePointerClick,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { type ChartConfig } from '@/components/ui/chart'

import AnalyticsEngine, { type DashboardData } from '@/lib/analytics-engine'

/* ─── Animation helpers ─── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const countFmt = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

const durationFmt = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/* ─── Pie chart colours ─── */
const PIE_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#f87171']

/* ─── Chart Configs ─── */
const activityChartConfig = {
  views: { label: 'Page Views', color: '#38bdf8' },
  events: { label: 'Events', color: '#c084fc' },
} satisfies ChartConfig

const featureChartConfig = {
  value: { label: 'Usage' },
} satisfies ChartConfig

/* ═══════════════════════════════════════════════
   StatsCards — 4 animated metric cards
   ═══════════════════════════════════════════════ */

function AnimatedNumber({ value, format = countFmt }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(value)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    prevRef.current = value
    if (start === end) return

    const duration = 600
    const startTime = performance.now()

    function step(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])

  return <span>{format(display)}</span>
}

function StatsCards({ data }: { data: DashboardData }) {
  const cards = [
    {
      title: 'Page Views',
      value: data.totalPageViews,
      change: data.growthRate,
      icon: Eye,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Active Features',
      value: data.activeFeatures,
      change: null,
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Avg Session',
      value: data.avgSessionDuration,
      change: null,
      format: durationFmt,
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Growth Rate',
      value: data.growthRate,
      change: data.growthRate,
      isPercent: true,
      icon: TrendingUp,
      color: data.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400',
      bgColor: data.growthRate >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20',
    },
  ]

  return (
    <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" {...stagger}>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <motion.div key={card.title} {...fadeUp}>
            <Card className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-9 rounded-xl ${card.bgColor} border flex items-center justify-center`}>
                    <Icon className={`size-4 ${card.color}`} />
                  </div>
                  {card.change !== null && card.change !== undefined && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] gap-0.5 px-1.5 py-0 rounded-full ${
                        card.change >= 0
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
                          : 'text-rose-400 border-rose-500/30 bg-rose-500/5'
                      }`}
                    >
                      {card.change >= 0 ? (
                        <ArrowUpRight className="size-2.5" />
                      ) : (
                        <ArrowDownRight className="size-2.5" />
                      )}
                      {Math.abs(card.change)}%
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  <AnimatedNumber
                    value={card.isPercent ? card.value : card.value}
                    format={card.format || (card.isPercent ? (n) => `${n}%` : countFmt)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{card.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   ActivityChart — Hourly bar chart (last 24h)
   ═══════════════════════════════════════════════ */

function ActivityChart({ data }: { data: DashboardData }) {
  const chartData = data.hourlyActivity.map((h) => ({
    hour: h.hour,
    views: h.views,
    events: h.events,
  }))

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="size-4 text-sky-400" />
          Hourly Activity
          <Badge variant="outline" className="text-[10px] ml-auto text-muted-foreground">Last 24h</Badge>
        </CardTitle>
        <CardDescription className="text-[11px]">Page views & feature events per hour</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={activityChartConfig} className="h-[220px] w-full">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: 'oklch(0.65 0.02 280)' }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'oklch(0.65 0.02 280)' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="views" fill="var(--color-views)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="events" fill="var(--color-events)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   PagePopularity — Horizontal bar chart
   ═══════════════════════════════════════════════ */

function PagePopularity({ data }: { data: DashboardData }) {
  const max = data.pagePopularity[0]?.count || 1
  const barConfig = {
    count: { label: 'Views', color: '#818cf8' },
  } satisfies ChartConfig

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="size-4 text-indigo-400" />
          Page Popularity
        </CardTitle>
        <CardDescription className="text-[11px]">Most visited pages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
          {data.pagePopularity.map((item, i) => (
            <motion.div
              key={item.page}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-[11px] text-muted-foreground w-24 truncate flex-shrink-0 text-right">
                {item.page}
              </span>
              <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden">
                <motion.div
                  className="h-full rounded-md"
                  style={{
                    background: `linear-gradient(90deg, oklch(0.62 0.22 262.881 / 0.7), oklch(0.72 0.15 175 / 0.7))`,
                    width: `${(item.count / max) * 100}%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground w-10 text-right tabular-nums">
                {item.count}
              </span>
            </motion.div>
          ))}
          {data.pagePopularity.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">No data yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   FeatureUsage — Donut pie chart
   ═══════════════════════════════════════════════ */

function FeatureUsage({ data }: { data: DashboardData }) {
  const chartData = data.featureUsage.slice(0, 6).map((f, i) => ({
    name: f.feature,
    value: f.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="size-4 text-fuchsia-400" />
          Feature Usage
        </CardTitle>
        <CardDescription className="text-[11px]">Breakdown of feature interactions</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center">
            <ChartContainer config={featureChartConfig} className="h-[180px] w-[180px]">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="oklch(0.15 0.02 280)"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'oklch(0.15 0.02 280)',
                    border: '1px solid oklch(1 0 0 / 10%)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: 'oklch(0.95 0.005 280)' }}
                  labelStyle={{ color: 'oklch(0.95 0.005 280)' }}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 text-center">
              <span className="text-xl font-bold tabular-nums">{total}</span>
              <p className="text-[10px] text-muted-foreground">Total Interactions</p>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 w-full max-w-[220px]">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                  <span className="truncate text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Layers className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">No feature data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   RecentActivity — Live scrolling feed
   ═══════════════════════════════════════════════ */

function RecentActivity({ data }: { data: DashboardData }) {
  const iconForType = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye className="size-3 text-sky-400" />
      case 'feature_use': return <MousePointerClick className="size-3 text-amber-400" />
      case 'navigation': return <Navigation className="size-3 text-emerald-400" />
      default: return <Activity className="size-3 text-muted-foreground" />
    }
  }

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="size-4 text-emerald-400" />
          Recent Activity
          <Badge variant="outline" className="text-[10px] ml-auto text-emerald-400 border-emerald-500/30 bg-emerald-500/5 gap-1">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
          {data.recentActivity.map((item, i) => (
            <motion.div
              key={`${item.type}-${item.timestamp}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="size-7 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center flex-shrink-0">
                {iconForType(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate">{item.label}</p>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                {timeAgo(item.timestamp)}
              </span>
            </motion.div>
          ))}
          {data.recentActivity.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">No activity yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   QuickInsights — AI-style insight cards
   ═══════════════════════════════════════════════ */

function QuickInsights({ data }: { data: DashboardData }) {
  const insights: { icon: React.ElementType; text: string; color: string; bg: string }[] = []

  // Generate contextual insights
  if (data.totalPageViews === 0) {
    insights.push({
      icon: Sparkles,
      text: 'Welcome! Start exploring to generate analytics insights.',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    })
  } else {
    // Most visited page insight
    if (data.pagePopularity.length > 0) {
      const top = data.pagePopularity[0]
      insights.push({
        icon: Flame,
        text: `${top.page} is your most visited page with ${top.count} views.`,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20',
      })
    }

    // Bounce rate insight
    if (data.bounceRate > 60) {
      insights.push({
        icon: TrendingUp,
        text: `Bounce rate is ${data.bounceRate}%. Consider improving content engagement.`,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
      })
    } else if (data.bounceRate > 0 && data.bounceRate < 30) {
      insights.push({
        icon: TrendingUp,
        text: `Great engagement! Bounce rate is only ${data.bounceRate}%.`,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      })
    }

    // Growth insight
    if (data.growthRate > 50) {
      insights.push({
        icon: ArrowUpRight,
        text: `Activity surged ${data.growthRate}% compared to yesterday!`,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      })
    }

    // Feature diversity
    if (data.activeFeatures >= 5) {
      insights.push({
        icon: Zap,
        text: `You've used ${data.activeFeatures} different features. Great exploration!`,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      })
    }

    // Navigation pattern
    if (data.topNavigationPaths.length > 0) {
      const topNav = data.topNavigationPaths[0]
      insights.push({
        icon: Navigation,
        text: `Most common path: ${topNav.from} → ${topNav.to} (${topNav.count}x).`,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10 border-sky-500/20',
      })
    }

    // Session time insight
    if (data.avgSessionDuration > 120) {
      insights.push({
        icon: Clock,
        text: `Average session is ${durationFmt(data.avgSessionDuration)} — deep engagement!`,
        color: 'text-violet-400',
        bg: 'bg-violet-500/10 border-violet-500/20',
      })
    }
  }

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          Quick Insights
          <Badge variant="outline" className="text-[10px] ml-auto text-amber-400 border-amber-500/30 bg-amber-500/5">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
          {insights.map((insight, i) => {
            const Icon = insight.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-start gap-3 p-3 rounded-lg border ${insight.bg}`}
              >
                <Icon className={`size-4 mt-0.5 flex-shrink-0 ${insight.color}`} />
                <p className="text-[11px] leading-relaxed">{insight.text}</p>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   NavigationPaths — Flow visualization
   ═══════════════════════════════════════════════ */

function NavigationPaths({ data }: { data: DashboardData }) {
  if (data.topNavigationPaths.length === 0) return null

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="size-4 text-teal-400" />
          Top Navigation Paths
        </CardTitle>
        <CardDescription className="text-[11px]">Most frequent page transitions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.topNavigationPaths.map((path, i) => (
            <motion.div
              key={`${path.from}-${path.to}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-[11px] p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-muted-foreground truncate max-w-[100px]">{path.from}</span>
              <ArrowUpRight className="size-3 text-primary rotate-90 flex-shrink-0" />
              <span className="text-foreground font-medium truncate max-w-[100px]">{path.to}</span>
              <Badge variant="secondary" className="text-[9px] ml-auto px-1.5 py-0 tabular-nums">
                {path.count}x
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════
   Main Export — AnalyticsDashboard
   ═══════════════════════════════════════════════ */

export function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(() => {
    setRefreshing(true)
    const dashboardData = AnalyticsEngine.getDashboardData()
    setData(dashboardData)
    setTimeout(() => setRefreshing(false), 400)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [refresh])

  const handleExport = () => {
    const json = AnalyticsEngine.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onewaygda-analytics-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Loading analytics dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Real-Time Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-refreshes every 30 seconds · Data stored locally for 7 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExport}
          >
            <Download className="size-3" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <StatsCards data={data} />

      {/* Charts Row */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" {...stagger}>
        <motion.div className="lg:col-span-2" {...fadeUp}>
          <ActivityChart data={data} />
        </motion.div>
        <motion.div {...fadeUp}>
          <FeatureUsage data={data} />
        </motion.div>
      </motion.div>

      {/* Middle Row */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4" {...stagger}>
        <motion.div {...fadeUp}>
          <PagePopularity data={data} />
        </motion.div>
        <motion.div {...fadeUp}>
          <NavigationPaths data={data} />
        </motion.div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4" {...stagger}>
        <motion.div {...fadeUp}>
          <RecentActivity data={data} />
        </motion.div>
        <motion.div {...fadeUp}>
          <QuickInsights data={data} />
        </motion.div>
      </motion.div>
    </div>
  )
}

export default AnalyticsDashboard
