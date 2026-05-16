'use client'
import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Globe, Users, GraduationCap, Building2, Shield, Heart, Lightbulb, BookOpen, Mail, ExternalLink, ArrowLeft } from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function AboutPage() {
  const { t, dir } = useTranslation()

  const values = [
    { icon: Lightbulb, title: t('about.valueInnovation'), desc: t('about.valueInnovationDesc'), color: 'bg-amber-500/10 text-amber-400' },
    { icon: Shield, title: t('about.valuePrivacy'), desc: t('about.valuePrivacyDesc'), color: 'bg-emerald-500/10 text-emerald-400' },
    { icon: Heart, title: t('about.valueAccessibility'), desc: t('about.valueAccessibilityDesc'), color: 'bg-blue-500/10 text-blue-400' },
    { icon: BookOpen, title: t('about.valueOpenScience'), desc: t('about.valueOpenScienceDesc'), color: 'bg-purple-500/10 text-purple-400' },
    { icon: Globe, title: t('about.valueCommunity'), desc: t('about.valueCommunityDesc'), color: 'bg-teal-500/10 text-teal-400' },
  ]

  const team = [
    { name: 'Dr. Sarah Chen', role: 'CEO & Founder', dept: 'Statistical AI Research' },
    { name: 'Prof. Ahmad Al-Rashid', role: 'Chief Science Officer', dept: 'Computational Statistics' },
    { name: 'Dr. Marie Dubois', role: 'VP Engineering', dept: 'Distributed Systems' },
    { name: 'Kenji Tanaka', role: 'Head of AI', dept: 'Machine Learning' },
    { name: 'Dr. Elena Volkova', role: 'Head of Research', dept: 'Data Science Methodology' },
    { name: 'Carlos Rodriguez', role: 'Head of Security', dept: 'Cryptography & Privacy' },
  ]

  const stats = [
    { icon: Users, value: t('about.researchers'), color: 'text-emerald-400' },
    { icon: GraduationCap, value: t('about.universities'), color: 'text-blue-400' },
    { icon: Globe, value: t('about.countries'), color: 'text-purple-400' },
  ]

  return (
    <div className="min-h-screen noise-overlay" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text-premium">{t('brand.name')}</span>
          </Link>
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6"><Building2 className="size-3.5 text-primary" />{t('about.title')}</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-premium">{t('about.title')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">{t('about.mission')}</motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8">
              <Card className="card-premium inline-block border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-left max-w-2xl mx-auto">
                  <p className="text-sm font-semibold text-primary mb-2">{t('about.vision')}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">&quot;{t('about.vision')}&quot;</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="text-center">
                <div className="flex justify-center mb-3"><div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center"><s.icon className="size-7 text-primary" /></div></div>
                <p className="text-3xl font-bold stat-animate">{s.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 grid-pattern">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-center mb-12">{t('about.values')}</motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((v, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="card-premium h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <CardHeader>
                      <div className={`size-12 rounded-xl ${v.color} flex items-center justify-center mb-2`}><v.icon className="size-6" /></div>
                      <CardTitle className="text-lg">{v.title}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p></CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-center mb-4">{t('about.team')}</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{t('about.teamDesc')}</motion.p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map((m, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 2}>
                  <Card className="card-premium hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold gradient-text-premium">{m.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <h3 className="font-semibold text-base">{m.name}</h3>
                      <p className="text-xs text-primary mt-1">{m.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.dept}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Founded & Community */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
              <Card className="card-premium border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Building2 className="size-10 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold">{t('about.founded')}</p>
                </CardContent>
              </Card>
            </motion.div>
            <Separator className="my-12" />
            <motion.div variants={fadeUp} custom={1}>
              <h2 className="text-3xl font-extrabold text-center mb-4">{t('about.partnerships')}</h2>
              <p className="text-center text-muted-foreground mb-8">{t('about.partnershipsDesc')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['MIT', 'Stanford', 'Oxford', 'ETH Zurich', 'Tokyo U.', 'Sorbonne', 'Tsinghua', 'IIT Bombay'].map((u, i) => (
                  <div key={i} className="card-premium glass-card rounded-lg p-4 text-center">
                    <GraduationCap className="size-5 mx-auto mb-2 text-primary/60" />
                    <p className="text-xs font-medium">{u}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <Separator className="my-12" />
            <motion.div variants={fadeUp} custom={2} className="text-center">
              <Mail className="size-8 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">{t('about.contact')}</h2>
              <p className="text-muted-foreground mb-1">{t('about.email')}</p>
              <p className="text-muted-foreground">{t('about.website')}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
