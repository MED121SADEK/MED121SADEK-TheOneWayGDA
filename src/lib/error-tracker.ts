// ──────────────────────────────────────────────────────────
// ErrorTracker — Client-side error tracking utility
// ──────────────────────────────────────────────────────────

export type ErrorCategory = 'runtime' | 'network' | 'auth' | 'ui'

export interface TrackedError {
  id: string
  timestamp: string
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  category: ErrorCategory
  source: 'onerror' | 'unhandledrejection' | 'react' | 'manual'
  extra?: Record<string, unknown>
}

export interface ErrorStats {
  total: number
  byCategory: Record<ErrorCategory, number>
  bySource: Record<string, number>
  recentTrend: 'increasing' | 'stable' | 'decreasing'
  lastHour: number
  lastDay: number
}

const STORAGE_KEY = 'oneway-error-tracker'
const MAX_MEMORY = 100
const MAX_STORAGE = 20

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function categorizeError(message: string, source: string): ErrorCategory {
  const msg = message.toLowerCase()

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('econnrefused') ||
    msg.includes('failed to fetch') ||
    msg.includes('net::') ||
    source === 'unhandledrejection'
  ) {
    return 'network'
  }

  if (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('token') ||
    msg.includes('session') ||
    msg.includes('auth')
  ) {
    return 'auth'
  }

  if (
    msg.includes('render') ||
    msg.includes('component') ||
    msg.includes('hook') ||
    msg.includes('hydration') ||
    msg.includes('dom') ||
    msg.includes('layout') ||
    source === 'react'
  ) {
    return 'ui'
  }

  return 'runtime'
}

// ──────────────────────────────────────────────────────────
// In-memory store (max 100 errors)
// ──────────────────────────────────────────────────────────

let errorBuffer: TrackedError[] = []
let isInitialized = false

// ──────────────────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────────────────

function loadFromStorage(): TrackedError[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as TrackedError[]
  } catch {
    return []
  }
}

function saveToStorage(errors: TrackedError[]) {
  if (typeof window === 'undefined') return
  try {
    // Keep only the most recent MAX_STORAGE errors
    const trimmed = errors.slice(-MAX_STORAGE)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full — silently fail
  }
}

// ──────────────────────────────────────────────────────────
// Core tracking function
// ──────────────────────────────────────────────────────────

function trackError(
  error: Error | string,
  options: {
    source?: TrackedError['source']
    extra?: Record<string, unknown>
    module?: string
    componentStack?: string
  } = {}
): TrackedError {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  const trackedError: TrackedError = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    message,
    stack: stack?.slice(0, 2000),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    category: categorizeError(message, options.source || 'manual'),
    source: options.source || 'manual',
    extra: {
      ...options.extra,
      ...(options.module ? { module: options.module } : {}),
      ...(options.componentStack ? { componentStack: options.componentStack } : {}),
    },
  }

  // Add to memory buffer
  errorBuffer.push(trackedError)
  if (errorBuffer.length > MAX_MEMORY) {
    errorBuffer = errorBuffer.slice(-MAX_MEMORY)
  }

  // Persist to localStorage
  const stored = loadFromStorage()
  stored.push(trackedError)
  saveToStorage(stored)

  return trackedError
}

// ──────────────────────────────────────────────────────────
// Global handlers
// ──────────────────────────────────────────────────────────

function handleWindowError(
  msg: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
) {
  const message = error?.message || String(msg)
  trackError(error || new Error(message), {
    source: 'onerror',
    extra: {
      ...(source ? { source } : {}),
      ...(lineno ? { lineno } : {}),
      ...(colno ? { colno } : {}),
    },
  })
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason
  const message = reason instanceof Error ? reason.message : String(reason)
  trackError(reason instanceof Error ? reason : new Error(message), {
    source: 'unhandledrejection',
  })
}

// ──────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────

export const ErrorTracker = {
  /**
   * Initialize global error handlers.
   * Safe to call multiple times — only sets up once.
   */
  init() {
    if (typeof window === 'undefined') return
    if (isInitialized) return
    isInitialized = true

    window.onerror = handleWindowError
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Pre-load stored errors into memory
    const stored = loadFromStorage()
    errorBuffer = stored.slice(-MAX_MEMORY)
  },

  /**
   * Track an error manually.
   */
  trackError,

  /**
   * Retrieve all captured errors (memory + storage combined, deduped).
   */
  getErrors(): TrackedError[] {
    const stored = loadFromStorage()
    // Merge and deduplicate by id
    const map = new Map<string, TrackedError>()
    for (const e of stored) map.set(e.id, e)
    for (const e of errorBuffer) map.set(e.id, e)
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  },

  /**
   * Clear all errors from memory and localStorage.
   */
  clear() {
    errorBuffer = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  /**
   * Get summary statistics about captured errors.
   */
  getErrorStats(): ErrorStats {
    const errors = this.getErrors()
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const byCategory: Record<ErrorCategory, number> = {
      runtime: 0,
      network: 0,
      auth: 0,
      ui: 0,
    }
    const bySource: Record<string, number> = {}

    let lastHour = 0
    let lastDay = 0

    for (const err of errors) {
      const ts = new Date(err.timestamp).getTime()
      byCategory[err.category]++
      bySource[err.source] = (bySource[err.source] || 0) + 1
      if (ts > oneHourAgo) lastHour++
      if (ts > oneDayAgo) lastDay++
    }

    // Calculate trend: compare first half vs second half (last 20 errors)
    let recentTrend: ErrorStats['recentTrend'] = 'stable'
    const recent = errors.slice(0, 20)
    if (recent.length >= 4) {
      const mid = Math.floor(recent.length / 2)
      const firstHalf = mid
      const secondHalf = recent.length - mid
      if (secondHalf > firstHalf * 1.5) recentTrend = 'increasing'
      else if (firstHalf > secondHalf * 1.5) recentTrend = 'decreasing'
    }

    return {
      total: errors.length,
      byCategory,
      bySource,
      recentTrend,
      lastHour,
      lastDay,
    }
  },
}
