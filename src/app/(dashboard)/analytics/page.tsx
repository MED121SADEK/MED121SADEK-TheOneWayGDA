'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, BarChart3, TrendingUp, Activity, Globe, Loader2,
  Zap, Brain, RefreshCw, ChevronRight, Plus, Trash2,
  Calculator, LineChart, PieChart, Target,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/* ─── Types ─── */
interface AnalysisResult {
  id: string
  name: string
  type: string
  status: string
  result: string | null
  chartData: string | null
  summary: string | null
  durationMs: number | null
  createdAt: string
}

/* ─── Helpers ─── */
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ANALYSIS_TYPES = [
  { value: 'descriptive', label: 'Descriptive Statistics', icon: BarChart3, desc: 'Mean, median, std dev, quartiles, skewness, kurtosis', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'correlation', label: 'Correlation Analysis', icon: Target, desc: 'Pearson correlation matrix between variables', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'regression', label: 'Linear Regression', icon: TrendingUp, desc: 'Simple linear regression with R-squared', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'inferential', label: 'Inferential Statistics', icon: Calculator, desc: 'T-tests, confidence intervals, p-values', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ─── MAIN ─── */
export default function AnalyticsPage() {
  const router = useRouter()
  const { t, locale, setLocale, dir } = useTranslation()

  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new')

  // Form state
  const [analysisName, setAnalysisName] = useState('')
  const [analysisType, setAnalysisType] = useState('descriptive')
  const [varInput, setVarInput] = useState('')
  const [variables, setVariables] = useState<string[]>([])
  const [dataCSV, setDataCSV] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/analytics')
      if (res.ok) {
        const data = await res.json()
        setAnalyses(data.analyses || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  const addVariable = () => {
    const trimmed = varInput.trim()
    if (trimmed && !variables.includes(trimmed)) {
      setVariables([...variables, trimmed])
      setVarInput('')
    }
  }

  const removeVariable = (v: string) => setVariables(variables.filter((x: string) => x !== v))

  const parseDataRows = (): Record<string, string | number>[] => {
    if (!dataCSV.trim()) return []
    const lines = dataCSV.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h: string) => h.trim())
    return lines.slice(1).map((line: string) => {
      const values = line.split(',')
      const row: Record<string, string | number> = {}
      headers.forEach((h: string, i: number) => {
        const v = (values[i] || '').trim()
        const n = Number(v)
        row[h] = isNaN(n) || v === '' ? v : n
      })
      return row
    })
  }

  const handleRun = async () => {
    if (variables.length < 1) return
    setRunning(true)
    setResult(null)
    try {
      const dataRows = parseDataRows()
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: analysisName || `${analysisType} Analysis`,
          type: analysisType,
          variables,
          dataRows,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.analysis)
        fetchAnalyses()
      }
    } catch { /* silent */ }
    setRunning(false)
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6" dir={dir}>
        {/* Hero */}
        <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10">
            <Badge variant="outline" className="px-3 py-1 rounded-full border-primary/30 bg-primary/5 mb-3 text-xs gap-1">
              <Zap className="size-3 text-primary" />Built-in Statistical Engine
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">
              <span className="gradient-text-premium">Advanced Analytics Engine</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Run descriptive statistics, correlation analysis, linear regression, and inferential tests directly in your browser.
              No external dependencies. Powered by our built-in computation engine.
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="new" className="gap-1.5 text-xs"><Plus className="size-3.5" />New Analysis</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs"><Activity className="size-3.5" />History ({analyses.length})</TabsTrigger>
          </TabsList>

          {/* ── New Analysis Tab ── */}
          <TabsContent value="new" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Config Panel */}
              <motion.div {...fadeUp} className="lg:col-span-1 space-y-4">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Analysis Name</Label>
                      <Input value={analysisName} onChange={(e) => setAnalysisName(e.target.value)} placeholder="My Analysis" className="text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Analysis Type</Label>
                      <Select value={analysisType} onValueChange={setAnalysisType}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANALYSIS_TYPES.map((at) => (
                            <SelectItem key={at.value} value={at.value} className="text-xs">{at.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Variables</Label>
                      <div className="flex gap-2">
                        <Input value={varInput} onChange={(e) => setVarInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())} placeholder="e.g., age, income" className="flex-1 text-sm" />
                        <Button size="sm" variant="outline" onClick={addVariable} disabled={!varInput.trim()} className="gap-1">
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {variables.map((v: string) => (
                            <Badge key={v} variant="secondary" className="text-[10px] gap-1 pr-1">
                              {v}
                              <button onClick={() => removeVariable(v)} className="hover:text-rose-400"><Trash2 className="size-2.5" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Data (CSV)</Label>
                      <Textarea
                        value={dataCSV}
                        onChange={(e) => setDataCSV(e.target.value)}
                        placeholder={"age,income,score\n25,45000,78\n30,52000,85\n35,61000,92\n28,48000,81\n40,72000,95"}
                        rows={6}
                        className="text-xs font-mono resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">Paste CSV data with headers in the first row. {dataCSV ? `${dataCSV.trim().split('\n').length - 1} rows detected` : 'No data'}</p>
                    </div>
                    <Button onClick={handleRun} disabled={running || variables.length < 1} className="w-full gap-2">
                      {running ? <><Loader2 className="size-3.5 animate-spin" />Analyzing...</> : <><Zap className="size-3.5" />Run Analysis</>}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Results Panel */}
              <motion.div {...fadeUp} className="lg:col-span-2">
                <Card className="card-premium h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="size-4 text-primary" />Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {running ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="size-8 text-primary animate-spin mb-3" />
                        <p className="text-sm text-muted-foreground">Computing statistics...</p>
                      </div>
                    ) : result ? (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">AI Summary</p>
                          <p className="text-sm">{String(result.summary)}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span>Type: {result.type}</span>
                            <span>Duration: {result.durationMs ? `${result.durationMs}ms` : 'N/A'}</span>
                          </div>
                        </div>

                        {/* Detailed Results */}
                        {result.result && (
                          <div className="overflow-x-auto">
                            <pre className="text-xs font-mono bg-muted/30 border border-border/30 rounded-lg p-4 max-h-80 overflow-y-auto whitespace-pre-wrap">
                              {JSON.stringify(JSON.parse(String(result.result)), null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setResult(null) }}>
                            <RefreshCw className="size-3" />New Analysis
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20">
                        <BarChart3 className="size-12 text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">Run an analysis to see results here</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Select variables, paste data, and click Run</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Analysis Types Cards */}
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" {...stagger}>
              {ANALYSIS_TYPES.map((at, i) => (
                <motion.div key={at.value} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.05 }}>
                  <Card
                    className={`card-premium cursor-pointer hover:border-primary/30 transition-all ${analysisType === at.value ? 'border-primary/40 ring-1 ring-primary/10' : ''}`}
                    onClick={() => setAnalysisType(at.value)}
                  >
                    <CardContent className="p-4">
                      <div className={`size-10 rounded-xl ${at.color} border flex items-center justify-center mb-3`}>
                        <at.icon className="size-5" />
                      </div>
                      <h3 className="text-sm font-semibold">{at.label}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{at.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : analyses.length === 0 ? (
              <motion.div {...fadeUp} className="text-center py-20">
                <Activity className="size-12 text-muted-foreground/20 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-muted-foreground">No analyses yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">Run your first analysis to see it here</p>
              </motion.div>
            ) : (
              <motion.div className="space-y-3" {...stagger}>
                {analyses.map((analysis: AnalysisResult) => {
                  const typeInfo = ANALYSIS_TYPES.find((at) => at.value === analysis.type) || ANALYSIS_TYPES[0]
                  const statusColor = analysis.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' : analysis.status === 'error' ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                  return (
                    <motion.div key={analysis.id} {...fadeUp}>
                      <Card className="card-premium hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group" onClick={() => { setResult(analysis); setActiveTab('new') }}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`size-10 rounded-xl ${typeInfo.color} border flex items-center justify-center flex-shrink-0`}>
                            <typeInfo.icon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{analysis.name}</h3>
                              <span className={`text-[10px] px-2 py-0 rounded-full ${statusColor}`}>{analysis.status}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span>{typeInfo.label}</span>
                              {analysis.durationMs && <span>{analysis.durationMs}ms</span>}
                              <span>{timeAgo(String(analysis.createdAt))}</span>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  )
}
