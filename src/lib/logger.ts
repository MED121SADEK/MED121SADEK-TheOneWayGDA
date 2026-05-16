/**
 * Structured Logger for The One-Way
 *
 * Provides consistent, structured JSON logging across the entire application.
 * Supports: log levels, context enrichment, timing, error tracking.
 * Output: JSON for production, colored text for development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('AI query completed', { context: 'workspace', tokens: 150, duration: 200 })
 *   logger.error('Pipeline failed', { pipelineId: 'abc', error: err.message })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  [key: string]: unknown
}

class StructuredLogger {
  private context: Record<string, unknown> = {}
  private minLevel: LogLevel

  constructor(defaultContext?: Record<string, unknown>) {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
    if (defaultContext) {
      this.context = defaultContext
    }
  }

  /** Create a child logger with additional context */
  child(additionalContext: Record<string, unknown>): StructuredLogger {
    const child = new StructuredLogger({ ...this.context, ...additionalContext })
    child.minLevel = this.minLevel
    return child
  }

  /** Add persistent context fields */
  with(fields: Record<string, unknown>): StructuredLogger {
    const child = new StructuredLogger({ ...this.context, ...fields })
    child.minLevel = this.minLevel
    return child
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('error', message, data)
  }

  fatal(message: string, data?: Record<string, unknown>) {
    this.log('fatal', message, data)
  }

  /** Time an async operation */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.info(`${label} completed`, { durationMs: duration })
      return result
    } catch (error: unknown) {
      const duration = Date.now() - start
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.error(`${label} failed`, { durationMs: duration, error: msg })
      throw error
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    }

    if (levels[level] < levels[this.minLevel]) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    }

    // Remove undefined values
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(entry)) {
      if (value !== undefined) clean[key] = value
    }

    if (process.env.LOG_FORMAT === 'text' || process.env.NODE_ENV === 'development') {
      this.logText(clean)
    } else {
      console.log(JSON.stringify(clean))
    }
  }

  private logText(entry: Record<string, unknown>) {
    const level = entry.level as string
    const colors: Record<string, string> = {
      debug: '\x1b[36m',  // Cyan
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      fatal: '\x1b[35m',  // Magenta
    }
    const reset = '\x1b[0m'
    const color = colors[level] || reset
    const timestamp = entry.timestamp as string
    const time = timestamp.split('T')[1]?.split('.')[0] || timestamp

    const parts = [`${color}${level.toUpperCase().padEnd(5)}${reset}`, time, entry.message as string]

    // Add context fields (skip common ones)
    for (const [key, value] of Object.entries(entry)) {
      if (['timestamp', 'level', 'message'].includes(key)) continue
      if (typeof value === 'string' || typeof value === 'number') {
        parts.push(`${key}=${value}`)
      }
    }

    console.log(parts.join('  '))
  }
}

// Default logger instance
export const logger = new StructuredLogger({
  service: 'the-one-way',
  version: '2.5.0',
  environment: process.env.NODE_ENV || 'development',
})

// Pre-configured loggers for common use cases
export const aiLogger = logger.child({ domain: 'ai' })
export const apiLogger = logger.child({ domain: 'api' })
export const dbLogger = logger.child({ domain: 'database' })
export const auditLogger = logger.child({ domain: 'audit' })
