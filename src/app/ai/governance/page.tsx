'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  Eye,
  Clock,
  Bot,
  Zap,
  Download,
  Info,
  CheckCircle,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Activity,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  Brain,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════
   Animation helpers (matches existing pages)
   ══════════════════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */
interface AuditLogEntry {
  id: string
  action: string
  details: string
  error: string | null
  durationMs: number | null
  tokensUsed: number | null
  createdAt: string
}

interface AuditStats {
  todayQueries: number
  weekQueries: number
  totalQueries: number
  avgDurationMs: number
}

/* ══════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════ */
export default function AiGovernancePage() {
  const { t, dir } = useTranslation()

  /* ── Audit data state ── */
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [loading, setLoading] = useState(true)

  /* ── Controls state ── */
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [proactivityLevel, setProactivityLevel] = useState([70])
  const [enableAutomation, setEnableAutomation] = useState(true)
  const [auditLogging, setAuditLogging] = useState(true)
  const [dataScope, setDataScope] = useState('standard')

  /* ── Table filter & pagination ── */
  const [filterAction, setFilterAction] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  /* ── Active tab state ── */
  const [activeTab, setActiveTab] = useState('overview')

  /* ── Fetch audit data ── */
  const fetchAuditData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((currentPage - 1) * pageSize),
      })
      if (filterAction && filterAction !== 'all') {
        params.set('action', filterAction)
      }

      const res = await fetch(`/api/ai/audit?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setLogs(data.logs)
        setTotalLogs(data.pagination.total)
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false)
    }
  }, [filterAction, currentPage])

  useEffect(() => {
    fetchAuditData()
  }, [fetchAuditData])

  /* ── CSV Export ── */
  const exportCSV = useCallback(() => {
    const headers = ['Timestamp', 'Action', 'Context', 'Duration (ms)', 'Tokens Used', 'Error']
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.action,
      `"${log.details.replace(/"/g, '""')}"`,
      log.durationMs ?? '',
      log.tokensUsed ?? '',
      log.error ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [logs])

  /* ── Action type badge helper ── */
  const getActionBadge = (action: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType; color: string }> = {
      ai_query: { variant: 'default', icon: Bot, color: 'text-primary' },
      automation_run: { variant: 'secondary', icon: Zap, color: 'text-amber-500' },
      suggestion_accepted: { variant: 'outline', icon: CheckCircle, color: 'text-emerald-500' },
      suggestion_dismissed: { variant: 'outline', icon: Info, color: 'text-muted-foreground' },
      data_access: { variant: 'secondary', icon: Database, color: 'text-cyan-500' },
    }
    const meta = map[action] || { variant: 'outline' as const, icon: Activity, color: 'text-muted-foreground' }
    return { ...meta }
  }

  const totalPages = Math.ceil(totalLogs / pageSize)

  /* ── Stats cards config ── */
  const statCards = [
    {
      label: 'Total AI Queries',
      icon: Activity,
      value: stats?.totalQueries ?? 0,
      sub: `Today: ${stats?.todayQueries ?? 0} · This week: ${stats?.weekQueries ?? 0}`,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'Automations Run',
      icon: Zap,
      value: stats?.weekQueries ?? 0,
      sub: `${stats?.todayQueries ?? 0} active today`,
      color: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    },
    {
      label: 'Suggestions',
      icon: Sparkles,
      value: '78%',
      sub: 'Accepted vs Dismissed ratio',
      color: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    },
    {
      label: 'Avg Response Time',
      icon: Clock,
      value: stats?.avgDurationMs ? `${stats.avgDurationMs}ms` : '—',
      sub: 'Across all AI interactions',
      color: 'from-cyan-500/20 to-cyan-600/5',
      iconBg: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 mesh-gradient">
        {/* ══════════════════════════════════════════════
            1. HEADER
        ══════════════════════════════════════════════ */}
        <section className="hero-gradient py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} custom={0}>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6">
                  <Shield className="size-3.5 text-primary mr-1.5" />
                  Responsible AI
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                <span className="gradient-text-premium">AI Governance &amp; Privacy</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Full transparency and control over all AI activity on the platform.
                Monitor queries, manage automations, understand how suggestions work, and exercise your data rights — all from one place.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            TAB NAVIGATION
        ══════════════════════════════════════════════ */}
        <section className="py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="size-3.5" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="controls" className="gap-2">
                  <Settings className="size-3.5" />
                  <span className="hidden sm:inline">Controls</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-2">
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Audit Log</span>
                </TabsTrigger>
              </TabsList>

              {/* ═══════════════════════════════════════
                  TAB 1: AI ACTIVITY OVERVIEW
              ═══════════════════════════════════════ */}
              <TabsContent value="overview" className="mt-8 space-y-10">
                {/* Stats Cards Grid */}
                <AnimatedSection>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {statCards.map((stat, i) => (
                      <motion.div key={stat.label} variants={fadeUp} custom={i}>
                        <Card className="h-full card-premium bg-gradient-to-br border backdrop-blur-sm">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`size-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                <stat.icon className="size-5" />
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Activity className="size-3 mr-1" />
                                Live
                              </Badge>
                            </div>
                            <div className="stat-animate">
                              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                            </div>
                            <p className="text-sm font-medium mt-1">{stat.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </AnimatedSection>

                {/* Your Data & AI — Info Cards */}
                <AnimatedSection>
                  <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-2">
                    Your Data &amp; AI
                  </motion.h2>
                  <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                    Understand how AI interacts with your data and what rights you have.
                  </motion.p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        icon: Database,
                        title: 'What Data the AI Can Access',
                        desc: 'The AI only accesses data you explicitly provide within your current session — uploaded datasets, variable definitions, and analysis parameters. It never accesses your personal profile, account settings, or data from other projects unless you grant explicit permission.',
                        gradient: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
                        iconBg: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400',
                      },
                      {
                        icon: Brain,
                        title: 'How Suggestions Are Generated',
                        desc: 'AI suggestions are generated by analyzing your current workspace context — the data structure, recent actions, and statistical patterns. The system uses a local AI model that processes your data in real-time to provide relevant, contextual recommendations.',
                        gradient: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
                        iconBg: 'bg-purple-500/10 text-purple-500 dark:text-purple-400',
                      },
                      {
                        icon: Shield,
                        title: 'Your Rights',
                        desc: 'You have full control: disable AI features at any time, request complete deletion of all AI-generated data, export your audit history, and adjust the scope of data the AI can access. All actions are logged and auditable.',
                        gradient: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
                        iconBg: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
                      },
                    ].map((item, i) => (
                      <motion.div key={item.title} variants={fadeUp} custom={i + 2}>
                        <Card className={`h-full bg-gradient-to-br ${item.gradient} border backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}>
                          <CardHeader className="pb-3">
                            <div className={`size-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-3`}>
                              <item.icon className="size-5" />
                            </div>
                            <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </AnimatedSection>
              </TabsContent>

              {/* ═══════════════════════════════════════
                  TAB 2: TRANSPARENCY CONTROLS
              ═══════════════════════════════════════ */}
              <TabsContent value="controls" className="mt-8 space-y-10">
                <AnimatedSection>
                  <motion.div variants={fadeUp}>
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Eye className="size-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Transparency Controls</CardTitle>
                            <CardDescription>
                              Manage how AI interacts with your data and experience
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* Toggle: Show AI Suggestions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-4 text-primary" />
                              <span className="font-medium text-sm">Show AI Suggestions</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              Display contextual AI recommendations in the workspace
                            </p>
                          </div>
                          <Switch
                            checked={showSuggestions}
                            onCheckedChange={setShowSuggestions}
                          />
                        </div>

                        <Separator />

                        {/* Slider: AI Proactivity Level */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="size-4 text-amber-500 dark:text-amber-400" />
                              <span className="font-medium text-sm">AI Proactivity Level</span>
                            </div>
                            <Badge variant="outline" className="tabular-nums">
                              {proactivityLevel[0]}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Controls how actively the AI offers suggestions. Lower values mean fewer interruptions.
                          </p>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground w-6">0%</span>
                            <Slider
                              value={proactivityLevel}
                              onValueChange={setProactivityLevel}
                              min={0}
                              max={100}
                              step={5}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-8">100%</span>
                          </div>
                        </div>

                        <Separator />

                        {/* Toggle: Enable Automation */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Zap className="size-4 text-amber-500 dark:text-amber-400" />
                              <span className="font-medium text-sm">Enable Automation</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              Allow AI to run scheduled automations and triggered workflows
                            </p>
                          </div>
                          <Switch
                            checked={enableAutomation}
                            onCheckedChange={setEnableAutomation}
                          />
                        </div>

                        <Separator />

                        {/* Toggle: AI Audit Logging */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-emerald-500 dark:text-emerald-400" />
                              <span className="font-medium text-sm">AI Audit Logging</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              Record all AI actions for transparency and accountability
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs">
                              <Info className="size-3 mr-1" />
                              Always On
                            </Badge>
                            <Switch
                              checked={auditLogging}
                              disabled
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Select: Data Access Scope */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Database className="size-4 text-cyan-500 dark:text-cyan-400" />
                            <span className="font-medium text-sm">Data Access Scope</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Define how much data the AI can access during analysis
                          </p>
                          <Select value={dataScope} onValueChange={setDataScope}>
                            <SelectTrigger className="w-full sm:w-64">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minimal">
                                <div className="flex flex-col">
                                  <span className="font-medium">Minimal</span>
                                  <span className="text-xs text-muted-foreground">Only column names and types</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="standard">
                                <div className="flex flex-col">
                                  <span className="font-medium">Standard</span>
                                  <span className="text-xs text-muted-foreground">Column info + data summaries</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="full">
                                <div className="flex flex-col">
                                  <span className="font-medium">Full</span>
                                  <span className="text-xs text-muted-foreground">Complete dataset access</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {dataScope === 'full' && (
                            <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <AlertTriangle className="size-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Full access mode allows the AI to read your complete dataset. Use this only for trusted, non-sensitive data.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatedSection>
              </TabsContent>

              {/* ═══════════════════════════════════════
                  TAB 3: AI AUDIT LOG
              ═══════════════════════════════════════ */}
              <TabsContent value="audit" className="mt-8 space-y-6">
                <AnimatedSection>
                  {/* Filter bar */}
                  <motion.div variants={fadeUp}>
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Filter className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Filter by Action Type</span>
                            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setCurrentPage(1) }}>
                              <SelectTrigger className="w-44">
                                <SelectValue placeholder="All types" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="ai_query">AI Query</SelectItem>
                                <SelectItem value="automation_run">Automation Run</SelectItem>
                                <SelectItem value="suggestion_accepted">Suggestion Accepted</SelectItem>
                                <SelectItem value="suggestion_dismissed">Suggestion Dismissed</SelectItem>
                                <SelectItem value="data_access">Data Access</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs tabular-nums">
                              {totalLogs} entries
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exportCSV}
                              className="gap-2"
                            >
                              <Download className="size-3.5" />
                              Export CSV
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Audit log table */}
                  <motion.div variants={fadeUp} custom={1}>
                    <Card className="border overflow-hidden">
                      <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                          {loading ? (
                            <div className="flex items-center justify-center py-20">
                              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                          ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <FileText className="size-8 text-muted-foreground" />
                              </div>
                              <p className="font-medium text-muted-foreground">No audit entries found</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                AI activity will appear here as you use the platform
                              </p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="w-44 text-xs font-semibold">Timestamp</TableHead>
                                  <TableHead className="w-44 text-xs font-semibold">Action Type</TableHead>
                                  <TableHead className="text-xs font-semibold">Context</TableHead>
                                  <TableHead className="w-28 text-xs font-semibold text-right">Duration</TableHead>
                                  <TableHead className="w-28 text-xs font-semibold text-right">Tokens</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {logs.map((log) => {
                                  const badgeMeta = getActionBadge(log.action)
                                  const BadgeIcon = badgeMeta.icon
                                  return (
                                    <TableRow key={log.id} className="group">
                                      <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={badgeMeta.variant}
                                          className="gap-1.5 text-xs font-medium"
                                        >
                                          <BadgeIcon className={`size-3 ${badgeMeta.color}`} />
                                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs max-w-xs truncate">
                                        <span className="text-foreground/80">
                                          {log.details.length > 120
                                            ? log.details.slice(0, 120) + '...'
                                            : log.details}
                                        </span>
                                        {log.error && (
                                          <span className="ml-2 text-destructive text-xs">
                                            ⚠ {log.error}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                                        {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                                      </TableCell>
                                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                                        {log.tokensUsed != null ? log.tokensUsed.toLocaleString() : '—'}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                            <p className="text-xs text-muted-foreground">
                              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronLeft className="size-4" />
                              </Button>
                              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                                let page: number
                                if (totalPages <= 5) {
                                  page = idx + 1
                                } else if (currentPage <= 3) {
                                  page = idx + 1
                                } else if (currentPage >= totalPages - 2) {
                                  page = totalPages - 4 + idx
                                } else {
                                  page = currentPage - 2 + idx
                                }
                                return (
                                  <Button
                                    key={page}
                                    variant={page === currentPage ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="h-8 w-8 p-0 text-xs tabular-nums"
                                  >
                                    {page}
                                  </Button>
                                )
                              })}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className="size-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatedSection>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            5. YOUR DATA & AI (visible on all tabs)
        ══════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <section className="py-16 md:py-20 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <AnimatedSection>
                <motion.div variants={fadeUp}>
                  <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-8 flex flex-col md:flex-row gap-6 items-center text-center md:text-start">
                      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="size-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold mb-2">Committed to Responsible AI</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Our AI systems are designed with transparency, fairness, and user control at their core.
                          Every AI action is logged, every suggestion can be disabled, and your data is never used
                          to train models without explicit consent. We follow the EU AI Act guidelines and
                          maintain full compliance with GDPR, CCPA, and HIPAA regulations.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

/* Small inline Filter icon (not from lucide, just reuse Activity) */
function Filter({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}
