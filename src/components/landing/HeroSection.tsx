'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Play, Sparkles, Users, WifiOff, Brain, Zap, BarChart3, Globe, Database, TrendingUp } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export function HeroSection() {
  const { t } = useTranslation()
  const store = useAppStore()

  const scrollTo = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
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
  )
}
