'use client'
import { useState } from 'react'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  ArrowLeft, Play, BookOpen, GraduationCap, Users, Lightbulb, Globe, Cpu,
  Brain, BarChart3, Clock, Star, ChevronRight, Video, Languages,
  FileText, CheckCircle, Monitor, Smartphone,
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const VIDEO_LANGUAGES: { code: Locale; name: string; flag: string; status: 'available' | 'coming' }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', status: 'available' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', status: 'available' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', status: 'available' },
  { code: 'es', name: 'Español', flag: '🇪🇸', status: 'available' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', status: 'coming' },
  { code: 'zh', name: '中文', flag: '🇨🇳', status: 'coming' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', status: 'coming' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', status: 'coming' },
]

const TUTORIALS = [
  { id: 't1', cat: 'getting-started', title: 'Creating Your First Project', desc: 'Learn how to create a new project, navigate the workspace, and understand the interface.', time: '5 min', difficulty: 'beginner', hasVideo: true, steps: ['Click "Start Analyzing" from the homepage', 'Enter a project name and click Create', 'Navigate through Data View, Variable View, Output, and Syntax tabs', 'Try adding a variable and entering some data'], script: { en: 'Welcome to The One-Way. In this tutorial, you will learn how to create your first project. Start by clicking the "Start Analyzing" button on the homepage. Enter a descriptive project name, then click Create. You will see the SPSS-style workspace with four main tabs: Data View for entering and viewing data, Variable View for defining variable properties, Output for analysis results, and Syntax for tracking operations. Try adding a variable by clicking the plus icon in the Variable View. Set its name, type, and label.', ar: 'مرحباً بكم في The One-Way. في هذا الدرس ستتعلم كيفية إنشاء أول مشروع. ابدأ بالنقر على زر "ابدأ التحليل" في الصفحة الرئيسية.' } },
  { id: 't2', cat: 'getting-started', title: 'Importing Your Data', desc: 'Import CSV, JSON, or Excel files into your workspace for analysis.', time: '7 min', difficulty: 'beginner', hasVideo: true, steps: ['Go to Import Data in the left sidebar', 'Upload a CSV file or paste data directly', 'Review imported variables and data types', 'Edit variable properties in Variable View'], script: { en: 'Data import is one of the most important features. Navigate to the Import Data section in the left sidebar. You can upload CSV, Excel, or JSON files. The system automatically detects data types — numeric, string, date, or currency. After import, review the Variable View to verify types and labels are correct.', ar: 'استيراد البيانات من أهم الميزات. انتقل إلى قسم استيراد البيانات في الشريط الجانبي الأيسر.' } },
  { id: 't3', cat: 'analysis', title: 'Descriptive Statistics', desc: 'Calculate mean, median, standard deviation, and more for your data.', time: '10 min', difficulty: 'beginner', hasVideo: true, steps: ['Select variables by clicking their column headers', 'Click "Descriptive Statistics" in the Analysis panel', 'Review the output table with all statistics', 'Interpret skewness and kurtosis values'] },
  { id: 't4', cat: 'analysis', title: 'Correlation Analysis', desc: 'Explore relationships between variables using Pearson correlation.', time: '12 min', difficulty: 'intermediate', hasVideo: true, steps: ['Select 2 or more numeric variables', 'Click "Correlation" in the Analysis panel', 'Read the correlation matrix', 'Identify strong and weak correlations'] },
  { id: 't5', cat: 'analysis', title: 'Linear Regression', desc: 'Build and interpret linear regression models with scatter plots.', time: '15 min', difficulty: 'intermediate', hasVideo: true, steps: ['Select dependent and independent variables (first 2 selected)', 'Click "Regression" to run the analysis', 'Review slope, intercept, R, and R-squared', 'Analyze the generated scatter plot'] },
  { id: 't6', cat: 'ai', title: 'Using the AI Assistant', desc: 'Ask questions in natural language and get professional statistical guidance.', time: '8 min', difficulty: 'beginner', hasVideo: true, steps: ['Open the AI Assistant panel on the right', 'Type your question in plain English', 'The AI analyzes your data and provides guidance', 'Ask follow-up questions for deeper analysis'] },
  { id: 't7', cat: 'ai', title: 'Scan & Fill (OCR)', desc: 'Scan paper forms and questionnaires to auto-fill your data.', time: '10 min', difficulty: 'beginner', hasVideo: false, steps: ['Click "Scan & Fill" in the top toolbar', 'Upload a scanned document (PDF, PNG, JPG)', 'Review extracted fields and confidence scores', 'Edit if needed, then approve to import'] },
  { id: 't8', cat: 'ai', title: 'Smart Data Cleaning', desc: 'Auto-fix typos, detect outliers, impute missing values.', time: '12 min', difficulty: 'intermediate', hasVideo: false, steps: ['Click "Clean Data" in the left sidebar', 'Review cleaning statistics', 'Check outlier and duplicate detection results', 'Approved changes are applied to your data'] },
  { id: 't9', cat: 'advanced', title: 'Data Validation Rules', desc: 'Validate data types, ranges, formats, and coded values.', time: '15 min', difficulty: 'advanced', hasVideo: false, steps: ['Click "Validate Data" in the left sidebar', 'Review error, warning, and info severity issues', 'Read AI-powered suggestions for fixes', 'Address critical validation issues'] },
]

const DISCIPLINES = [
  { icon: Users, key: 'social', name: 'Social Sciences', desc: 'Survey analysis, cross-tabulations, Likert scales, qualitative coding. Ideal for sociology, political science, and anthropology research.' },
  { icon: Cpu, key: 'engineering', name: 'Engineering', desc: 'Quality control, DOE, reliability analysis, Six Sigma, process optimization. Built for industrial and systems engineering workflows.' },
  { icon: Globe, key: 'natural', name: 'Natural Sciences', desc: 'Environmental data, biological measurements, experimental design, ANOVA. Supports physics, chemistry, biology, and environmental science.' },
  { icon: Brain, key: 'medical', name: 'Medical / Health', desc: 'Clinical trials, epidemiological studies, survival analysis, sensitivity. HIPAA-compliant handling of sensitive health data.' },
  { icon: BarChart3, key: 'business', name: 'Business Analytics', desc: 'Market research, A/B testing, customer segmentation, financial modeling. Perfect for MBA students and business analysts.' },
  { icon: Lightbulb, key: 'psychology', name: 'Psychology', desc: 'Psychometric analysis, factor analysis, reliability/validity testing. Designed for psychological research methodology.' },
  { icon: GraduationCap, key: 'education', name: 'Education', desc: 'Assessment evaluation, learning analytics, intervention effectiveness. FERPA-compliant for educational research.' },
]

export default function TutorialsPage() {
  const { t, dir, locale, setLocale } = useTranslation()
  const [activeCat, setActiveCat] = useState('getting-started')
  const [videoLang, setVideoLang] = useState<Locale>('en')

  const categories = [
    { key: 'getting-started', label: t('tutorials.gettingStarted'), icon: BookOpen },
    { key: 'analysis', label: t('tutorials.statisticalAnalysis'), icon: BarChart3 },
    { key: 'ai', label: t('tutorials.aiFeatures'), icon: Brain },
    { key: 'advanced', label: t('tutorials.advanced'), icon: Star },
  ]

  const filtered = TUTORIALS.filter(tut => tut.cat === activeCat)

  return (
    <div className="min-h-screen" dir={dir}>
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="The One-Way" width={32} height={32} className="rounded" />
            <span className="text-lg font-bold gradient-text">{t('brand.name')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <Languages className="size-3.5 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localeNames.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
          </div>
        </div>
      </nav>

      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 mb-6">
                <Video className="size-3.5 text-primary mr-1.5" />{t('video.badge')}
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-extrabold"><span className="gradient-text">{t('tutorials.title')}</span></motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">{t('video.subtitle')}</motion.p>
          </motion.div>
        </div>
      </section>

      {/* Video Language Selector */}
      <section className="py-8 bg-muted/30 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h3 variants={fadeUp} className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Languages className="size-4 text-primary" />{t('video.selectLang')}
            </motion.h3>
            <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {VIDEO_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => lang.status === 'available' && setVideoLang(lang.code)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${videoLang === lang.code ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:border-primary/30 bg-card/50'}`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-[10px] font-medium">{lang.name}</span>
                  {lang.status === 'available' && <CheckCircle className="size-3 text-emerald-400 absolute top-1 right-1" />}
                  {lang.status === 'coming' && <Badge variant="outline" className="text-[8px] absolute -top-1 -right-1 bg-amber-500/10 text-amber-400 border-amber-500/20">Soon</Badge>}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="border-b border-border/50 bg-card/30 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto py-3">
          {categories.map(c => (
            <Button key={c.key} variant={activeCat === c.key ? 'default' : 'outline'} size="sm" className="text-xs whitespace-nowrap" onClick={() => setActiveCat(c.key)}>
              <c.icon className="size-3.5 mr-1" />{c.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Tutorial List with Video Indicators */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {filtered.map((tut, i) => (
              <motion.div key={tut.id} variants={fadeUp} custom={i}>
                <Card className="hover:border-primary/30 transition-all duration-300">
                  <Accordion type="single">
                    <AccordionItem value={tut.id}>
                      <AccordionTrigger className="p-5 hover:no-underline">
                        <div className="flex items-center gap-3 text-left flex-1">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {tut.hasVideo ? (
                              <Video className="size-4 text-primary" />
                            ) : (
                              <FileText className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              {tut.title}
                              {tut.hasVideo && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] px-1.5">
                                  {VIDEO_LANGUAGES.find(l => l.code === videoLang)?.flag} Video
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{tut.desc}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]"><Clock className="size-3 mr-1" />{tut.time}</Badge>
                            <Badge variant={tut.difficulty === 'beginner' ? 'default' : tut.difficulty === 'intermediate' ? 'secondary' : 'outline'} className="text-[10px]">{t(`tutorials.${tut.difficulty}`)}</Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-5 pb-5">
                          {/* Video Player Placeholder */}
                          {tut.hasVideo && (
                            <div className="mb-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-6 text-center">
                              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-primary/20 transition-colors">
                                <Play className="size-7 text-primary ml-1" />
                              </div>
                              <p className="text-sm font-medium">{tut.title} — {VIDEO_LANGUAGES.find(l => l.code === videoLang)?.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t('video.comingSoon')}</p>
                              <div className="flex justify-center gap-4 mt-3">
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Monitor className="size-3" /> {t('video.desktop')} </span>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Smartphone className="size-3" /> {t('video.mobile')}</span>
                              </div>
                            </div>
                          )}
                          {/* Script Preview */}
                          {tut.script && tut.script[videoLang] && (
                            <div className="mb-4 ml-7 border-l-2 border-primary/30 pl-4">
                              <p className="text-xs font-semibold mb-2 flex items-center gap-1"><FileText className="size-3" /> {t('video.script')} ({VIDEO_LANGUAGES.find(l => l.code === videoLang)?.name})</p>
                              <p className="text-xs text-muted-foreground leading-relaxed italic">{tut.script[videoLang]}</p>
                            </div>
                          )}
                          {/* Steps */}
                          <div className="ml-7 border-l-2 border-primary/30 pl-4">
                            <p className="text-xs font-semibold mb-3">{t('video.steps')}</p>
                            <ol className="space-y-2">
                              {tut.steps.map((step, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">{j + 1}</span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Academic Disciplines */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-4">{t('tutorials.academicResearch')}</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">{t('tutorials.disciplines')}</motion.p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DISCIPLINES.map((d, i) => (
                <motion.div key={d.key} variants={fadeUp} custom={i + 2}>
                  <Card className="h-full hover:border-primary/30 transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors"><d.icon className="size-6 text-primary" /></div>
                      <h3 className="font-semibold">{d.name}</h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{d.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tips */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-center mb-8">{t('tutorials.tips')}</motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { tip: 'Always start by defining your variables properly in Variable View before entering data. This ensures accurate type detection and proper statistical calculations.', label: 'Define Variables First' },
                { tip: 'Use the AI Assistant to understand which statistical test is appropriate for your data. It can analyze your variables and recommend the right approach.', label: 'Ask AI for Guidance' },
                { tip: 'Run Data Validation before and after importing to catch errors early. This prevents issues from propagating through your entire analysis pipeline.', label: 'Validate Early & Often' },
                { tip: 'Export your results regularly in CSV or JSON format. This ensures you never lose your work and can share results with collaborators easily.', label: 'Export Your Results' },
                { tip: 'Use Scan & Fill to digitize paper surveys from your field research. The AI OCR engine recognizes forms, tables, and handwritten text with high accuracy.', label: 'Digitize Paper Forms' },
                { tip: 'Select multiple variables using Ctrl+Click for correlation and cross-variable analysis. This enables more comprehensive multi-variable statistical testing.', label: 'Multi-Variable Selection' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full hover:border-primary/30 transition-all"><CardContent className="p-5"><p className="text-xs font-semibold text-primary mb-1">{item.label}</p><p className="text-xs text-muted-foreground leading-relaxed">{item.tip}</p></CardContent></Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
