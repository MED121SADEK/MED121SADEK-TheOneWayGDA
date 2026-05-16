'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import type { Variable } from '@/lib/store'

import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain, WifiOff, RefreshCw, ScanLine, MessageSquare, Users,
  Sparkles, Play, Menu, Check, X, BarChart3, ArrowRight,
  Zap, Star, ChevronRight, Globe, Save, FolderOpen, Share2,
  Download, Upload, Plus, Trash2, Edit3, Table2, Variable, Terminal,
  Send, Bot, User, FileText, Copy, ChevronDown, Languages,
  LayoutDashboard, Settings, LogOut, MoreHorizontal, Database,
  TrendingUp, PieChart, FileSpreadsheet, ClipboardList, PenLine, ShieldCheck,
  Mail, ExternalLink,
} from 'lucide-react'
import { UpdateBanner } from '@/components/update-banner'

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={stagger} className={className}>
      {children}
    </motion.div>
  )
}

/* ─── Statistical Engine ─── */
function calcStats(values: number[]) {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (nums.length === 0) return null
  const n = nums.length
  const sum = nums.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const sorted = [...nums].sort((a, b) => a - b)
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (n > 1 ? n - 1 : 1)
  const stddev = Math.sqrt(variance)
  const min = sorted[0]
  const max = sorted[n - 1]

  // Mode
  const freq: Record<number, number> = {}
  nums.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
  const maxFreq = Math.max(...Object.values(freq))
  const mode = nums.find(v => freq[v] === maxFreq)

  // Skewness
  const skewness = n > 2 ? (nums.reduce((a, b) => a + ((b - mean) / stddev) ** 3, 0) * n) / ((n - 1) * (n - 2)) : 0
  // Kurtosis
  const kurtosis = n > 3 ? (nums.reduce((a, b) => a + ((b - mean) / stddev) ** 4, 0) * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)) : 0

  // Percentiles
  const p25 = sorted[Math.floor(n * 0.25)]
  const p50 = sorted[Math.floor(n * 0.5)]
  const p75 = sorted[Math.floor(n * 0.75)]

  return { n, sum, mean, median, mode, variance, stddev, min, max, range: max - min, skewness, kurtosis, p25, p50, p75 }
}

function calcCorrelation(x: number[], y: number[]): { r: number; n: number } | null {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && typeof y[i] === 'number' && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]])
    }
  }
  if (pairs.length < 3) return null
  const n = pairs.length
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n
  const my = pairs.reduce((a, p) => a + p[1], 0) / n
  let num = 0, dx = 0, dy = 0
  for (const [px, py] of pairs) {
    num += (px - mx) * (py - my)
    dx += (px - mx) ** 2
    dy += (py - my) ** 2
  }
  const r = dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy)
  return { r, n }
}

function calcRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number; n: number } | null {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && typeof y[i] === 'number' && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]])
    }
  }
  if (pairs.length < 3) return null
  const n = pairs.length
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n
  const my = pairs.reduce((a, p) => a + p[1], 0) / n
  let num = 0, den = 0
  for (const [px, py] of pairs) {
    num += (px - mx) * (py - my)
    den += (px - mx) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  const intercept = my - slope * mx
  const ssRes = pairs.reduce((a, [px, py]) => a + (py - (slope * px + intercept)) ** 2, 0)
  const ssTot = pairs.reduce((a, [, py]) => a + (py - my) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2, n }
}

/* ─── MAIN PAGE ─── */
export default function Home() {
  const { t, locale, setLocale, dir } = useTranslation()
  const store = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [newVarDialogOpen, setNewVarDialogOpen] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarType, setNewVarType] = useState<'numeric' | 'string' | 'date' | 'currency'>('numeric')
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Scan & Fill state
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false)
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleNewProject = () => {
    if (!newProjectName.trim()) return
    store.createProject(newProjectName.trim())
    setNewProjectName('')
  }

  const handleImportCSV = () => {
    if (!importText.trim()) return
    store.importCSV(importText.trim())
    setImportDialogOpen(false)
    setImportText('')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      store.importCSV(text)
      setImportDialogOpen(false)
    }
    reader.readAsText(file)
  }

  const handleMobileWorkspace = () => {
    store.setView('workspace')
    setMobileOpen(false)
  }

  const handleExportCSV = () => {
    const csv = store.exportCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.currentProject?.name || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    store.addVariable({
      id: Date.now().toString(36),
      name: newVarName.trim(),
      type: newVarType,
      label: newVarName.trim(),
      width: 8,
      decimals: newVarType === 'numeric' ? 2 : 0,
      missing: '',
      values: {},
    })
    setNewVarName('')
    setNewVarDialogOpen(false)
  }

  const handleRunDescriptive = () => {
    const results: any[] = []
    for (const varName of store.selectedVariables) {
      const vals = (store.data[varName] || []).map(v => typeof v === 'string' ? parseFloat(v) : v)
      const stats = calcStats(vals as number[])
      if (stats) results.push({ variable: varName, ...stats })
    }
    if (results.length === 0) return
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.descriptive'),
      type: 'table',
      content: { headers: ['Variable', 'N', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Sum'], rows: results.map(r => [r.variable, r.n, r.mean?.toFixed(3), r.median, r.stddev?.toFixed(3), r.min, r.max, r.sum?.toFixed(2)]) },
      timestamp: new Date().toISOString(),
    })
    store.setWorkspaceTab('output')
  }

  const handleRunCorrelation = () => {
    if (store.selectedVariables.length < 2) return
    const vars = store.selectedVariables.slice(0, 5)
    const matrix: string[][] = [vars]
    for (const v1 of vars) {
      const row: string[] = [v1]
      for (const v2 of vars) {
        if (v1 === v2) { row.push('1.000'); continue }
        const x = (store.data[v1] || []).map(v => typeof v === 'string' ? parseFloat(v) : v) as number[]
        const y = (store.data[v2] || []).map(v => typeof v === 'string' ? parseFloat(v) : v) as number[]
        const result = calcCorrelation(x, y)
        row.push(result?.r.toFixed(3) ?? 'N/A')
      }
      matrix.push(row)
    }
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.correlation'),
      type: 'table',
      content: { headers: [''] , rows: matrix },
      timestamp: new Date().toISOString(),
    })
    store.setWorkspaceTab('output')
  }

  const handleRunRegression = () => {
    if (store.selectedVariables.length < 2) return
    const dv = store.selectedVariables[0]
    const iv = store.selectedVariables[1]
    const x = (store.data[iv] || []).map(v => typeof v === 'string' ? parseFloat(v) : v) as number[]
    const y = (store.data[dv] || []).map(v => typeof v === 'string' ? parseFloat(v) : v) as number[]
    const reg = calcRegression(x, y)
    const corr = calcCorrelation(x, y)
    if (!reg || !corr) return
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.regression') + ` (${dv} ~ ${iv})`,
      type: 'table',
      content: {
        headers: ['Statistic', 'Value'],
        rows: [
          ['Intercept', reg.intercept.toFixed(4)],
          ['Slope', reg.slope.toFixed(4)],
          ['R', corr.r.toFixed(4)],
          ['R²', reg.r2.toFixed(4)],
          ['N', String(reg.n)],
          ['Equation', `${dv} = ${reg.intercept.toFixed(2)} + ${reg.slope.toFixed(2)} × ${iv}`],
        ],
      },
      timestamp: new Date().toISOString(),
    })
    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: `Scatter Plot (${dv} vs ${iv})`,
      type: 'chart',
      content: { dv, iv, x: x.slice(0, 50), y: y.slice(0, 50), slope: reg.slope, intercept: reg.intercept },
      timestamp: new Date().toISOString(),
    })
    store.setWorkspaceTab('output')
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = { id: Date.now().toString(36), role: 'user' as const, content: chatInput.trim(), timestamp: new Date().toISOString() }
    store.addChatMessage(userMsg)
    setChatInput('')
    store.setAiTyping(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...store.chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          data: store.data,
          variables: store.variables,
        }),
      })
      const data = await res.json()
      const aiContent = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.'
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: aiContent, timestamp: new Date().toISOString() })
    } catch {
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: 'Network error. Please try again.', timestamp: new Date().toISOString() })
    }
    store.setAiTyping(false)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chatMessages, store.isAiTyping])

  const rowCount = store.variables.length > 0 ? Math.max(0, ...Object.values(store.data).map(a => a.length)) : 0

  // ─── Data for landing page ───
  const features = [
    { icon: Brain, title: t('feature.ai.title'), desc: t('feature.ai.desc') },
    { icon: WifiOff, title: t('feature.offline.title'), desc: t('feature.offline.desc') },
    { icon: RefreshCw, title: t('feature.updates.title'), desc: t('feature.updates.desc') },
    { icon: ScanLine, title: t('feature.ocr.title'), desc: t('feature.ocr.desc') },
    { icon: Globe, title: t('feature.language.title'), desc: t('feature.language.desc') },
    { icon: Users, title: t('feature.collab.title'), desc: t('feature.collab.desc') },
  ]

  const comparisonData = [
    { feature: t('comp.ai'), statmind: true, spss: false },
    { feature: t('comp.offline'), statmind: true, spss: false },
    { feature: t('comp.updates'), statmind: true, spss: false },
    { feature: t('comp.ocr'), statmind: true, spss: false },
    { feature: t('comp.natural'), statmind: true, spss: false },
    { feature: t('comp.collab'), statmind: true, spss: false },
    { feature: t('comp.steep'), statmind: false, spss: true },
    { feature: t('comp.expensive'), statmind: false, spss: true },
    { feature: t('comp.internet'), statmind: true, spss: false },
    { feature: t('comp.modern'), statmind: true, spss: false },
    { feature: t('comp.free'), statmind: true, spss: false },
    { feature: t('comp.hybrid'), statmind: true, spss: false },
  ]

  const pricingPlans = [
    { name: t('plan.free'), price: '$0', period: t('plan.month'), desc: t('plan.freeDesc'), features: [t('planFeature.datasets'), t('planFeature.basicAI'), t('planFeature.offline'), t('planFeature.basicImport'), t('planFeature.community')], cta: t('plan.cta'), highlighted: false },
    { name: t('plan.pro'), price: '$19', period: t('plan.month'), desc: t('plan.proDesc'), features: [t('planFeature.unlimited'), t('planFeature.advancedAI'), t('planFeature.ocr'), t('planFeature.exportFormats'), t('planFeature.priority'), t('planFeature.realtime')], cta: t('plan.cta'), highlighted: true },
    { name: t('plan.enterprise'), price: 'Custom', period: '', desc: t('plan.enterpriseDesc'), features: [t('planFeature.customAI'), t('planFeature.onpremise'), t('planFeature.api'), t('planFeature.dedicated'), t('planFeature.sla'), t('planFeature.team')], cta: t('plan.contactSales'), highlighted: false },
  ]

  /* ─── WORKSPACE VIEW → redirect to /workspace route ─── */
  if (store.view === 'workspace') {
    if (typeof window !== 'undefined') {
      window.location.href = '/workspace'
    }
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  /* ─── LANDING PAGE ─── */
  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold gradient-text">{t('brand.name')}</span>
          </button>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: t('nav.features'), href: '#features' },
              { label: t('nav.comparison'), href: '#comparison' },
              { label: t('nav.workspace'), href: '#demo' },
              { label: t('nav.pricing'), href: '#pricing' },
              { label: t('nav.about'), href: '/about' },
              { label: t('nav.security'), href: '/security' },
              { label: t('nav.company'), href: '/company' },
              { label: t('nav.updates'), href: '/updates' },
              { label: t('nav.tutorials'), href: '/tutorials' },
              { label: t('modules.title'), href: '/modules' },
            ].map((l) => (
              l.href.startsWith('/') ? (
                <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
              ) : (
                <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
              )
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-9 w-32 text-xs"><Globe className="size-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="rounded-full px-5" onClick={() => store.setView('workspace')}><ArrowRight className="size-4" /> {t('nav.workspace')}</Button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded" />{t('brand.name')}</SheetTitle></SheetHeader>
              <div className="flex flex-col gap-4 mt-8 px-4">
                <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                  <SelectTrigger className="h-9 text-xs"><Globe className="size-3.5 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
                </Select>
                {[
                  { label: t('nav.features'), href: '#features' },
                  { label: t('nav.comparison'), href: '#comparison' },
                  { label: t('nav.workspace'), href: '#demo' },
                  { label: t('nav.pricing'), href: '#pricing' },
                  { label: t('nav.about'), href: '/about' },
                  { label: t('nav.security'), href: '/security' },
                  { label: t('nav.company'), href: '/company' },
                  { label: t('nav.updates'), href: '/updates' },
                  { label: t('nav.tutorials'), href: '/tutorials' },
                  { label: t('modules.title'), href: '/modules' },
                ].map((l) => (
                  l.href.startsWith('/') ? (
                    <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2">{l.label}</Link>
                  ) : (
                    <button key={l.href} onClick={() => scrollTo(l.href)} className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2">{l.label}</button>
                  )
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col items-center">
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-6"><Sparkles className="size-3.5 text-primary" />{t('hero.badge')}</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1]">
              {t('hero.title1')} <span className="gradient-text">{t('hero.titleHighlight')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">{t('hero.subtitle')}</motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 mt-10">
              <Button size="lg" className="rounded-full px-8 text-base h-12" onClick={() => store.setView('workspace')}>{t('hero.cta1')} <ArrowRight className="size-4" /></Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 text-base h-12" onClick={() => scrollTo('#demo')}><Play className="size-4" />{t('hero.cta2')}</Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-14">
              {[{ l: t('hero.stat1'), i: Users }, { l: t('hero.stat2'), i: WifiOff }, { l: t('hero.stat3'), i: Brain }, { l: t('hero.stat4'), i: Zap }].map(s => (
                <div key={s.l} className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><s.i className="size-4 text-primary" />{s.l}</div>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} custom={5} className="mt-16 w-full max-w-4xl">
              <div className="glow-border rounded-2xl overflow-hidden border border-border/30">
                <Image src="/images/hero.png" alt="TheOneWayGDA Dashboard" width={1200} height={680} className="w-full h-auto" priority />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Star className="size-3.5 text-primary" />{t('features.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('features.title1')} <span className="gradient-text">{t('features.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('features.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div key={f.title} variants={fadeUp} custom={i}>
                  <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                    <CardHeader>
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors"><f.icon className="size-6 text-primary" /></div>
                      <CardTitle className="text-xl">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent><CardDescription className="text-base leading-relaxed">{f.desc}</CardDescription></CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><BarChart3 className="size-3.5 text-primary" />{t('comparison.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"><span className="gradient-text">{t('comparison.title1')}</span> {t('comparison.title2')}</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('comparison.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-border">
                        <TableHead className="text-base font-semibold pl-6 py-4 w-2/5">{t('comparison.feature')}</TableHead>
                        <TableHead className="text-base font-semibold py-4 text-center"><span className="gradient-text font-bold">{t('comparison.theway')}</span></TableHead>
                        <TableHead className="text-base font-semibold py-4 text-center text-muted-foreground">{t('comparison.spss')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row, i) => (
                        <TableRow key={row.feature} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                          <TableCell className="font-medium pl-6 py-3.5">{row.feature}</TableCell>
                          <TableCell className="py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center size-7 rounded-full ${row.statmind ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}><Check className="size-4" /></span>
                          </TableCell>
                          <TableCell className="py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center size-7 rounded-full ${row.spss ? 'bg-rose-500/10 text-rose-400' : 'bg-muted text-muted-foreground'}`}><Check className="size-4" /></span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Play className="size-3.5 text-primary" />{t('demo.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('demo.title1')} <span className="gradient-text">{t('demo.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('demo.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="overflow-hidden border-primary/20 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="border-b lg:border-b-0 lg:border-r border-border p-6">
                      <div className="flex items-center gap-2 mb-5"><div className="size-3 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm font-semibold text-emerald-400">{t('demo.session')}</span></div>
                      <div className="space-y-4">
                        {[
                          { role: 'user', text: 'Analyze the correlation between study hours and exam scores' },
                          { role: 'ai', text: `Running Pearson correlation... Found strong positive correlation (r=0.87, p<0.001). Generated scatter plot + regression model.` },
                          { role: 'user', text: 'Add a linear regression' },
                          { role: 'ai', text: 'Regression: Score = 12.3 + 7.8 × Hours. R² = 0.756, F(1,98) = 304.2, p < 0.001.' },
                        ].map((msg, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.4 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <div className="flex-shrink-0 size-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1"><Brain className="size-4 text-primary" /></div>}
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>{msg.text}{i === 3 && <span className="inline-block w-2 h-4 ml-1 bg-current/60 animate-pulse rounded-sm" />}</div>
                            {msg.role === 'user' && <div className="flex-shrink-0 size-8 rounded-lg bg-accent/20 flex items-center justify-center mt-1"><User className="size-4 text-accent" /></div>}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-5"><BarChart3 className="size-4 text-primary" /><span className="text-sm font-semibold">{t('demo.chart')}</span></div>
                        <div className="rounded-xl bg-muted/50 border border-border/50 p-4 aspect-[4/3]">
                          <svg viewBox="0 0 400 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            {[0, 1, 2, 3, 4].map(i => <line key={`h${i}`} x1="50" y1={40 + i * 52} x2="380" y2={40 + i * 52} stroke="currentColor" strokeOpacity="0.06" />)}
                            <line x1="50" y1="250" x2="380" y2="250" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                            <line x1="50" y1="40" x2="50" y2="250" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                            <line x1="50" y1="230" x2="380" y2="55" stroke="oklch(0.72 0.15 175)" strokeWidth="2" strokeDasharray="6 3" opacity="0.7" />
                            {[[65, 225], [95, 198], [125, 175], [155, 158], [182, 135], [210, 118], [235, 105], [260, 90], [288, 75], [315, 60], [345, 50], [80, 210], [138, 165], [195, 128], [248, 95], [300, 72], [340, 55], [110, 190], [168, 145], [220, 112], [270, 88], [320, 65], [150, 170], [200, 130], [250, 100], [300, 72], [350, 52]].map((p, i) => (
                              <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="oklch(0.62 0.22 262.881)" opacity="0.6">
                                <animate attributeName="opacity" values="0.4;0.8;0.4" dur={`${3 + (i % 5) * 0.5}s`} repeatCount="indefinite" />
                              </circle>
                            ))}
                          </svg>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {[{ label: t('demo.r2'), cls: 'border-primary/30 bg-primary/5' }, { label: t('demo.pvalue'), cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' }, { label: t('demo.nsample'), cls: 'border-accent/30 bg-accent/5' }].map(b => (
                          <Badge key={b.label} variant="outline" className={`rounded-lg px-3 py-1.5 text-sm ${b.cls}`}>{b.label}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Zap className="size-3.5 text-primary" />{t('pricing.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('pricing.title1')} <span className="gradient-text">{t('pricing.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('pricing.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <motion.div key={plan.name} variants={fadeUp} custom={i} className={plan.highlighted ? 'md:-mt-4' : ''}>
                  <Card className={`h-full relative flex flex-col ${plan.highlighted ? 'border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20' : ''}`}>
                    {plan.highlighted && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2"><Badge className="rounded-full px-4 py-1 bg-primary text-primary-foreground shadow-md shadow-primary/20">{t('pricing.popular')}</Badge></div>}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-muted-foreground">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1 mt-2"><span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>{plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}</div>
                      <CardDescription className="mt-2">{plan.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1"><ul className="space-y-3 mt-2">{plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-400 flex-shrink-0" /><span className="text-muted-foreground">{f}</span></li>)}</ul></CardContent>
                    <CardFooter><Button className={`w-full rounded-full ${plan.highlighted ? '' : ''}`} variant={plan.highlighted ? 'default' : 'outline'} onClick={() => store.setView('workspace')}>{plan.cta} <ChevronRight className="size-4" /></Button></CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4"><Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded-lg" /><span className="text-lg font-bold gradient-text">{t('brand.name')}</span></div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{t('footer.desc')}</p>
            </div>
            {[{ title: t('footer.product'), links: [t('nav.features'), t('nav.pricing')] }, { title: t('footer.resources'), links: ['Documentation', 'API', 'Community'] }, { title: t('footer.company'), links: [t('footer.about'), t('footer.blog'), t('footer.contact')] }].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">{col.links.map(l => <li key={l}><button className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</button></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">GDPR · SOC 2 · ISO 27001 · HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <a href="mailto:msad41855@gmail.com" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Mail className="size-3.5" /> msad41855@gmail.com
              </a>
              <span className="text-muted-foreground">|</span>
              <a href="https://www.linkedin.com/in/mohammed-essadek-549a17229" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="size-3.5" /> LinkedIn
              </a>
            </div>
          </div>
          <div className="mt-4 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.about')}</Link>
              <Link href="/company" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.company')}</Link>
              <Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.security')}</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
              <Link href="/modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('modules.title')}</Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
