'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Search,
  Puzzle,
  Download,
  Star,
  Users,
  ExternalLink,
  Code2,
  BarChart3,
  Database,
  FileText,
  Zap,
  Plug,
  Brain,
  Settings,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ─── Types ─── */
interface Extension {
  id: string
  name: string
  description: string
  type: 'visualization' | 'data_source' | 'statistical' | 'export' | 'integration' | 'ai_model'
  author: string
  version: string
  status: 'official' | 'community' | 'beta'
  apiVersion: string
  hooks: string[]
  config: Record<string, string>
  installs: number
  rating: number
  isInstalled: boolean
  createdAt: string
}

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={stagger} className={className}>
      {children}
    </motion.div>
  )
}

/* ─── Config ─── */
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  visualization: { icon: BarChart3, color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-600/5 border-violet-500/20' },
  data_source: { icon: Database, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20' },
  statistical: { icon: Brain, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' },
  export: { icon: FileText, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/5 border-amber-500/20' },
  integration: { icon: Plug, color: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-600/5 border-sky-500/20' },
  ai_model: { icon: Zap, color: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-600/5 border-rose-500/20' },
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  official: { label: 'Official', color: 'bg-primary/15 text-primary border-primary/25' },
  community: { label: 'Community', color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  beta: { label: 'Beta', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
}

export default function ExtensionsPage() {
  const { dir } = useTranslation()
  const { toast } = useToast()

  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedExt, setSelectedExt] = useState<Extension | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchExtensions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/extensions')
      const data = await res.json()
      setExtensions(data.extensions || [])
    } catch {
      console.error('Failed to fetch extensions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExtensions() }, [fetchExtensions])

  /* Filter */
  const filtered = extensions.filter((e) => {
    const matchesSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || e.type === typeFilter
    return matchesSearch && matchesType
  })

  const types = [...new Set(extensions.map((e) => e.type))]

  /* Install/Uninstall */
  const handleToggleInstall = (ext: Extension) => {
    setExtensions((prev) =>
      prev.map((e) =>
        e.id === ext.id ? { ...e, isInstalled: !e.isInstalled, installs: e.isInstalled ? e.installs - 1 : e.installs + 1 } : e
      )
    )
    toast({
      title: ext.isInstalled ? 'Extension removed' : 'Extension installed',
      description: `"${ext.name}" has been ${ext.isInstalled ? 'uninstalled' : 'installed'} successfully.`,
    })
    if (selectedExt?.id === ext.id) {
      setSelectedExt({ ...ext, isInstalled: !ext.isInstalled })
    }
  }

  const openDetail = (ext: Extension) => {
    setSelectedExt(ext)
    setDetailOpen(true)
  }

  /* Stats */
  const installedCount = extensions.filter((e) => e.isInstalled).length
  const totalInstalls = extensions.reduce((sum, e) => sum + e.installs, 0)

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Extension Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <Puzzle className="size-3" />
              {installedCount} Installed
            </Badge>
            <Link href="/ai/sdk">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <Code2 className="size-3.5" />
                <span className="hidden sm:inline">SDK Docs</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="hero-gradient rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/5 pointer-events-none" />
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10">
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-emerald-500/30 bg-emerald-500/5 mb-4">
                <Puzzle className="size-3.5 text-emerald-400 me-1.5" />
                Open Ecosystem
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-premium">Extension Marketplace</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Extend the platform with powerful integrations, custom visualizations, statistical packages, and AI models.
              Install community-built extensions or build your own with the SDK.
            </motion.p>
          </motion.div>
        </section>

        {/* Search + Filter */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search extensions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AnimatedSection>

        {/* Stats */}
        <AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Extensions', value: extensions.length, icon: Puzzle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Installed', value: installedCount, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Total Installs', value: totalInstalls.toLocaleString(), icon: Download, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'API Hooks', value: [...new Set(extensions.flatMap((e) => e.hooks))].length, icon: Settings, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i}>
                <Card className="card-premium p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`size-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* Extensions Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Browse Extensions</h2>
            <Badge variant="outline" className="text-xs text-muted-foreground">{filtered.length} extensions</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((ext, idx) => {
                  const typeConfig = TYPE_CONFIG[ext.type] || TYPE_CONFIG.visualization
                  const TypeIcon = typeConfig.icon
                  const statusBadge = STATUS_BADGE[ext.status] || STATUS_BADGE.community

                  return (
                    <motion.div key={ext.id} variants={fadeUp} custom={Math.min(idx, 15)}>
                      <Card className={`card-premium h-full bg-gradient-to-br ${typeConfig.gradient} border backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${typeConfig.gradient.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                              <TypeIcon className={`size-5 ${typeConfig.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">{ext.name}</CardTitle>
                                <Badge variant="outline" className={`text-[9px] ${statusBadge.color}`}>{statusBadge.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-muted-foreground">v{ext.version}</span>
                                <span className="text-[10px] text-muted-foreground">{ext.author}</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Star className="size-2.5 text-amber-400 fill-amber-400" />{ext.rating}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-3">
                          <p className="text-xs text-muted-foreground line-clamp-2">{ext.description}</p>

                          {/* Hooks */}
                          <div className="flex flex-wrap gap-1">
                            {ext.hooks.map((hook) => (
                              <Badge key={hook} variant="secondary" className="text-[9px] font-mono">{hook}</Badge>
                            ))}
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Download className="size-2.5" />{ext.installs.toLocaleString()}</span>
                            <span>API v{ext.apiVersion}</span>
                          </div>

                          <Separator />

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className={`flex-1 h-8 text-xs gap-1.5 ${ext.isInstalled ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''}`}
                              variant={ext.isInstalled ? 'secondary' : 'default'}
                              onClick={() => handleToggleInstall(ext)}
                            >
                              {ext.isInstalled ? <><CheckCircle2 className="size-3" />Installed</> : <><Download className="size-3" />Install</>}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => openDetail(ext)}>
                              <ExternalLink className="size-3" />
                              Details
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
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedExt && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  {(() => { const T = TYPE_CONFIG[selectedExt.type] || TYPE_CONFIG.visualization; return <T.icon className={`size-5 ${T.color}`} /> })()}
                  {selectedExt.name}
                </DialogTitle>
                <DialogDescription>{selectedExt.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Version', value: `v${selectedExt.version}` },
                    { label: 'Status', value: STATUS_BADGE[selectedExt.status]?.label || selectedExt.status },
                    { label: 'Installs', value: selectedExt.installs.toLocaleString() },
                    { label: 'Rating', value: `${selectedExt.rating}/5` },
                    { label: 'API Version', value: `v${selectedExt.apiVersion}` },
                    { label: 'Author', value: selectedExt.author },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-muted/30 border border-border/30 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-xs font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2">Hooks</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExt.hooks.map((hook) => (
                      <Badge key={hook} variant="outline" className="text-[10px] font-mono">{hook}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold mb-2">Configuration</h4>
                  <div className="rounded-lg bg-muted/20 border border-border/30 p-3 font-mono text-[10px] text-muted-foreground space-y-1">
                    {Object.entries(selectedExt.config).map(([k, v]) => (
                      <div key={k}><span className="text-foreground/70">{k}</span>: {v}</div>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  variant={selectedExt.isInstalled ? 'secondary' : 'default'}
                  onClick={() => { handleToggleInstall(selectedExt); setDetailOpen(false) }}
                >
                  {selectedExt.isInstalled ? <><CheckCircle2 className="size-4" />Uninstall</> : <><Download className="size-4" />Install Extension</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
