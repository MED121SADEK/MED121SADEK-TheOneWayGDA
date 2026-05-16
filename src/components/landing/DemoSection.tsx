'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Brain, User, BarChart3 } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function DemoSection() {
  const { t } = useTranslation()

  return (
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
  )
}
