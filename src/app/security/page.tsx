'use client'

import { useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  Lock,
  Eye,
  Server,
  Key,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Globe,
  ArrowLeft,
  Download,
  Trash2,
  Cookie,
  Users,
  Scan,
  Fingerprint,
  ShieldCheck,
  Bug,
  Monitor,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function SecurityPage() {
  const { t, dir } = useTranslation()

  /* ── Compliance Certifications ── */
  const certifications = [
    { icon: ShieldCheck, name: t('privacy.gdpr'), desc: t('security.gdprDescription'), body: 'In Progress', color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20', iconBg: 'bg-blue-500/10 text-blue-500 dark:text-blue-400' },
    { icon: Shield, name: t('privacy.soc2'), desc: t('security.soc2Description'), body: 'In Progress', color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20', iconBg: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' },
    { icon: FileCheck, name: t('privacy.iso27001'), desc: t('security.isoDescription'), body: 'In Progress', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/20', iconBg: 'bg-purple-500/10 text-purple-500 dark:text-purple-400' },
    { icon: Fingerprint, name: t('privacy.hipaa'), desc: t('security.hipaaDesc'), body: 'In Progress', color: 'from-teal-500/20 to-teal-600/5 border-teal-500/20', iconBg: 'bg-teal-500/10 text-teal-500 dark:text-teal-400' },
    { icon: CheckCircle, name: t('privacy.ccpa'), desc: t('security.ccpaDescription'), body: 'Planned', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20', iconBg: 'bg-amber-500/10 text-amber-500 dark:text-amber-400' },
    { icon: Eye, name: t('privacy.ferpa'), desc: t('security.ferpaDescription'), body: 'Planned', color: 'from-rose-500/20 to-rose-600/5 border-rose-500/20', iconBg: 'bg-rose-500/10 text-rose-500 dark:text-rose-400' },
    { icon: Globe, name: t('security.lgpd'), desc: t('security.lgpdDescription'), body: 'Planned', color: 'from-green-500/20 to-green-600/5 border-green-500/20', iconBg: 'bg-green-500/10 text-green-500 dark:text-green-400' },
    { icon: Lock, name: t('security.pcidss'), desc: t('security.pcidssDescription'), body: 'Planned', color: 'from-red-500/20 to-red-600/5 border-red-500/20', iconBg: 'bg-red-500/10 text-red-500 dark:text-red-400' },
    { icon: Shield, name: t('security.fedramp'), desc: t('security.fedrampDescription'), body: 'Planned', color: 'from-sky-500/20 to-sky-600/5 border-sky-500/20', iconBg: 'bg-sky-500/10 text-sky-500 dark:text-sky-400' },
  ]

  /* ── Encryption & Infrastructure ── */
  const encryptionPillars = [
    { icon: Lock, title: t('security.aes256'), desc: t('security.aes256Desc'), color: 'from-teal-500/15 to-teal-600/5', iconColor: 'text-teal-500 dark:text-teal-400' },
    { icon: Server, title: t('security.tls13'), desc: t('security.tls13Desc'), color: 'from-cyan-500/15 to-cyan-600/5', iconColor: 'text-cyan-500 dark:text-cyan-400' },
    { icon: Key, title: t('security.zeroKnowledge'), desc: t('security.zeroKnowledgeDesc'), color: 'from-emerald-500/15 to-emerald-600/5', iconColor: 'text-emerald-500 dark:text-emerald-400' },
  ]

  /* ── Security Architecture ── */
  const architecturePillars = [
    { icon: Lock, title: t('security.e2e'), desc: t('security.e2eDesc'), gradient: 'from-teal-500/20 to-teal-600/5 border-teal-500/20', iconBg: 'bg-teal-500/10 text-teal-500 dark:text-teal-400' },
    { icon: Monitor, title: t('security.monitoring'), desc: t('security.monitoringDesc'), gradient: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20', iconBg: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400' },
    { icon: Globe, title: t('security.globalCompliance'), desc: t('security.globalComplianceDesc'), gradient: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20', iconBg: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' },
    { icon: ShieldCheck, title: t('security.aiSafety'), desc: t('security.aiSafetyDesc'), gradient: 'from-purple-500/20 to-purple-600/5 border-purple-500/20', iconBg: 'bg-purple-500/10 text-purple-500 dark:text-purple-400' },
  ]

  /* ── Privacy Principles ── */
  const privacyPrinciples = [
    { icon: Eye, title: t('privacy.dataMinimization'), desc: t('privacy.dataMinimizationDesc'), color: 'bg-blue-500/10 text-blue-400' },
    { icon: FileCheck, title: t('privacy.purposeLimitation'), desc: t('privacy.purposeLimitationDesc'), color: 'bg-emerald-500/10 text-emerald-400' },
    { icon: CheckCircle, title: t('privacy.consent'), desc: t('security.consentDesc'), color: 'bg-purple-500/10 text-purple-400' },
    { icon: Trash2, title: t('privacy.rightToErasure'), desc: t('privacy.rightToErasureDesc'), color: 'bg-rose-500/10 text-rose-400' },
    { icon: Download, title: t('privacy.dataPortability'), desc: t('privacy.dataPortabilityDesc'), color: 'bg-amber-500/10 text-amber-400' },
  ]

  /* ── Advanced Security Features ── */
  const advancedFeatures = [
    { icon: Users, title: t('security.dpo'), desc: t('security.dpoDesc'), color: 'bg-blue-500/10 text-blue-400' },
    { icon: Scan, title: t('security.penetration'), desc: t('security.penetrationDesc'), color: 'bg-rose-500/10 text-rose-400' },
    { icon: Bug, title: t('security.bugBounty'), desc: t('security.bugBountyDesc'), color: 'bg-amber-500/10 text-amber-400' },
    { icon: Key, title: t('security.sso'), desc: t('security.ssoDesc'), color: 'bg-purple-500/10 text-purple-400' },
    { icon: Fingerprint, title: t('security.mfa'), desc: t('security.mfaDesc'), color: 'bg-teal-500/10 text-teal-400' },
    { icon: FileCheck, title: t('security.auditLog'), desc: t('security.auditLogDesc'), color: 'bg-cyan-500/10 text-cyan-400' },
    { icon: AlertTriangle, title: t('security.incident'), desc: t('security.incidentDesc'), color: 'bg-orange-500/10 text-orange-400' },
    { icon: RefreshCw, title: t('security.retention'), desc: t('security.retentionDesc'), color: 'bg-emerald-500/10 text-emerald-400' },
  ]

  /* ── Data Control ── */
  const dataControls = [
    { icon: Download, label: t('privacy.downloadData'), desc: t('security.downloadDesc') },
    { icon: Trash2, label: t('privacy.deleteAccount'), desc: t('security.deleteDesc') },
    { icon: Cookie, label: t('privacy.manageConsent'), desc: t('security.consentDesc') },
  ]

  /* ── Bottom cards ── */
  const bottomCards = [
    { title: t('privacy.terms'), desc: t('privacy.termsDesc'), icon: FileCheck },
    { title: t('privacy.cookies'), desc: t('privacy.cookiesDesc'), icon: Cookie },
    { title: t('privacy.thirdParty'), desc: t('privacy.thirdPartyDesc'), icon: Users },
  ]

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* ══════════════════════════════════════════════
            1. HERO
        ══════════════════════════════════════════════ */}
        <section className="hero-gradient py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} custom={0}>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6">
                  <Shield className="size-3.5 text-primary" />
                  {t('privacy.badge')}
                </Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                <span className="gradient-text">{t('privacy.title')}</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {t('privacy.subtitle')}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            2. COMPLIANCE CERTIFICATIONS GRID
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-4">
                {t('privacy.compliance')}
              </motion.h2>
              <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                {t('company.certifications')}
              </motion.p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {certifications.map((cert, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className={`h-full bg-gradient-to-br ${cert.color} border backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`size-11 rounded-xl ${cert.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <cert.icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base leading-snug">{cert.name}</CardTitle>
                            <CardDescription className="mt-0.5 text-xs">{cert.body}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">{cert.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            3. ENCRYPTION & INFRASTRUCTURE
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t('privacy.encryption')}
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {encryptionPillars.map((item, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className={`h-full bg-gradient-to-br ${item.color} border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}>
                      <CardContent className="p-6 text-center">
                        <div className={`size-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                          <item.icon className={`size-8 ${item.iconColor}`} />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <motion.div variants={fadeUp} custom={4}>
                <Card className="mt-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      {t('privacy.encryptionDesc')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            4. SECURITY ARCHITECTURE (4 PILLARS)
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t('privacy.architecture')}
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {architecturePillars.map((pillar, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className={`h-full bg-gradient-to-br ${pillar.gradient} border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}>
                      <CardHeader className="text-center pb-3">
                        <div className={`size-12 rounded-xl ${pillar.iconBg} flex items-center justify-center mx-auto mb-3`}>
                          <pillar.icon className="size-6" />
                        </div>
                        <CardTitle className="text-base">{pillar.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground text-center leading-relaxed">{pillar.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <motion.div variants={fadeUp} custom={5}>
                <Card className="mt-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      {t('privacy.architectureDesc')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            5. PRIVACY PRINCIPLES
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t('privacy.principles')}
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {privacyPrinciples.map((p, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader>
                        <div className={`size-12 rounded-xl ${p.color} flex items-center justify-center mb-2`}>
                          <p.icon className="size-6" />
                        </div>
                        <CardTitle className="text-lg">{p.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            6. ADVANCED SECURITY FEATURES
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t('security.advanced') || 'Advanced Security Features'}
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {advancedFeatures.map((feat, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className={`size-10 rounded-xl ${feat.color} flex items-center justify-center mb-2`}>
                          <feat.icon className="size-5" />
                        </div>
                        <CardTitle className="text-sm font-bold">{feat.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            7. DATA CONTROL
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-center mb-4">
                {t('privacy.dataControl')}
              </motion.h2>
              <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                {t('privacy.architectureDesc')}
              </motion.p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dataControls.map((d, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i + 2}>
                    <Card className="text-center h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <d.icon className="size-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{d.label}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            8. TRUST & AUDIT
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-8 flex flex-col md:flex-row gap-6 items-center text-center md:text-start">
                    <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="size-8 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">{t('privacy.audit')}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('privacy.auditDesc')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            9. TERMS, COOKIES, THIRD-PARTY
        ══════════════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AnimatedSection>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bottomCards.map((item, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                          <item.icon className="size-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>
    </div>
  )
}
