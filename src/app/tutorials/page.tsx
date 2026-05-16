'use client'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, Play, BookOpen, GraduationCap, Users, Lightbulb, Globe, Cpu, Brain, BarChart3, Clock, Star, ChevronRight } from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const TUTORIALS = [
  { id: 't1', cat: 'getting-started', title: 'Creating Your First Project', desc: 'Learn how to create a new project, navigate the workspace, and understand the interface.', time: '5 min', difficulty: 'beginner', steps: ['Click "Start Analyzing" from the homepage', 'Enter a project name and click Create', 'Navigate through Data View, Variable View, Output, and Syntax tabs', 'Try adding a variable and entering some data'] },
  { id: 't2', cat: 'getting-started', title: 'Importing Your Data', desc: 'Import CSV, JSON, or Excel files into your workspace for analysis.', time: '7 min', difficulty: 'beginner', steps: ['Go to Import Data in the left sidebar', 'Upload a CSV file or paste data directly', 'Review imported variables and data types', 'Edit variable properties in Variable View'] },
  { id: 't3', cat: 'analysis', title: 'Descriptive Statistics', desc: 'Calculate mean, median, standard deviation, and more for your data.', time: '10 min', difficulty: 'beginner', steps: ['Select variables by clicking their column headers', 'Click "Descriptive Statistics" in the Analysis panel', 'Review the output table with all statistics', 'Interpret skewness and kurtosis values'] },
  { id: 't4', cat: 'analysis', title: 'Correlation Analysis', desc: 'Explore relationships between variables using Pearson correlation.', time: '12 min', difficulty: 'intermediate', steps: ['Select 2 or more numeric variables', 'Click "Correlation" in the Analysis panel', 'Read the correlation matrix', 'Identify strong and weak correlations'] },
  { id: 't5', cat: 'analysis', title: 'Linear Regression', desc: 'Build and interpret linear regression models with scatter plots.', time: '15 min', difficulty: 'intermediate', steps: ['Select dependent and independent variables (first 2 selected)', 'Click "Regression" to run the analysis', 'Review slope, intercept, R, and R-squared', 'Analyze the generated scatter plot'] },
  { id: 't6', cat: 'ai', title: 'Using the AI Assistant', desc: 'Ask questions in natural language and get professional statistical guidance.', time: '8 min', difficulty: 'beginner', steps: ['Open the AI Assistant panel on the right', 'Type your question in plain English', 'The AI analyzes your data and provides guidance', 'Ask follow-up questions for deeper analysis'] },
  { id: 't7', cat: 'ai', title: 'Scan & Fill (OCR)', desc: 'Scan paper forms and questionnaires to auto-fill your data.', time: '10 min', difficulty: 'beginner', steps: ['Click "Scan & Fill" in the top toolbar', 'Upload a scanned document (PDF, PNG, JPG)', 'Review extracted fields and confidence scores', 'Edit if needed, then approve to import'] },
  { id: 't8', cat: 'ai', title: 'Smart Data Cleaning', desc: 'Auto-fix typos, detect outliers, impute missing values.', time: '12 min', difficulty: 'intermediate', steps: ['Click "Clean Data" in the left sidebar', 'Review cleaning statistics', 'Check outlier and duplicate detection results', 'Approved changes are applied to your data'] },
  { id: 't9', cat: 'advanced', title: 'Data Validation Rules', desc: 'Validate data types, ranges, formats, and coded values.', time: '15 min', difficulty: 'advanced', steps: ['Click "Validate Data" in the left sidebar', 'Review error, warning, and info severity issues', 'Read AI-powered suggestions for fixes', 'Address critical validation issues'] },
]

const DISCIPLINES = [
  { icon: Users, key: 'social', name: 'Social Sciences', desc: 'Survey analysis, cross-tabulations, Likert scales, qualitative coding.' },
  { icon: Cpu, key: 'engineering', name: 'Engineering', desc: 'Quality control, DOE, reliability analysis, Six Sigma, process optimization.' },
  { icon: Globe, key: 'natural', name: 'Natural Sciences', desc: 'Environmental data, biological measurements, experimental design, ANOVA.' },
  { icon: Brain, key: 'medical', name: 'Medical / Health', desc: 'Clinical trials, epidemiological studies, survival analysis, sensitivity.' },
  { icon: BarChart3, key: 'business', name: 'Business Analytics', desc: 'Market research, A/B testing, customer segmentation, financial modeling.' },
  { icon: Lightbulb, key: 'psychology', name: 'Psychology', desc: 'Psychometric analysis, factor analysis, reliability/validity testing.' },
  { icon: GraduationCap, key: 'education', name: 'Education', desc: 'Assessment evaluation, learning analytics, intervention effectiveness.' },
]

export default function TutorialsPage() {
  const { t, dir } = useTranslation()
  const [activeCat, setActiveCat] = useState('getting-started')

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
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
        </div>
      </nav>

      <section className="hero-gradient py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold"><span className="gradient-text">{t('tutorials.title')}</span></motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">Learn how to use The One-Way for academic research, data analysis, and statistical computing.</motion.p>
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

      {/* Tutorial List */}
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
                          <Play className="size-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm">{tut.title}</h3>
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
                          <div className="ml-7 border-l-2 border-primary/30 pl-4">
                            <p className="text-xs font-semibold mb-3">Step-by-Step Guide</p>
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
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10">{t('tutorials.disciplines')}</motion.p>
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
                { tip: 'Always start by defining your variables properly in Variable View before entering data.', label: 'Define Variables First' },
                { tip: 'Use the AI Assistant to understand which statistical test is appropriate for your data.', label: 'Ask AI for Guidance' },
                { tip: 'Run Data Validation before and after importing to catch errors early.', label: 'Validate Early & Often' },
                { tip: 'Export your results regularly. The platform supports CSV and JSON formats.', label: 'Export Your Results' },
                { tip: 'Use Scan & Fill to digitize paper surveys from your field research.', label: 'Digitize Paper Forms' },
                { tip: 'Select multiple variables (Ctrl+Click) for correlation and cross-variable analysis.', label: 'Multi-Variable Selection' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <Card className="h-full"><CardContent className="p-5"><p className="text-xs font-semibold text-primary mb-1">{item.label}</p><p className="text-xs text-muted-foreground leading-relaxed">{item.tip}</p></CardContent></Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
