'use client'

import { useState, useRef } from 'react'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Cpu,
  Brain,
  ScanLine,
  Sparkles,
  BarChart3,
  PieChart,
  Shield,
  Globe,
  Package,
  CheckCircle,
  RefreshCw,
  Settings,
  ArrowLeft,
} from 'lucide-react'

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}
const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ─── Module Type ─── */
interface ModuleItem {
  id: string
  nameKey: string
  descKey: string
  icon: React.ElementType
  version: string
  categoryKey: string
  priorityKey: 'critical' | 'recommended' | 'optional'
  enabled: boolean
  type: 'system' | 'plugin'
}

/* ─── Category Color Map ─── */
const CATEGORY_COLORS: Record<string, string> = {
  categoryStatistical: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  categoryAi: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  categoryVisualization: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  categoryIntegration: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  categoryUi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  recommended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  optional: 'bg-muted text-muted-foreground border-border',
}

const ICON_COLORS: Record<string, string> = {
  statistical: 'bg-cyan-500/10 text-cyan-400',
  ai: 'bg-purple-500/10 text-purple-400',
  visualization: 'bg-amber-500/10 text-amber-400',
  integration: 'bg-teal-500/10 text-teal-400',
  ui: 'bg-emerald-500/10 text-emerald-400',
}

/* ─── Animated Section Wrapper ─── */
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

/* ─── Page Component ─── */
export default function ModulesPage() {
  const { t, dir } = useTranslation()
  const [filter, setFilter] = useState<'all' | 'system' | 'plugin'>('all')

  /* ─── Module Definitions ─── */
  const modules: ModuleItem[] = [
    {
      id: 'core-statistical-engine',
      nameKey: 'modules.coreStatisticalEngine',
      descKey: 'modules.coreStatisticalEngineDesc',
      icon: Cpu,
      version: '2.4.0',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'critical',
      enabled: true,
      type: 'system',
    },
    {
      id: 'ai-assistant',
      nameKey: 'modules.aiAssistant',
      descKey: 'modules.aiAssistantDesc',
      icon: Brain,
      version: '2.4.0',
      categoryKey: 'modules.categoryAi',
      priorityKey: 'critical',
      enabled: true,
      type: 'system',
    },
    {
      id: 'ocr-document-scanner',
      nameKey: 'modules.ocrScanner',
      descKey: 'modules.ocrScannerDesc',
      icon: ScanLine,
      version: '2.4.0',
      categoryKey: 'modules.categoryAi',
      priorityKey: 'recommended',
      enabled: true,
      type: 'plugin',
    },
    {
      id: 'data-cleaning-engine',
      nameKey: 'modules.dataCleaningEngine',
      descKey: 'modules.dataCleaningEngineDesc',
      icon: Sparkles,
      version: '2.3.2',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'recommended',
      enabled: true,
      type: 'plugin',
    },
    {
      id: 'correlation-matrix',
      nameKey: 'modules.correlationMatrix',
      descKey: 'modules.correlationMatrixDesc',
      icon: BarChart3,
      version: '2.3.0',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'critical',
      enabled: true,
      type: 'plugin',
    },
    {
      id: 'linear-regression',
      nameKey: 'modules.linearRegression',
      descKey: 'modules.linearRegressionDesc',
      icon: PieChart,
      version: '2.3.0',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'critical',
      enabled: true,
      type: 'plugin',
    },
    {
      id: 'descriptive-statistics',
      nameKey: 'modules.descriptiveStatistics',
      descKey: 'modules.descriptiveStatisticsDesc',
      icon: CheckCircle,
      version: '2.2.0',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'critical',
      enabled: true,
      type: 'plugin',
    },
    {
      id: 'data-validation',
      nameKey: 'modules.dataValidation',
      descKey: 'modules.dataValidationDesc',
      icon: Shield,
      version: '2.1.0',
      categoryKey: 'modules.categoryStatistical',
      priorityKey: 'recommended',
      enabled: true,
      type: 'system',
    },
    {
      id: 'multi-language-support',
      nameKey: 'modules.multilanguageSupport',
      descKey: 'modules.multilanguageSupportDesc',
      icon: Globe,
      version: '2.0.0',
      categoryKey: 'modules.categoryUi',
      priorityKey: 'critical',
      enabled: true,
      type: 'system',
    },
    {
      id: 'export-system',
      nameKey: 'modules.exportSystem',
      descKey: 'modules.exportSystemDesc',
      icon: Package,
      version: '2.0.0',
      categoryKey: 'modules.categoryIntegration',
      priorityKey: 'recommended',
      enabled: true,
      type: 'system',
    },
  ]

  const filteredModules =
    filter === 'all'
      ? modules
      : modules.filter((m) => m.type === filter)

  const totalModules = modules.length
  const activeModules = modules.filter((m) => m.enabled).length

  const filterTabs = [
    { key: 'all' as const, labelKey: 'modules.moduleRegistry' },
    { key: 'system' as const, labelKey: 'modules.systemModules' },
    { key: 'plugin' as const, labelKey: 'modules.pluginModules' },
  ]

  return (
    <div className="min-h-screen" dir={dir}>
      {/* ─── Navigation Bar ─── */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="The One-Way"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-lg font-bold gradient-text">
              {t('brand.name')}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
            >
              <CheckCircle className="size-3 mr-1.5" />
              {t('modules.noUpdates')}
            </Badge>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6"
              >
                <Settings className="size-3.5 text-primary me-1.5" />
                {t('modules.moduleRegistry')}
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-5xl font-extrabold tracking-tight"
            >
              <span className="gradient-text">{t('modules.title')}</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              {t('modules.installed')}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Row ─── */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Total Modules */}
              <motion.div variants={fadeUp} custom={0}>
                <Card className="p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="size-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{totalModules}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('modules.totalModules')}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
              {/* Active Modules */}
              <motion.div variants={fadeUp} custom={1}>
                <Card className="p-6 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="size-7 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-400">
                        {activeModules}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('modules.activeModules')}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Filter Tabs ─── */}
      <section className="border-b border-border/50 bg-card/30 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2">
          {filterTabs.map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'default' : 'ghost'}
              size="sm"
              className="text-xs whitespace-nowrap"
              onClick={() => setFilter(tab.key)}
            >
              {filter === tab.key && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground me-1.5" />
              )}
              {t(tab.labelKey)}
            </Button>
          ))}
        </div>
      </section>

      {/* ─── Module Cards Grid ─── */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredModules.map((mod, idx) => {
                const Icon = mod.icon
                const catColor =
                  CATEGORY_COLORS[mod.categoryKey] ||
                  'bg-muted text-muted-foreground border-border'
                const priorityColor =
                  PRIORITY_COLORS[mod.priorityKey] || PRIORITY_COLORS.optional
                const iconBg =
                  ICON_COLORS[
                    mod.categoryKey.replace('modules.category', '').toLowerCase()
                  ] || 'bg-primary/10 text-primary'

                return (
                  <motion.div
                    key={mod.id}
                    variants={fadeUp}
                    custom={Math.min(idx, 9)}
                  >
                    <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          {/* Module Icon */}
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} group-hover:scale-110 transition-transform duration-300`}
                          >
                            <Icon className="size-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-snug">
                              {t(mod.nameKey)}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {t(mod.descKey)}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <Separator className="mb-4" />

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Version Badge */}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {t('modules.version')} {mod.version}
                          </Badge>

                          {/* Status Badge */}
                          {mod.enabled ? (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <CheckCircle className="size-2.5 me-1" />
                              {t('modules.enabled')}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              {t('modules.disabled')}
                            </Badge>
                          )}

                          {/* Category Badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${catColor}`}
                          >
                            {t(mod.categoryKey)}
                          </Badge>

                          {/* Priority Badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${priorityColor}`}
                          >
                            {t(`modules.${mod.priorityKey}`)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {filteredModules.length === 0 && (
              <motion.div variants={fadeUp} className="text-center py-16">
                <Package className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t('modules.noModules')}
                </p>
              </motion.div>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer Info Section ─── */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <RefreshCw className="size-10 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('modules.noUpdates')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    {t('modules.checkUpdates')}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      className="bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20"
                    >
                      <RefreshCw className="size-4 me-2" />
                      {t('modules.checkUpdates')}
                    </Button>
                    <Link href="/">
                      <Button variant="ghost">
                        <ArrowLeft className="size-4 me-2" />
                        {t('brand.name')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
