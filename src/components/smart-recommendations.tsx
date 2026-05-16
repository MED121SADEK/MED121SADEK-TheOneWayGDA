'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutGrid,
  Workflow,
  ThumbsDown,
  ExternalLink,
  Lightbulb,
} from 'lucide-react'
import { recommendationEngine, type Recommendation, type RecommendationType } from '@/lib/recommendations'

// ─── Icon mapping for recommendation types ──────────────────

const TYPE_ICONS: Record<RecommendationType, React.ReactNode> = {
  model: <Cpu className="size-4" />,
  feature: <LayoutGrid className="size-4" />,
  workflow: <Workflow className="size-4" />,
}

const TYPE_COLORS: Record<RecommendationType, string> = {
  model: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20',
  feature: 'from-amber-500/20 to-orange-500/20 border-amber-500/20',
  workflow: 'from-violet-500/20 to-purple-500/20 border-violet-500/20',
}

const TYPE_ICON_BG: Record<RecommendationType, string> = {
  model: 'bg-emerald-500/15 text-emerald-400',
  feature: 'bg-amber-500/15 text-amber-400',
  workflow: 'bg-violet-500/15 text-violet-400',
}

const TYPE_LABELS: Record<RecommendationType, string> = {
  model: 'Model',
  feature: 'Feature',
  workflow: 'Workflow',
}

// ─── Card entrance animation ────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
  exit: {
    opacity: 0,
    x: -40,
    scale: 0.9,
    transition: { duration: 0.25 },
  },
}

// ─── Main Component ─────────────────────────────────────────

export default function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => {
    // Initialize on first render (client-only)
    if (typeof window !== 'undefined') {
      recommendationEngine.init()
      return recommendationEngine.getRecommendations()
    }
    return []
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)

  // Compute visibility derived from state
  const isVisible = recommendations.length > 0 && !isDismissed

  const handleDismissCard = useCallback((id: string) => {
    recommendationEngine.dismiss(id)
    setRecommendations((prev) => {
      const updated = prev.filter((r) => r.id !== id)
      if (currentIndex >= updated.length && updated.length > 0) {
        setCurrentIndex(Math.max(0, updated.length - 1))
      }
      return updated
    })
  }, [currentIndex])

  const handleDismissAll = useCallback(() => {
    setIsDismissed(true)
    // Also clear recommendation state
    setRecommendations([])
  }, [])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : recommendations.length - 1))
  }, [recommendations.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < recommendations.length - 1 ? prev + 1 : 0))
  }, [recommendations.length])

  // No recommendations or dismissed
  if (!isVisible || recommendations.length === 0) return null

  const current = recommendations[currentIndex]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30, transition: { duration: 0.3 } }}
        className="fixed bottom-6 left-6 z-[9980] w-80"
      >
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Lightbulb className="size-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recommended for You</h3>
                <p className="text-[10px] text-muted-foreground">Based on your activity</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={handleDismissAll}
                    aria-label="Dismiss recommendations"
                  >
                    <X className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Dismiss</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── Recommendation Cards Carousel ── */}
          <div className="relative p-3">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id}
                  custom={currentIndex}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`rounded-xl border bg-gradient-to-br p-3.5 ${TYPE_COLORS[current.type]}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${TYPE_ICON_BG[current.type]}`}>
                      {TYPE_ICONS[current.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-border/30 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                        >
                          {TYPE_LABELS[current.type]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {current.score}% match
                        </span>
                      </div>

                      <h4 className="mt-1.5 text-sm font-semibold text-foreground leading-snug">
                        {current.title}
                      </h4>

                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {current.reason}
                      </p>

                      {/* Action row */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 text-[11px] font-medium text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/30"
                          onClick={() => {
                            // Track the recommendation click
                            recommendationEngine.trackAction('use_recommendation', {
                              recommendationId: current.id,
                              recommendationType: current.type,
                            })
                          }}
                        >
                          <ExternalLink className="size-3" />
                          Explore
                        </Button>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDismissCard(current.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/30 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
                              aria-label="Not interested"
                            >
                              <ThumbsDown className="size-2.5" />
                              Not interested
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Remove this suggestion</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            {recommendations.length > 1 && (
              <div className="mt-2.5 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handlePrev}
                  aria-label="Previous recommendation"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {recommendations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`size-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? 'w-4 bg-primary'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={`Go to recommendation ${idx + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleNext}
                  aria-label="Next recommendation"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border/20 px-4 py-2">
            <p className="text-center text-[10px] text-muted-foreground/50">
              <Sparkles className="mr-1 inline size-2.5" />
              AI-powered suggestions improve as you use the platform
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
