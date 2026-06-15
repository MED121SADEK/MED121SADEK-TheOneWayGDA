'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain, Database, Table2, BarChart3, FileText,
  Terminal, ScanLine, Variable,
  ArrowRight, Send, Sparkles, TrendingUp,
} from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

/* ─── Fake data for the data table ─── */
const TABLE_HEADERS = ['ID', 'Name', 'Age', 'Score', 'Group', 'Status'] as const
const TABLE_ROWS = [
  ['001', 'Sarah M.', '23', '92.4', 'A', '●'],
  ['002', 'James K.', '27', '87.1', 'B', '●'],
  ['003', 'Lin W.', '31', '95.8', 'A', '●'],
  ['004', 'Omar H.', '25', '78.3', 'C', '●'],
  ['005', 'Emma T.', '29', '91.0', 'A', '●'],
  ['006', 'Yuki N.', '26', '84.6', 'B', '●'],
]

/* ─── Sidebar nav items ─── */
const SIDEBAR_ITEMS = [
  { icon: Brain, label: 'AI Copilot', active: true },
  { icon: Database, label: 'Import', active: false },
  { icon: Table2, label: 'Data View', active: false },
  { icon: BarChart3, label: 'Analysis', active: false },
  { icon: FileText, label: 'Output', active: false },
  { icon: Variable, label: 'Variables', active: false },
  { icon: ScanLine, label: 'Scan', active: false },
  { icon: Terminal, label: 'Syntax', active: false },
]

export function DemoSection() {
  const { t } = useTranslation()

  return (
    <section id="demo" className="py-20 md:py-32 grid-pattern relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ─── Section heading ─── */}
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4">
              <Sparkles className="size-3.5 text-primary mr-1.5" />
              {t('demo.badge')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {t('demo.title1')}{' '}
              <span className="gradient-text-premium">{t('demo.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('demo.subtitle')}
            </p>
          </motion.div>
        </AnimatedSection>

        {/* ─── Browser-frame workspace mockup ─── */}
        <AnimatedSection>
          <motion.div variants={fadeUp} custom={1}>
            <div className="rounded-2xl overflow-hidden border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
              {/* ── Browser chrome (top bar) ── */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border/40">
                {/* Traffic-light dots */}
                <span className="size-3 rounded-full bg-red-400/80" />
                <span className="size-3 rounded-full bg-yellow-400/80" />
                <span className="size-3 rounded-full bg-green-400/80" />
                {/* Fake URL bar */}
                <div className="ml-3 flex-1 max-w-xs h-7 rounded-lg bg-background/60 border border-border/30 flex items-center px-3 gap-2">
                  <span className="size-3 rounded-full bg-emerald-500/60" />
                  <span className="text-[11px] text-muted-foreground truncate">app.theonewaygda.com/workspace</span>
                </div>
                {/* Tab placeholders */}
                <div className="hidden sm:flex items-center gap-2 ml-auto">
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">Free Plan</Badge>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">S</div>
                </div>
              </div>

              {/* ── Workspace layout: sidebar + main ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px] md:min-h-[480px]">
                {/* ── Sidebar ── */}
                <div className="hidden lg:flex lg:col-span-2 flex-col border-r border-border/40 bg-muted/30 p-3 gap-1">
                  <div className="flex items-center gap-2 px-2 py-2 mb-2">
                    <div className="size-5 rounded bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="size-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold gradient-text-premium">TheOneWayGDA</span>
                  </div>
                  {SIDEBAR_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                        item.active
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="size-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* ── Main content area ── */}
                <div className="lg:col-span-10 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                  {/* ── Left: Data Table ── */}
                  <div className="p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="size-4 text-blue-400" />
                        <span className="text-sm font-semibold">{t('demo.dataView')}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5 px-2 border-blue-400/30 text-blue-400">
                        {t('demo.rowCount')}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-border/40 overflow-hidden flex-1">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-muted/60 border-b border-border/40">
                            {TABLE_HEADERS.map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TABLE_ROWS.map((row, ri) => (
                            <motion.tr
                              key={ri}
                              initial={{ opacity: 0, x: -8 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.15 + ri * 0.06, duration: 0.35 }}
                              className="border-b border-border/20 last:border-0 hover:bg-muted/20"
                            >
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className={`px-3 py-1.5 whitespace-nowrap ${
                                    ci === 5 ? 'text-emerald-400' : ci === 3 ? 'font-mono' : ''
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Stats badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-[10px] rounded-lg px-2 py-1 border-primary/30 bg-primary/5">
                        R² = 0.756
                      </Badge>
                      <Badge variant="outline" className="text-[10px] rounded-lg px-2 py-1 border-emerald-500/30 bg-emerald-500/5 text-emerald-400">
                        p &lt; 0.001
                      </Badge>
                      <Badge variant="outline" className="text-[10px] rounded-lg px-2 py-1 border-blue-400/30 bg-blue-400/5 text-blue-400">
                        n = 248
                      </Badge>
                    </div>
                  </div>

                  {/* ── Right: AI Chat Panel ── */}
                  <div className="p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-semibold text-emerald-400">{t('demo.session')}</span>
                    </div>
                    <div className="flex-1 space-y-3 overflow-hidden">
                      {/* User message */}
                      <div className="flex justify-end gap-2">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2.5 text-[12px] leading-relaxed">
                          {t('demo.userMsg')}
                        </div>
                      </div>
                      {/* AI response */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex gap-2 justify-start"
                      >
                        <div className="flex-shrink-0 size-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10">
                          <Brain className="size-3.5 text-primary" />
                        </div>
                        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/80 border border-border/30 px-3.5 py-2.5 text-[12px] leading-relaxed">
                          <p className="font-medium mb-1.5 text-primary">{t('demo.aiLabel')}</p>
                          <p className="text-muted-foreground">{t('demo.aiResponse1')}</p>
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            <div className="rounded-md bg-primary/5 border border-primary/10 p-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">Mean</p>
                              <p className="text-[11px] font-mono font-bold">88.2</p>
                            </div>
                            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 p-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">Std Dev</p>
                              <p className="text-[11px] font-mono font-bold text-emerald-400">6.34</p>
                            </div>
                            <div className="rounded-md bg-blue-500/5 border border-blue-500/10 p-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">Median</p>
                              <p className="text-[11px] font-mono font-bold text-blue-400">89.5</p>
                            </div>
                          </div>
                          <p className="mt-2 text-muted-foreground">{t('demo.aiResponse2')}</p>
                        </div>
                      </motion.div>
                      {/* Typing indicator */}
                      <div className="flex gap-2 justify-start">
                        <div className="flex-shrink-0 size-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10">
                          <Brain className="size-3.5 text-primary" />
                        </div>
                        <div className="bg-muted/80 border border-border/30 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1.5">
                          <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="size-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                    {/* Fake input bar */}
                    <div className="mt-3 flex items-center gap-2 h-9 rounded-xl bg-muted/60 border border-border/30 px-3">
                      <span className="text-[11px] text-muted-foreground flex-1 truncate">{t('demo.placeholder')}</span>
                      <Send className="size-3.5 text-muted-foreground/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatedSection>

        {/* ─── CTA below the preview ─── */}
        <AnimatedSection>
          <motion.div variants={fadeUp} custom={2} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <Button size="lg" className="btn-glow rounded-full px-8 text-base h-12 font-semibold" asChild>
              <Link href="/auth/register">
                {t('demo.cta')} <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 text-base h-12" asChild>
              <Link href="#pricing">
                {t('demo.ctaSecondary')}
              </Link>
            </Button>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  )
}
