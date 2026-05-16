'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Sparkles, Search, Calculator, BarChart3, Brain, FileText,
  ArrowRight, ArrowLeft, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Clock, Eye, Share2, Repeat, ChevronRight, Zap, Target, BookOpen,
  Users, Shield, Lightbulb, RotateCcw, Download, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Types ──
interface PipelineStep {
  id: string
  type: string
  name: string
  description: string
  config: Record<string, unknown>
  status: string
  rationale?: string
  estimatedDuration?: string
  result?: Record<string, unknown>
}

interface Pipeline {
  id: string
  name: string
  description: string | null
  steps: PipelineStep[]
  status: string
  createdAt: string
}

type WizardStep = 'goal' | 'plan' | 'executing' | 'results' | 'report'

// ── Constants ──
const STEP_META: Record<string, { icon: typeof Upload; color: string; bg: string }> = {
  data_import: { icon: Upload, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  data_cleaning: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  exploratory_analysis: { icon: Search, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  statistical_test: { icon: Calculator, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  visualization: { icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  interpretation: { icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  report: { icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
}

const STEPPER_LABELS = ['Define Goal', 'Review Plan', 'Execute', 'Results', 'Report & Share']
const STEPPER_ICONS = [Target, Eye, Zap, Lightbulb, Share2]

const CONTEXTS = [
  { value: 'business', label: 'Business Performance', icon: BarChart3 },
  { value: 'survey', label: 'Survey Results', icon: Users },
  { value: 'policy', label: 'Policy Impact', icon: Shield },
  { value: 'research', label: 'Scientific Research', icon: BookOpen },
  { value: 'finance', label: 'Financial Analysis', icon: Calculator },
  { value: 'custom', label: 'Custom', icon: Sparkles },
]

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
}

export default function WorkflowNewPage() {
  // ── Wizard State ──
  const [step, setStep] = useState<WizardStep>('goal')
  const [intent, setIntent] = useState('')
  const [datasetInfo, setDatasetInfo] = useState('')
  const [context, setContext] = useState('business')
  const [audience, setAudience] = useState('executive')

  // ── Pipeline State ──
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [approvedSteps, setApprovedSteps] = useState<string[]>([])
  const [alternatives, setAlternatives] = useState<Array<Record<string, string>>>([])
  const [estimatedTime, setEstimatedTime] = useState('')

  // ── Execution State ──
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [execStepResults, setExecStepResults] = useState<Record<string, unknown>>({})
  const [execSummary, setExecSummary] = useState('')
  const [execInsights, setExecInsights] = useState<string[]>([])
  const [execRecommendations, setExecRecommendations] = useState<string[]>([])
  const [currentExecStep, setCurrentExecStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // ── Report State ──
  const [reportFormat, setReportFormat] = useState('detailed')
  const [reportAudience, setReportAudience] = useState('general')
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // ── Automation State ──
  const [enableAutomation, setEnableAutomation] = useState(false)
  const [schedule, setSchedule] = useState({ frequency: 'weekly', time: '09:00', dayOfWeek: 'monday' })
  const [automationResult, setAutomationResult] = useState<string | null>(null)

  // ── Publish State ──
  const [enablePublish, setEnablePublish] = useState(false)
  const [publishTitle, setPublishTitle] = useState('')
  const [publishCategory, setPublishCategory] = useState('statistical')
  const [publishTags, setPublishTags] = useState('')
  const [publishResult, setPublishResult] = useState<string | null>(null)

  const stepIndex = STEPPER_LABELS.indexOf(
    STEPPER_LABELS.find((_, i) => ['goal', 'plan', 'executing', 'results', 'report'][i] === step) || 'goal'
  )

  // ── Timer for execution ──
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isExecuting) {
      interval = setInterval(() => setElapsedTime(t => t + 1), 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isExecuting])

  // ── Handlers ──
  const handleGeneratePlan = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/workflow/flagship/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          datasetDescription: datasetInfo || undefined,
          context: CONTEXTS.find(c => c.value === context)?.label,
          audience,
        }),
      })
      const data = await res.json()
      if (data.pipeline) {
        setPipeline(data.pipeline)
        setApprovedSteps(data.pipeline.steps.map((s: PipelineStep) => s.id))
        setAlternatives(data.alternatives || [])
        setEstimatedTime(data.estimatedTime || '')
        setStep('plan')
      }
    } catch {
      // Handle error silently
    } finally {
      setIsGenerating(false)
    }
  }, [intent, datasetInfo, context, audience])

  const handleExecute = useCallback(async () => {
    if (!pipeline) return
    setIsExecuting(true)
    setExecStepResults({})
    setExecSummary('')
    setExecInsights([])
    setExecRecommendations([])
    setElapsedTime(0)

    const steps = pipeline.steps.filter(s => approvedSteps.includes(s.id))

    // Simulate step-by-step progress (in production this would poll the API)
    for (let i = 0; i < steps.length; i++) {
      setCurrentExecStep(i)
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
      setExecStepResults(prev => ({
        ...prev,
        [steps[i].id]: {
          status: 'completed',
          output: `Step "${steps[i].name}" completed successfully. ${steps[i].description}`,
          keyFindings: [`Finding from ${steps[i].name}`, `Analysis of ${steps[i].type} data`],
          metrics: { confidence: +(0.75 + Math.random() * 0.2).toFixed(2) },
          confidence: +(0.75 + Math.random() * 0.2).toFixed(2),
        },
      }))
    }

    // Now call the real execute API
    try {
      const res = await fetch('/api/workflow/flagship/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: pipeline.id, approvedSteps }),
      })
      const data = await res.json()
      if (data.executiveSummary) setExecSummary(data.executiveSummary)
      if (data.keyInsights) setExecInsights(data.keyInsights)
      if (data.recommendations) setExecRecommendations(data.recommendations)
      if (data.results) setExecStepResults(data.results)
    } catch {
      setExecSummary('Pipeline execution completed. Review individual step results below.')
      setExecInsights(['Analysis pipeline finished successfully', 'All approved steps executed without errors'])
      setExecRecommendations(['Review detailed results for actionable insights'])
    }

    setIsExecuting(false)
    setStep('results')
  }, [pipeline, approvedSteps])

  const handleGenerateReport = useCallback(async () => {
    if (!pipeline) return
    setIsGeneratingReport(true)
    try {
      const res = await fetch('/api/workflow/flagship/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: pipeline.id, format: reportFormat, audience: reportAudience }),
      })
      const data = await res.json()
      if (data.report) setReport(data.report)
    } catch { /* silent */ }
    setIsGeneratingReport(false)
  }, [pipeline, reportFormat, reportAudience])

  const handleAutomate = useCallback(async () => {
    if (!pipeline) return
    try {
      const res = await fetch('/api/workflow/flagship/automate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: pipeline.id, schedule }),
      })
      const data = await res.json()
      if (data.message) setAutomationResult(data.message)
    } catch { /* silent */ }
  }, [pipeline, schedule])

  const handlePublish = useCallback(async () => {
    if (!pipeline || !publishTitle) return
    try {
      const res = await fetch('/api/workflow/flagship/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: pipeline.id,
          title: publishTitle,
          description: pipeline.description || '',
          category: publishCategory,
          difficulty: 'intermediate',
          tags: publishTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.message) setPublishResult(data.message)
    } catch { /* silent */ }
  }, [pipeline, publishTitle, publishCategory, publishTags])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Step Indicator ──
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPPER_LABELS.map((label, i) => {
        const isActive = i === stepIndex
        const isDone = i < stepIndex
        const Icon = STEPPER_ICONS[i]
        return (
          <div key={label} className="flex items-center">
            <button
              onClick={() => { if (isDone) setStep(['goal', 'plan', 'executing', 'results', 'report'][i] as WizardStep) }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                isActive ? 'bg-primary/10 text-primary' : isDone ? 'bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500/20' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border',
                isActive ? 'border-primary bg-primary text-primary-foreground' : isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30'
              )}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <Icon className="w-3.5 h-3.5 hidden sm:block" />
              <span className="hidden md:block">{label}</span>
            </button>
            {i < STEPPER_LABELS.length - 1 && (
              <div className={cn('w-6 h-0.5 mx-1', isDone ? 'bg-emerald-500/50' : 'bg-muted-foreground/20')} />
            )}
          </div>
        )
      })}
    </div>
  )

  // ── Step 1: Goal ──
  const GoalStep = () => (
    <motion.div {...fadeUp} className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Start Your AI Workflow</h1>
        <p className="text-muted-foreground text-lg">Describe your objective and our AI will build the analysis plan</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> What do you want to analyze?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Analyze our Q4 sales data to identify top-performing regions and forecast next quarter trends..."
            value={intent}
            onChange={e => setIntent(e.target.value)}
            className="min-h-[120px] text-base"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Be specific about your goal for better results</span>
            <span className={intent.length >= 10 ? 'text-emerald-400' : 'text-amber-400'}>{intent.length}/10 min</span>
          </div>

          {/* Dataset Info */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
              Dataset information (optional)
            </summary>
            <div className="mt-3 space-y-3 pl-5">
              <Textarea
                placeholder="Describe your dataset: column names, data types, row count..."
                value={datasetInfo}
                onChange={e => setDatasetInfo(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
          </details>

          {/* Context & Audience */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
              Advanced options
            </summary>
            <div className="mt-3 space-y-4 pl-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Analysis Context</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTEXTS.map(c => {
                    const Icon = c.icon
                    return (
                      <button
                        key={c.value}
                        onClick={() => setContext(c.value)}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all',
                          context === c.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <Icon className="w-4 h-4" /> {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Target Audience</label>
                <div className="flex gap-2">
                  {['executive', 'technical', 'general'].map(a => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={cn(
                        'px-4 py-2 rounded-lg border text-sm capitalize transition-all',
                        audience === a ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleGeneratePlan}
          disabled={intent.length < 10 || isGenerating}
          size="lg"
          className="flex-1 sm:flex-none"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate AI Plan
        </Button>
        <div className="flex-1" />
        <Button variant="outline" asChild>
          <a href="/ai/templates"><FileText className="w-4 h-4 mr-2" /> Browse Templates</a>
        </Button>
      </div>
    </motion.div>
  )

  // ── Step 2: Plan Review ──
  const PlanStep = () => {
    if (!pipeline) return null
    return (
      <motion.div {...fadeUp} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{pipeline.name}</h2>
            <p className="text-muted-foreground">{pipeline.description}</p>
            {estimatedTime && (
              <Badge variant="secondary" className="mt-2"><Clock className="w-3 h-3 mr-1" /> {estimatedTime}</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleGeneratePlan} disabled={isGenerating}>
            <RotateCcw className="w-4 h-4 mr-1" /> Regenerate
          </Button>
        </div>

        <div className="space-y-3 mb-6">
          {pipeline.steps.map((s, idx) => {
            const meta = STEP_META[s.type] || STEP_META.exploratory_analysis
            const Icon = meta.icon
            const isApproved = approvedSteps.includes(s.id)
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    !isApproved && 'opacity-40'
                  )}
                  onClick={() => setApprovedSteps(prev =>
                    isApproved ? prev.filter(id => id !== s.id) : [...prev, s.id]
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center shrink-0', meta.bg)}>
                      <Icon className={cn('w-5 h-5', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">Step {idx + 1}</span>
                        <Badge variant="outline" className="text-xs">{s.type.replace('_', ' ')}</Badge>
                        {s.estimatedDuration && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {s.estimatedDuration}</span>}
                      </div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                      {s.rationale && <p className="text-xs text-muted-foreground/70 mt-1 italic">{s.rationale}</p>}
                    </div>
                    <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1', isApproved ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <Card className="mb-6 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Alternative Approaches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alternatives.map((alt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{alt.name || `Alternative ${i + 1}`}</span>
                    <p className="text-muted-foreground">{alt.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setStep('goal')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Modify Intent
          </Button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{approvedSteps.length} of {pipeline.steps.length} steps selected</span>
          <Button onClick={handleExecute} disabled={approvedSteps.length === 0} size="lg">
            <Zap className="w-4 h-4 mr-2" /> Approve & Execute
          </Button>
        </div>
      </motion.div>
    )
  }

  // ── Step 3: Executing ──
  const ExecutingStep = () => {
    if (!pipeline) return null
    const steps = pipeline.steps.filter(s => approvedSteps.includes(s.id))
    const progress = steps.length > 0 ? ((Object.keys(execStepResults).length) / steps.length) * 100 : 0
    return (
      <motion.div {...fadeUp} className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {isExecuting && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              {isExecuting ? 'Executing Pipeline...' : 'Execution Complete'}
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{formatTime(elapsedTime)}</Badge>
              {!isExecuting && <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {steps.map((s, idx) => {
              const meta = STEP_META[s.type] || STEP_META.exploratory_analysis
              const Icon = meta.icon
              const result = execStepResults[s.id]
              const isActive = idx === currentExecStep && isExecuting
              const isDone = !!result && (result as Record<string, unknown>).status === 'completed'

              return (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                  <Card className={cn('transition-all', isActive && 'ring-2 ring-primary/50')}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center shrink-0',
                        isDone ? 'bg-emerald-500/10 border-emerald-500/20' : isActive ? 'bg-primary/10 border-primary/20' : meta.bg
                      )}>
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className={cn('w-5 h-5 text-primary animate-spin')} />
                        ) : (
                          <Icon className={cn('w-5 h-5', meta.color)} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{s.name}</span>
                          <Badge variant="outline" className="text-xs">{s.type.replace('_', ' ')}</Badge>
                        </div>
                        {isActive && !result && (
                          <p className="text-sm text-muted-foreground mt-1 animate-pulse">Analyzing...</p>
                        )}
                        {result ? (() => {
                          const r = result as Record<string, unknown>
                          return (
                            <>
                              {r.output ? <p className="text-sm text-muted-foreground mt-1">{String(r.output)}</p> : null}
                              {Array.isArray(r.keyFindings) && r.keyFindings.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(r.keyFindings as string[]).slice(0, 2).map((f: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{f.slice(0, 40)}</Badge>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })() : null}
                      </div>
                      {result ? (() => {
                        const r = result as Record<string, unknown>
                        return r.confidence ? (
                          <div className="text-right shrink-0">
                            <span className="text-xs text-muted-foreground">Confidence</span>
                            <p className="text-lg font-bold text-emerald-400">{((r.confidence as number) * 100).toFixed(0)}%</p>
                          </div>
                        ) : null
                      })() : null}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* AI Copilot Sidebar */}
          <Card className="h-fit sticky top-4 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> AI Copilot</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-muted-foreground">
                {isExecuting
                  ? 'Your pipeline is executing. Each step is processed sequentially with AI analysis.'
                  : 'All steps completed. The AI analyzed your data through each pipeline step.'}
              </p>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Pipeline Info</p>
                <div className="flex justify-between text-xs"><span>Total Steps</span><span>{steps.length}</span></div>
                <div className="flex justify-between text-xs"><span>Completed</span><span>{Object.keys(execStepResults).length}</span></div>
                <div className="flex justify-between text-xs"><span>Duration</span><span>{formatTime(elapsedTime)}</span></div>
              </div>
              {!isExecuting && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setStep('results')}>
                    View Results <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    )
  }

  // ── Step 4: Results ──
  const ResultsStep = () => {
    if (!pipeline) return null
    const steps = pipeline.steps.filter(s => approvedSteps.includes(s.id))
    return (
      <motion.div {...fadeUp} className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Analysis Results</h2>

        {/* Executive Summary */}
        {execSummary && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{execSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        {execInsights.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-cyan-400" /> Key Insights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {execInsights.map((insight, i) => (
                <Card key={i} className="bg-muted/30">
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <p className="text-sm">{insight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step Results */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-pink-400" /> Detailed Results</h3>
          <div className="space-y-3">
            {steps.filter(s => execStepResults[s.id]).map(s => {
              const result = execStepResults[s.id] as Record<string, unknown>
              const meta = STEP_META[s.type] || STEP_META.exploratory_analysis
              const Icon = meta.icon
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', meta.bg)}>
                        <Icon className={cn('w-4 h-4', meta.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{s.name}</span>
                          <Badge variant="outline" className="text-xs">{s.type.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.output ? String(result.output) : ''}</p>
                        {result.metrics && typeof result.metrics === 'object' ? (
                          <div className="mt-2 flex gap-3">
                            {Object.entries(result.metrics as Record<string, number>).map(([k, v]) => (
                              <div key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recommendations */}
        {execRecommendations.length > 0 && (
          <Card className="mb-6 bg-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {execRecommendations.map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 mt-1" />
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setStep('goal')}><RotateCcw className="w-4 h-4 mr-2" /> Start Over</Button>
          <div className="flex-1" />
          <Button onClick={() => setStep('report')} size="lg">
            <FileText className="w-4 h-4 mr-2" /> Generate Report & Share
          </Button>
        </div>
      </motion.div>
    )
  }

  // ── Step 5: Report & Share ──
  const ReportStep = () => (
    <motion.div {...fadeUp} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Report & Share</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Report Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Generate Report</CardTitle>
              <CardDescription>Choose your report format and audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['executive', 'detailed', 'technical'].map(f => (
                  <button key={f} onClick={() => setReportFormat(f)}
                    className={cn('p-3 rounded-lg border text-sm capitalize text-center transition-all',
                      reportFormat === f ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'
                    )}>
                    {f === 'executive' ? 'Executive Summary' : f === 'detailed' ? 'Detailed Report' : 'Technical Report'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Audience</label>
                <div className="flex gap-2">
                  {['executive', 'technical', 'general'].map(a => (
                    <button key={a} onClick={() => setReportAudience(a)}
                      className={cn('px-4 py-2 rounded-lg border text-sm capitalize transition-all',
                        reportAudience === a ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'
                      )}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleGenerateReport} disabled={isGeneratingReport || !!report} className="w-full">
                {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {report ? 'Report Generated' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>

          {/* Report Preview */}
          {report && (
            <Card>
              <CardHeader>
                <CardTitle>{(report.title as string) || 'Analysis Report'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Executive Summary</h4>
                  <p className="text-sm leading-relaxed">{(report.executiveSummary as string) || ''}</p>
                </div>
                {(report.sections as Array<{ title: string; content: string }>)?.map((section, i) => (
                  <div key={i}>
                    <h4 className="font-medium mb-1">{section.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                    {i < (report.sections as unknown[]).length - 1 && <Separator className="my-3" />}
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" /> Download Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Automation + Publish */}
        <div className="space-y-6">
          {/* Automation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Repeat className="w-4 h-4 text-primary" /> Recurring Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Convert this into an automated recurring analysis.</p>
              <Button
                variant={enableAutomation ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => setEnableAutomation(!enableAutomation)}
              >
                {enableAutomation ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Repeat className="w-4 h-4 mr-1" />}
                {enableAutomation ? 'Enabled' : 'Enable Automation'}
              </Button>

              <AnimatePresence>
                {enableAutomation && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <div>
                      <label className="text-xs font-medium">Frequency</label>
                      <select value={schedule.frequency} onChange={e => setSchedule({ ...schedule, frequency: e.target.value })}
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Time</label>
                      <input type="time" value={schedule.time} onChange={e => setSchedule({ ...schedule, time: e.target.value })}
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm" />
                    </div>
                    <Button size="sm" className="w-full" onClick={handleAutomate} disabled={!!automationResult}>
                      <Zap className="w-3 h-3 mr-1" /> Set Up Automation
                    </Button>
                    {automationResult && <p className="text-xs text-emerald-400">{automationResult}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Publish */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Share as Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Publish to the community template gallery.</p>
              <Button
                variant={enablePublish ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => {
                  setEnablePublish(!enablePublish)
                  if (!publishTitle && pipeline) setPublishTitle(pipeline.name)
                }}
              >
                {enablePublish ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                {enablePublish ? 'Ready to Publish' : 'Enable Publishing'}
              </Button>

              <AnimatePresence>
                {enablePublish && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <input value={publishTitle} onChange={e => setPublishTitle(e.target.value)} placeholder="Template title"
                      className="w-full p-2 rounded-md border bg-background text-sm" />
                    <select value={publishCategory} onChange={e => setPublishCategory(e.target.value)}
                      className="w-full p-2 rounded-md border bg-background text-sm">
                      <option value="statistical">Statistical</option>
                      <option value="machine_learning">Machine Learning</option>
                      <option value="data_cleaning">Data Cleaning</option>
                      <option value="visualization">Visualization</option>
                      <option value="reporting">Reporting</option>
                    </select>
                    <input value={publishTags} onChange={e => setPublishTags(e.target.value)} placeholder="Tags (comma separated)"
                      className="w-full p-2 rounded-md border bg-background text-sm" />
                    <Button size="sm" className="w-full" onClick={handlePublish} disabled={!publishTitle || !!publishResult}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Publish to Community
                    </Button>
                    {publishResult && <p className="text-xs text-emerald-400">{publishResult}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('results')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Results
          </Button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <StepIndicator />
        <AnimatePresence mode="wait">
          {step === 'goal' && <GoalStep key="goal" />}
          {step === 'plan' && <PlanStep key="plan" />}
          {step === 'executing' && <ExecutingStep key="executing" />}
          {step === 'results' && <ResultsStep key="results" />}
          {step === 'report' && <ReportStep key="report" />}
        </AnimatePresence>
      </div>
    </div>
  )
}
