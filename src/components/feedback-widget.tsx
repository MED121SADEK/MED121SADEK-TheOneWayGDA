'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Star, X, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

// ──────────────────────────────────────────────────────────
// Types & Constants
// ──────────────────────────────────────────────────────────

type FeedbackCategory = 'bug' | 'feature' | 'general' | 'uiux'

interface FeedbackEntry {
  id: string
  rating: number
  category: FeedbackCategory
  message: string
  email?: string
  page: string
  userAgent: string
  timestamp: string
}

const STORAGE_KEY = 'oneway-feedback'

const CATEGORIES: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '💡' },
  { value: 'general', label: 'General Feedback', icon: '💬' },
  { value: 'uiux', label: 'UI/UX Improvement', icon: '🎨' },
]

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent']

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function saveFeedback(entry: FeedbackEntry) {
  if (typeof window === 'undefined') return
  try {
    const existing: FeedbackEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    existing.push(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // Storage full — silently fail
  }
}

// ──────────────────────────────────────────────────────────
// Star Rating Sub-component
// ──────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="relative p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`size-7 transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {STAR_LABELS[value]} ({value}/5)
        </span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const resetForm = useCallback(() => {
    setRating(0)
    setCategory('')
    setMessage('')
    setEmail('')
    setIsSubmitting(false)
    setIsSuccess(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!rating) {
        toast.error('Please select a rating')
        return
      }
      if (!category) {
        toast.error('Please select a category')
        return
      }
      if (!message.trim()) {
        toast.error('Please write your feedback')
        return
      }

      setIsSubmitting(true)

      const entry: FeedbackEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        rating,
        category: category as FeedbackCategory,
        message: message.trim(),
        email: email.trim() || undefined,
        page: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }

      // Save to localStorage
      saveFeedback(entry)

      // Send to API (fire and forget)
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
      } catch {
        // API unavailable — feedback is still saved locally
      }

      setIsSubmitting(false)
      setIsSuccess(true)
      toast.success('Thank you for your feedback! 🎉')

      // Close dialog after a brief delay
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 1500)
    },
    [rating, category, message, email, resetForm]
  )

  // Animation variants
  const fabVariants = {
    idle: { scale: 1 },
    pulse: {
      scale: [1, 1.06, 1],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
    },
  }

  return (
    <div className="fixed bottom-24 right-6 z-[9989] flex flex-col items-end">
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogTrigger asChild>
          <motion.button
            variants={fabVariants}
            animate="pulse"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex size-12 items-center justify-center rounded-xl border border-border/40 bg-card/90 text-muted-foreground shadow-lg shadow-black/20 backdrop-blur-xl transition-colors hover:text-foreground hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Send feedback"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-primary/0 blur-xl transition-all group-hover:bg-primary/20 group-hover:blur-lg" />
            <MessageSquare className="relative size-5" />
          </motion.button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[460px] gap-0 p-0 overflow-hidden rounded-xl">
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-violet-600/10 via-primary/5 to-cyan-600/10 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-md shadow-violet-500/20">
                  <MessageSquare className="size-4 text-white" />
                </div>
                Send Feedback
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Help us improve TheOneWayGDA. Your feedback matters.
              </DialogDescription>
            </DialogHeader>
          </div>

          {isSuccess ? (
            /* ── Success State ── */
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              >
                <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 shadow-inner">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-sm font-medium text-foreground"
              >
                Feedback submitted successfully!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-1 text-xs text-muted-foreground"
              >
                Thanks for helping us make the platform better.
              </motion.p>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
              {/* Star Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  How would you rate your experience?
                </Label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="feedback-category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as FeedbackCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
                  Your Feedback
                </Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think, what went wrong, or what you'd like to see..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground/60 text-right">
                  {message.length}/1000
                </p>
              </div>

              {/* Email (optional) */}
              <div className="space-y-2">
                <Label htmlFor="feedback-email" className="text-sm font-medium text-foreground">
                  Email <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-9"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Send className="size-4" />
                      </motion.div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setOpen(false); resetForm() }}
                  className="gap-1"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
