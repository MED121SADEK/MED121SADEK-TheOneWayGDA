'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search,
  Download,
  Star,
  Sparkles,
  Bot,
  BarChart3,
  Brain,
  Code2,
  GraduationCap,
  FileText,
  Palette,
  Globe,
  ArrowRight,
  Zap,
  TrendingUp,
  Users,
  Grid3x3,
  SlidersHorizontal,
  Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */
interface Copilot {
  id: string
  name: string
  description: string
  category: string
  avatarColor: string
  tags: string | null
  tools: string | null
  pricing: string
  price: number | null
  rating: number
  ratingCount: number
  installCount: number
  usageCount: number
  isFeatured: boolean
  isOfficial: boolean
  authorName: string | null
  version: string
  createdAt: string
}

interface Stats {
  total: number
  totalInstalls: number
  categories: number
  featured: number
}

/* ═══════════════════════════════════════════════
   Category Config
   ═══════════════════════════════════════════════ */
const CATEGORIES = [
  { value: 'all', label: 'All', icon: Grid3x3 },
  { value: 'data_analyst', label: 'Data Analyst', icon: BarChart3 },
  { value: 'ml_engineer', label: 'ML Engineer', icon: Brain },
  { value: 'code_gen', label: 'Code Gen', icon: Code2 },
  { value: 'statistician', label: 'Statistician', icon: GraduationCap },
  { value: 'report_writer', label: 'Report Writer', icon: FileText },
  { value: 'creative', label: 'Creative', icon: Palette },
  { value: 'domain_expert', label: 'Domain Expert', icon: Globe },
] as const

const CATEGORY_LABELS: Record<string, string> = {
  data_analyst: 'Data Analyst',
  ml_engineer: 'ML Engineer',
  code_gen: 'Code Gen',
  statistician: 'Statistician',
  report_writer: 'Report Writer',
  creative: 'Creative',
  domain_expert: 'Domain Expert',
}

const CATEGORY_COLORS: Record<string, string> = {
  data_analyst: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ml_engineer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  code_gen: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  statistician: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  report_writer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  creative: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  domain_expert: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

/* ═══════════════════════════════════════════════
   Helper: Render Stars
   ═══════════════════════════════════════════════ */
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Helper: Avatar with initials
   ═══════════════════════════════════════════════ */
function CopilotAvatar({
  name,
  color,
  size = 'md',
}: {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sizes = {
    sm: 'size-8 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-16 text-base',
    xl: 'size-20 text-xl',
  }

  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-lg`}
      style={{
        backgroundColor: color,
        boxShadow: `0 8px 24px ${color}33`,
      }}
    >
      {initials}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Helper: Format install count
   ═══════════════════════════════════════════════ */
function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return n.toString()
}

/* ═══════════════════════════════════════════════
   Animation Variants
   ═══════════════════════════════════════════════ */
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

/* ═══════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════ */
export default function CopilotStudioPage() {
  const [copilots, setCopilots] = useState<Copilot[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, totalInstalls: 0, categories: 0, featured: 0 })
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'installs' | 'rating' | 'newest'>('installs')
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())

  /* ── Fetch copilots ── */
  useEffect(() => {
    async function fetchCopilots() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ sort: sortBy })
        if (activeCategory !== 'all') params.set('category', activeCategory)
        if (searchQuery) params.set('search', searchQuery)

        const res = await fetch(`/api/studio/copilots?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setCopilots(data.copilots)
          setStats(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch copilots:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCopilots()
  }, [activeCategory, searchQuery, sortBy])

  /* ── Featured copilots ── */
  const featuredCopilots = useMemo(() => copilots.filter((c) => c.isFeatured), [copilots])

  /* ── Install toggle ── */
  async function handleInstall(copilotId: string, currentlyInstalled: boolean) {
    const newInstalled = new Set(installedIds)
    if (currentlyInstalled) {
      newInstalled.delete(copilotId)
    } else {
      newInstalled.add(copilotId)
    }
    setInstalledIds(newInstalled)

    try {
      await fetch(`/api/studio/copilots/${copilotId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'studio-user@theonewaygda.com',
          action: currentlyInstalled ? 'uninstall' : 'install',
        }),
      })
    } catch {
      // Revert on error
      const reverted = new Set(installedIds)
      if (currentlyInstalled) reverted.add(copilotId)
      else reverted.delete(copilotId)
      setInstalledIds(reverted)
    }
  }

  /* ── Stats animation ── */
  const [animatedStats, setAnimatedStats] = useState({ total: 0, totalInstalls: 0, categories: 0, featured: 0 })

  useEffect(() => {
    const duration = 1500
    const start = Date.now()
    const from = animatedStats

    function animate() {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      setAnimatedStats({
        total: Math.round(from.total + (stats.total - from.total) * eased),
        totalInstalls: Math.round(from.totalInstalls + (stats.totalInstalls - from.totalInstalls) * eased),
        categories: Math.round(from.categories + (stats.categories - from.categories) * eased),
        featured: Math.round(from.featured + (stats.featured - from.featured) * eased),
      })

      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [stats])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="hero-gradient absolute inset-0" />
          <div className="mesh-gradient absolute inset-0" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Sparkles size={14} className="animate-pulse" />
                <span>AI Marketplace</span>
              </div>

              <h1 className="gradient-text-premium text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Copilot Studio
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Build, share, and monetize custom AI assistants.
                <br className="hidden sm:block" />
                Discover powerful copilots crafted by the community.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/studio/create">
                  <Button size="lg" className="btn-glow gap-2 rounded-xl px-8 shadow-lg shadow-primary/20">
                    <Bot size={18} />
                    Create Copilot
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="gap-2 rounded-xl border-border/60">
                  <SlidersHorizontal size={18} />
                  Browse Marketplace
                </Button>
              </div>
            </motion.div>

            {/* ── Stats Bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6"
            >
              {[
                { label: 'Total Copilots', value: animatedStats.total, icon: Bot, color: 'text-primary' },
                {
                  label: 'Total Installs',
                  value: formatCount(animatedStats.totalInstalls),
                  icon: Download,
                  color: 'text-emerald-400',
                },
                { label: 'Categories', value: animatedStats.categories, icon: Grid3x3, color: 'text-purple-400' },
                { label: 'Featured', value: animatedStats.featured, icon: Zap, color: 'text-amber-400' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card group relative overflow-hidden rounded-xl p-4 sm:p-6 transition-all duration-300 hover:border-primary/20"
                >
                  <div className="flex items-center gap-3">
                    <stat.icon size={20} className={stat.color} />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold sm:text-3xl">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Search + Category Tabs ── */}
        <section className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative max-w-md flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search copilots by name, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-muted/30 pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">Sort by:</span>
                <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                  {(['installs', 'rating', 'newest'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        sortBy === s
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s === 'installs'
                        ? 'Popular'
                        : s === 'rating'
                        ? 'Top Rated'
                        : 'Newest'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="mt-3 -mb-4 overflow-x-auto scrollbar-none">
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="h-9 w-fit gap-1 rounded-lg bg-muted/40 p-1">
                  {CATEGORIES.map((cat) => (
                    <TabsTrigger
                      key={cat.value}
                      value={cat.value}
                      className="gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <cat.icon size={13} />
                      <span className="hidden sm:inline">{cat.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </section>

        {/* ── Featured Copilots ── */}
        {featuredCopilots.length > 0 && activeCategory === 'all' && !searchQuery && (
          <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold">Featured Copilots</h2>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {featuredCopilots.map((copilot) => (
                <motion.div key={copilot.id} variants={cardVariants}>
                  <Card className="card-premium group relative overflow-hidden border-border/40 bg-card/80 p-0 transition-all duration-300 hover:border-primary/30">
                    {/* Featured ribbon */}
                    <div className="absolute right-3 top-3 z-10">
                      <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 backdrop-blur-sm">
                        <Sparkles size={10} />
                        Featured
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CopilotAvatar name={copilot.name} color={copilot.avatarColor} size="lg" />

                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-semibold">{copilot.name}</h3>
                            {copilot.isOfficial && (
                              <Badge variant="outline" className="shrink-0 gap-1 border-primary/30 bg-primary/5 text-[10px] text-primary px-1.5 py-0">
                                <Check size={8} />
                                Official
                              </Badge>
                            )}
                          </div>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            by {copilot.authorName || 'Anonymous'} &middot; v{copilot.version}
                          </p>

                          <div className="mt-2">
                            <StarRating rating={copilot.rating} />
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {copilot.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${CATEGORY_COLORS[copilot.category] || 'border-border/60 text-muted-foreground'}`}
                        >
                          {CATEGORY_LABELS[copilot.category] || copilot.category}
                        </Badge>
                        {copilot.tools &&
                          JSON.parse(copilot.tools).map((tool: string) => (
                            <Badge key={tool} variant="outline" className="border-border/40 text-[10px] text-muted-foreground">
                              {tool}
                            </Badge>
                          ))}
                      </div>

                      <Separator className="my-4 bg-border/40" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Download size={12} />
                            {formatCount(copilot.installCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            {formatCount(copilot.usageCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {copilot.ratingCount}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant={installedIds.has(copilot.id) ? 'secondary' : 'default'}
                          className="gap-1.5 rounded-lg text-xs"
                          onClick={() => handleInstall(copilot.id, installedIds.has(copilot.id))}
                        >
                          {installedIds.has(copilot.id) ? (
                            <>
                              <Check size={12} />
                              Installed
                            </>
                          ) : (
                            <>
                              <Download size={12} />
                              {copilot.pricing === 'paid' ? `$${copilot.price}/mo` : 'Free'}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* ── All Copilots Grid ── */}
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">
                {activeCategory === 'all' ? 'All Copilots' : CATEGORY_LABELS[activeCategory]}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {copilots.length}
              </Badge>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="border-border/40 bg-card/80 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-12 w-full rounded" />
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Grid */}
          {!loading && (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${activeCategory}-${sortBy}-${searchQuery}`}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {copilots.map((copilot) => (
                  <motion.div key={copilot.id} variants={cardVariants} layout>
                    <Card className="card-premium group relative overflow-hidden border-border/40 bg-card/80 p-0 transition-all duration-300 hover:border-primary/20">
                      {copilot.isFeatured && (
                        <div className="absolute left-3 top-3 z-10">
                          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
                            <Zap size={9} />
                            Featured
                          </div>
                        </div>
                      )}

                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <CopilotAvatar name={copilot.name} color={copilot.avatarColor} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold leading-tight">
                              {copilot.name}
                            </h3>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {copilot.authorName || 'Anonymous'}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {copilot.description}
                        </p>

                        {/* Rating */}
                        <div className="mt-3">
                          <StarRating rating={copilot.rating} size={12} />
                        </div>

                        {/* Tags */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-medium px-1.5 py-0 ${CATEGORY_COLORS[copilot.category] || 'border-border/60 text-muted-foreground'}`}
                          >
                            {CATEGORY_LABELS[copilot.category] || copilot.category}
                          </Badge>
                          {copilot.pricing === 'paid' && (
                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[9px] font-medium text-amber-400 px-1.5 py-0">
                              ${copilot.price}/mo
                            </Badge>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Download size={11} />
                              {formatCount(copilot.installCount)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant={installedIds.has(copilot.id) ? 'secondary' : 'default'}
                            className="h-7 gap-1 rounded-md px-2.5 text-[11px]"
                            onClick={() => handleInstall(copilot.id, installedIds.has(copilot.id))}
                          >
                            {installedIds.has(copilot.id) ? (
                              <>
                                <Check size={11} />
                                Installed
                              </>
                            ) : copilot.pricing === 'paid' ? (
                              `$${copilot.price}/mo`
                            ) : (
                              'Install'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Empty state */}
          {!loading && copilots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <Bot size={28} className="text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">No copilots found</h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Try adjusting your search or filters
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>
      </div>
    </TooltipProvider>
  )
}
