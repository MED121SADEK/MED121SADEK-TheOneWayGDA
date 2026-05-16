'use client'
import { useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useModuleRegistry, APP_VERSION } from '@/lib/modules'
import { checkForUpdates } from '@/lib/update-checker'
import type { ModuleUpdate } from '@/lib/modules'
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
  RefreshCw, Package, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Download, Cpu as ModuleIcon, Puzzle, Info,
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } }) }
const stagger = { visible: { transition: { staggerChildren: 0.06 } } }

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

export default function UpdatesPage() {
  const { t, dir } = useTranslation()
  const registry = useModuleRegistry()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null)
  const [updateTab, setUpdateTab] = useState<'changelog' | 'modules'>('changelog')

  const handleCheckForUpdates = useCallback(async () => {
    registry.setChecking(true)
    try {
      const updates = await checkForUpdates(registry.modules)
      registry.setPendingUpdates(updates)
      registry.setLastChecked(new Date().toISOString())
    } catch {
      // Silently handle
    }
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

      {/* Hero Section with Version Badge */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
                <Info className="size-3 mr-1.5" />
                {t('modules.appVersion')} v{APP_VERSION}
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-extrabold">
              <span className="gradient-text">{t('updates.title')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
              {t('modules.installed')}: {activeModules}/{totalModules} {t('modules.enabled')}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-6 flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleCheckForUpdates}
                disabled={registry.isChecking}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
              >
                <RefreshCw className={`size-4 mr-2 ${registry.isChecking ? 'animate-spin' : ''}`} />
                {registry.isChecking ? t('modules.checking') : t('modules.checkUpdates')}
              </Button>
              {updateCount > 0 && (
                <Button variant="outline" onClick={() => setUpdateTab('modules')}>
                  <Download className="size-4 mr-2" />
                  {t('modules.updateAll')} ({updateCount})
                </Button>
              )}
            </motion.div>
            {registry.lastChecked && (
              <motion.p variants={fadeUp} custom={4} className="mt-3 text-xs text-muted-foreground">
                {t('modules.lastUpdated')}: {new Date(registry.lastChecked).toLocaleString()}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="border-b border-border/50 bg-card/30 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
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

      {/* Changelog Tab */}
      {updateTab === 'changelog' && (
        <>
          {/* Category Filters */}
          <section className="py-6 border-b border-border/50 bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex gap-2 mb-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('updates.search')}
                    className="pl-9 h-9 text-xs"
                  />
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

          {/* Update Notifications */}
          {updateCount > 0 && (
            <section className="py-6 border-b border-border/50">
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">{updateCount} {t('modules.updatesAvailable')}</h3>
                </div>
                <div className="space-y-3">
                  {registry.pendingUpdates.map((update: ModuleUpdate) => (
                    <UpdateNotificationCard
                      key={update.moduleId}
                      update={update}
                      expanded={expandedUpdate === update.moduleId}
                      onToggle={() => setExpandedUpdate(expandedUpdate === update.moduleId ? null : update.moduleId)}
                      onApply={() => registry.updateModuleVersion(update.moduleId, update.latestVersion)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Updates List */}
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

          {/* Technology Radar */}
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

      {/* Modules Tab */}
      {updateTab === 'modules' && (
        <section className="py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            {/* Stats Row */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div variants={fadeUp}>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Puzzle className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{totalModules}</p>
                      <p className="text-[10px] text-muted-foreground">{t('modules.totalModules')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp} custom={1}>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{activeModules}</p>
                      <p className="text-[10px] text-muted-foreground">{t('modules.activeModules')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp} custom={2}>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <RefreshCw className="size-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{updateCount}</p>
                      <p className="text-[10px] text-muted-foreground">{t('modules.updatesAvailable')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp} custom={3}>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Info className="size-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">v{APP_VERSION}</p>
                      <p className="text-[10px] text-muted-foreground">{t('modules.appVersion')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            {/* Modules Grid */}
            <div className="space-y-3">
              {registry.modules.map((mod, idx) => {
                const hasUpdate = registry.pendingUpdates.some(u => u.moduleId === mod.id)
                const updateInfo = registry.pendingUpdates.find(u => u.moduleId === mod.id)
                const catColor = CATEGORY_COLORS[mod.category] || 'bg-muted text-muted-foreground border-border'

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.4 }}
                  >
                    <Card className={`hover:border-primary/30 transition-all duration-300 ${hasUpdate ? 'border-amber-500/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Module Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor}`}>
                            <ModuleIcon className="size-5" />
                          </div>

                          {/* Module Info */}
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
                              {hasUpdate && (
                                <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  <RefreshCw className="size-2.5 mr-1" />
                                  v{updateInfo?.latestVersion}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed truncate">{t(mod.descriptionKey) || mod.description}</p>
                            {mod.dependencies && mod.dependencies.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {t('modules.dependencies')}: {mod.dependencies.join(', ')}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {hasUpdate && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                                onClick={() => registry.updateModuleVersion(mod.id, updateInfo!.latestVersion)}
                              >
                                <Download className="size-3 mr-1" />
                                {t('modules.updateAll').replace(' All', '')}
                              </Button>
                            )}
                            <Switch
                              checked={mod.enabled}
                              onCheckedChange={(checked) => checked ? registry.enableModule(mod.id) : registry.disableModule(mod.id)}
                            />
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

/* ─── Update Notification Card ─── */
function UpdateNotificationCard({
  update,
  expanded,
  onToggle,
  onApply,
  t,
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
              {update.critical ? (
                <AlertTriangle className="size-4" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-sm">{update.moduleName}</h4>
                <Badge variant="outline" className={`text-[10px] ${priorityColor}`}>
                  {t(`modules.${update.priority}`)}
                </Badge>
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
              <Download className="size-3 mr-1" />
              {t('modules.updateAll').replace(' All', '')}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggle}>
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-border/50"
          >
            <p className="text-xs font-medium mb-1.5">{t('modules.changelog')}</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 leading-relaxed">
              {update.changelog}
            </pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
