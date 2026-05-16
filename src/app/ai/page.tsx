'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Zap,
  Play,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit,
  Calendar,
  Bell,
  Database,
  FileText,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Send,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ───────────────────────── Types ───────────────────────── */
interface AutomationAction {
  id: string
  type: 'clean_data' | 'run_model' | 'generate_report' | 'send_notification'
  config: Record<string, string>
}

interface Automation {
  id: string
  name: string
  description: string
  trigger: 'schedule' | 'new_data' | 'event' | 'manual'
  scheduleConfig: {
    frequency: string
    time: string
    dayOfWeek?: string
    dayOfMonth?: string
  } | null
  actions: AutomationAction[]
  isActive: boolean
  lastRunAt: string | null
  runCount: number
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

interface ActivityLog {
  id: string
  automationId: string
  automationName: string
  status: 'success' | 'error' | 'running'
  startedAt: string
  completedAt: string | null
  duration: string | null
}

interface AutomationFormData {
  name: string
  description: string
  trigger: 'schedule' | 'new_data' | 'event' | 'manual'
  scheduleConfig: {
    frequency: string
    time: string
    dayOfWeek?: string
    dayOfMonth?: string
  } | null
  actions: AutomationAction[]
  isActive: boolean
}

/* ───────────────────────── Animation Variants ───────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ───────────────────────── Helpers ───────────────────────── */
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDateTime(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TRIGGER_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  schedule: {
    label: 'Schedule',
    icon: Calendar,
    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  new_data: {
    label: 'New Data',
    icon: Database,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  event: {
    label: 'Event',
    icon: Bell,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  manual: {
    label: 'Manual',
    icon: Play,
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  clean_data: {
    label: 'Clean Data',
    icon: Sparkles,
    color: 'bg-emerald-500/10 text-emerald-400',
  },
  run_model: {
    label: 'Run Model',
    icon: BarChart3,
    color: 'bg-violet-500/10 text-violet-400',
  },
  generate_report: {
    label: 'Generate Report',
    icon: FileText,
    color: 'bg-sky-500/10 text-sky-400',
  },
  send_notification: {
    label: 'Send Notification',
    icon: Send,
    color: 'bg-amber-500/10 text-amber-400',
  },
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  running: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
}

/* ───────────────────────── Animated Section ───────────────────────── */
function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

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

/* ───────────────────────── MAIN PAGE ───────────────────────── */
export default function AutomationPage() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()

  /* ── Data state ── */
  const [automations, setAutomations] = useState<Automation[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error' | 'running'>('all')
  const [logsOpen, setLogsOpen] = useState(false)

  /* ── Dialog state ── */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  /* ── Form state ── */
  const emptyForm: AutomationFormData = {
    name: '',
    description: '',
    trigger: 'manual',
    scheduleConfig: null,
    actions: [],
    isActive: true,
  }
  const [form, setForm] = useState<AutomationFormData>({ ...emptyForm })

  /* ── Running state ── */
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())

  /* ───────────────────────── Data Fetching ───────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/automations')
      const data = await res.json()
      setAutomations(data.automations || [])
      setLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to fetch automations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ───────────────────────── Handlers ───────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (auto: Automation) => {
    setEditingId(auto.id)
    setForm({
      name: auto.name,
      description: auto.description,
      trigger: auto.trigger,
      scheduleConfig: auto.scheduleConfig
        ? { ...auto.scheduleConfig }
        : null,
      actions: auto.actions.map((a) => ({ ...a })),
      isActive: auto.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter a name for your automation.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/ai/automations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast({
          title: 'Automation updated',
          description: `"${form.name}" has been updated successfully.`,
        })
      } else {
        await fetch('/api/ai/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast({
          title: 'Automation created',
          description: `"${form.name}" has been created successfully.`,
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save automation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await fetch(`/api/ai/automations/${id}`, { method: 'DELETE' })
      toast({
        title: 'Automation deleted',
        description: `"${name}" has been removed.`,
      })
      fetchData()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete automation.',
        variant: 'destructive',
      })
    }
  }

  const handleToggle = async (auto: Automation) => {
    const updated = { ...auto, isActive: !auto.isActive }
    try {
      await fetch(`/api/ai/automations/${auto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setAutomations((prev) =>
        prev.map((a) =>
          a.id === auto.id ? { ...a, isActive: !a.isActive } : a
        )
      )
      toast({
        title: updated.isActive ? 'Automation enabled' : 'Automation paused',
        description: `"${auto.name}" is now ${updated.isActive ? 'active' : 'inactive'}.`,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to toggle automation.',
        variant: 'destructive',
      })
    }
  }

  const handleRunNow = async (id: string, name: string) => {
    setRunningIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/ai/automations/${id}/run`, { method: 'POST' })
      toast({
        title: 'Run triggered',
        description: `"${name}" is now running.`,
      })
      // Simulate running for 3 seconds
      setTimeout(() => {
        setRunningIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 3000)
    } catch {
      setRunningIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast({
        title: 'Error',
        description: 'Failed to trigger automation run.',
        variant: 'destructive',
      })
    }
  }

  /* ── Action form helpers ── */
  const addAction = () => {
    setForm((prev) => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: `act-${Date.now()}`,
          type: 'clean_data',
          config: {},
        },
      ],
    }))
  }

  const removeAction = (actionId: string) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== actionId),
    }))
  }

  const updateAction = (
    actionId: string,
    field: 'type' | 'config',
    value: string | Record<string, string>
  ) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === actionId ? { ...a, [field]: value } : a
      ),
    }))
  }

  /* ── Filtered logs ── */
  const filteredLogs =
    logFilter === 'all'
      ? logs
      : logs.filter((l) => l.status === logFilter)

  /* ── Stats ── */
  const activeCount = automations.filter((a) => a.isActive).length
  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0)

  /* ───────────────────────── RENDER ───────────────────────── */
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* ═══ STICKY NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <Image
              src="/images/logo.png"
              alt="TheOneWayGDA"
              width={28}
              height={28}
              className="rounded-lg flex-shrink-0"
            />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">
              AI Automation Center
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20">
              <Zap className="size-3" />
              {activeCount} Active
            </Badge>
            <Button size="sm" onClick={openCreate} className="gap-1.5 text-xs h-8">
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Create Automation</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* ═══ HERO SECTION ═══ */}
        <section className="hero-gradient rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative z-10"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-4"
              >
                <Zap className="size-3.5 text-primary me-1.5" />
                No-Code Automation Engine
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-3xl md:text-5xl font-extrabold tracking-tight"
            >
              <span className="gradient-text-premium">AI Automation Center</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed"
            >
              Create, manage, and monitor workflow automation rules. Set triggers, build action
              pipelines, and let AI handle the repetitive work — no coding required.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-6 flex flex-wrap gap-3">
              <Button onClick={openCreate} className="gap-2">
                <Plus className="size-4" />
                Create Automation
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setLogsOpen(!logsOpen)}>
                <Clock className="size-4" />
                Activity Log
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full">
                  {logs.length}
                </Badge>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══ STATS ROW ═══ */}
        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} custom={0}>
              <Card className="card-premium p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{automations.length}</p>
                    <p className="text-xs text-muted-foreground">Total Automations</p>
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} custom={1}>
              <Card className="card-premium p-5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="size-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active Rules</p>
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} custom={2}>
              <Card className="card-premium p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Play className="size-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-400">{totalRuns}</p>
                    <p className="text-xs text-muted-foreground">Total Runs</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* ═══ AUTOMATIONS GRID ═══ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Active Automations</h2>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {automations.length} rules
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
          ) : automations.length === 0 ? (
            <motion.div {...fadeUp} className="text-center py-20">
              <Zap className="size-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No automations yet
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first automation to get started.
              </p>
              <Button onClick={openCreate} className="mt-4 gap-2">
                <Plus className="size-4" />
                Create Automation
              </Button>
            </motion.div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {automations.map((auto, idx) => {
                  const trigger = TRIGGER_CONFIG[auto.trigger]
                  const TriggerIcon = trigger.icon

                  return (
                    <motion.div
                      key={auto.id}
                      variants={fadeUp}
                      custom={Math.min(idx, 9)}
                    >
                      <Card className="card-premium h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            {/* Status indicator */}
                            <div className="relative flex-shrink-0 mt-1">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  auto.isActive
                                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                                    : 'bg-muted-foreground/30'
                                }`}
                              />
                              {auto.isActive && (
                                <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                                  {auto.name}
                                </CardTitle>
                                {/* Trigger Badge */}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] gap-1 ${trigger.color}`}
                                >
                                  <TriggerIcon className="size-2.5" />
                                  {trigger.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {auto.description}
                              </p>
                            </div>
                            {/* Toggle */}
                            <Switch
                              checked={auto.isActive}
                              onCheckedChange={() => handleToggle(auto)}
                              className="flex-shrink-0"
                            />
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-4">
                          <Separator />

                          {/* Actions preview */}
                          {auto.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {auto.actions.map((action) => {
                                const actConf = ACTION_CONFIG[action.type]
                                const ActIcon = actConf.icon
                                return (
                                  <Badge
                                    key={action.id}
                                    variant="outline"
                                    className={`text-[10px] gap-1 ${actConf.color} border-0`}
                                  >
                                    <ActIcon className="size-2.5" />
                                    {actConf.label}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Last Run
                              </p>
                              <p className="text-xs font-medium">
                                {auto.lastRunAt ? timeAgo(auto.lastRunAt) : '—'}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Runs
                              </p>
                              <p className="text-xs font-medium">{auto.runCount}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Next Run
                              </p>
                              <p className="text-xs font-medium">
                                {auto.nextRunAt ? formatDateTime(auto.nextRunAt) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 flex-1"
                              onClick={() => openEdit(auto)}
                            >
                              <Edit className="size-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 flex-1"
                              onClick={() => handleRunNow(auto.id, auto.name)}
                              disabled={runningIds.has(auto.id) || !auto.isActive}
                            >
                              {runningIds.has(auto.id) ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Play className="size-3" />
                              )}
                              {runningIds.has(auto.id) ? 'Running...' : 'Run Now'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                              onClick={() => handleDelete(auto.id, auto.name)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatedSection>
          )}
        </section>

        {/* ═══ ACTIVITY LOG (Collapsible) ═══ */}
        <section>
          <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 mb-4 group w-full text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Activity Log</h2>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {filteredLogs.length} entries
                  </Badge>
                </div>
                <ChevronDown
                  className={`size-5 text-muted-foreground transition-transform duration-200 ml-auto ${
                    logsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </CollapsibleTrigger>

            <AnimatePresence>
              {logsOpen && (
                <CollapsibleContent forceMount>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <Card className="card-premium overflow-hidden">
                      {/* Filter tabs */}
                      <div className="border-b border-border/40 px-4 py-3">
                        <Tabs
                          value={logFilter}
                          onValueChange={(v) =>
                            setLogFilter(v as typeof logFilter)
                          }
                        >
                          <TabsList className="h-8">
                            <TabsTrigger value="all" className="text-xs gap-1.5">
                              All
                            </TabsTrigger>
                            <TabsTrigger value="success" className="text-xs gap-1.5">
                              <CheckCircle2 className="size-3 text-emerald-400" />
                              Success
                            </TabsTrigger>
                            <TabsTrigger value="error" className="text-xs gap-1.5">
                              <XCircle className="size-3 text-rose-400" />
                              Error
                            </TabsTrigger>
                            <TabsTrigger value="running" className="text-xs gap-1.5">
                              <Loader2 className="size-3 text-sky-400" />
                              Running
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Log entries */}
                      <ScrollArea className="max-h-96">
                        <div className="divide-y divide-border/20">
                          {filteredLogs.length === 0 ? (
                            <div className="py-12 text-center">
                              <Clock className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No log entries match this filter.
                              </p>
                            </div>
                          ) : (
                            filteredLogs.map((log) => {
                              const statusColor =
                                STATUS_COLORS[log.status] ||
                                STATUS_COLORS.success
                              const StatusIcon =
                                log.status === 'success'
                                  ? CheckCircle2
                                  : log.status === 'error'
                                  ? XCircle
                                  : Loader2

                              return (
                                <div
                                  key={log.id}
                                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                                >
                                  {/* Status icon */}
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      log.status === 'success'
                                        ? 'bg-emerald-500/10'
                                        : log.status === 'error'
                                        ? 'bg-rose-500/10'
                                        : 'bg-sky-500/10'
                                    }`}
                                  >
                                    <StatusIcon
                                      className={`size-4 ${
                                        log.status === 'success'
                                          ? 'text-emerald-400'
                                          : log.status === 'error'
                                          ? 'text-rose-400'
                                          : 'text-sky-400 animate-spin'
                                      }`}
                                    />
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {log.automationName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(log.startedAt)}
                                    </p>
                                  </div>

                                  {/* Status badge + duration */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor}`}
                                    >
                                      {log.status}
                                    </Badge>
                                    {log.duration && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {log.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </motion.div>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>
        </section>
      </div>

      {/* ═══ CREATE / EDIT DIALOG ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingId ? 'Edit Automation' : 'Create Automation'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modify the automation rule settings, trigger, and action pipeline.'
                : 'Configure a new automation rule with triggers and action steps.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="auto-name">Name</Label>
              <Input
                id="auto-name"
                placeholder="e.g., Daily Data Cleanup"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="auto-desc">Description</Label>
              <Input
                id="auto-desc"
                placeholder="Briefly describe what this automation does..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            {/* Trigger Type */}
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    trigger: v as AutomationFormData['trigger'],
                    scheduleConfig:
                      v === 'schedule'
                        ? {
                            frequency: 'daily',
                            time: '00:00',
                          }
                        : null,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">Schedule (Cron)</SelectItem>
                  <SelectItem value="new_data">New Data</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Config (only for schedule trigger) */}
            {form.trigger === 'schedule' && form.scheduleConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="size-4 text-primary" />
                  <Label className="text-sm font-medium">Schedule Configuration</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Frequency
                    </Label>
                    <Select
                      value={form.scheduleConfig.frequency}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleConfig: prev.scheduleConfig
                            ? { ...prev.scheduleConfig, frequency: v }
                            : null,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily" className="text-xs">
                          Daily
                        </SelectItem>
                        <SelectItem value="weekly" className="text-xs">
                          Weekly
                        </SelectItem>
                        <SelectItem value="monthly" className="text-xs">
                          Monthly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Time
                    </Label>
                    <Input
                      type="time"
                      className="h-9 text-xs"
                      value={form.scheduleConfig.time}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleConfig: prev.scheduleConfig
                            ? { ...prev.scheduleConfig, time: e.target.value }
                            : null,
                        }))
                      }
                    />
                  </div>
                </div>
                {form.scheduleConfig.frequency === 'weekly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Day of Week
                    </Label>
                    <Select
                      value={form.scheduleConfig.dayOfWeek || 'monday'}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleConfig: prev.scheduleConfig
                            ? { ...prev.scheduleConfig, dayOfWeek: v }
                            : null,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          'monday',
                          'tuesday',
                          'wednesday',
                          'thursday',
                          'friday',
                          'saturday',
                          'sunday',
                        ].map((d) => (
                          <SelectItem key={d} value={d} className="text-xs capitalize">
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.scheduleConfig.frequency === 'monthly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Day of Month
                    </Label>
                    <Select
                      value={form.scheduleConfig.dayOfMonth || '1'}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduleConfig: prev.scheduleConfig
                            ? { ...prev.scheduleConfig, dayOfMonth: v }
                            : null,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (d) => (
                            <SelectItem key={d} value={String(d)} className="text-xs">
                              {d}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </motion.div>
            )}

            <Separator />

            {/* Actions Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Action Pipeline</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={addAction}
                >
                  <Plus className="size-3" />
                  Add Action
                </Button>
              </div>

              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  <AnimatePresence>
                    {form.actions.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 border border-dashed border-border/40 rounded-xl"
                      >
                        <Sparkles className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No actions yet. Add your first action step.
                        </p>
                      </motion.div>
                    ) : (
                      form.actions.map((action, idx) => {
                        const actConf = ACTION_CONFIG[action.type]
                        const ActIcon = actConf.icon

                        return (
                          <motion.div
                            key={action.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-3"
                          >
                            {/* Step number + action type + remove */}
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <ActIcon className={`size-4 ${actConf.color.split(' ')[1]}`} />
                                <Select
                                  value={action.type}
                                  onValueChange={(v) =>
                                    updateAction(
                                      action.id,
                                      'type',
                                      v
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clean_data" className="text-xs">
                                      Clean Data
                                    </SelectItem>
                                    <SelectItem value="run_model" className="text-xs">
                                      Run Model
                                    </SelectItem>
                                    <SelectItem value="generate_report" className="text-xs">
                                      Generate Report
                                    </SelectItem>
                                    <SelectItem value="send_notification" className="text-xs">
                                      Send Notification
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                onClick={() => removeAction(action.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            {/* Config fields based on action type */}
                            <div className="pl-9">
                              {action.type === 'clean_data' && (
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Cleaning Strategy
                                  </Label>
                                  <Select
                                    value={action.config.strategy || 'auto'}
                                    onValueChange={(v) =>
                                      updateAction(action.id, 'config', {
                                        ...action.config,
                                        strategy: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto" className="text-xs">
                                        Auto (AI-powered)
                                      </SelectItem>
                                      <SelectItem value="standard" className="text-xs">
                                        Standard
                                      </SelectItem>
                                      <SelectItem value="aggressive" className="text-xs">
                                        Aggressive
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {action.type === 'run_model' && (
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Model
                                  </Label>
                                  <Select
                                    value={action.config.model || 'descriptive-stats'}
                                    onValueChange={(v) =>
                                      updateAction(action.id, 'config', {
                                        ...action.config,
                                        model: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="descriptive-stats" className="text-xs">
                                        Descriptive Statistics
                                      </SelectItem>
                                      <SelectItem value="regression" className="text-xs">
                                        Regression Analysis
                                      </SelectItem>
                                      <SelectItem value="random-forest" className="text-xs">
                                        Random Forest
                                      </SelectItem>
                                      <SelectItem value="anomaly-detection" className="text-xs">
                                        Anomaly Detection
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {action.type === 'generate_report' && (
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Report Format
                                  </Label>
                                  <Select
                                    value={action.config.format || 'pdf'}
                                    onValueChange={(v) =>
                                      updateAction(action.id, 'config', {
                                        ...action.config,
                                        format: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pdf" className="text-xs">
                                        PDF
                                      </SelectItem>
                                      <SelectItem value="html" className="text-xs">
                                        HTML
                                      </SelectItem>
                                      <SelectItem value="csv" className="text-xs">
                                        CSV
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {action.type === 'send_notification' && (
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Channel
                                  </Label>
                                  <Select
                                    value={action.config.channel || 'email'}
                                    onValueChange={(v) =>
                                      updateAction(action.id, 'config', {
                                        ...action.config,
                                        channel: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="email" className="text-xs">
                                        Email
                                      </SelectItem>
                                      <SelectItem value="push" className="text-xs">
                                        Push Notification
                                      </SelectItem>
                                      <SelectItem value="webhook" className="text-xs">
                                        Webhook
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>

            {/* Active toggle */}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable this automation to run automatically
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, isActive: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {editingId ? 'Update Automation' : 'Create Automation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
