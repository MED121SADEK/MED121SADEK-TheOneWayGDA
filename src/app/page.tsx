'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Brain,
  WifiOff,
  RefreshCw,
  ScanLine,
  MessageSquare,
  Users,
  Sparkles,
  Play,
  Menu,
  Check,
  X,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Star,
  ChevronRight,
} from 'lucide-react'

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
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

/* ─── data ─── */
const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'Demo', href: '#demo' },
  { label: 'Pricing', href: '#pricing' },
]

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description:
      'Ask questions in plain English and get professional statistical analysis. Our AI understands your data and recommends the right tests, transformations, and visualizations automatically.',
  },
  {
    icon: WifiOff,
    title: 'Works Completely Offline',
    description:
      'No internet? No problem. StatMind AI runs entirely in your browser with a local AI engine. Analyze data, build models, and generate reports anywhere, anytime.',
  },
  {
    icon: RefreshCw,
    title: 'AI Auto-Updates',
    description:
      'Stay current with the latest statistical methods and AI capabilities. Our intelligent update system delivers new features, algorithms, and improvements seamlessly through AI-driven deployment.',
  },
  {
    icon: ScanLine,
    title: 'Built-in OCR & Form Scanner',
    description:
      'Scan paper forms, questionnaires, and surveys directly into your analysis. No more manual data entry or expensive third-party OCR tools.',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language Interface',
    description:
      'No coding or syntax to learn. Simply describe what you want to analyze in plain language, and our AI handles the complex statistical computations behind the scenes.',
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description:
      'Work together with your team in real-time. Share datasets, analysis workflows, and results with version control, comments, and live collaboration features.',
  },
]

const comparisonData = [
  { feature: 'AI-Powered Analysis', statmind: true, spss: false },
  { feature: 'Works Offline', statmind: true, spss: false },
  { feature: 'Auto-Updates', statmind: true, spss: false },
  { feature: 'Built-in OCR', statmind: true, spss: false },
  { feature: 'Natural Language Queries', statmind: true, spss: false },
  { feature: 'Real-time Collaboration', statmind: true, spss: false },
  { feature: 'Steep Learning Curve', statmind: false, spss: true },
  { feature: 'Expensive Licensing', statmind: false, spss: true },
  { feature: 'No Internet Required', statmind: true, spss: false },
  { feature: 'Modern UI/UX', statmind: true, spss: false },
  { feature: 'Free Tier Available', statmind: true, spss: false },
  { feature: 'Cloud + Local Hybrid', statmind: true, spss: false },
]

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started with AI-powered analysis',
    features: [
      'Up to 5 datasets',
      'Basic AI analysis',
      'Offline mode',
      'CSV/Excel import',
      'Community support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professionals who need advanced capabilities',
    features: [
      'Unlimited datasets',
      'Advanced AI analysis',
      'OCR scanning',
      'All export formats',
      'Priority support',
      'Real-time collaboration',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with custom requirements',
    features: [
      'Custom AI models',
      'On-premise deployment',
      'API access',
      'Dedicated support',
      'SLA guarantee',
      'Team management',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const chatMessages = [
  {
    role: 'user' as const,
    text: 'Analyze the correlation between study hours and exam scores',
  },
  {
    role: 'ai' as const,
    text: 'Running Pearson correlation analysis... Found strong positive correlation (r=0.87, p<0.001). I\'ve also generated a scatter plot and regression model. Would you like me to run additional tests?',
  },
  {
    role: 'user' as const,
    text: 'Yes, add a simple linear regression',
  },
  {
    role: 'ai' as const,
    text: 'Regression complete: Exam Score = 12.3 + 7.8 \u00d7 Study Hours. R\u00b2 = 0.756, F(1,98) = 304.2, p < 0.001. The model explains 75.6% of the variance.',
  },
]

/* ─── main page ─── */
export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2"
          >
            <Image
              src="/images/logo.png"
              alt="StatMind AI"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold gradient-text">StatMind AI</span>
          </button>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => scrollTo('#pricing')}
              className="rounded-full px-5"
            >
              Get Started Free
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/images/logo.png"
                    alt="StatMind AI"
                    width={28}
                    height={28}
                    className="rounded"
                  />
                  StatMind AI
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8 px-4">
                {navLinks.map((l) => (
                  <button
                    key={l.href}
                    onClick={() => scrollTo(l.href)}
                    className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {l.label}
                  </button>
                ))}
                <Button
                  className="mt-4 rounded-full"
                  onClick={() => scrollTo('#pricing')}
                >
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col items-center"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-6"
              >
                <Sparkles className="size-3.5 text-primary" />
                Powered by Advanced AI
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1]"
            >
              Statistical Analysis,{' '}
              <span className="gradient-text">Reimagined with AI</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              The all-in-one platform that makes professional data analysis
              accessible to everyone. Works offline, auto-updates with AI, and
              eliminates the steep learning curve of traditional tools.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-4 mt-10"
            >
              <Button
                size="lg"
                className="rounded-full px-8 text-base h-12"
                onClick={() => scrollTo('#pricing')}
              >
                Start Analyzing Free
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base h-12"
                onClick={() => scrollTo('#demo')}
              >
                <Play className="size-4" />
                Watch Demo
              </Button>
            </motion.div>

            {/* stats row */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-14"
            >
              {[
                { label: '10K+ Users', icon: Users },
                { label: 'Offline Capable', icon: WifiOff },
                { label: 'AI-Powered', icon: Brain },
                { label: 'Free Tier', icon: Zap },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                >
                  <s.icon className="size-4 text-primary" />
                  {s.label}
                </div>
              ))}
            </motion.div>

            {/* hero image */}
            <motion.div
              variants={fadeUp}
              custom={5}
              className="mt-16 w-full max-w-4xl"
            >
              <div className="glow-border rounded-2xl overflow-hidden border border-border/30">
                <Image
                  src="/images/hero.png"
                  alt="StatMind AI Dashboard Preview"
                  width={1200}
                  height={680}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"
              >
                <Star className="size-3.5 text-primary" />
                Why StatMind AI
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Everything SPSS Can&apos;t Do,{' '}
                <span className="gradient-text">We Do Better</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Discover why thousands of researchers, data scientists, and
                analysts have switched to the smarter way to analyze data.
              </p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div key={f.title} variants={fadeUp} custom={i}>
                  <Card className="h-full hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                    <CardHeader>
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                        <f.icon className="size-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {f.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section id="comparison" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"
              >
                <BarChart3 className="size-3.5 text-primary" />
                Feature Comparison
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                <span className="gradient-text">StatMind AI</span> vs. SPSS
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                See how StatMind AI stacks up against the legacy statistical
                software.
              </p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-border">
                        <TableHead className="text-base font-semibold pl-6 py-4 w-2/5">
                          Feature
                        </TableHead>
                        <TableHead className="text-base font-semibold py-4 text-center">
                          <span className="gradient-text font-bold">
                            StatMind AI
                          </span>
                        </TableHead>
                        <TableHead className="text-base font-semibold py-4 text-center text-muted-foreground">
                          SPSS
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row, i) => (
                        <TableRow
                          key={row.feature}
                          className={
                            i % 2 === 0 ? 'bg-muted/20' : ''
                          }
                        >
                          <TableCell className="font-medium pl-6 py-3.5">
                            {row.feature}
                          </TableCell>
                          <TableCell className="py-3.5 text-center">
                            {row.statmind ? (
                              <span className="inline-flex items-center justify-center size-7 rounded-full bg-emerald-500/10 text-emerald-400">
                                <Check className="size-4" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center size-7 rounded-full bg-rose-500/10 text-rose-400">
                                <X className="size-4" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 text-center">
                            {row.spss ? (
                              <span className="inline-flex items-center justify-center size-7 rounded-full bg-rose-500/10 text-rose-400">
                                <Check className="size-4" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center size-7 rounded-full bg-muted text-muted-foreground">
                                <X className="size-4" />
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── DEMO ─── */}
      <section id="demo" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"
              >
                <Play className="size-3.5 text-primary" />
                Interactive Demo
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                See the <span className="gradient-text">AI in Action</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Watch how StatMind AI turns natural language questions into
                professional statistical analysis in seconds.
              </p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <Card className="overflow-hidden border-primary/20 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Chat panel */}
                    <div className="border-b lg:border-b-0 lg:border-r border-border p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-emerald-400">
                          AI Analysis Session
                        </span>
                      </div>
                      <div className="space-y-4">
                        {chatMessages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.4 }}
                            className={`flex gap-3 ${
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {msg.role === 'ai' && (
                              <div className="flex-shrink-0 size-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                                <Brain className="size-4 text-primary" />
                              </div>
                            )}
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              {msg.text}
                              {i === chatMessages.length - 1 && (
                                <span className="inline-block w-2 h-4 ml-1 bg-current/60 animate-pulse rounded-sm" />
                              )}
                            </div>
                            {msg.role === 'user' && (
                              <div className="flex-shrink-0 size-8 rounded-lg bg-accent/20 flex items-center justify-center mt-1">
                                <Users className="size-4 text-accent" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Chart panel */}
                    <div className="p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-5">
                          <BarChart3 className="size-4 text-primary" />
                          <span className="text-sm font-semibold">
                            Scatter Plot + Regression Line
                          </span>
                        </div>
                        {/* SVG chart */}
                        <div className="rounded-xl bg-muted/50 border border-border/50 p-4 aspect-[4/3] relative overflow-hidden">
                          <svg
                            viewBox="0 0 400 280"
                            className="w-full h-full"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4].map((i) => (
                              <line
                                key={`hg-${i}`}
                                x1="50"
                                y1={40 + i * 52}
                                x2="380"
                                y2={40 + i * 52}
                                stroke="currentColor"
                                strokeOpacity="0.06"
                                strokeWidth="1"
                              />
                            ))}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <line
                                key={`vg-${i}`}
                                x1={50 + i * 66}
                                y1="40"
                                x2={50 + i * 66}
                                y2="250"
                                stroke="currentColor"
                                strokeOpacity="0.06"
                                strokeWidth="1"
                              />
                            ))}

                            {/* Axes */}
                            <line
                              x1="50"
                              y1="250"
                              x2="380"
                              y2="250"
                              stroke="currentColor"
                              strokeOpacity="0.2"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="50"
                              y1="40"
                              x2="50"
                              y2="250"
                              stroke="currentColor"
                              strokeOpacity="0.2"
                              strokeWidth="1.5"
                            />

                            {/* Y axis labels */}
                            <text
                              x="42"
                              y="254"
                              textAnchor="end"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              0
                            </text>
                            <text
                              x="42"
                              y="148"
                              textAnchor="end"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              50
                            </text>
                            <text
                              x="42"
                              y="46"
                              textAnchor="end"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              100
                            </text>

                            {/* X axis labels */}
                            <text
                              x="50"
                              y="268"
                              textAnchor="middle"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              0
                            </text>
                            <text
                              x="216"
                              y="268"
                              textAnchor="middle"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              5
                            </text>
                            <text
                              x="380"
                              y="268"
                              textAnchor="middle"
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              10
                            </text>

                            {/* Regression line */}
                            <line
                              x1="50"
                              y1="230"
                              x2="380"
                              y2="55"
                              stroke="oklch(0.72 0.15 175)"
                              strokeWidth="2"
                              strokeDasharray="6 3"
                              opacity="0.7"
                            />

                            {/* Data points - scattered around regression line */}
                            {[
                              [65, 225],
                              [80, 210],
                              [95, 198],
                              [110, 190],
                              [125, 175],
                              [138, 165],
                              [155, 158],
                              [168, 145],
                              [182, 135],
                              [195, 128],
                              [210, 118],
                              [220, 112],
                              [235, 105],
                              [248, 95],
                              [260, 90],
                              [275, 82],
                              [288, 75],
                              [300, 70],
                              [315, 60],
                              [330, 55],
                              [345, 50],
                              [358, 48],
                              [370, 42],
                              [90, 215],
                              [130, 180],
                              [170, 155],
                              [200, 130],
                              [240, 110],
                              [270, 88],
                              [300, 72],
                              [340, 55],
                              [100, 205],
                              [150, 170],
                              [190, 140],
                              [230, 115],
                              [260, 98],
                              [290, 80],
                              [320, 65],
                              [355, 50],
                            ].map((p, i) => (
                              <circle
                                key={i}
                                cx={p[0]}
                                cy={p[1]}
                                r="4"
                                fill="oklch(0.62 0.22 262.881)"
                                opacity="0.6"
                              >
                                <animate
                                  attributeName="opacity"
                                  values="0.4;0.8;0.4"
                                  dur={`${3 + (i % 5) * 0.5}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            ))}
                          </svg>
                        </div>
                      </div>

                      {/* Stats badges */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        <Badge
                          variant="outline"
                          className="rounded-lg px-3 py-1.5 text-sm border-primary/30 bg-primary/5"
                        >
                          R&sup2; = 0.756
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-lg px-3 py-1.5 text-sm border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        >
                          p &lt; 0.001
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-lg px-3 py-1.5 text-sm border-accent/30 bg-accent/5"
                        >
                          n = 100
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"
              >
                <Zap className="size-3.5 text-primary" />
                Pricing
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Simple, <span className="gradient-text">Transparent Pricing</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Choose the plan that fits your needs. Start free and scale as
                you grow.
              </p>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={fadeUp}
                  custom={i}
                  className={plan.highlighted ? 'md:-mt-4 md:mb-[-16px]' : ''}
                >
                  <Card
                    className={`h-full relative flex flex-col ${
                      plan.highlighted
                        ? 'border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
                        : ''
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="rounded-full px-4 py-1 bg-primary text-primary-foreground shadow-md shadow-primary/20">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-muted-foreground">
                        {plan.name}
                      </CardTitle>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-extrabold tracking-tight">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-muted-foreground text-sm">
                            {plan.period}
                          </span>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3 mt-2">
                        {plan.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="size-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className={`w-full rounded-full ${
                          plan.highlighted
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            : ''
                        }`}
                        variant={plan.highlighted ? 'default' : 'outline'}
                      >
                        {plan.cta}
                        <ChevronRight className="size-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-auto border-t border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="StatMind AI"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-bold gradient-text">
                  StatMind AI
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Making professional statistical analysis accessible to everyone
                through the power of artificial intelligence.
              </p>
            </div>

            {/* product */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Updates', 'Roadmap'].map((l) => (
                  <li key={l}>
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* resources */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {['Documentation', 'Tutorials', 'API', 'Community'].map((l) => (
                  <li key={l}>
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* company */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                  <li key={l}>
                    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 StatMind AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </button>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
