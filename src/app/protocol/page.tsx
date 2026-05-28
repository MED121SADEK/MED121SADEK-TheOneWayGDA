'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft, FlaskConical, Send, Loader2, CheckCircle2, Clock, Eye,
  FileText, Shield, Users, TrendingUp, AlertCircle, ArrowRight,
  GitBranch, BarChart3, Zap, BookOpen, Globe,
} from 'lucide-react'
import { toast } from 'sonner'

/* ── Types ── */
interface Benchmark {
  id: string
  name: string
  category: string
  description: string
}

interface Protocol {
  id: string
  version: string
  name: string
  description: string
  benchmarks: Benchmark[]
  criteria: {
    min_sample_size: number
    reproducibility_required: boolean
    methodology_disclosure: boolean
    confidence_threshold: number
  }
  publishedAt: string
}

interface Submission {
  id: string
  modelName: string
  provider: string
  benchmark: string
  score: number
  maxScore: number
  methodology: string | null
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected'
  submitterName: string | null
  isVerified: boolean
  createdAt: string
}

interface ProtocolStats {
  totalSubmissions: number
  verifiedCount: number
  contributors: number
  acceptanceRate: string
}

/* ── Status Config ── */
function getStatusConfig(status: string) {
  switch (status) {
    case 'accepted':
      return { icon: <CheckCircle2 className="size-3.5" />, label: 'Accepted', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' }
    case 'reviewing':
      return { icon: <Eye className="size-3.5" />, label: 'Reviewing', className: 'bg-sky-500/15 text-sky-400 border-sky-500/25' }
    case 'rejected':
      return { icon: <AlertCircle className="size-3.5" />, label: 'Rejected', className: 'bg-rose-500/15 text-rose-400 border-rose-500/25' }
    default:
      return { icon: <Clock className="size-3.5" />, label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' }
  }
}

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

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 80) return 'text-sky-400'
  if (score >= 70) return 'text-amber-400'
  return 'text-rose-400'
}

function formatDate(date: string): string {
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
export default function ProtocolPage() {
  const [protocol, setProtocol] = useState<Protocol | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<ProtocolStats>({ totalSubmissions: 0, verifiedCount: 0, contributors: 0, acceptanceRate: '0' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Form state
  const [formModelName, setFormModelName] = useState('')
  const [formProvider, setFormProvider] = useState('')
  const [formBenchmark, setFormBenchmark] = useState('')
  const [formScore, setFormScore] = useState('')
  const [formMethodology, setFormMethodology] = useState('')
  const [formSubmitterName, setFormSubmitterName] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/protocol')
      const data = await res.json()
      setProtocol(data.protocol || null)
      setSubmissions(data.submissions || [])
      setStats(data.stats || { totalSubmissions: 0, verifiedCount: 0, contributors: 0, acceptanceRate: '0' })
    } catch (err) {
      console.error('Protocol fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formModelName || !formProvider || !formBenchmark || !formScore) {
      toast.error('Please fill in all required fields.')
      return
    }
    const parsedScore = parseFloat(formScore)
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      toast.error('Score must be a number between 0 and 100.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/protocol/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: formModelName,
          provider: formProvider,
          benchmark: formBenchmark,
          score: parsedScore,
          methodology: formMethodology,
          submitterName: formSubmitterName || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Benchmark submitted successfully! It will be reviewed by our team.')
        setFormModelName('')
        setFormProvider('')
        setFormBenchmark('')
        setFormScore('')
        setFormMethodology('')
        setFormSubmitterName('')
        fetchData()
      } else {
        toast.error(data.error || 'Failed to submit benchmark.')
      }
    } catch (err) {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col noise-overlay">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 hero-gradient opacity-60" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-teal-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Open Benchmark Protocol</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <GitBranch className="size-3" />
              v1.0
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Globe className="size-3 mr-1" />
              Open
            </Badge>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 relative z-10">

        {/* ── Hero ── */}
        <motion.section {...fadeUp} className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <FlaskConical className="size-4" />
            <span>Open Standard for AI Evaluation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="gradient-text-premium">Open Benchmark Protocol</span>
            <span className="text-muted-foreground font-normal"> v1.0</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Submit your benchmark results and contribute to the open AI evaluation standard.
            Transparent, reproducible, community-driven.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button className="gap-2 btn-glow" onClick={() => setActiveTab('submit')}>
              <Send className="size-4" />
              Submit Benchmark
            </Button>
            <Link href="/certifications">
              <Button variant="outline" className="gap-2">
                <Shield className="size-4" />
                View Certifications
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* ── Stats ── */}
        <motion.section {...fadeUp}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Submissions', value: stats.totalSubmissions, icon: <FileText className="size-4 text-primary" />, change: '+12 this week' },
              { label: 'Verified', value: stats.verifiedCount, icon: <CheckCircle2 className="size-4 text-emerald-400" />, change: `${stats.acceptanceRate}% acceptance` },
              { label: 'Contributors', value: stats.contributors, icon: <Users className="size-4 text-sky-400" />, change: 'Global community' },
              { label: 'Benchmarks', value: protocol?.benchmarks?.length || 6, icon: <BarChart3 className="size-4 text-amber-400" />, change: 'Standardized tests' },
            ].map((stat, i) => (
              <Card key={i} className="bg-card/60 backdrop-blur-sm border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">{stat.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold font-mono">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.change}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1.5 text-xs">
              <FileText className="size-3.5" />
              <span className="hidden sm:inline">Submissions</span>
            </TabsTrigger>
            <TabsTrigger value="submit" className="gap-1.5 text-xs">
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
            <TabsTrigger value="guidelines" className="gap-1.5 text-xs">
              <BookOpen className="size-3.5" />
              <span className="hidden sm:inline">Guidelines</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════
              TAB 1: OVERVIEW
              ═══════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : protocol ? (
              <>
                {/* Protocol Description */}
                <motion.div {...fadeUp}>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                    <CardHeader className="pb-2 pt-5 px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FlaskConical className="size-5 text-primary" />
                            {protocol.name}
                          </CardTitle>
                          <Badge variant="outline" className="mt-2 text-xs">Version {protocol.version}</Badge>
                        </div>
                        <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          <Zap className="size-3" /> Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{protocol.description}</p>

                      {/* Criteria */}
                      {protocol.criteria && (
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                            <Shield className="size-3.5" />
                            Evaluation Criteria
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { label: 'Min Sample Size', value: `${protocol.criteria.min_sample_size}`, icon: '📊' },
                              { label: 'Reproducibility', value: protocol.criteria.reproducibility_required ? 'Required' : 'Optional', icon: '🔄' },
                              { label: 'Methodology Disclosure', value: protocol.criteria.methodology_disclosure ? 'Required' : 'Optional', icon: '📝' },
                              { label: 'Confidence Threshold', value: `${(protocol.criteria.confidence_threshold * 100).toFixed(0)}%`, icon: '🎯' },
                            ].map((c, i) => (
                              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/30 text-sm">
                                <span className="text-base">{c.icon}</span>
                                <span className="text-muted-foreground">{c.label}</span>
                                <span className="ml-auto font-semibold font-mono">{c.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Supported Benchmarks */}
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    Supported Benchmarks
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {protocol.benchmarks.map((bm, i) => (
                      <motion.div key={bm.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
                        <Card className="bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all group cursor-pointer">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{bm.name}</h4>
                                <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full border mt-1 capitalize">
                                  {bm.category}
                                </Badge>
                              </div>
                              <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">{bm.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Submissions Preview */}
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      Recent Submissions
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setActiveTab('submissions')}>
                      View all <ArrowRight className="size-3" />
                    </Button>
                  </div>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/40 bg-muted/30">
                              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Model</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden sm:table-cell">Benchmark</th>
                              <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Score</th>
                              <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissions.slice(0, 5).map((sub, i) => {
                              const statusConfig = getStatusConfig(sub.status)
                              return (
                                <motion.tr key={sub.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.03 }}
                                  className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                  <td className="py-3 px-4">
                                    <div>
                                      <span className="font-semibold text-sm">{sub.modelName}</span>
                                      <p className="text-[10px] text-muted-foreground">{sub.provider}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 hidden sm:table-cell">
                                    <span className="text-sm text-muted-foreground">{sub.benchmark}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`text-lg font-bold font-mono ${getScoreColor(sub.score)}`}>{sub.score}</span>
                                    <span className="text-[10px] text-muted-foreground">/{sub.maxScore}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.className}`}>
                                      {statusConfig.icon}
                                      {statusConfig.label}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 text-right hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground">{timeAgo(sub.createdAt)}</span>
                                  </td>
                                </motion.tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FlaskConical className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Protocol not available</h3>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════
              TAB 2: ALL SUBMISSIONS
              ═══════════════════════════════════════ */}
          <TabsContent value="submissions" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="size-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No submissions yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">Be the first to submit a benchmark result.</p>
              </div>
            ) : (
              <motion.div {...stagger}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/40 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-border/40 bg-muted/60 backdrop-blur-sm">
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Model</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Provider</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden sm:table-cell">Benchmark</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Score</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Submitter</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {submissions.map((sub, i) => {
                              const statusConfig = getStatusConfig(sub.status)
                              return (
                                <motion.tr key={sub.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.02 }}
                                  className="border-b border-border/20 hover:bg-muted/20 transition-colors group">
                                  <td className="py-3 px-4">
                                    <span className="text-sm font-mono text-muted-foreground w-6 text-center inline-block">{i + 1}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">{sub.modelName}</span>
                                    {sub.isVerified && (
                                      <CheckCircle2 className="inline-block size-3 text-emerald-400 ml-1.5" />
                                    )}
                                  </td>
                                  <td className="py-3 px-4 hidden md:table-cell">
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full border ${getProviderColor(sub.provider)}`}>
                                      {sub.provider}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 hidden sm:table-cell">
                                    <span className="text-sm text-muted-foreground">{sub.benchmark}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className={`inline-flex items-center justify-center min-w-[50px] px-2 py-0.5 rounded-md border bg-muted/30`}>
                                      <span className={`font-bold text-sm font-mono ${getScoreColor(sub.score)}`}>{sub.score}</span>
                                      <span className="text-[10px] text-muted-foreground">/{sub.maxScore}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.className}`}>
                                      {statusConfig.icon}
                                      {statusConfig.label}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 hidden lg:table-cell">
                                    <span className="text-xs text-muted-foreground">{sub.submitterName || 'Anonymous'}</span>
                                  </td>
                                  <td className="py-3 px-4 text-right hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground">{timeAgo(sub.createdAt)}</span>
                                  </td>
                                </motion.tr>
                              )
                            })}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════
              TAB 3: SUBMIT FORM
              ═══════════════════════════════════════ */}
          <TabsContent value="submit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <motion.div {...fadeUp} className="lg:col-span-3">
                <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Send className="size-5 text-primary" />
                      Submit Benchmark Result
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fill out the form below to submit your benchmark results for review.
                    </p>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Model Name */}
                        <div className="space-y-2">
                          <Label htmlFor="modelName" className="text-xs">
                            Model Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="modelName"
                            value={formModelName}
                            onChange={(e) => setFormModelName(e.target.value)}
                            placeholder="e.g. GPT-4o, Claude 4"
                            className="h-10 text-sm"
                            required
                          />
                        </div>

                        {/* Provider */}
                        <div className="space-y-2">
                          <Label htmlFor="provider" className="text-xs">
                            Provider <span className="text-destructive">*</span>
                          </Label>
                          <Select value={formProvider} onValueChange={setFormProvider}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OpenAI">OpenAI</SelectItem>
                              <SelectItem value="Anthropic">Anthropic</SelectItem>
                              <SelectItem value="Google">Google</SelectItem>
                              <SelectItem value="Meta">Meta</SelectItem>
                              <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                              <SelectItem value="Mistral AI">Mistral AI</SelectItem>
                              <SelectItem value="Alibaba">Alibaba</SelectItem>
                              <SelectItem value="Cohere">Cohere</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Benchmark */}
                        <div className="space-y-2">
                          <Label htmlFor="benchmark" className="text-xs">
                            Benchmark <span className="text-destructive">*</span>
                          </Label>
                          <Select value={formBenchmark} onValueChange={setFormBenchmark}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select benchmark" />
                            </SelectTrigger>
                            <SelectContent>
                              {(protocol?.benchmarks || []).map(bm => (
                                <SelectItem key={bm.id} value={bm.id} className="text-xs">
                                  {bm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Score */}
                        <div className="space-y-2">
                          <Label htmlFor="score" className="text-xs">
                            Score <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="score"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={formScore}
                              onChange={(e) => setFormScore(e.target.value)}
                              placeholder="0 - 100"
                              className="h-10 text-sm pr-10"
                              required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Methodology */}
                      <div className="space-y-2">
                        <Label htmlFor="methodology" className="text-xs">
                          Methodology Description
                        </Label>
                        <Textarea
                          id="methodology"
                          value={formMethodology}
                          onChange={(e) => setFormMethodology(e.target.value)}
                          placeholder="Describe your testing methodology, sample size, environment, and any relevant details..."
                          className="min-h-[100px] text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Detailed methodology descriptions help accelerate the review process.
                        </p>
                      </div>

                      {/* Submitter Name */}
                      <div className="space-y-2">
                        <Label htmlFor="submitterName" className="text-xs">
                          Your Name / Organization
                        </Label>
                        <Input
                          id="submitterName"
                          value={formSubmitterName}
                          onChange={(e) => setFormSubmitterName(e.target.value)}
                          placeholder="e.g. OpenAI Research, Your Lab Name"
                          className="h-10 text-sm"
                        />
                      </div>

                      <Separator className="opacity-40" />

                      {/* Submit */}
                      <div className="flex items-center gap-3">
                        <Button type="submit" disabled={submitting} className="gap-2 btn-glow">
                          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          {submitting ? 'Submitting...' : 'Submit Benchmark'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => {
                          setFormModelName(''); setFormProvider(''); setFormBenchmark(''); setFormScore(''); setFormMethodology(''); setFormSubmitterName('')
                        }}>
                          Reset
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sidebar Info */}
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="lg:col-span-2 space-y-4">
                {/* Tips */}
                <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="size-4 text-amber-400" />
                      Submission Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {[
                      { tip: 'Use a large, diverse sample set for more reliable results.', icon: '📊' },
                      { tip: 'Document your testing environment (hardware, software, versions).', icon: '🔧' },
                      { tip: 'Report raw scores — do not normalize or adjust values.', icon: '📏' },
                      { tip: 'Include statistical significance measures when possible.', icon: '📈' },
                      { tip: 'Provide enough detail for results to be independently reproduced.', icon: '🔄' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
                        <span className="text-muted-foreground">{item.tip}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Process */}
                <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      Review Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {[
                      { step: '1', label: 'Submit', desc: 'Fill out the form with your benchmark data', color: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
                      { step: '2', label: 'Review', desc: 'Our team reviews for accuracy and methodology', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
                      { step: '3', label: 'Verify', desc: 'Independent verification of results', color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
                      { step: '4', label: 'Accept', desc: 'Results added to the open benchmark database', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`flex items-center justify-center size-7 rounded-full border text-xs font-bold flex-shrink-0 ${item.color}`}>
                          {item.step}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-card/60 backdrop-blur-sm border-border/40">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold font-mono text-emerald-400">{stats.verifiedCount}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Verified Results</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold font-mono text-sky-400">{stats.acceptanceRate}%</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Acceptance Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════
              TAB 4: GUIDELINES
              ═══════════════════════════════════════ */}
          <TabsContent value="guidelines" className="space-y-6">
            <motion.div {...stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Reproducibility',
                  description: 'All submissions must include enough detail for independent reproduction. Include your testing environment, model version, temperature settings, and any prompt engineering techniques used.',
                  icon: <Shield className="size-5 text-emerald-400" />,
                  color: 'bg-emerald-500/15 border-emerald-500/30',
                },
                {
                  title: 'Sample Size',
                  description: `We require a minimum of ${protocol?.criteria?.min_sample_size || 100} test samples per benchmark. Larger sample sizes produce more reliable results and are given priority in the review queue.`,
                  icon: <BarChart3 className="size-5 text-sky-400" />,
                  color: 'bg-sky-500/15 border-sky-500/30',
                },
                {
                  title: 'Methodology Transparency',
                  description: 'Clearly document your evaluation methodology. Describe how prompts were constructed, how responses were scored, and any preprocessing or postprocessing steps.',
                  icon: <Eye className="size-5 text-amber-400" />,
                  color: 'bg-amber-500/15 border-amber-500/30',
                },
                {
                  title: 'Conflict of Interest',
                  description: 'Disclose any affiliation with the model provider. Submissions from model creators are welcome but must be clearly marked. Independent evaluations receive priority review.',
                  icon: <Users className="size-5 text-violet-400" />,
                  color: 'bg-violet-500/15 border-violet-500/30',
                },
                {
                  title: 'Data Integrity',
                  description: 'Do not cherry-pick results or exclude unfavorable test cases. Report complete results for all test samples, including failures and edge cases.',
                  icon: <CheckCircle2 className="size-5 text-rose-400" />,
                  color: 'bg-rose-500/15 border-rose-500/30',
                },
                {
                  title: 'Open Licensing',
                  description: 'Submitted benchmark data becomes part of the open protocol database under a CC BY-SA 4.0 license, enabling community-wide access and verification.',
                  icon: <Globe className="size-5 text-teal-400" />,
                  color: 'bg-teal-500/15 border-teal-500/30',
                },
              ].map((guide, i) => (
                <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}>
                  <Card className="bg-card/60 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all h-full">
                    <CardContent className="p-5 space-y-3">
                      <div className={`inline-flex p-2.5 rounded-xl border ${guide.color}`}>
                        {guide.icon}
                      </div>
                      <h3 className="font-bold text-base">{guide.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{guide.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div {...fadeUp} className="text-center py-4 space-y-3">
              <Separator className="opacity-30 mb-6" />
              <p className="text-sm text-muted-foreground">
                Ready to contribute? Submit your first benchmark result and help build the open standard for AI evaluation.
              </p>
              <Button className="gap-2 btn-glow" onClick={() => setActiveTab('submit')}>
                <Send className="size-4" />
                Submit Now
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
