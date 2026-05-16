'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function CTASection() {
  const { t } = useTranslation()
  const store = useAppStore()

  const scrollTo = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-chart-3/8 to-chart-2/5" />
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('cta.title1')} <span className="gradient-text-premium">{t('cta.titleHighlight')}</span> {t('cta.title2')}</motion.h2>
        <motion.p variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">{t('cta.subtitle')}</motion.p>
        <motion.div variants={fadeUp} custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Button size="lg" className="btn-glow rounded-full px-8 text-base h-12 font-semibold" onClick={() => store.setView('workspace')}>{t('cta.getStarted')} <ArrowRight className="size-4" /></Button>
          <Button variant="outline" size="lg" className="rounded-full px-8 text-base h-12" onClick={() => scrollTo('#pricing')}>{t('cta.viewPricing')}</Button>
        </motion.div>
      </div>
    </section>
  )
}
