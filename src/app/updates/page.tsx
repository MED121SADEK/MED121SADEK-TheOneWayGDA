'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useModuleRegistry, APP_VERSION } from '@/lib/modules'
import { checkForUpdates } from '@/lib/update-checker'
import type { ModuleUpdate } from '@/lib/modules'
import { AI_COMPANIES, COMPANY_CATEGORIES, getCompaniesByFilter } from '@/lib/ai-companies'
import type { AICompany } from '@/lib/ai-companies'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Search, Brain, Shield, Sparkles, Layout, Zap, Cpu, Code, AlertTriangle,
  RefreshCw, Package, CheckCircle2, ChevronDown, ChevronUp,
  Download, Cpu as ModuleIcon, Puzzle, Info,
  ExternalLink, Newspaper, Globe, Building2, TrendingUp, Clock, Filter, Rss,
  Flame, Bot, Video, ImageIcon, Music, Wrench, BarChart3, Target, Microscope,
  Landmark, Gamepad2, PenTool,
} from 'lucide-react'

/* ─── Animation helpers ─── */
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } }) }
const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }

/* ─── Types ─── */
interface NewsItem {
  id?: string
  title: string
  snippet: string
  url: string
  hostName: string
  date: string
  favicon?: string
  relevanceScore?: number
  category?: string
  matchedCompanies?: { id: string; name: string; logo: string; region: string; category: string }[]
}

/* ─── News Category Config ─── */
const NEWS_CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  'Foundation Models': { icon: Brain, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Foundation Models' },
  'AI Agents': { icon: Bot, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'AI Agents' },
  'AI Assistants': { icon: Target, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'AI Assistants' },
  'AI Video': { icon: Video, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', label: 'AI Video' },
  'AI Image': { icon: ImageIcon, color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', label: 'AI Image' },
  'AI Audio': { icon: Music, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'AI Audio' },
  'AI Developer Tools': { icon: Wrench, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', label: 'Dev Tools' },
  'AI Frameworks': { icon: Code, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'Frameworks' },
  'AI Hardware': { icon: Cpu, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Hardware' },
  'AI Search': { icon: Search, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'AI Search' },
  'Enterprise AI': { icon: BarChart3, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Enterprise' },
  'AI Research': { icon: Microscope, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', label: 'Research' },
  'Funding': { icon: Landmark, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Funding' },
  'AI News': { icon: Newspaper, color: 'bg-muted text-muted-foreground border-border', label: 'General' },
}

/* ─── Changelog data (unchanged) ─── */
const UPDATES = [
  { id: 1, version: 'v2.4.0', date: '2026-04-18', category: 'ai', title: 'GLM-4.6V Vision Model', desc: 'Upgraded OCR engine with state-of-the-art vision AI for 40% better form recognition accuracy.' },
  { id: 2, version: 'v2.4.0', date: '2026-04-18', category: 'features', title: 'Batch OCR Processing', desc: 'Upload and process 100+ scanned documents in a single batch operation.' },
  { id: 3, version: 'v2.3.2', date: '2026-04-10', category: 'security', title: 'SOC 2 Type II Audit', desc: 'Completed SOC 2 Type II audit with zero findings. Security posture strengthened.' },
  { id: 4, version: 'v2.3.1', date: '2026-04-05', category: 'stats', title: 'Bayesian Analysis Module', desc: 'New Bayesian inference methods including MCMC sampling and posterior analysis.' },
  { id: 5, version: 'v2.3.0', date: '2026-03-28', category: 'uiux', title: 'Redesigned Variable View', desc: 'Complete overhaul of variable view with inline editing and drag-drop reordering.' },
  { id: 6, version: 'v2.2.0', date: '2026-03-15', category: 'ai', title: 'AI Chat Context Memory', desc: 'AI assistant now remembers conversation context across sessions within a project.' },
  { id: 7, version: 'v2.1.0', date: '2026-03-01', category: 'stats', title: 'Mixed-Effects Models', desc: 'Support for linear mixed-effects models with random intercepts and slopes.' },
  { id: 8, version: 'v2.1.0', date: '2026-03-01', category: 'stats', title: 'Robust Standard Errors', desc: 'HC0-HC4 robust standard errors for heteroscedasticity-consistent inference.' },
  { id: 9, version: 'v2.0.0', date: '2026-02-20', category: 'features', title: '8-Language Support', desc: 'Full interface translation for AR, EN, FR, ES, DE, ZH, JA, RU with RTL support.' },
  { id: 10, version: 'v2.0.0', date: '2026-02-20', category: 'performance', title: '50MB Dataset Support', desc: 'Optimized rendering engine for smooth scrolling with datasets up to 50MB.' },
  { id: 11, version: 'v1.9.0', date: '2026-02-10', category: 'security', title: 'Zero-Knowledge Encryption', desc: 'Implemented zero-knowledge architecture. Data encrypted before leaving browser.' },
  { id: 12, version: 'v1.8.0', date: '2026-01-25', category: 'ai', title: 'Smart Data Cleaning', desc: 'AI-powered cleaning: typo correction, outlier detection, missing value imputation.' },
]

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'ai', label: 'AI Models', icon: Brain, color: 'bg-purple-500/10 text-purple-400' },
  { key: 'stats', label: 'Statistical Methods', icon: Cpu, color: 'bg-cyan-500/10 text-cyan-400' },
  { key: 'security', label: 'Security', icon: Shield, color: 'bg-emerald-500/10 text-emerald-400' },
  { key: 'uiux', label: 'UI/UX', icon: Layout, color: 'bg-amber-500/10 text-amber-400' },
  { key: 'features', label: 'New Features', icon: Sparkles, color: 'bg-teal-500/10 text-teal-400' },
  { key: 'performance', label: 'Performance', icon: Zap, color: 'bg-rose-500/10 text-rose-400' },
]

const RADAR = [
  { zone: 'Adopt', color: 'bg-emerald-500/10 border-emerald-500/20', items: ['GLM-4.6V Vision', 'AES-256 Encryption', 'Zustand State Management'] },
  { zone: 'Trial', color: 'bg-cyan-500/10 border-cyan-500/20', items: ['Bayesian Analysis', 'Mixed-Effects Models', 'Real-time Collaboration'] },
  { zone: 'Assess', color: 'bg-amber-500/10 border-amber-500/20', items: ['Natural Language SQL', 'Automated Report Generation', '3D Visualization'] },
  { zone: 'Hold', color: 'bg-rose-500/10 border-rose-500/20', items: ['Blockchain Audit Trail', 'Quantum Computing Tests'] },
]

const CATEGORY_COLORS: Record<string, string> = {
  statistical: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ai: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  visualization: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  integration: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  ui: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  recommended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  optional: 'bg-muted text-muted-foreground border-border',
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function UpdatesPage() {
  const { t, dir } = useTranslation()
  const registry = useModuleRegistry()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null)
  const [updateTab, setUpdateTab] = useState<'news' | 'changelog' | 'modules'>('news')

  /* ─── Module update checker ─── */
  const handleCheckForUpdates = useCallback(async () => {
    registry.setChecking(true)
    try {
      const updates = await checkForUpdates(registry.modules)
      registry.setPendingUpdates(updates)
      registry.setLastChecked(new Date().toISOString())
    } catch { /* silent */ }
    registry.setChecking(false)
  }, [registry])

  const filteredUpdates = UPDATES.filter(u => {
    if (filter !== 'all' && u.category !== filter) return false
    if (search && !u.title.toLowerCase().includes(search.toLowerCase()) && !u.desc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalModules = registry.modules.length
  const activeModules = registry.modules.filter(m => m.enabled).length
  const updateCount = registry.pendingUpdates.length

  return (
    <div className="min-h-screen" dir={dir}>
      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <div className="flex items-center gap-2">
            {updateCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                {updateCount} {t('modules.updatesAvailable')}
              </Badge>
            )}
            <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-gradient py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
                <Rss className="size-3 mr-1.5" />
                AI News Hub &amp; Platform Updates
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold">
              <span className="gradient-text">Updates &amp; AI News</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
              Track the latest AI model releases, tool updates, and industry news from {AI_COMPANIES.length}+ companies worldwide. Auto-refreshed 3 times daily with 50+ source queries.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Tab Navigation ── */}
      <section className="border-b border-border/50 bg-card/30 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          <Button
            variant={updateTab === 'news' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setUpdateTab('news')}
          >
            <Newspaper className="size-3.5 mr-1.5" />
            AI News Hub
          </Button>
          <Button
            variant={updateTab === 'changelog' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setUpdateTab('changelog')}
          >
            <Code className="size-3.5 mr-1.5" />
            {t('updates.title')}
          </Button>
          <Button
            variant={updateTab === 'modules' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setUpdateTab('modules')}
          >
            <Package className="size-3.5 mr-1.5" />
            {t('modules.title')}
            {updateCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5">{updateCount}</Badge>
            )}
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TAB: AI NEWS HUB
          ═══════════════════════════════════════════════════ */}
      {updateTab === 'news' && <AINewsHub />}

      {/* ═══════════════════════════════════════════════════
          TAB: CHANGELOG
          ═══════════════════════════════════════════════════ */}
      {updateTab === 'changelog' && (
        <>
          <section className="py-6 border-b border-border/50 bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex gap-2 mb-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('updates.search')} className="pl-9 h-9 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(c => (
                  <Button key={c.key} variant={filter === c.key ? 'default' : 'outline'} size="sm" className="text-xs whitespace-nowrap" onClick={() => setFilter(c.key)}>
                    {filter === c.key && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground mr-1.5" />}
                    {c.key === 'all' ? 'All' : c.label}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          {updateCount > 0 && (
            <section className="py-6 border-b border-border/50">
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">{updateCount} {t('modules.updatesAvailable')}</h3>
                </div>
                <div className="space-y-3">
                  {registry.pendingUpdates.map((update: ModuleUpdate) => (
                    <UpdateNotificationCard key={update.moduleId} update={update} expanded={expandedUpdate === update.moduleId}
                      onToggle={() => setExpandedUpdate(expandedUpdate === update.moduleId ? null : update.moduleId)}
                      onApply={() => registry.updateModuleVersion(update.moduleId, update.latestVersion)} t={t} />
                  ))}
                </div>
              </div>
            </section>
          )}
          <section className="py-8">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                {filteredUpdates.map((u, i) => {
                  const cat = CATEGORIES.find(c => c.key === u.category)
                  return (
                    <motion.div key={u.id} variants={fadeUp} custom={Math.min(i, 8)}>
                      <Card className="hover:border-primary/30 transition-all duration-300">
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {cat && <Badge variant="outline" className={`text-[10px] ${cat.color}`}>{cat.label}</Badge>}
                            <Badge variant="outline" className="text-[10px]">{u.version}</Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">{u.date}</span>
                          </div>
                          <h3 className="font-semibold text-sm">{u.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{u.desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
                {filteredUpdates.length === 0 && <p className="text-center text-muted-foreground py-12">No updates found.</p>}
              </motion.div>
            </div>
          </section>
          <section className="py-16 bg-muted/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-10">{t('updates.technologyRadar')}</motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {RADAR.map((zone, i) => (
                    <motion.div key={zone.zone} variants={fadeUp} custom={i}>
                      <div className={`rounded-xl border p-4 ${zone.color}`}>
                        <h3 className="font-semibold text-sm mb-3">{zone.zone}</h3>
                        <ul className="space-y-2">{zone.items.map((item, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-current/30 flex-shrink-0" />{item}</li>
                        ))}</ul>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: MODULES
          ═══════════════════════════════════════════════════ */}
      {updateTab === 'modules' && (
        <section className="py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Puzzle, label: t('modules.totalModules'), value: totalModules, color: 'primary' },
                { icon: CheckCircle2, label: t('modules.activeModules'), value: activeModules, color: 'emerald' },
                { icon: RefreshCw, label: t('modules.updatesAvailable'), value: updateCount, color: 'amber' },
                { icon: Info, label: t('modules.appVersion'), value: `v${APP_VERSION}`, color: 'cyan' },
              ].map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} custom={i}>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                        <stat.icon className={`size-4 text-${stat.color}-400`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <div className="space-y-3">
              {registry.modules.map((mod, idx) => {
                const hasUpdate = registry.pendingUpdates.some(u => u.moduleId === mod.id)
                const updateInfo = registry.pendingUpdates.find(u => u.moduleId === mod.id)
                const catColor = CATEGORY_COLORS[mod.category] || 'bg-muted text-muted-foreground border-border'
                return (
                  <motion.div key={mod.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.4 }}>
                    <Card className={`hover:border-primary/30 transition-all duration-300 ${hasUpdate ? 'border-amber-500/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor}`}>
                            <ModuleIcon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{t(mod.nameKey) || mod.name}</h3>
                              <Badge variant="outline" className="text-[10px]">{mod.version}</Badge>
                              <Badge variant="outline" className={`text-[10px] ${catColor}`}>{t(`modules.category${mod.category.charAt(0).toUpperCase() + mod.category.slice(1)}`) || mod.category}</Badge>
                              {mod.enabled ? (
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{t('modules.enabled')}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('modules.disabled')}</Badge>
                              )}
                              {hasUpdate && <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20"><RefreshCw className="size-2.5 mr-1" />v{updateInfo?.latestVersion}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed truncate">{t(mod.descriptionKey) || mod.description}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {hasUpdate && (
                              <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" onClick={() => registry.updateModuleVersion(mod.id, updateInfo!.latestVersion)}>
                                <Download className="size-3 mr-1" />{t('modules.updateAll').replace(' All', '')}
                              </Button>
                            )}
                            <Switch checked={mod.enabled} onCheckedChange={(checked) => checked ? registry.enableModule(mod.id) : registry.disableModule(mod.id)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   AI NEWS HUB COMPONENT — REDESIGNED
   ═══════════════════════════════════════════════════════ */
function AINewsHub() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lastFetch, setLastFetch] = useState<string>('')
  const [totalStored, setTotalStored] = useState(0)
  const [newsCategories, setNewsCategories] = useState<string[]>([])
  const [newsCompanies, setNewsCompanies] = useState<{ id: string; name: string; logo: string; region: string; category: string }[]>([])
  const [viewMode, setViewMode] = useState<'all' | 'trending'>('all')
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNews = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (forceRefresh) params.set('refresh', 'true')
      params.set('limit', '50')
      if (companyFilter !== 'all') params.set('company', companyFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/community/news?${params}`)
      const data = await res.json()
      if (data.news) {
        setNews(data.news)
        setLastFetch(data.fetchedAt || new Date().toISOString())
        setTotalStored(data.totalStored || 0)
        if (data.companies) setNewsCompanies(data.companies)
        if (data.categories) setNewsCategories(data.categories)
      }
      if (!res.ok) setError(data.error || 'Failed to fetch news')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [companyFilter, categoryFilter])

  // Initial fetch + auto-refresh every 20 minutes (reduced from 30 for more timely updates)
  useEffect(() => {
    fetchNews(true)
    refreshTimer.current = setInterval(() => fetchNews(false), 20 * 60 * 1000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [fetchNews])

  // Filter news
  const filteredNews = news.filter(item => {
    if (companyFilter !== 'all') {
      const hasCompany = item.matchedCompanies?.some(c =>
        c.id === companyFilter || c.name.toLowerCase().includes(companyFilter.toLowerCase())
      )
      if (!hasCompany) return false
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
    }
    return true
  })

  // Trending news: top 10 by relevance score
  const trendingNews = [...news].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 10)

  // Company spotlight data
  const usCompanies = AI_COMPANIES.filter(c => c.region === 'us')
  const asiaCompanies = AI_COMPANIES.filter(c => c.region === 'asia')
  const europeCompanies = AI_COMPANIES.filter(c => c.region === 'europe')

  // Stats
  const displayNews = viewMode === 'trending' ? trendingNews : filteredNews

  return (
    <>
      {/* ── Stats Bar ── */}
      <section className="py-4 border-b border-border/50 bg-muted/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Newspaper className="size-3.5 text-primary" />
            <span><strong className="text-foreground">{news.length}</strong> articles loaded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="size-3.5 text-amber-400" />
            <span><strong className="text-foreground">{AI_COMPANIES.length}</strong> companies tracked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Search className="size-3.5 text-blue-400" />
            <span><strong className="text-foreground">50+</strong> source queries</span>
          </div>
          {totalStored > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-emerald-400" />
              <span><strong className="text-foreground">{totalStored}</strong> stored in DB</span>
            </div>
          )}
          {lastFetch && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="size-3.5" />
              <span>Last updated: {new Date(lastFetch).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── View Toggle: All vs Trending ── */}
      <section className="py-3 border-b border-border/50 bg-muted/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                viewMode === 'all'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Newspaper className="size-3 inline mr-1" />
              All News ({news.length})
            </button>
            <button
              onClick={() => setViewMode('trending')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                viewMode === 'trending'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Flame className="size-3 inline mr-1" />
              Trending ({trendingNews.length})
            </button>
          </div>
          <Button
            onClick={() => fetchNews(true)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {/* ── Search + Category + Company Filters ── */}
      <section className="py-4 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search AI news, companies, tools..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* News Category Filters */}
          {newsCategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                All Categories
              </button>
              {newsCategories.map(cat => {
                const config = NEWS_CATEGORY_CONFIG[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                      categoryFilter === cat
                        ? (config?.color || 'bg-primary/15 text-primary border border-primary/30')
                        : 'bg-muted/20 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    {config && <config.icon className="size-2.5" />}
                    {cat}
                  </button>
                )
              })}
            </div>
          )}

          {/* Company / Region Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {COMPANY_CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCompanyFilter(cat.key); if (cat.key !== 'all') setCategoryFilter('all') }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                  companyFilter === cat.key
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <span className="text-border/50 mx-1">|</span>
            {COMPANY_CATEGORIES.slice(5, 12).map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCompanyFilter(cat.key); setCategoryFilter('all') }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                  companyFilter === cat.key
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Quick Cards (visible only in 'all' mode) ── */}
      {viewMode === 'all' && trendingNews.length > 3 && (
        <section className="py-5 border-b border-border/50 bg-gradient-to-r from-orange-500/5 via-red-500/5 to-purple-500/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="size-4 text-orange-400" />
              <h2 className="text-sm font-semibold">Trending Now</h2>
              <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-400 border-orange-500/20">Top Stories</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendingNews.slice(0, 6).map((item, i) => (
                <motion.a
                  key={item.url || i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="group"
                >
                  <Card className="h-full hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300">
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="text-lg font-bold text-orange-400/40 flex-shrink-0 w-5 text-right">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-semibold line-clamp-2 group-hover:text-orange-300 transition-colors leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {item.category && (
                              <Badge variant="outline" className={`text-[8px] px-1 py-0 ${NEWS_CATEGORY_CONFIG[item.category]?.color || ''}`}>
                                {item.category}
                              </Badge>
                            )}
                            {item.matchedCompanies?.slice(0, 2).map(c => (
                              <span key={c.id} className="text-[9px] text-muted-foreground">
                                {c.logo} {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── News Feed ── */}
      <section className="py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Loading State */}
          {loading && news.length === 0 && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="size-6 text-red-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchNews(true)}>
                <RefreshCw className="size-3.5 mr-1.5" />Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayNews.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">No matching news found</p>
              <p className="text-xs text-muted-foreground">Try changing your search or filter</p>
            </div>
          )}

          {/* News Cards */}
          {!loading && displayNews.length > 0 && (
            <div className="space-y-3">
              {displayNews.map((item, i) => {
                const catConfig = item.category ? NEWS_CATEGORY_CONFIG[item.category] : null
                return (
                  <motion.div
                    key={item.url || i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
                  >
                    <Card className="hover:border-primary/30 transition-all duration-300 group">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-sm hover:text-primary transition-colors leading-snug line-clamp-2 group-hover:underline decoration-primary/40"
                            >
                              {item.title}
                              <ExternalLink className="size-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>

                            {/* Snippet */}
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                              {item.snippet}
                            </p>

                            {/* Meta: category badge, source, date, companies */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              {/* Category Badge */}
                              {item.category && catConfig && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 ${catConfig.color}`}
                                >
                                  <catConfig.icon className="size-2.5 mr-0.5" />
                                  {item.category}
                                </Badge>
                              )}

                              {/* Source */}
                              {item.hostName && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Globe className="size-2.5" />
                                  {item.hostName}
                                </span>
                              )}

                              {/* Date */}
                              {item.date && (
                                <span className="text-[10px] text-muted-foreground">
                                  {typeof item.date === 'string' && item.date.includes('T')
                                    ? new Date(item.date).toLocaleDateString()
                                    : item.date}
                                </span>
                              )}

                              {/* Relevance Score Indicator */}
                              {item.relevanceScore !== undefined && item.relevanceScore >= 8 && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                  <Flame className="size-2 mr-0.5" />
                                  Hot
                                </Badge>
                              )}

                              {/* Company Tags */}
                              {item.matchedCompanies && item.matchedCompanies.length > 0 && (
                                <div className="flex flex-wrap gap-1 ml-1">
                                  {item.matchedCompanies.slice(0, 4).map(c => (
                                    <Badge
                                      key={c.id}
                                      variant="outline"
                                      className={`text-[9px] px-1.5 py-0 border-border/50 ${
                                        c.region === 'us' ? 'bg-blue-500/5 text-blue-400' :
                                        c.region === 'asia' ? 'bg-orange-500/5 text-orange-400' :
                                        'bg-purple-500/5 text-purple-400'
                                      }`}
                                    >
                                      <span className="mr-0.5">{c.logo}</span>
                                      {c.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Relevance indicator bar */}
                          {item.relevanceScore !== undefined && item.relevanceScore >= 5 && (
                            <div className="flex-shrink-0 hidden sm:block">
                              <div
                                className={`w-2 h-10 rounded-full ${
                                  item.relevanceScore >= 15 ? 'bg-emerald-400' :
                                  item.relevanceScore >= 10 ? 'bg-emerald-400/70' :
                                  item.relevanceScore >= 8 ? 'bg-primary' :
                                  item.relevanceScore >= 5 ? 'bg-amber-400' :
                                  'bg-muted'
                                }`}
                                title={`Relevance: ${item.relevanceScore}`}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Results count */}
          {!loading && displayNews.length > 0 && (
            <div className="text-center py-4">
              <p className="text-[10px] text-muted-foreground">
                Showing {displayNews.length} of {news.length} articles
                {viewMode === 'trending' && ' (sorted by relevance)'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Company Spotlight ── */}
      <section className="py-12 bg-muted/20 border-t border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Global AI Companies Database
              <Badge variant="outline" className="text-[10px] ml-1">{AI_COMPANIES.length} tracked</Badge>
            </h2>
          </div>

          {/* Country breakdown badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { flag: '🇺🇸', label: 'USA', count: usCompanies.length },
              { flag: '🇨🇳', label: 'China', count: AI_COMPANIES.filter(c => c.country === 'China').length },
              { flag: '🇮🇳', label: 'India', count: AI_COMPANIES.filter(c => c.country === 'India').length },
              { flag: '🇯🇵', label: 'Japan', count: AI_COMPANIES.filter(c => c.country === 'Japan').length },
              { flag: '🇰🇷', label: 'S. Korea', count: AI_COMPANIES.filter(c => c.country === 'South Korea').length },
              { flag: '🇸🇬', label: 'Singapore', count: AI_COMPANIES.filter(c => c.country === 'Singapore').length },
              { flag: '🇪🇺', label: 'Europe', count: europeCompanies.length },
              { flag: '🇦🇪', label: 'UAE', count: AI_COMPANIES.filter(c => c.country === 'UAE').length },
              { flag: '🇮🇩', label: 'Indonesia', count: AI_COMPANIES.filter(c => c.country === 'Indonesia').length },
            ].map(c => (
              <Badge key={c.label} variant="outline" className="text-[10px] bg-muted/30">
                {c.flag} {c.label}: <strong className="ml-0.5">{c.count}</strong>
              </Badge>
            ))}
          </div>

          {/* Region: US */}
          <CompanyRegion title="🇺🇸 United States — American AI Companies" companies={usCompanies} />
          <Separator className="my-6" />
          {/* Region: Asia */}
          <CompanyRegion title="🌏 Asia — Chinese, Indian, Japanese, Korean & Southeast Asian AI" companies={asiaCompanies} />
          {europeCompanies.length > 0 && (
            <>
              <Separator className="my-6" />
              <CompanyRegion title="🇪🇺 Europe — European AI Companies" companies={europeCompanies} />
            </>
          )}
        </div>
      </section>
    </>
  )
}

/* ─── Company Region Grid ─── */
function CompanyRegion({ title, companies }: { title: string; companies: AICompany[] }) {
  const [showAll, setShowAll] = useState(false)
  const [categoryView, setCategoryView] = useState<string | null>(null)
  const visible = showAll ? companies : companies.slice(0, 12)

  // Group by category
  const categoryGroups = companies.reduce<Record<string, AICompany[]>>((acc, c) => {
    const cat = c.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  const displayCompanies = categoryView
    ? categoryGroups[categoryView] || []
    : visible

  const categories = Object.keys(categoryGroups).sort((a, b) => categoryGroups[b].length - categoryGroups[a].length)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{title} ({companies.length})</h3>
        {!categoryView && (
          <div className="flex gap-1 overflow-x-auto">
            {categories.slice(0, 6).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryView(cat)}
                className="px-2 py-0.5 rounded text-[9px] bg-muted/30 text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {cat} ({categoryGroups[cat].length})
              </button>
            ))}
          </div>
        )}
      </div>
      {categoryView && (
        <button
          onClick={() => setCategoryView(null)}
          className="text-[10px] text-primary hover:underline mb-2 flex items-center gap-1"
        >
          <ArrowLeft className="size-3" /> Back to all
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {displayCompanies.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/50 border border-border/30 hover:border-primary/20 transition-all"
          >
            <span className="text-lg flex-shrink-0">{c.logo}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{c.name}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-muted-foreground truncate">{c.specialty.split(',')[0]}</p>
              </div>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {c.products.slice(0, 3).map(p => (
                  <span key={p} className="text-[8px] px-1 py-0 rounded bg-muted/50 text-muted-foreground">{p}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!categoryView && companies.length > 12 && !showAll && (
        <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setShowAll(true)}>
          +{companies.length - 12} more companies
        </Button>
      )}
    </div>
  )
}

/* ─── Update Notification Card (unchanged) ─── */
function UpdateNotificationCard({
  update, expanded, onToggle, onApply, t,
}: {
  update: ModuleUpdate
  expanded: boolean
  onToggle: () => void
  onApply: () => void
  t: (key: string) => string
}) {
  const priorityColor = PRIORITY_COLORS[update.priority] || PRIORITY_COLORS.optional
  return (
    <Card className={`border ${priorityColor} transition-all duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${priorityColor}`}>
              {update.critical ? <AlertTriangle className="size-4" /> : <RefreshCw className="size-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-sm">{update.moduleName}</h4>
                <Badge variant="outline" className={`text-[10px] ${priorityColor}`}>{t(`modules.${update.priority}`)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                v{update.currentVersion} → v{update.latestVersion}
                <span className="mx-2">•</span>
                <span>{update.releaseDate}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" className="h-7 text-xs" onClick={onApply}>
              <Download className="size-3 mr-1" />{t('modules.updateAll').replace(' All', '')}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggle}>
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium mb-1.5">{t('modules.changelog')}</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 leading-relaxed">{update.changelog}</pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
