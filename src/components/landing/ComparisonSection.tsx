'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart3, Check } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function ComparisonSection() {
  const { t } = useTranslation()

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

  return (
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
  )
}
