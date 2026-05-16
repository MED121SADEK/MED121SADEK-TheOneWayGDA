'use client'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Brain, Shield, Sparkles, Layout, Zap, Cpu, Code, AlertTriangle } from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.06 } } }

const UPDATES = [
  { id: 1, version: 'v2.4.0', date: '2026-04-18', category: 'ai', title: 'GLM-4.6V Vision Model', desc: 'Upgraded OCR engine with state-of-the-art vision AI for 40% better form recognition accuracy.' },
  { id: 2, version: 'v2.4.0', date: '2026-04-18', category: 'features', title: 'Batch OCR Processing', desc: 'Upload and process 100+ scanned documents in a single batch operation.' },
  { id: 3, version: 'v2.3.2', date: '2026-04-10', category: 'security', title: 'SOC 2 Type II Audit', desc: 'Completed SOC 2 Type II audit with zero findings. Security posture strengthened.' },
  { id: 4, version: 'v2.3.1', date: '2026-04-05', category: 'stats', title: 'Bayesian Analysis Module', desc: 'New Bayesian inference methods including MCMC sampling and posterior analysis.' },
  { id: 5, version: 'v2.3.0', date: '2026-03-28', category: 'uiux', title: 'Redesigned Variable View', desc: 'Complete overhaul of variable view with inline editing and drag-drop reordering.' },
  { id: 6, version: 'v2.2.0', date: '2026-03-15', category: 'ai', title: 'AI Chat Context Memory', desc: 'AI assistant now remembers conversation context across sessions within a project.' },
  { id: 7, version: 'v2.1.0', date: '2026-03-01', category: 'stats', title: 'Mixed-Effects Models', desc: 'Support for linear mixed-effects models with random intercepts and slopes.' },
  { id: 8, version: 'v2.1.0', date: '2026-03-01', category: 'stats', title: 'Robust Standard Errors', desc: 'HC0-HC4 robust standard errors for heteroscedasticity-consistent inference.' },
  { id: 9, version: 'v2.0.0', date: '2026-02-20', category: 'features', title: '8-Language Support', desc: 'Full interface translation for AR, EN, FR, ES, DE, ZH, JA, RU with RTL support.' },
  { id: 10, version: 'v2.0.0', date: '2026-02-20', category: 'performance', title: '50MB Dataset Support', desc: 'Optimized rendering engine for smooth scrolling with datasets up to 50MB.' },
  { id: 11, version: 'v1.9.0', date: '2026-02-10', category: 'security', title: 'Zero-Knowledge Encryption', desc: 'Implemented zero-knowledge architecture. Data encrypted before leaving browser.' },
  { id: 12, version: 'v1.8.0', date: '2026-01-25', category: 'ai', title: 'Smart Data Cleaning', desc: 'AI-powered cleaning: typo correction, outlier detection, missing value imputation.' },
]

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'ai', label: 'AI Models', icon: Brain, color: 'bg-purple-500/10 text-purple-400' },
  { key: 'stats', label: 'Statistical Methods', icon: Cpu, color: 'bg-blue-500/10 text-blue-400' },
  { key: 'security', label: 'Security', icon: Shield, color: 'bg-emerald-500/10 text-emerald-400' },
  { key: 'uiux', label: 'UI/UX', icon: Layout, color: 'bg-amber-500/10 text-amber-400' },
  { key: 'features', label: 'New Features', icon: Sparkles, color: 'bg-teal-500/10 text-teal-400' },
  { key: 'performance', label: 'Performance', icon: Zap, color: 'bg-rose-500/10 text-rose-400' },
]

const RADAR = [
  { zone: 'Adopt', color: 'bg-emerald-500/10 border-emerald-500/20', items: ['GLM-4.6V Vision', 'AES-256 Encryption', 'Zustand State Management'] },
  { zone: 'Trial', color: 'bg-blue-500/10 border-blue-500/20', items: ['Bayesian Analysis', 'Mixed-Effects Models', 'Real-time Collaboration'] },
  { zone: 'Assess', color: 'bg-amber-500/10 border-amber-500/20', items: ['Natural Language SQL', 'Automated Report Generation', '3D Visualization'] },
  { zone: 'Hold', color: 'bg-rose-500/10 border-rose-500/20', items: ['Blockchain Audit Trail', 'Quantum Computing Tests'] },
]

export default function UpdatesPage() {
  const { t, dir } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = UPDATES.filter(u => {
    if (filter !== 'all' && u.category !== filter) return false
    if (search && !u.title.toLowerCase().includes(search.toLowerCase()) && !u.desc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen" dir={dir}>
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="The One-Way" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
        </div>
      </nav>

      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold"><span className="gradient-text">{t('updates.title')}</span></motion.h1>
            <motion.div variants={fadeUp} custom={1} className="mt-8 max-w-md mx-auto flex gap-2">
              <div className="relative flex-1"><Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('updates.search')} className="pl-9 h-10" /></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-8 border-b border-border/50 bg-card/30 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(c => (
            <Button key={c.key} variant={filter === c.key ? 'default' : 'outline'} size="sm" className="text-xs whitespace-nowrap" onClick={() => setFilter(c.key)}>
              {filter === c.key && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground mr-1.5" />}
              {c.key === 'all' ? 'All' : c.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Updates List */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {filtered.map((u, i) => {
              const cat = CATEGORIES.find(c => c.key === u.category)
              return (
                <motion.div key={u.id} variants={fadeUp} custom={Math.min(i, 8)}>
                  <Card className="hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {cat && <Badge variant="outline" className={`text-[10px] ${cat.color}`}>{cat.label}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{u.version}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{u.date}</span>
                      </div>
                      <h3 className="font-semibold text-sm">{u.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{u.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No updates found.</p>}
          </motion.div>
        </div>
      </section>

      {/* Technology Radar */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-10">{t('updates.technologyRadar')}</motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {RADAR.map((zone, i) => (
                <motion.div key={zone.zone} variants={fadeUp} custom={i}>
                  <div className={`rounded-xl border p-4 ${zone.color}`}>
                    <h3 className="font-semibold text-sm mb-3">{zone.zone}</h3>
                    <ul className="space-y-2">{zone.items.map((item, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-current/30 flex-shrink-0" />{item}</li>
                    ))}</ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
