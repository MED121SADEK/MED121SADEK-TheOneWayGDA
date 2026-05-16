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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  GitBranch,
  Play,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Database,
  BarChart3,
  LineChart,
  FileText,
  ArrowLeft,
  Zap,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ───────────────────────── Types ───────────────────────── */
interface PipelineStep {
  id: string
  type: 'data_prep' | 'statistical_test' | 'visualization' | 'report'
  name: string
  description: string
  config: Record<string, unknown>
}

interface Pipeline {
  id: string
  name: string
  description: string
  intent: string
  steps: PipelineStep[]
  status: 'draft' | 'ready' | 'running' | 'completed' | 'error'
  result?: string
  executiveSummary?: string
  tokensUsed?: number
  durationMs?: number
  createdAt: string
  updatedAt: string
}

interface DecisionRecord {
  id: string
  context: string
  question: string
  aiAnalysis: unknown
  selectedOption?: string
  confidence?: number
  createdAt: string
}

/* ───────────────────────── Animation Variants ───────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

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

/* ───────────────────────── Helpers ───────────────────────── */
const STEP_ICONS: Record<string, React.ElementType> = {
  data_prep: Database,
  statistical_test: BarChart3,
  visualization: LineChart,
  report: FileText,
}

const STEP_COLORS: Record<string, string> = {
  data_prep: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  statistical_test: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  visualization: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  report: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const STATUS_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  draft: { color: 'bg-muted text-muted-foreground border-border', icon: FileText },
  ready: { color: 'bg-sky-500/15 text-sky-400 border-sky-500/25', icon: CheckCircle2 },
  running: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/25', icon: Loader2 },
  completed: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
  error: { color: 'bg-rose-500/15 text-rose-400 border-rose-500/25', icon: XCircle },
}

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

/* ───────────────────────── MAIN PAGE ───────────────────────── */
export default function WorkflowsPage() {
  const { dir } = useTranslation()
  const { toast } = useToast()

  /* ── State ── */
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [intent, setIntent] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [decisionsOpen, setDecisionsOpen] = useState(false)
  const [execSteps, setExecSteps] = useState<Record<string, string>>({})

  /* ── Fetch ── */
  const fetchPipelines = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/workflow')
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch {
      console.error('Failed to fetch pipelines')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/decisions?limit=10')
      const data = await res.json()
      setDecisions(data.decisions || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchPipelines()
    fetchDecisions()
  }, [fetchPipelines, fetchDecisions])

  /* ── Generate Pipeline ── */
  const handleGenerate = async () => {
    if (!intent.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intent.trim(), context: 'workspace' }),
      })
      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()
      toast({
        title: 'Pipeline generated',
        description: `"${data.pipeline.name}" created with ${data.pipeline.steps?.length || 0} steps.`,
      })
      setIntent('')
      fetchPipelines()
    } catch {
      toast({
        title: 'Generation failed',
        description: 'Could not generate pipeline. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  /* ── Execute Pipeline (simulated) ── */
  const handleExecute = (pipeline: Pipeline) => {
    if (runningIds.has(pipeline.id)) return
    setRunningIds((prev) => new Set(prev).add(pipeline.id))
    setExecSteps((prev) => ({ ...prev, [pipeline.id]: '0' }))

    // Simulate step-by-step execution
    const totalSteps = pipeline.steps?.length || 1
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      setExecSteps((prev) => ({ ...prev, [pipeline.id]: String(currentStep) }))

      if (currentStep >= totalSteps) {
        clearInterval(interval)
        setTimeout(() => {
          setPipelines((prev) =>
            prev.map((p) =>
              p.id === pipeline.id ? { ...p, status: 'completed' as const } : p
            )
          )
          setRunningIds((prev) => {
            const next = new Set(prev)
            next.delete(pipeline.id)
            return next
          })
          toast({
            title: 'Pipeline completed',
            description: `"${pipeline.name}" finished successfully.`,
          })
        }, 500)
      }
    }, 1200)
  }

  /* ── Delete Pipeline ── */
  const handleDelete = async (id: string, name: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id))
    toast({ title: 'Pipeline deleted', description: `"${name}" removed.` })
  }

  /* ── Open Detail ── */
  const openDetail = (p: Pipeline) => {
    setSelectedPipeline(p)
    setDetailOpen(true)
  }

  /* ── Stats ── */
  const completedCount = pipelines.filter((p) => p.status === 'completed').length
  const totalSteps = pipelines.reduce((sum, p) => sum + (p.steps?.length || 0), 0)

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
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">AI Workflows</span>
          </div>
          <Badge className="gap-1.5 px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/25">
            <GitBranch className="size-3" />
            {pipelines.length} Pipelines
          </Badge>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* ═══ HERO ═══ */}
        <section className="hero-gradient rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 pointer-events-none" />
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10">
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-violet-500/30 bg-violet-500/5 mb-4">
                <GitBranch className="size-3.5 text-violet-400 me-1.5" />
                Workflow Engine
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-premium">AI Workflow Pipelines</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Describe your analysis goal in natural language and let AI design a complete workflow pipeline
              with data preparation, statistical analysis, visualization, and reporting steps.
            </motion.p>
          </motion.div>
        </section>

        {/* ═══ GENERATE PIPELINE ═══ */}
        <AnimatedSection>
          <Card className="card-premium border-violet-500/20 hover:border-violet-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="size-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Generate New Pipeline</h3>
                  <p className="text-xs text-muted-foreground">Describe your analysis goal and AI will create a step-by-step workflow</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g., Analyze customer churn patterns and predict future attrition..."
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  className="flex-1"
                  disabled={generating}
                />
                <Button onClick={handleGenerate} disabled={generating || !intent.trim()} className="gap-2 min-w-[140px]">
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="size-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ═══ STATS ROW ═══ */}
        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Pipelines', value: pipelines.length, icon: GitBranch, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Total Steps', value: totalSteps, icon: BarChart3, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i}>
                <Card className="card-premium p-5 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`size-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* ═══ PIPELINE GRID ═══ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Your Pipelines</h2>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {pipelines.length} pipelines
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
          ) : pipelines.length === 0 ? (
            <motion.div {...fadeUp} className="text-center py-20">
              <GitBranch className="size-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No pipelines yet</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">Describe your analysis goal above to generate your first pipeline.</p>
            </motion.div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pipelines.map((pipeline, idx) => {
                  const statusStyle = STATUS_STYLES[pipeline.status] || STATUS_STYLES.draft
                  const StatusIcon = statusStyle.icon
                  const isRunning = runningIds.has(pipeline.id)
                  const currentExecStep = execSteps[pipeline.id]

                  return (
                    <motion.div key={pipeline.id} variants={fadeUp} custom={Math.min(idx, 9)}>
                      <Card
                        className="card-premium h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer"
                        onClick={() => openDetail(pipeline)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0 mt-1">
                              <div className={`w-3 h-3 rounded-full ${
                                pipeline.status === 'completed' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' :
                                pipeline.status === 'running' ? 'bg-amber-500 animate-pulse' :
                                pipeline.status === 'error' ? 'bg-rose-500' : 'bg-muted-foreground/30'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                                  {pipeline.name}
                                </CardTitle>
                                <Badge variant="outline" className={`text-[10px] gap-1 ${statusStyle.color}`}>
                                  <StatusIcon className={`size-2.5 ${pipeline.status === 'running' ? 'animate-spin' : ''}`} />
                                  {pipeline.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate italic">
                                &quot;{pipeline.intent}&quot;
                              </p>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-4">
                          <Separator />

                          {/* Steps preview */}
                          <div className="flex flex-wrap gap-1.5">
                            {(pipeline.steps || []).map((step, si) => {
                              const StepIcon = STEP_ICONS[step.type] || FileText
                              const stepCompleted = currentExecStep && parseInt(currentExecStep) > si
                              const stepActive = currentExecStep === String(si)

                              return (
                                <div
                                  key={step.id}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-all ${
                                    stepCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    stepActive ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    'bg-muted/30 border-border/30 text-muted-foreground'
                                  }`}
                                >
                                  <StepIcon className="size-2.5" />
                                  {step.name.length > 18 ? step.name.slice(0, 18) + '...' : step.name}
                                </div>
                              )
                            })}
                          </div>

                          {/* Meta row */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Steps</p>
                              <p className="text-xs font-medium">{pipeline.steps?.length || 0}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</p>
                              <p className="text-xs font-medium">{pipeline.durationMs ? `${(pipeline.durationMs / 1000).toFixed(1)}s` : '—'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 border border-border/30 p-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Created</p>
                              <p className="text-xs font-medium">{timeAgo(pipeline.createdAt)}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 flex-1"
                              onClick={() => openDetail(pipeline)}
                            >
                              <GitBranch className="size-3" />
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 flex-1"
                              onClick={() => handleExecute(pipeline)}
                              disabled={isRunning || pipeline.status === 'running'}
                            >
                              {isRunning ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Play className="size-3" />
                              )}
                              {isRunning ? 'Running...' : 'Execute'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                              onClick={() => handleDelete(pipeline.id, pipeline.name)}
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

        {/* ═══ DECISION HISTORY ═══ */}
        <section>
          <Collapsible open={decisionsOpen} onOpenChange={setDecisionsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 mb-4 group w-full text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">AI Decision History</h2>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {decisions.length} records
                  </Badge>
                </div>
                <ChevronDown className={`size-5 text-muted-foreground transition-transform duration-200 ml-auto ${decisionsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>

            <AnimatePresence>
              {decisionsOpen && (
                <CollapsibleContent forceMount>
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <Card className="card-premium overflow-hidden">
                      <ScrollArea className="max-h-80">
                        <div className="divide-y divide-border/20">
                          {decisions.length === 0 ? (
                            <div className="py-12 text-center">
                              <Brain className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No decision records yet.</p>
                            </div>
                          ) : (
                            decisions.map((d) => (
                              <div key={d.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Brain className="size-4 text-violet-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{d.question}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-[10px]">{d.context}</Badge>
                                    {d.confidence != null && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Confidence: {Math.round(d.confidence * 100)}%
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">{timeAgo(d.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            ))
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

      {/* ═══ PIPELINE DETAIL DIALOG ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPipeline && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="size-5 text-violet-400" />
                  {selectedPipeline.name}
                </DialogTitle>
                <DialogDescription className="italic">&quot;{selectedPipeline.intent}&quot;</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Status', value: selectedPipeline.status },
                    { label: 'Steps', value: String(selectedPipeline.steps?.length || 0) },
                    { label: 'Duration', value: selectedPipeline.durationMs ? `${(selectedPipeline.durationMs / 1000).toFixed(1)}s` : '—' },
                    { label: 'Tokens', value: selectedPipeline.tokensUsed ? String(selectedPipeline.tokensUsed) : '—' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-muted/30 border border-border/30 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-xs font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                {selectedPipeline.description && (
                  <p className="text-sm text-muted-foreground">{selectedPipeline.description}</p>
                )}

                {/* Executive Summary */}
                {selectedPipeline.executiveSummary && (
                  <Card className="bg-violet-500/5 border-violet-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-4 text-violet-400" />
                        <h4 className="text-sm font-semibold">Executive Summary</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedPipeline.executiveSummary}</p>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Step-by-step breakdown */}
                <div>
                  <h4 className="text-sm font-semibold mb-4">Pipeline Steps</h4>
                  <div className="space-y-3">
                    {(selectedPipeline.steps || []).map((step, idx) => {
                      const StepIcon = STEP_ICONS[step.type] || FileText
                      const stepColor = STEP_COLORS[step.type] || 'bg-muted text-muted-foreground'
                      const isRunning = runningIds.has(selectedPipeline.id)
                      const currentExecStep = execSteps[selectedPipeline.id]
                      const stepCompleted = currentExecStep && parseInt(currentExecStep) > idx
                      const stepActive = currentExecStep === String(idx)

                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                            stepCompleted ? 'bg-emerald-500/5 border-emerald-500/20' :
                            stepActive ? 'bg-amber-500/5 border-amber-500/20' :
                            'bg-muted/20 border-border/30'
                          }`}
                        >
                          {/* Step number + icon */}
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className={`w-9 h-9 rounded-lg ${stepColor.split(' ')[0]} flex items-center justify-center`}>
                              <StepIcon className={`size-4 ${stepColor.split(' ')[1]}`} />
                            </div>
                            {idx < (selectedPipeline.steps?.length || 0) - 1 && (
                              <div className="w-px h-4 bg-border/50" />
                            )}
                          </div>

                          {/* Step details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                                Step {idx + 1}
                              </Badge>
                              <span className={`text-[10px] uppercase tracking-wider font-medium ${stepColor.split(' ')[1]}`}>
                                {step.type.replace('_', ' ')}
                              </span>
                              {stepCompleted && <CheckCircle2 className="size-3.5 text-emerald-400 ml-auto" />}
                              {stepActive && <Loader2 className="size-3.5 text-amber-400 animate-spin ml-auto" />}
                            </div>
                            <p className="text-sm font-medium mt-1">{step.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                            {Object.keys(step.config || {}).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(step.config || {}).map(([k, v]) => (
                                  <Badge key={k} variant="secondary" className="text-[9px] font-mono">
                                    {k}: {String(v)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleExecute(selectedPipeline)}
                    disabled={runningIds.has(selectedPipeline.id) || selectedPipeline.status === 'running'}
                  >
                    {runningIds.has(selectedPipeline.id) ? (
                      <><Loader2 className="size-4 animate-spin" /> Running...</>
                    ) : (
                      <><Play className="size-4" /> Execute Pipeline</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => { handleDelete(selectedPipeline.id, selectedPipeline.name); setDetailOpen(false) }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
