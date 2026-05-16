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
  Globe, Users, GraduationCap, Building2, Shield, Heart, Lightbulb,
  BookOpen, Mail, ArrowLeft, Award, MapPin, Clock, TrendingUp,
  Star, Target, Handshake, FileCheck, Lock, CheckCircle, Zap,
  Briefcase, Newspaper, Rocket, ChevronRight, Eye, Sparkles,
  Calendar, Building, User, Banknote, FileText, Crown, ExternalLink,
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const FLAGS: Record<string, string> = { 'USA': '🇺🇸', 'UK': '🇬🇧', 'Japan': '🇯🇵', 'France': '🇫🇷', 'UAE': '🇦🇪', 'Germany': '🇩🇪', 'China': '🇨🇳', 'Brazil': '🇧🇷' }

const TIMELINE_ICONS = [Lightbulb, Rocket, Zap, Star, Globe]
const TIMELINE_COLORS = ['text-amber-400', 'text-blue-400', 'text-purple-400', 'text-emerald-400', 'text-teal-400']
const TIMELINE_DATES = ['company.timeline2026q1', 'company.timeline2026q2', 'company.timeline2026q3', 'company.timeline2026q4', 'company.timeline2027q1']
const TIMELINE_TITLES = ['company.timeline2026q1', 'company.timeline2026q2', 'company.timeline2026q3', 'company.timeline2026q4', 'company.timeline2027q1']
const TIMELINE_DESCS = ['company.timeline2026q1Desc', 'company.timeline2026q2Desc', 'company.timeline2026q3Desc', 'company.timeline2026q4Desc', 'company.timeline2027q1Desc']
const TIMELINE_LABELS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027']

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className={className}>
      {children}
    </motion.div>
  )
}

export default function CompanyPage() {
  const { t, dir } = useTranslation()

  const OFFICES = [
    { city: t('company.office1City'), country: t('company.office1Country'), role: t('company.office1Role') },
    { city: t('company.office2City'), country: t('company.office2Country'), role: t('company.office2Role') },
    { city: t('company.office3City'), country: t('company.office3Country'), role: t('company.office3Role') },
    { city: t('company.office4City'), country: t('company.office4Country'), role: t('company.office4Role') },
    { city: t('company.office5City'), country: t('company.office5Country'), role: t('company.office5Role') },
    { city: t('company.office6City'), country: t('company.office6Country'), role: t('company.office6Role') },
    { city: t('company.office7City'), country: t('company.office7Country'), role: t('company.office7Role') },
    { city: t('company.office8City'), country: t('company.office8Country'), role: t('company.office8Role') },
  ]

  const ADVISORS = [
    { name: t('company.advisor1Name'), title: t('company.advisor1Title'), expertise: t('company.advisor1Expertise') },
    { name: t('company.advisor2Name'), title: t('company.advisor2Title'), expertise: t('company.advisor2Expertise') },
    { name: t('company.advisor3Name'), title: t('company.advisor3Title'), expertise: t('company.advisor3Expertise') },
    { name: t('company.advisor4Name'), title: t('company.advisor4Title'), expertise: t('company.advisor4Expertise') },
    { name: t('company.advisor5Name'), title: t('company.advisor5Title'), expertise: t('company.advisor5Expertise') },
    { name: t('company.advisor6Name'), title: t('company.advisor6Title'), expertise: t('company.advisor6Expertise') },
  ]

  const LEADERS = [
    { name: 'Mohammed Essadek', title: 'Founder & CEO', icon: Crown, linkedin: 'https://www.linkedin.com/in/mohammed-essadek-549a17229' },
    { name: t('company.ctoName'), title: t('company.ctoTitle'), icon: Sparkles },
    { name: t('company.cooName'), title: t('company.cooTitle'), icon: Briefcase },
  ]

  const INVESTORS = [t('company.investor1'), t('company.investor2'), t('company.investor3'), t('company.investor4')]
  const PRESS = [t('company.press1'), t('company.press2'), t('company.press3'), t('company.press4')]
  const AWARDS = [t('company.award1'), t('company.award2'), t('company.award3')]
  const PRESS_BADGES = ['Featured', 'Research', 'Innovation', 'International']

  return (
    <div className="min-h-screen" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded" />
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
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6">
                <Building2 className="size-3.5 text-primary mr-1.5" />{t('company.badge')}
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">{t('company.title')}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('company.tagline')}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap justify-center gap-4">
              {[
                { icon: Users, value: '10,000+', label: t('about.researchers') },
                { icon: GraduationCap, value: '500+', label: t('about.universities') },
                { icon: Globe, value: '80+', label: t('about.countries') },
              ].map((s, i) => (
                <Card key={i} className="glass-card border-primary/20 px-6 py-4">
                  <CardContent className="p-0 flex items-center gap-3">
                    <s.icon className="size-5 text-primary" />
                    <div className="text-left">
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Company Identity */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{t('company.legalEntity')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Calendar, label: t('company.established') },
                    { icon: MapPin, label: t('company.headquarters') },
                    { icon: Users, label: t('company.employees') },
                    { icon: Banknote, label: t('company.revenue') },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <item.icon className="size-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <Separator className="my-4" />
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="size-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">{t('company.dba')}</span></p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="size-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground text-xs">{t('company.registration')}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold">{t('about.team')}</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('about.teamDesc')}</motion.p>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LEADERS.map((leader, i) => (
                <motion.div key={leader.name} variants={fadeUp} custom={i + 2}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 text-center">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 ring-4 ring-primary/10">
                        <leader.icon className="size-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold">{leader.name}</h3>
                      <p className="text-sm text-primary mt-1">{leader.title}</p>
                      {leader.linkedin && (
                        <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="size-3.5" /> Connect on LinkedIn
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={fadeUp} custom={0}>
                <Card className="h-full hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Target className="size-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{t('company.missionStatement')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('company.mission')}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp} custom={1}>
                <Card className="h-full hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Eye className="size-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{t('about.vision').split(' ').slice(0, 2).join(' ')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t('company.vision')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              {t('company.story')}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-14 max-w-2xl mx-auto">
              {t('company.storyDesc')}
            </motion.p>
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent md:-translate-x-0.5" />
              {TIMELINE_DATES.map((key, i) => {
                const Icon = TIMELINE_ICONS[i]
                const color = TIMELINE_COLORS[i]
                return (
                  <motion.div
                    key={key}
                    variants={fadeUp}
                    custom={i + 2}
                    className={`relative flex items-start gap-6 mb-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background -translate-x-1.5 md:-translate-x-1.5 mt-1.5 z-10" />
                    <div className={`ml-10 md:ml-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                      <Badge variant="outline" className="text-xs mb-2">{TIMELINE_LABELS[i]}</Badge>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-2">
                        <Icon className={`size-4 ${color} ${i % 2 === 0 ? 'md:order-2' : ''}`} />
                        {t(key)}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(TIMELINE_DESCS[i])}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Global Presence */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-12">
            <motion.div variants={fadeUp}>
              <Globe className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.globalPresence')}</h2>
              <p className="text-muted-foreground mt-2">{t('company.globalPresenceDesc')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OFFICES.map((office, i) => (
                <motion.div key={office.city} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 group">
                    <CardContent className="p-5 text-center">
                      <span className="text-3xl mb-2 block">{FLAGS[office.country] || '🌍'}</span>
                      <h3 className="font-semibold text-sm">{office.city}</h3>
                      <p className="text-xs text-muted-foreground">{office.country}</p>
                      <p className="text-[10px] text-primary mt-1">{office.role}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Advisory Board */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-center mb-4">{t('company.advisoryBoard')}</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">{t('company.advisoryBoardDesc')}</motion.p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADVISORS.map((advisor, i) => (
                <motion.div key={advisor.name} variants={fadeUp} custom={i + 2}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold gradient-text">{advisor.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{advisor.name}</h3>
                          <p className="text-xs text-primary truncate">{advisor.title}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{advisor.expertise}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-center mb-10">{t('company.certifications')}</motion.h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'ISO 27001', desc: 'Information Security', icon: Shield },
                { label: 'SOC 2 Type II', desc: 'Service Controls', icon: FileCheck },
                { label: 'GDPR', desc: 'EU Data Protection', icon: Lock },
                { label: 'HIPAA', desc: 'Healthcare Data', icon: Heart },
                { label: 'CCPA', desc: 'California Privacy', icon: Shield },
                { label: 'FERPA', desc: 'Education Records', icon: BookOpen },
              ].map((cert, i) => (
                <motion.div key={cert.label} variants={fadeUp} custom={i}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-4 text-center">
                      <cert.icon className="size-8 text-primary mx-auto mb-2" />
                      <p className="text-xs font-semibold">{cert.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{cert.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Partnership Network */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-12">
            <motion.div variants={fadeUp}>
              <Handshake className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.partners')}</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('company.partnersDesc')}</p>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: GraduationCap, title: t('company.academicPartners'), desc: t('company.academicPartnersDesc'), count: '500+' },
                { icon: Briefcase, title: t('company.techPartners'), desc: t('company.techPartnersDesc'), count: '50+' },
                { icon: FileCheck, title: t('company.researchCollabs'), desc: t('company.researchCollabsDesc'), count: '200+' },
              ].map((p, i) => (
                <motion.div key={p.title} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <p.icon className="size-7 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{p.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
                      <Badge variant="outline" className="text-sm">{p.count}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Press & Recognition */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-12">
            <motion.div variants={fadeUp}>
              <Newspaper className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.press')}</h2>
            </motion.div>
          </AnimatedSection>
          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {PRESS.map((headline, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{PRESS_BADGES[i]}</Badge>
                        <ChevronRight className="size-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold text-sm leading-relaxed">{headline}</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <motion.h3 variants={fadeUp} className="text-2xl font-bold text-center mb-8">{t('company.awards')}</motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AWARDS.map((award, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 10}>
                  <Card className="text-center hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <Award className="size-8 text-amber-400 mx-auto mb-3" />
                      <h3 className="font-semibold text-sm">{award}</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Investors */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="size-10 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{t('company.backedBy')}</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">{t('company.backedByDesc')}</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {INVESTORS.map((investor, i) => (
                      <div key={i} className="glass-card rounded-lg px-5 py-3">
                        <p className="text-xs font-medium">{investor}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl font-bold mb-8">{t('about.contact')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <a href="mailto:msad41855@gmail.com" className="flex items-center gap-4 p-6 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="size-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">msad41855@gmail.com</p>
                  </div>
                </a>
                <a href="https://www.linkedin.com/in/mohammed-essadek-549a17229" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-6 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="size-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground mb-1">LinkedIn</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">Mohammed Essadek</p>
                  </div>
                </a>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
