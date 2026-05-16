'use client'

import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  FileText, UserCheck, ShieldCheck, Copyright, Lock,
  AlertTriangle, RefreshCw, Scale, Mail, ArrowLeft, Calendar,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function TermsPage() {
  const { t, dir } = useTranslation()

  const sections = [
    {
      icon: FileText,
      title: t('terms.introduction'),
      content: t('terms.introductionContent'),
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: UserCheck,
      title: t('terms.accountTerms'),
      paragraphs: [t('terms.accountContent1'), t('terms.accountContent2')],
      color: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      icon: ShieldCheck,
      title: t('terms.acceptableUse'),
      paragraphs: [t('terms.acceptableContent1'), t('terms.acceptableContent2')],
      color: 'bg-amber-500/10 text-amber-400',
    },
    {
      icon: Copyright,
      title: t('terms.intellectualProperty'),
      paragraphs: [t('terms.intellectualContent1'), t('terms.intellectualContent2')],
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      icon: Lock,
      title: t('terms.privacy'),
      content: t('terms.privacyContent'),
      color: 'bg-teal-500/10 text-teal-400',
    },
    {
      icon: AlertTriangle,
      title: t('terms.limitationOfLiability'),
      paragraphs: [t('terms.liabilityContent1'), t('terms.liabilityContent2')],
      color: 'bg-rose-500/10 text-rose-400',
    },
    {
      icon: RefreshCw,
      title: t('terms.modifications'),
      content: t('terms.modificationsContent'),
      color: 'bg-cyan-500/10 text-cyan-400',
    },
    {
      icon: Scale,
      title: t('terms.governingLaw'),
      content: t('terms.governingContent'),
      color: 'bg-orange-500/10 text-orange-400',
    },
  ]

  return (
    <div className="min-h-screen" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="TheOneWayGDA"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6"
              >
                <FileText className="size-3.5 text-primary" />
                {t('terms.badge')}
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-5xl font-extrabold tracking-tight"
            >
              <span className="gradient-text">{t('terms.title')}</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              {t('terms.subtitle')}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-6">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                {t('terms.lastUpdated')}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-6"
          >
            {sections.map((section, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="hover:border-primary/20 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-xl ${section.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <section.icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {section.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {section.content}
                      </p>
                    )}
                    {section.paragraphs?.map((p, j) => (
                      <p
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {j > 0 && <span className="block h-3" />}
                        {p}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Section */}
          <Separator className="my-12" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Mail className="size-10 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{t('terms.contact')}</h2>
                  <p className="text-muted-foreground mb-4">{t('terms.contactContent')}</p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary">
                      {t('terms.contactEmail')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('terms.contactWebsite')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
