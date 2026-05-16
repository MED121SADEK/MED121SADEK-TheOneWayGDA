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

  /* ─── WORKSPACE VIEW ─── */
  if (store.view === 'workspace') {
    return (
      <div className="h-screen flex flex-col" dir={dir}>
        {/* Update Notification Banner */}
        <UpdateBanner />
        {/* Workspace Navbar */}
        <nav className="h-12 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => store.setView('landing')} className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="The One-Way" width={28} height={28} className="rounded" />
              <span className="font-bold gradient-text text-sm hidden sm:inline">{t('brand.name')}</span>
            </button>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm font-medium text-muted-foreground truncate max-w-48">{store.currentProject?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language */}
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <Languages className="size-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localeNames.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Save */}
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { store.saveProject() }}>
              <Save className="size-3.5" /> {t('workspace.save')}
            </Button>
            {/* Share */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <Share2 className="size-3.5" /> {t('workspace.share')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('share.title')}</DialogTitle><DialogDescription>{t('share.description')}</DialogDescription></DialogHeader>
                <div className="flex gap-2">
                  <Input placeholder={t('share.email')} value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
                  <Button onClick={() => setShareEmail('')}>{t('share.addEmail')}</Button>
                </div>
                <Separator />
                <div><p className="text-sm font-medium mb-2">{t('share.link')}</p>
                  <div className="flex gap-2"><Input readOnly value={shareLink || `https://theoneway.app/share/${store.currentProject?.id}`} /><Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`https://theoneway.app/share/${store.currentProject?.id}`) }}><Copy className="size-3.5" /> {t('share.copyLink')}</Button></div>
                </div>
                <DialogFooter><Button onClick={() => setShareDialogOpen(false)}>{t('workspace.close')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Scan & Fill */}
            <Dialog open={scanDialogOpen} onOpenChange={(open) => { setScanDialogOpen(open); if (!open) { setScanFile(null); setScanPreview(null); setEditedFields({}) } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                  <ScanLine className="size-3.5" /> {t('scan.title')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><ScanLine className="size-5 text-teal-500" />{t('scan.title')}</DialogTitle><DialogDescription>{t('scan.batchDesc')}</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  {/* Upload area */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${scanFile ? 'border-teal-400 bg-teal-50/50' : 'border-border hover:border-teal-300 hover:bg-muted/30'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setScanFile(f); const reader = new FileReader(); reader.onload = (ev) => setScanPreview(ev.target?.result as string); reader.readAsDataURL(f) }
                    }} />
                    {store.scanState === 'processing' ? (
                      <div className="flex flex-col items-center gap-2"><div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /><p className="text-sm text-muted-foreground">{t('scan.processing')}</p></div>
                    ) : scanPreview ? (
                      <div className="flex flex-col items-center gap-2"><img src={scanPreview} alt="Preview" className="max-h-48 rounded-lg shadow-sm" /><p className="text-xs text-muted-foreground">{scanFile?.name}</p></div>
                    ) : (
                      <><Upload className="size-8 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">{t('scan.dragDrop')}</p><p className="text-xs text-muted-foreground mt-1">{t('scan.supportedFormats')}</p></>
                    )}
                  </div>
                  {/* Batch upload */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => batchInputRef.current?.click()}><FolderOpen className="size-3.5" />{t('scan.batch')}</Button>
                    <input ref={batchInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={async (e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(f => store.addToBatchQueue({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: f.name, status: 'pending' }))
                    }} />
                    {store.batchQueue.length > 0 && <span className="text-xs text-muted-foreground">{store.batchQueue.length} files queued</span>}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={!scanFile || store.scanState === 'processing'} onClick={async () => {
                      if (!scanFile) return
                      store.setScanState('processing')
                      const formData = new FormData()
                      formData.append('file', scanFile)
                      try {
                        const res = await fetch('/api/scan', { method: 'POST', body: formData })
                        const data = await res.json()
                        if (data.fields || data.tables) {
                          store.setScanResults({ fields: data.fields || [], tables: data.tables || [], rawText: data.rawText || '', summary: data.summary || '' })
                        } else if (data.error) {
                          store.setScanState('error')
                        }
                      } catch { store.setScanState('error') }
                    }}>{store.scanState === 'processing' ? t('scan.processing') : t('scan.title')}</Button>
                    {store.scanState === 'done' && store.scanResults && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { store.importScanResults(store.scanResults!); setScanDialogOpen(false) }}><Check className="size-3.5" />{t('scan.approve')}</Button>
                    )}
                  </div>
                  {/* Results */}
                  {store.scanState === 'done' && store.scanResults && (
                    <div className="space-y-4">
                      {store.scanResults.summary && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{store.scanResults.summary}</p>}
                      {/* Extracted fields */}
                      {store.scanResults.fields.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2">{t('scan.extracted')} ({store.scanResults.fields.length})</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {store.scanResults.fields.map((f: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                                <Badge variant="outline" className="text-[10px] w-16 justify-center shrink-0">{f.type || 'text'}</Badge>
                                <span className="text-xs font-medium w-28 truncate">{f.label}</span>
                                <input className="flex-1 text-xs bg-background border rounded px-2 py-1" value={editedFields[f.label] ?? f.value} onChange={e => setEditedFields(p => ({ ...p, [f.label]: e.target.value }))} />
                                <Badge variant={f.confidence > 0.8 ? 'default' : 'secondary'} className={`text-[10px] ${f.confidence > 0.8 ? 'bg-emerald-500 text-white' : f.confidence > 0.5 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>{Math.round((f.confidence || 0.5) * 100)}%</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Tables */}
                      {store.scanResults.tables.map((tbl: any, ti: number) => (
                        <div key={ti}>
                          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Table2 className="size-3" />{t('scan.tableDetected')} - {tbl.rows.length} {t('scan.rowsExtracted')}</p>
                          <div className="overflow-x-auto max-h-40 overflow-y-auto border rounded-lg">
                            <table className="w-full text-xs border-collapse">
                              <thead className="sticky top-0 bg-muted/80"><tr>{tbl.headers.map((h: string, hi: number) => <th key={hi} className="border px-2 py-1 text-left font-medium bg-muted/60">{h}</th>)}</tr></thead>
                              <tbody>{tbl.rows.slice(0, 20).map((row: string[], ri: number) => <tr key={ri} className="hover:bg-muted/30">{row.map((cell: string, ci: number) => <td key={ci} className="border px-2 py-1">{cell}</td>)}</tr>)}</tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Scan history */}
                  {store.scanHistory.length > 0 && (
                    <div><p className="text-xs font-semibold mb-2">{t('scan.history')}</p><div className="space-y-1 max-h-24 overflow-y-auto">{store.scanHistory.slice(-5).reverse().map((s: any, i: number) => <div key={i} className="text-xs text-muted-foreground bg-muted/30 rounded p-1.5">{s.summary || `${s.fields.length} fields, ${s.tables.length} tables`}</div>)}</div></div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8 text-xs"><Download className="size-3.5" /> {t('workspace.export')} <ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="size-4" /> CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { const json = store.exportJSON(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'project.json'; a.click() }}><FileText className="size-4" /> JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Analysis */}
          <aside className="w-56 border-r border-border/50 bg-card/50 flex flex-col flex-shrink-0 overflow-y-auto hidden md:flex">
            <div className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('workspace.analysis')}</p>
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunDescriptive} disabled={store.selectedVariables.length === 0}><BarChart3 className="size-3.5 mr-2" />{t('analysis.descriptive')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunCorrelation} disabled={store.selectedVariables.length < 2}><TrendingUp className="size-3.5 mr-2" />{t('analysis.correlation')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunRegression} disabled={store.selectedVariables.length < 2}><PieChart className="size-3.5 mr-2" />{t('analysis.regression')}</Button>
                <Separator className="my-2" />
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><ClipboardList className="size-3.5 mr-2" />{t('analysis.frequencies')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><Table2 className="size-3.5 mr-2" />{t('analysis.crosstabs')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><FileText className="size-3.5 mr-2" />{t('analysis.ttest')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><Database className="size-3.5 mr-2" />{t('analysis.anova')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><BarChart3 className="size-3.5 mr-2" />{t('analysis.chisquare')}</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled><PenLine className="size-3.5 mr-2" />{t('analysis.nonparametric')}</Button>
              </div>
            </div>
            <div className="p-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('scan.title')}</p>
              <div className="space-y-1">
                <Dialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length === 0}><Sparkles className="size-3.5 mr-2 text-teal-500" />{t('clean.title')}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-teal-500" />{t('clean.title')}</DialogTitle><DialogDescription>AI-powered data cleaning and normalization</DialogDescription></DialogHeader>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={store.variables.length === 0} onClick={async () => {
                      const res = await fetch('/api/clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: store.data, variables: store.variables }) })
                      const result = await res.json()
                      if (result.cleanedData) {
                        store.setData(result.cleanedData)
                        store.setCleaningStats(result.stats)
                        store.addSyntax(`DATA CLEANING: ${result.stats.totalRows} rows processed, ${result.stats.cleanedCells} cells cleaned, ${result.stats.outliers} outliers detected, ${result.stats.duplicates} duplicates found, ${result.stats.missing} missing imputed`)
                        store.addOutput({ id: Date.now().toString(36), title: t('clean.title'), type: 'table', content: { headers: ['Metric', 'Value'], rows: [['Rows Processed', result.stats.totalRows], ['Cells Cleaned', result.stats.cleanedCells], ['Outliers Detected', result.stats.outliers], ['Duplicates Found', result.stats.duplicates], ['Missing Imputed', result.stats.missing]] }, timestamp: new Date().toISOString() })
                      }
                    }}>{t('clean.start')}</Button>
                    {store.cleaningStats && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-600">{store.cleaningStats.cleanedCells}</p><p className="text-[10px] text-muted-foreground">{t('clean.fixes')}</p></div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-amber-600">{store.cleaningStats.outliers}</p><p className="text-[10px] text-muted-foreground">{t('clean.outliers')}</p></div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-red-600">{store.cleaningStats.duplicates}</p><p className="text-[10px] text-muted-foreground">{t('clean.duplicates')}</p></div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length === 0}><Check className="size-3.5 mr-2 text-emerald-500" />{t('validate.title')}</Button></DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Check className="size-5 text-emerald-500" />{t('validate.title')}</DialogTitle><DialogDescription>Smart data validation with AI-powered suggestions</DialogDescription></DialogHeader>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={store.variables.length === 0} onClick={async () => {
                      const res = await fetch('/api/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: store.data, variables: store.variables }) })
                      const result = await res.json()
                      store.setValidationIssues(result.issues || [])
                      if (result.valid) {
                        store.addOutput({ id: Date.now().toString(36), title: t('clean.validated'), type: 'text', content: 'All data passed validation checks.', timestamp: new Date().toISOString() })
                      }
                    }}>{t('validate.start')}</Button>
                    {store.validationIssues && store.validationIssues.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <div className="flex gap-2 text-xs mb-2">
                          <Badge className="bg-red-100 text-red-700 border-red-200">{store.validationIssues.filter((i: any) => i.severity === 'error').length} {t('validate.errors')}</Badge>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">{store.validationIssues.filter((i: any) => i.severity === 'warning').length} {t('validate.warnings')}</Badge>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {store.validationIssues.slice(0, 50).map((issue: any, i: number) => (
                            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${issue.severity === 'error' ? 'bg-red-50 border border-red-100' : issue.severity === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
                              <span className="font-medium shrink-0">Row {issue.row}:</span>
                              <div><p className="font-medium\">{issue.message}</p><p className="text-muted-foreground">{issue.suggestion}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {store.validationIssues && store.validationIssues.length === 0 && (
                      <div className="text-center py-4"><Check className="size-8 mx-auto text-emerald-500 mb-2" /><p className="text-sm text-muted-foreground">{t('validate.noIssues')}</p></div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="mt-auto p-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('workspace.import')}</p>
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full text-xs h-8"><Upload className="size-3.5 mr-1" />CSV</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t('import.title')}</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground">{t('import.supportedFormats')}</p>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('import.dragDrop')}</p>
                    <input type="file" accept=".csv,.xlsx,.json" onChange={handleFileUpload} className="mt-3 text-xs" />
                  </div>
                  <Textarea placeholder="Or paste CSV data here..." value={importText} onChange={e => setImportText(e.target.value)} className="h-32 text-xs font-mono" />
                  <DialogFooter><Button onClick={handleImportCSV}>{t('workspace.import')}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="h-10 border-b border-border/50 flex items-center px-2 gap-1 flex-shrink-0 bg-card/30">
              {[
                { key: 'data' as const, icon: Table2, label: t('workspace.dataView') },
                { key: 'variables' as const, icon: Variable, label: t('workspace.variableView') },
                { key: 'output' as const, icon: BarChart3, label: t('workspace.output') },
                { key: 'syntax' as const, icon: Terminal, label: t('workspace.syntax') },
              ].map(tab => (
                <button key={tab.key} onClick={() => store.setWorkspaceTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${store.workspaceTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  <tab.icon className="size-3.5" />{tab.label}
                </button>
              ))}
              <div className="flex-1" />
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => store.addRow()}><Plus className="size-3" />{t('workspace.newProject')}</Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
              {/* DATA VIEW */}
              {store.workspaceTab === 'data' && (
                <div className="overflow-auto h-full">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="border border-border/50 px-2 py-1.5 text-left text-muted-foreground font-medium w-12 bg-muted/60">#</th>
                        {store.variables.map(v => (
                          <th key={v.id} className={`border border-border/50 px-2 py-1.5 text-left font-medium min-w-[100px] ${store.selectedVariables.includes(v.name) ? 'bg-primary/10 text-primary' : 'bg-muted/60'}`}>
                            <button className="flex items-center gap-1" onClick={() => store.toggleVariableSelection(v.name)}>
                              {store.selectedVariables.includes(v.name) && <Check className="size-3" />}
                              {v.name}
                            </button>
                          </th>
                        ))}
                        <th className="border border-border/50 px-1 py-1.5 w-8 bg-muted/60">
                          <Dialog open={newVarDialogOpen} onOpenChange={setNewVarDialogOpen}>
                            <DialogTrigger asChild><button><Plus className="size-3" /></button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>{t('workspace.newProject')}</DialogTitle></DialogHeader>
                              <div className="space-y-3">
                                <div><p className="text-xs font-medium mb-1">Name</p><Input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="variable_name" className="text-sm" /></div>
                                <div><p className="text-xs font-medium mb-1">Type</p>
                                  <Select value={newVarType} onValueChange={(v: any) => setNewVarType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="numeric">{t('var.numeric')}</SelectItem>
                                      <SelectItem value="string">{t('var.string')}</SelectItem>
                                      <SelectItem value="date">{t('var.date')}</SelectItem>
                                      <SelectItem value="currency">{t('var.currency')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter><Button onClick={handleAddVariable}>{t('workspace.confirm')}</Button></DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(rowCount, 1) }, (_, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-muted/30">
                          <td className="border border-border/50 px-2 py-1 text-muted-foreground">{rowIdx + 1}</td>
                          {store.variables.map(v => (
                            <td key={v.id} className="border border-border/50 px-1 py-0.5">
                              <input type="text" value={store.data[v.name]?.[rowIdx] ?? '' ?? ''} onChange={e => store.setCellValue(v.name, rowIdx, v.type === 'numeric' ? (parseFloat(e.target.value) || e.target.value) : e.target.value)}
                                className="w-full px-1 py-1 bg-transparent text-xs outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded" />
                            </td>
                          ))}
                          <td className="border border-border/50 px-1 py-0.5 text-center text-muted-foreground">
                            <button onClick={() => store.deleteRow(rowIdx)} className="hover:text-destructive"><Trash2 className="size-3" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VARIABLE VIEW */}
              {store.workspaceTab === 'variables' && (
                <div className="overflow-auto h-full">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        {['Name', 'Type', 'Label', 'Width', 'Decimals', 'Missing', 'Values'].map(h => (
                          <th key={h} className="border border-border/50 px-3 py-2 text-left font-medium bg-muted/60">{h}</th>
                        ))}
                        <th className="border border-border/50 px-2 py-2 w-10 bg-muted/60"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.variables.map(v => (
                        <tr key={v.id} className="hover:bg-muted/30">
                          <td className="border border-border/50 px-3 py-1.5 font-medium">{v.name}</td>
                          <td className="border border-border/50 px-3 py-1.5"><Badge variant="outline" className="text-[10px] px-1.5">{v.type}</Badge></td>
                          <td className="border border-border/50 px-3 py-1.5"><input value={v.label} onChange={e => store.updateVariable(v.id, { label: e.target.value })} className="w-full bg-transparent text-xs outline-none" /></td>
                          <td className="border border-border/50 px-3 py-1.5"><input type="number" value={v.width} onChange={e => store.updateVariable(v.id, { width: parseInt(e.target.value) || 8 })} className="w-12 bg-transparent text-xs outline-none" /></td>
                          <td className="border border-border/50 px-3 py-1.5"><input type="number" value={v.decimals} onChange={e => store.updateVariable(v.id, { decimals: parseInt(e.target.value) || 0 })} className="w-12 bg-transparent text-xs outline-none" /></td>
                          <td className="border border-border/50 px-3 py-1.5"><input value={v.missing} onChange={e => store.updateVariable(v.id, { missing: e.target.value })} className="w-full bg-transparent text-xs outline-none" /></td>
                          <td className="border border-border/50 px-3 py-1.5 text-muted-foreground">{Object.keys(v.values).length}</td>
                          <td className="border border-border/50 px-2 py-1.5 text-center"><button onClick={() => store.deleteVariable(v.id)} className="hover:text-destructive"><Trash2 className="size-3" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* OUTPUT VIEW */}
              {store.workspaceTab === 'output' && (
                <div className="p-4 space-y-4 overflow-auto h-full">
                  {store.outputs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <BarChart3 className="size-12 mb-3 opacity-30" />
                      <p className="text-sm">{t('output.noOutput')}</p>
                    </div>
                  )}
                  {store.outputs.map(out => (
                    <Card key={out.id} className="overflow-hidden">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{out.title}</CardTitle>
                          <span className="text-[10px] text-muted-foreground">{new Date(out.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {out.type === 'table' && out.content?.rows && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr>{out.content.headers.map((h: string, i: number) => <th key={i} className="border border-border/50 px-3 py-1.5 text-left font-medium bg-muted/50">{h}</th>)}</tr>
                              </thead>
                              <tbody>
                                {out.content.rows.map((row: string[], ri: number) => (
                                  <tr key={ri} className="hover:bg-muted/30">
                                    {row.map((cell: string, ci: number) => <td key={ci} className="border border-border/50 px-3 py-1.5">{cell}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {out.type === 'chart' && out.content && (
                          <div className="bg-muted/30 rounded-lg p-4">
                            <svg viewBox="0 0 400 250" className="w-full h-auto max-h-64">
                              <line x1="50" y1="220" x2="380" y2="220" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                              <line x1="50" y1="30" x2="50" y2="220" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                              {out.content.slope != null && (
                                <line x1="50" y1={220 - (out.content.intercept + out.content.slope * 0) * 2} x2="380" y2={220 - (out.content.intercept + out.content.slope * 10) * 2}
                                  stroke="oklch(0.72 0.15 175)" strokeWidth="2" strokeDasharray="6 3" opacity="0.7" />
                              )}
                              {(out.content.x || []).map((x: number, i: number) => {
                                const px = 50 + (x / 10) * 330
                                const py = 220 - ((out.content.y?.[i] || 0) / 100) * 180
                                return <circle key={i} cx={px} cy={Math.max(10, Math.min(220, py))} r="4" fill="oklch(0.62 0.22 262.881)" opacity="0.7" />
                              })}
                              <text x="200" y="245" textAnchor="middle" className="fill-muted-foreground" fontSize="11">{out.content.iv || 'X'}</text>
                              <text x="15" y="130" textAnchor="middle" className="fill-muted-foreground" fontSize="11" transform="rotate(-90,15,130)">{out.content.dv || 'Y'}</text>
                            </svg>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* SYNTAX VIEW */}
              {store.workspaceTab === 'syntax' && (
                <div className="p-4 font-mono text-xs text-muted-foreground space-y-1 overflow-auto h-full">
                  <p className="text-foreground font-medium mb-3">* Syntax History</p>
                  {store.syntaxHistory.length === 0 && <p>No syntax recorded yet.</p>}
                  {store.syntaxHistory.map((s, i) => <p key={i} className="py-1">{s}</p>)}
                </div>
              )}
            </div>
          </main>

          {/* Right Panel - AI Assistant */}
          <aside className="w-80 border-l border-border/50 bg-card/30 flex flex-col flex-shrink-0 hidden lg:flex">
            <div className="p-3 border-b border-border/50 flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold">{t('workspace.aiAssistant')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {store.chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="size-10 mb-2 text-primary/50" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('ai.welcome')}</p>
                </div>
              )}
              {store.chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && <div className="flex-shrink-0 size-6 rounded-md bg-primary/10 flex items-center justify-center"><Bot className="size-3 text-primary" /></div>}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-md'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && <div className="flex-shrink-0 size-6 rounded-md bg-accent/20 flex items-center justify-center"><User className="size-3 text-accent" /></div>}
                </div>
              ))}
              {store.isAiTyping && (
                <div className="flex gap-2 items-center"><div className="size-6 rounded-md bg-primary/10 flex items-center justify-center"><Bot className="size-3 text-primary" /></div><div className="bg-muted rounded-xl px-3 py-2 text-xs"><span className="animate-pulse">{t('ai.thinking')}</span></div></div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-border/50">
              <div className="flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t('ai.placeholder')} className="text-xs h-8" onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()} />
                <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendChat} disabled={store.isAiTyping}><Send className="size-3.5" /></Button>
              </div>
            </div>
          </aside>
        </div>
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
            <Image src="/images/logo.png" alt="The One-Way" width={40} height={40} className="rounded-lg" />
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
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Image src="/images/logo.png" alt="The One-Way" width={28} height={28} className="rounded" />{t('brand.name')}</SheetTitle></SheetHeader>
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
                <Image src="/images/hero.png" alt="The One-Way Dashboard" width={1200} height={680} className="w-full h-auto" priority />
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
              <div className="flex items-center gap-2 mb-4"><Image src="/images/logo.png" alt="The One-Way" width={32} height={32} className="rounded-lg" /><span className="text-lg font-bold gradient-text">{t('brand.name')}</span></div>
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
