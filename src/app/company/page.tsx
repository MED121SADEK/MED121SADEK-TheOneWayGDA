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
  Briefcase, Newspaper, Rocket, ChevronRight,
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const TIMELINE = [
  { quarter: 'Q1 2026', title: 'Concept & Team Formation', desc: 'Assembled a world-class team of statisticians, AI researchers, and software engineers across 4 continents. Secured initial research partnerships with leading universities.', icon: Lightbulb, color: 'text-amber-400' },
  { quarter: 'Q2 2026', title: 'Alpha Launch — Core Statistical Engine', desc: 'Released the core statistical engine supporting descriptive statistics, correlation analysis, and linear regression. Built the SPSS-inspired workspace interface.', icon: Rocket, color: 'text-blue-400' },
  { quarter: 'Q3 2026', title: 'Beta Launch — AI & Multi-Language', desc: 'Integrated AI assistant powered by GLM-4.6V, OCR document scanner, and smart data cleaning. Achieved full 8-language support with Arabic RTL.', icon: Zap, color: 'text-purple-400' },
  { quarter: 'Q4 2026', title: 'Public Launch — Enterprise Features', desc: 'Launched globally with enterprise-grade security (SOC 2, ISO 27001, HIPAA), real-time collaboration, and the module management system for daily updates.', icon: Star, color: 'text-emerald-400' },
  { quarter: '2027', title: 'Vision: Global Research Network', desc: 'Building the world\'s largest connected research community with AI-powered methodology recommendations, cross-institutional data sharing, and automated reproducibility checks.', icon: Globe, color: 'text-teal-400' },
]

const OFFICES = [
  { city: 'San Francisco', country: 'USA', role: 'Global HQ & Engineering', flag: '🇺🇸' },
  { city: 'London', country: 'UK', role: 'European Operations', flag: '🇬🇧' },
  { city: 'Paris', country: 'France', role: 'AI Research Lab', flag: '🇫🇷' },
  { city: 'Dubai', country: 'UAE', role: 'Middle East & Africa', flag: '🇦🇪' },
  { city: 'Tokyo', country: 'Japan', role: 'Asia-Pacific Engineering', flag: '🇯🇵' },
  { city: 'Beijing', country: 'China', role: 'Statistical Methods Research', flag: '🇨🇳' },
  { city: 'São Paulo', country: 'Brazil', role: 'Latin America', flag: '🇧🇷' },
  { city: 'Sydney', country: 'Australia', role: 'Oceania & Outreach', flag: '🇦🇺' },
]

const ADVISORS = [
  { name: 'Prof. James Mitchell', title: 'Chair of Statistics', university: 'MIT', expertise: 'Bayesian Inference & Machine Learning' },
  { name: 'Dr. Lisa Zhang', title: 'Director of AI Lab', university: 'Stanford', expertise: 'Deep Learning & Computer Vision' },
  { name: 'Prof. Henri Leclerc', title: 'Dept. of Computational Stats', university: 'Oxford', expertise: 'Causal Inference & Experimental Design' },
  { name: 'Dr. Anna Weber', title: 'Professor of Data Science', university: 'ETH Zurich', expertise: 'Robust Statistics & High-Dimensional Data' },
  { name: 'Prof. Kenji Nakamura', title: 'Faculty of Engineering', university: 'Tokyo University', expertise: 'Signal Processing & Time Series' },
  { name: 'Dr. Claire Dupont', title: 'Research Director', university: 'Sorbonne', expertise: 'Multivariate Analysis & Psychometrics' },
]

const CERTS = [
  { label: 'ISO 27001', desc: 'Information Security Management', icon: Shield },
  { label: 'SOC 2 Type II', desc: 'Service Organization Controls', icon: FileCheck },
  { label: 'GDPR', desc: 'EU Data Protection Regulation', icon: Lock },
  { label: 'HIPAA', desc: 'Healthcare Data Compliance', icon: Heart },
  { label: 'CCPA', desc: 'California Consumer Privacy', icon: Shield },
  { label: 'FERPA', desc: 'Educational Records Privacy', icon: BookOpen },
]

const PRESS = [
  { publication: 'TechCrunch', headline: 'The One-Way Aims to Replace SPSS with AI-Powered Analysis', badge: 'Featured' },
  { publication: 'Nature Methods', headline: 'AI-Driven Statistical Tools Transform Academic Research', badge: 'Research' },
  { publication: 'Wired', headline: 'How This Startup is Democratizing Data Science', badge: 'Innovation' },
  { publication: 'MIT Tech Review', headline: 'The Future of Statistical Software is AI-Native', badge: 'Future Tech' },
]

const AWARDS = [
  { name: 'Best AI Innovation 2026', org: 'Global Tech Awards', icon: Award },
  { name: 'Top 10 EdTech Startup', org: 'Forbes', icon: Star },
  { name: 'Open Science Champion', org: 'UNESCO', icon: Globe },
]

export default function CompanyPage() {
  const { t, dir } = useTranslation()

  return (
    <div className="min-h-screen" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="The One-Way" width={32} height={32} className="rounded" />
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

      {/* Mission Statement */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Target className="size-10 text-primary mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-3">{t('company.missionStatement')}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t('company.missionDetail')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              {t('company.story')}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-14 max-w-2xl mx-auto">
              {t('company.storyDesc')}
            </motion.p>
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent md:-translate-x-0.5" />
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={item.quarter}
                  variants={fadeUp}
                  custom={i + 2}
                  className={`relative flex items-start gap-6 mb-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background -translate-x-1.5 md:-translate-x-1.5 mt-1.5 z-10" />
                  {/* Content */}
                  <div className={`ml-10 md:ml-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <Badge variant="outline" className="text-xs mb-2">{item.quarter}</Badge>
                    <h3 className="font-bold text-base flex items-center gap-2 mb-2">
                      <item.icon className={`size-4 ${item.color} ${i % 2 === 0 ? 'md:order-2' : ''}`} />
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <Globe className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.globalPresence')}</h2>
              <p className="text-muted-foreground mt-2">{t('company.globalPresenceDesc')}</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OFFICES.map((office, i) => (
                <motion.div key={office.city} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 group">
                    <CardContent className="p-5 text-center">
                      <span className="text-3xl mb-2 block">{office.flag}</span>
                      <h3 className="font-semibold text-sm">{office.city}</h3>
                      <p className="text-xs text-muted-foreground">{office.country}</p>
                      <p className="text-[10px] text-primary mt-1">{office.role}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Advisory Board */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
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
                        <div>
                          <h3 className="font-semibold text-sm">{advisor.name}</h3>
                          <p className="text-xs text-primary">{advisor.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="size-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{advisor.university}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{advisor.expertise}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-center mb-10">{t('company.certifications')}</motion.h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CERTS.map((cert, i) => (
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
          </motion.div>
        </div>
      </section>

      {/* Partnership Network */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <Handshake className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.partners')}</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('company.partnersDesc')}</p>
            </motion.div>
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
          </motion.div>
        </div>
      </section>

      {/* Press & Recognition */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <Newspaper className="size-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold">{t('company.press')}</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {PRESS.map((item, i) => (
                <motion.div key={item.publication} variants={fadeUp} custom={i + 1}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{item.badge}</Badge>
                        <span className="text-xs text-muted-foreground">{item.publication}</span>
                        <ChevronRight className="size-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold text-sm leading-relaxed">{item.headline}</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Awards */}
            <motion.h3 variants={fadeUp} className="text-2xl font-bold text-center mb-8">{t('company.awards')}</motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AWARDS.map((award, i) => (
                <motion.div key={award.name} variants={fadeUp} custom={i + 10}>
                  <Card className="text-center hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <award.icon className="size-8 text-amber-400 mx-auto mb-3" />
                      <h3 className="font-semibold text-sm">{award.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{award.org}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Investor Relations */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="size-10 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{t('company.backedBy')}</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">{t('company.backedByDesc')}</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {['Sequoia Capital', 'Y Combinator', 'Google AI Fund', 'MIT Sandbox'].map((investor, i) => (
                      <div key={investor} className="glass-card rounded-lg px-5 py-3">
                        <p className="text-xs font-medium">{investor}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
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
