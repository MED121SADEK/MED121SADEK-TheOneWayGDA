'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'
import { Brain, WifiOff, RefreshCw, ScanLine, Globe, Users } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function FeaturesSection() {
  const { t } = useTranslation()

  const features = [
    { icon: Brain, title: t('feature.ai.title'), desc: t('feature.ai.desc') },
    { icon: WifiOff, title: t('feature.offline.title'), desc: t('feature.offline.desc') },
    { icon: RefreshCw, title: t('feature.updates.title'), desc: t('feature.updates.desc') },
    { icon: ScanLine, title: t('feature.ocr.title'), desc: t('feature.ocr.desc') },
    { icon: Globe, title: t('feature.language.title'), desc: t('feature.language.desc') },
    { icon: Users, title: t('feature.collab.title'), desc: t('feature.collab.desc') },
  ]

  return (
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
  )
}
