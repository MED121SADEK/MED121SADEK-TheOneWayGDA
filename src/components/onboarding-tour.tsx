'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  LayoutGrid,
  Users,
  Rocket,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────
// Types & Constants
// ──────────────────────────────────────────────────────────

const TOUR_KEY = 'oneway-tour-completed'

interface TourStep {
  icon: React.ReactNode
  title: string
  description: string
  illustration: React.ReactNode
}

const STEPS: TourStep[] = [
  {
    icon: <Sparkles className="size-8" />,
    title: 'Welcome to TheOneWayGDA',
    description:
      'Your all-in-one AI model comparison and analysis platform. Compare models, run workflows, and collaborate with a growing community of AI practitioners.',
    illustration: (
      <div className="relative flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-border/30">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={52} height={52} className="rounded-xl" />
          </div>
          <motion.div
            className="absolute -inset-2 rounded-2xl border border-primary/20"
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium gradient-text-premium">
          <Sparkles className="size-3.5" />
          AI-Powered Analysis Platform
        </div>
      </div>
    ),
  },
  {
    icon: <Trophy className="size-8" />,
    title: 'AI Model Leaderboard',
    description:
      'Compare 50+ AI models with real-time benchmarks. Track performance across accuracy, speed, cost, and more. Make data-driven decisions for your AI stack.',
    illustration: (
      <div className="flex flex-col gap-2 py-4 px-2">
        {[
          { rank: '🥇', name: 'GPT-4o', score: 94.2, color: 'from-amber-500/20 to-amber-600/10' },
          { rank: '🥈', name: 'Claude 3.5', score: 93.8, color: 'from-slate-400/20 to-slate-500/10' },
          { rank: '🥉', name: 'GLM-4', score: 92.1, color: 'from-orange-400/20 to-orange-500/10' },
        ].map((model) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex items-center gap-3 rounded-xl bg-gradient-to-r ${model.color} border border-border/30 px-4 py-2.5`}
          >
            <span className="text-lg">{model.rank}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{model.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold gradient-text-premium">{model.score}</p>
            </div>
          </motion.div>
        ))}
        <p className="text-center text-[11px] text-muted-foreground mt-1">+ 47 more models tracked</p>
      </div>
    ),
  },
  {
    icon: <LayoutGrid className="size-8" />,
    title: 'AI Workspace',
    description:
      'Run AI-powered analysis workflows with 7 specialist assistants. From data analysis to report generation, automate your entire analytics pipeline.',
    illustration: (
      <div className="grid grid-cols-2 gap-2 py-4 px-2">
        {[
          { emoji: '📊', label: 'Data Analyst' },
          { emoji: '🤖', label: 'ML Engineer' },
          { emoji: '📈', label: 'Statistician' },
          { emoji: '💻', label: 'Code Gen' },
          { emoji: '📝', label: 'Report Writer' },
          { emoji: '🔬', label: 'Researcher' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5"
          >
            <span className="text-base">{item.emoji}</span>
            <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    icon: <Users className="size-8" />,
    title: 'Community & Collaboration',
    description:
      'Join the community, share workflows, and stay updated. Collaborate with teams, publish analyses, and learn from fellow AI practitioners.',
    illustration: (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex -space-x-2">
          {['🧑‍💻', '👩‍🔬', '👨‍🎓', '👩‍💼', '🧑‍🎨'].map((emoji, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex size-10 items-center justify-center rounded-full border-2 border-background bg-muted text-lg"
            >
              {emoji}
            </motion.div>
          ))}
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-[10px] font-bold text-primary">
            +2k
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 px-4 py-2.5">
          <span className="text-lg">🚀</span>
          <div>
            <p className="text-xs font-semibold text-foreground">500+ workflows shared</p>
            <p className="text-[10px] text-muted-foreground">Community-powered AI analysis</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Rocket className="size-8" />,
    title: "You're All Set!",
    description:
      'Explore the platform, compare AI models, run workflows, and join the community. Your AI-powered analytics journey starts now.',
    illustration: (
      <div className="flex flex-col items-center gap-3 py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
          className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Rocket className="size-10 text-emerald-400" />
          </motion.div>
        </motion.div>
        <div className="flex items-center gap-2">
          {['Compare', 'Analyze', 'Automate'].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.15 }}
              className="rounded-full border border-border/30 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
            >
              {word}
            </motion.span>
          ))}
        </div>
      </div>
    ),
  },
]

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────

export function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  // Check if tour has been completed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const completeTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_KEY, 'true')
    }
    setOpen(false)
  }, [])

  const nextStep = useCallback(() => {
    setDirection(1)
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeTour()
    }
  }, [currentStep, completeTour])

  const prevStep = useCallback(() => {
    setDirection(-1)
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  // Expose a replay function on window for settings access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as Record<string, () => void>).__oneway_replay_tour = () => {
        setCurrentStep(0)
        setDirection(1)
        setOpen(true)
      }
    }
  }, [])

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  // Animation variants for step content
  const contentVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) completeTour() }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header area with gradient */}
        <div className="relative bg-gradient-to-br from-primary/10 via-transparent to-accent/5 px-6 pt-6 pb-4">
          {/* Skip button */}
          {!isLastStep && (
            <button
              onClick={completeTour}
              className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Skip tour"
            >
              <X className="size-4" />
            </button>
          )}

          <DialogHeader>
            <DialogTitle className="sr-only">{step.title}</DialogTitle>
            <DialogDescription className="sr-only">{step.description}</DialogDescription>
          </DialogHeader>

          {/* Step icon */}
          <motion.div
            key={`icon-${currentStep}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary border border-primary/20"
          >
            {step.icon}
          </motion.div>

          {/* Title */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.h2
              key={`title-${currentStep}`}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-xl font-bold text-foreground leading-tight"
            >
              {step.title}
            </motion.h2>
          </AnimatePresence>

          {/* Description */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.p
              key={`desc-${currentStep}`}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.05 }}
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {step.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Illustration area */}
        <div className="px-6 min-h-[160px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`illust-${currentStep}`}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.08 }}
            >
              {step.illustration}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-border/30 px-6 py-4">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentStep ? 1 : -1)
                  setCurrentStep(i)
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'h-2 w-6 bg-primary'
                    : 'size-2 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <div>
              {!isFirstStep ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="text-muted-foreground hover:text-foreground gap-1"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={completeTour}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={nextStep}
              className="rounded-full px-5 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity gap-1"
            >
              {isLastStep ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
