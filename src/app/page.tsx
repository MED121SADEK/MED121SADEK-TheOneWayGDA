'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain, WifiOff, RefreshCw, ScanLine, Users,
  Sparkles, Play, Menu, Check, BarChart3, ArrowRight,
  Zap, Star, ChevronRight, Globe, User, ChevronDown, Database,
  TrendingUp, ShieldCheck, Mail,
} from 'lucide-react'
import { LinkedInIcon, InstagramIcon, TikTokIcon } from '@/components/BrandIcons'

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
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

/* ─── MAIN PAGE ─── */
export default function Home() {
  const { t, locale, setLocale, dir } = useTranslation()
  const store = useAppStore()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

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

  const footerColumns = [
    { title: t('footer.product'), links: [{ label: t('nav.features'), href: '#features' }, { label: t('nav.pricing'), href: '#pricing' }, { label: t('nav.workspace'), href: '/workspace' }] },
    { title: t('footer.resources'), links: [{ label: t('footer.documentation'), href: '/tutorials' }, { label: t('footer.api'), href: '/leaderboard' }, { label: t('nav.community') || 'Community', href: '/community' }] },
    { title: t('footer.company'), links: [{ label: t('footer.about'), href: '/about' }, { label: t('footer.blog'), href: '/updates' }, { label: t('footer.contact'), href: '/company' }] },
  ]

  /* ─── WORKSPACE VIEW → redirect to /workspace route ─── */
  if (store.view === 'workspace') {
    if (typeof window !== 'undefined') {
      router.push('/workspace')
    }
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  /* ─── LANDING PAGE ─── */
  return (
    <div className="min-h-screen flex flex-col noise-overlay" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={36} height={36} className="rounded-lg" />
            <span className="text-xl font-bold gradient-text-premium">{t('brand.name')}</span>
          </button>
          {/* Primary nav links - always visible on lg+ */}
          <div className="hidden lg:flex items-center gap-6 flex-shrink-0">
            {[
              { label: t('nav.features'), href: '#features' },
              { label: t('nav.comparison'), href: '#comparison' },
              { label: t('nav.workspace'), href: '#demo' },
              { label: t('nav.pricing'), href: '#pricing' },
            ].map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">{l.label}</button>
            ))}
            {/* Secondary links in More dropdown to prevent overflow */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap">
                  {t('nav.more') || 'More'} <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {[
                  { label: t('nav.community') || 'Community', href: '/community' },
                  { label: t('lb.badge') || 'Leaderboard', href: '/leaderboard' },
                  { label: t('nav.about'), href: '/about' },
                  { label: t('nav.security'), href: '/security' },
                  { label: t('nav.company'), href: '/company' },
                  { label: t('nav.updates'), href: '/updates' },
                  { label: t('nav.tutorials'), href: '/tutorials' },
                  { label: t('modules.title'), href: '/modules' },
                ].map((l) => (
                  <DropdownMenuItem key={l.href} asChild>
                    <Link href={l.href} className="cursor-pointer">{l.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-9 w-32 text-xs"><Globe className="size-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="rounded-full px-5" onClick={() => store.setView('workspace')}><ArrowRight className="size-4" /> {t('nav.workspace')}</Button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /></Button></SheetTrigger>
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
                  { label: t('nav.community') || 'Community', href: '/community' },
                  { label: t('lb.badge') || 'Leaderboard', href: '/leaderboard' },
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
      <section className="mesh-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col items-center">
            {/* Animated gradient orb behind hero text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 via-chart-3/15 to-chart-2/10 blur-[120px] pointer-events-none animate-pulse opacity-40" />
            <motion.div variants={fadeUp} custom={0} className="relative z-10">
              <Badge variant="outline" className="px-3.5 py-1 text-xs rounded-full border-primary/20 bg-primary/5 mb-6 gradient-border"><Sparkles className="size-3 text-primary" />{t('hero.badge')}</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="relative z-10 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[-0.03em] max-w-4xl leading-[1.08]">
              {t('hero.title1')} <span className="gradient-text-premium">{t('hero.titleHighlight')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">{t('hero.subtitle')}</motion.p>
            <motion.div variants={fadeUp} custom={3} className="relative z-10 flex flex-col sm:flex-row gap-4 mt-10">
              <Button size="lg" className="btn-glow rounded-full px-8 text-base h-12 font-semibold" onClick={() => store.setView('workspace')}>{t('hero.cta1')} <ArrowRight className="size-4" /></Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 text-base h-12" onClick={() => scrollTo('#demo')}><Play className="size-4" />{t('hero.cta2')}</Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="relative z-10 flex flex-wrap justify-center gap-6 sm:gap-10 mt-14">
              {[{ l: t('hero.stat1'), i: Users }, { l: t('hero.stat2'), i: WifiOff }, { l: t('hero.stat3'), i: Brain }, { l: t('hero.stat4'), i: Zap }].map(s => (
                <div key={s.l} className="stat-animate flex items-center gap-2 text-sm font-medium text-muted-foreground"><s.i className="size-4 text-primary" />{s.l}</div>
              ))}
            </motion.div>
            {/* Trust bar */}
            <motion.div variants={fadeUp} custom={5} className="relative z-10 mt-12">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-4">{t('hero.trustedBy')}</p>
              <div className="flex items-center justify-center gap-8 sm:gap-12 opacity-30">
                {[Brain, BarChart3, Globe, Database, TrendingUp].map((Icon, idx) => (
                  <Icon key={idx} className="size-6 sm:size-7" />
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} custom={6} className="relative z-10 mt-14 w-full max-w-4xl">
              <div className="glow-border rounded-2xl overflow-hidden border border-border/30">
                <Image src="/images/hero.png" alt="TheOneWayGDA Dashboard" width={1200} height={680} className="w-full h-auto" priority />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-32 dot-pattern relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Star className="size-3.5 text-primary" />{t('features.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('features.title1')} <span className="gradient-text-premium">{t('features.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('features.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div key={f.title} variants={fadeUp} custom={i}>
                  <Card className="card-premium h-full bg-card/80 backdrop-blur-sm group relative overflow-hidden">
                    {/* Subtle gradient line at top */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><f.icon className="size-6 text-primary" /></div>
                        <span className="text-xs font-mono text-muted-foreground/40 tracking-wider">{String(i + 1).padStart(2, '0')}</span>
                      </div>
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
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"><span className="gradient-text-premium">{t('comparison.title1')}</span> {t('comparison.title2')}</h2>
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
                        <TableHead className="text-base font-semibold py-4 text-center"><span className="gradient-text-premium font-bold">{t('comparison.theway')}</span> <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] rounded-full border-emerald-500/30 bg-emerald-500/5 text-emerald-400">{t('comparison.recommended')}</Badge></TableHead>
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
      <section id="demo" className="py-20 md:py-32 grid-pattern relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Play className="size-3.5 text-primary" />{t('demo.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('demo.title1')} <span className="gradient-text-premium">{t('demo.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('demo.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="overflow-hidden border-primary/20 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="border-b lg:border-b-0 lg:border-r border-border p-6">
                      <div className="flex items-center gap-2 mb-5"><div className="size-3 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm font-semibold text-emerald-400">{t('demo.session')}</span></div>
                      <div className="space-y-5">
                        {[
                          { role: 'user', text: 'Analyze the correlation between study hours and exam scores' },
                          { role: 'ai', text: `Running Pearson correlation... Found strong positive correlation (r=0.87, p<0.001). Generated scatter plot + regression model.` },
                          { role: 'user', text: 'Add a linear regression' },
                          { role: 'ai', text: 'Regression: Score = 12.3 + 7.8 × Hours. R² = 0.756, F(1,98) = 304.2, p < 0.001.' },
                        ].map((msg, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2, duration: 0.4 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5 border border-primary/10"><Brain className="size-4 text-primary" /></div>}
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/80 border border-border/30 rounded-bl-md'}`}>{msg.text}{i === 3 && <span className="inline-block w-1.5 h-4 ml-1 bg-current/50 animate-pulse rounded-sm" />}</div>
                            {msg.role === 'user' && <div className="flex-shrink-0 size-9 rounded-xl bg-accent/15 flex items-center justify-center mt-0.5 border border-accent/10"><User className="size-4 text-accent" /></div>}
                          </motion.div>
                        ))}
                        {/* Typing indicator */}
                        <div className="flex gap-3 justify-start">
                          <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10"><Brain className="size-4 text-primary" /></div>
                          <div className="bg-muted/80 border border-border/30 rounded-2xl rounded-bl-md px-5 py-3.5 flex items-center gap-1.5">
                            <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
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
      <section id="pricing" className="py-20 md:py-32 mesh-gradient relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Zap className="size-3.5 text-primary" />{t('pricing.badge')}</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('pricing.title1')} <span className="gradient-text-premium">{t('pricing.titleHighlight')}</span></h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('pricing.subtitle')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <motion.div key={plan.name} variants={fadeUp} custom={i} className={plan.highlighted ? 'md:-mt-4' : ''}>
                  <Card className={`card-premium h-full relative flex flex-col bg-card/80 backdrop-blur-sm ${plan.highlighted ? 'gradient-border !border-transparent shadow-2xl shadow-primary/10' : ''}`}>
                    {plan.highlighted && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2"><Badge className="btn-glow rounded-full px-4 py-1 bg-primary text-primary-foreground shadow-md shadow-primary/20">{t('pricing.popular')}</Badge></div>}
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

      {/* CTA SECTION */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-chart-3/8 to-chart-2/5" />
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('cta.title1')} <span className="gradient-text-premium">{t('cta.titleHighlight')}</span> {t('cta.title2')}</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">{t('cta.subtitle')}</motion.p>
          <motion.div variants={fadeUp} custom={2} className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <Button size="lg" className="btn-glow rounded-full px-8 text-base h-12 font-semibold" onClick={() => store.setView('workspace')}>{t('cta.getStarted')} <ArrowRight className="size-4" /></Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 text-base h-12" onClick={() => scrollTo('#pricing')}>{t('cta.viewPricing')}</Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto footer-premium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4"><Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded-lg" /><span className="text-lg font-bold gradient-text-premium">{t('brand.name')}</span></div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mt-3">{t('footer.desc')}</p>
            </div>
            {footerColumns.map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">{col.links.map(l => (
                  <li key={l.href}>
                    {l.href.startsWith('/') ? (
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                    ) : (
                      <button onClick={() => scrollTo(l.href)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
                    )}
                  </li>
                ))}</ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{t('footer.compliance')}</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <a href="mailto:msad41855@gmail.com" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                <Mail className="size-4" />
              </a>
              <a href="https://www.linkedin.com/in/mohammed-essadek-549a17229" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                <LinkedInIcon size={16} />
              </a>
              <a href="https://www.instagram.com/the_one_way_community/" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                <InstagramIcon size={16} />
              </a>
              <a href="https://www.tiktok.com/@the1way1" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                <TikTokIcon size={16} />
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
              <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('lb.badge') || 'Leaderboard'}</Link>
              <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.community') || 'Community'}</Link>
              <span className="text-muted-foreground">|</span>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
