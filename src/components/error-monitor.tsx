'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bug,
  Globe,
  Wifi,
  ShieldCheck,
  Layout,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  CircleDot,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ErrorTracker, type TrackedError, type ErrorStats } from '@/lib/error-tracker'

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  runtime: { icon: Bug, color: 'text-amber-500', label: 'Runtime' },
  network: { icon: Wifi, color: 'text-red-500', label: 'Network' },
  auth: { icon: ShieldCheck, color: 'text-rose-500', label: 'Auth' },
  ui: { icon: Layout, color: 'text-violet-500', label: 'UI' },
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  onerror: { label: 'Global', color: 'bg-red-500' },
  unhandledrejection: { label: 'Promise', color: 'bg-orange-500' },
  react: { label: 'React', color: 'bg-violet-500' },
  manual: { label: 'Manual', color: 'bg-sky-500' },
}

const TREND_ICONS = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

function ErrorRow({ error }: { error: TrackedError }) {
  const [expanded, setExpanded] = useState(false)
  const catConfig = CATEGORY_CONFIG[error.category] || CATEGORY_CONFIG.runtime
  const srcConfig = SOURCE_CONFIG[error.source] || SOURCE_CONFIG.manual
  const CatIcon = catConfig.icon

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-md"
      >
        <div className="mt-0.5 flex-shrink-0">
          <CatIcon className={`size-4 ${catConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-foreground truncate">
              {error.message.length > 80 ? error.message.slice(0, 80) + '...' : error.message}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(error.timestamp)}
            </span>
            <span className={`inline-block size-1.5 rounded-full ${srcConfig.color}`} title={srcConfig.label} />
          </div>
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 ml-7">
              <div className="rounded-lg bg-muted/40 border border-border/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {catConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {srcConfig.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    ID: {error.id.slice(0, 8)}
                  </span>
                </div>
                {error.stack && (
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap leading-relaxed">
                    {error.stack}
                  </pre>
                )}
                {error.extra && Object.keys(error.extra).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(error.extra).map(([key, value]) => (
                      <p key={key} className="text-[10px] text-muted-foreground">
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'string'
                          ? value.length > 100 ? value.slice(0, 100) + '...' : value
                          : String(value)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatsPanel({ stats }: { stats: ErrorStats }) {
  const TrendIcon = TREND_ICONS[stats.recentTrend]

  const trendColor =
    stats.recentTrend === 'increasing'
      ? 'text-red-500'
      : stats.recentTrend === 'decreasing'
        ? 'text-emerald-500'
        : 'text-amber-500'

  return (
    <div className="px-4 py-3 border-b border-border/30">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{stats.lastHour}</p>
          <p className="text-[10px] text-muted-foreground">Last Hour</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{stats.lastDay}</p>
          <p className="text-[10px] text-muted-foreground">Last Day</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(stats.byCategory).map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat]
            const num = count as number
            if (!config || num === 0) return null
            const Icon = config.icon
            return (
              <div key={cat} className="flex items-center gap-1">
                <Icon className={`size-3 ${config.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground">{num}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`size-3 ${trendColor}`} />
          <span className={`text-[10px] font-medium capitalize ${trendColor}`}>
            {stats.recentTrend}
          </span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────

export function ErrorMonitor() {
  const [isOpen, setIsOpen] = useState(false)
  const [errors, setErrors] = useState<TrackedError[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)

  // Initialize ErrorTracker on mount
  useEffect(() => {
    ErrorTracker.init()
  }, [])

  // Poll errors every 2 seconds
  useEffect(() => {
    const refresh = () => {
      setErrors(ErrorTracker.getErrors().slice(0, 50))
      setStats(ErrorTracker.getErrorStats())
    }

    refresh()
    const interval = setInterval(refresh, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleClear = useCallback(() => {
    ErrorTracker.clear()
    setErrors([])
    setStats(ErrorTracker.getErrorStats())
  }, [])

  // Only visible in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const errorCount = stats?.total ?? errors.length
  const hasErrors = errorCount > 0
  const hasRecentErrors = (stats?.lastHour ?? 0) > 0

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-3 w-[400px] max-h-[520px] flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
                  <Bug className="size-3.5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Error Monitor</h3>
                  <p className="text-[10px] text-muted-foreground">Development only</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                  aria-label="Clear all errors"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close error monitor"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            {stats && <StatsPanel stats={stats} />}

            {/* Error List */}
            <ScrollArea className="flex-1">
              {errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <CircleDot className="size-6 text-emerald-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No errors</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Everything looks clean! Errors will appear here as they occur.
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {errors.map((err) => (
                    <ErrorRow key={err.id} error={err} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <Separator />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {errors.length} error{errors.length !== 1 ? 's' : ''} tracked
              </span>
              <span className="text-[10px] text-muted-foreground">
                Refreshes every 2s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge / Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-xl
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          ${
            hasRecentErrors
              ? 'border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : hasErrors
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                : 'border-border/40 bg-card/90 text-muted-foreground hover:text-foreground'
          }
        `}
        aria-label={`Error monitor: ${errorCount} errors`}
      >
        {hasRecentErrors ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AlertTriangle className="size-4" />
          </motion.div>
        ) : hasErrors ? (
          <Zap className="size-4" />
        ) : (
          <Bug className="size-4" />
        )}
        <span className="text-xs font-semibold tabular-nums">{errorCount}</span>
      </motion.button>
    </div>
  )
}
