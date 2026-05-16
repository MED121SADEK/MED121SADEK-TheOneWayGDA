'use client'
import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Shield, Lock, Eye, Trash2, Download, FileCheck, Cookie, Users, ArrowLeft, CheckCircle, AlertTriangle, Server, Key } from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function PrivacyPage() {
  const { t, dir } = useTranslation()

  const certs = [
    { label: t('privacy.gdpr'), color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: t('privacy.soc2'), color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { label: t('privacy.iso27001'), color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { label: t('privacy.hipaa'), color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    { label: t('privacy.ccpa'), color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { label: t('privacy.ferpa'), color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  ]

  const principles = [
    { icon: Eye, title: t('privacy.dataMinimization'), desc: t('privacy.dataMinimizationDesc') },
    { icon: FileCheck, title: t('privacy.purposeLimitation'), desc: t('privacy.purposeLimitationDesc') },
    { icon: CheckCircle, title: t('privacy.consent'), desc: t('privacy.consentDesc') },
    { icon: Trash2, title: t('privacy.rightToErasure'), desc: t('privacy.rightToErasureDesc') },
    { icon: Download, title: t('privacy.dataPortability'), desc: t('privacy.dataPortabilityDesc') },
  ]

  const dataControls = [
    { icon: Download, label: t('privacy.downloadData'), desc: 'CSV, JSON, PDF' },
    { icon: Trash2, label: t('privacy.deleteAccount'), desc: '72 hours' },
    { icon: CheckCircle, label: t('privacy.manageConsent'), desc: 'Granular' },
  ]

  return (
    <div className="min-h-screen" dir={dir}>
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDAGDA" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6"><Shield className="size-3.5 text-primary" />{t('privacy.badge')}</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text">{t('privacy.title')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">{t('privacy.subtitle')}</motion.p>
          </motion.div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-8">{t('privacy.compliance')}</motion.h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {certs.map((c, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className={`border ${c.color} h-full`}>
                    <CardContent className="p-4 text-center">
                      <Shield className="size-8 mx-auto mb-2" />
                      <p className="text-xs font-semibold">{c.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Encryption */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-8">{t('privacy.encryption')}</motion.h2>
            <motion.div variants={fadeUp} custom={1}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                      <Lock className="size-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold">AES-256</p>
                      <p className="text-xs text-muted-foreground">At Rest</p>
                    </div>
                    <div>
                      <Server className="size-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold">TLS 1.3</p>
                      <p className="text-xs text-muted-foreground">In Transit</p>
                    </div>
                    <div>
                      <Key className="size-10 text-primary mx-auto mb-3" />
                      <p className="font-semibold">Zero-Knowledge</p>
                      <p className="text-xs text-muted-foreground">Architecture</p>
                    </div>
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground text-center leading-relaxed">{t('privacy.encryptionDesc')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Privacy Principles */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-10">{t('privacy.principles')}</motion.h2>
            <div className="space-y-4">
              {principles.map((p, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-6 flex gap-4">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><p.icon className="size-5 text-primary" /></div>
                      <div><h3 className="font-semibold">{p.title}</h3><p className="text-sm text-muted-foreground mt-1">{p.desc}</p></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Data Control */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-4">{t('privacy.dataControl')}</motion.h2>
            <motion.div variants={fadeUp} custom={1} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {dataControls.map((d, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 2}>
                  <Card className="text-center hover:border-primary/30 transition-all h-full">
                    <CardContent className="p-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><d.icon className="size-7 text-primary" /></div>
                      <h3 className="font-semibold text-sm">{d.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Audit, Terms, Cookies, Third Party */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
          {[
            { title: t('privacy.audit'), desc: t('privacy.auditDesc'), icon: AlertTriangle },
            { title: t('privacy.terms'), desc: t('privacy.termsDesc'), icon: FileCheck },
            { title: t('privacy.cookies'), desc: t('privacy.cookiesDesc'), icon: Cookie },
            { title: t('privacy.thirdParty'), desc: t('privacy.thirdPartyDesc'), icon: Users },
          ].map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
              <Card>
                <CardContent className="p-6 flex gap-4">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><item.icon className="size-5 text-primary" /></div>
                  <div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground mt-1">{item.desc}</p></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
