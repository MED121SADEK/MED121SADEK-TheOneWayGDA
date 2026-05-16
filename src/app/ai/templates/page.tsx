'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
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
  ArrowLeft,
  Search,
  BookOpen,
  FlaskConical,
  TrendingUp,
  Sparkles,
  FileText,
  BarChart3,
  LayoutTemplate,
  Database,
  Brain,
  Star,
  Users,
  Clock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ─── Types ─── */
interface TemplateStep {
  id: string
  order: number
  name: string
  description: string
  type: 'data_prep' | 'analysis' | 'visualization' | 'interpretation'
  config: Record<string, unknown>
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  author: string
  authorType: 'community' | 'official'
  tags: string[]
  steps: TemplateStep[]
  requiredVariables: string[]
  estimatedDuration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
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

/* ─── Category Config ─── */
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  statistical: { icon: BarChart3, color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-600/5 border-violet-500/20' },
  machine_learning: { icon: Brain, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20' },
  data_cleaning: { icon: Sparkles, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' },
  visualization: { icon: TrendingUp, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/5 border-amber-500/20' },
  reporting: { icon: FileText, color: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-600/5 border-sky-500/20' },
  benchmarking: { icon: FlaskConical, color: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-600/5 border-rose-500/20' },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  advanced: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
}

export default function TemplatesPage() {
  const { dir } = useTranslation()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      console.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  /* Filter */
  const filtered = templates.filter((t) => {
    const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = categoryFilter === 'all' || t.category === categoryFilter
    return matchesSearch && matchesCat
  })

  const categories = [...new Set(templates.map((t) => t.category))]

  /* Use template */
  const handleUseTemplate = (t: Template) => {
    toast({ title: 'Template applied', description: `"${t.name}" workflow has been loaded. Navigate to Workspace to start.` })
  }

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
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Template Marketplace</span>
          </div>
          <Badge className="gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <LayoutTemplate className="size-3" />
            {templates.length} Templates
          </Badge>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="hero-gradient rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-500/5 pointer-events-none" />
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10">
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-amber-500/30 bg-amber-500/5 mb-4">
                <LayoutTemplate className="size-3.5 text-amber-400 me-1.5" />
                Community & Official Templates
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-premium">Analysis Templates</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Jump-start your analysis with pre-built workflow templates created by the team and community.
              Each template includes step-by-step instructions and configurable parameters.
            </motion.p>
          </motion.div>
        </section>

        {/* Search + Filter */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, description, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AnimatedSection>

        {/* Stats */}
        <AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Templates', value: templates.length, icon: LayoutTemplate, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Official', value: templates.filter((t) => t.authorType === 'official').length, icon: Star, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Community', value: templates.filter((t) => t.authorType === 'community').length, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Categories', value: categories.length, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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

        {/* Template Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Available Templates</h2>
            <Badge variant="outline" className="text-xs text-muted-foreground">{filtered.length} results</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <LayoutTemplate className="size-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No templates found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <AnimatedSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((template, idx) => {
                  const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.statistical
                  const CatIcon = catConfig.icon

                  return (
                    <motion.div key={template.id} variants={fadeUp} custom={Math.min(idx, 15)}>
                      <Card className={`card-premium h-full bg-gradient-to-br ${catConfig.gradient} border backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${catConfig.gradient.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                              <CatIcon className={`size-5 ${catConfig.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                                  {template.name}
                                </CardTitle>
                                <Badge variant="outline" className={`text-[9px] ${DIFFICULTY_COLORS[template.difficulty] || ''}`}>
                                  {template.difficulty}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[9px] gap-1">
                                  {template.authorType === 'official' ? <Star className="size-2" /> : <Users className="size-2" />}
                                  {template.author}
                                </Badge>
                                {template.estimatedDuration && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="size-2.5" />{template.estimatedDuration}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-3">
                          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                            ))}
                          </div>

                          {/* Steps preview */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {(template.steps || []).slice(0, 4).map((step, si) => (
                              <div key={step.id} className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[9px] font-mono">{step.name}</Badge>
                                {si < Math.min((template.steps || []).length, 4) - 1 && (
                                  <span className="text-muted-foreground text-[10px]">&rarr;</span>
                                )}
                              </div>
                            ))}
                            {(template.steps || []).length > 4 && (
                              <span className="text-[10px] text-muted-foreground">+{(template.steps || []).length - 4} more</span>
                            )}
                          </div>

                          <Separator />

                          {/* Required variables */}
                          {template.requiredVariables && template.requiredVariables.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Database className="size-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">Required: {template.requiredVariables.join(', ')}</span>
                            </div>
                          )}

                          {/* Action */}
                          <Button size="sm" className="w-full gap-2 h-8 text-xs" onClick={() => handleUseTemplate(template)}>
                            <Sparkles className="size-3" />
                            Use This Template
                          </Button>
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
    </div>
  )
}
