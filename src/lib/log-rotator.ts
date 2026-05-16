/**
 * Log Rotator for The One-Way
 *
 * Provides file-based logging with automatic rotation.
 * Writes structured JSON logs to disk and rotates when size limits are reached.
 *
 * Features:
 *  - Size-based rotation (default: 10MB per file)
 *  - Count-based retention (default: 5 files)
 *  - Automatic cleanup of old logs
 *  - Synchronous write for server-side usage
 *  - Thread-safe append operations
 */

import { appendFileSync, existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'

interface LogRotatorConfig {
  /** Directory for log files */
  logDir: string
  /** Maximum size per log file in bytes (default: 10MB) */
  maxSizeBytes: number
  /** Maximum number of rotated log files to keep (default: 5) */
  maxFiles: number
  /** Base filename */
  baseName: string
}

const DEFAULT_CONFIG: LogRotatorConfig = {
  logDir: process.env.LOG_DIR || join(process.cwd(), 'logs'),
  maxSizeBytes: (parseInt(process.env.LOG_MAX_SIZE_MB || '10')) * 1024 * 1024,
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  baseName: 'application',
}

class LogRotator {
  private config: LogRotatorConfig
  private initialized = false

  constructor(config?: Partial<LogRotatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Ensure log directory exists */
  private init() {
    if (this.initialized) return
    try {
      if (!existsSync(this.config.logDir)) {
        mkdirSync(this.config.logDir, { recursive: true })
      }
      this.initialized = true
    } catch {
      // Log directory not available (e.g., read-only filesystem)
      console.warn('[LogRotator] Cannot create log directory, file logging disabled')
    }
  }

  /** Get the current log file path */
  private getCurrentFilePath(): string {
    return join(this.config.logDir, `${this.config.baseName}.log`)
  }

  /** Get the path for a rotated log file */
  private getRotatedFilePath(index: number): string {
    return join(this.config.logDir, `${this.config.baseName}.log.${index}`)
  }

  /** Check if rotation is needed and perform it */
  private rotateIfNeeded() {
    try {
      const currentFile = this.getCurrentFilePath()
      if (!existsSync(currentFile)) return

      const stats = statSync(currentFile)
      if (stats.size < this.config.maxSizeBytes) return

      // Shift existing rotated files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const olderFile = this.getRotatedFilePath(i)
        const newerFile = this.getRotatedFilePath(i - 1) === currentFile
          ? currentFile
          : this.getRotatedFilePath(i - 1)

        if (existsSync(newerFile)) {
          if (existsSync(olderFile)) {
            unlinkSync(olderFile)
          }
          // Rename is atomic on most filesystems
          const fs = require('fs')
          fs.renameSync(newerFile, olderFile)
        }
      }

      // Move current file to .log.1
      const firstRotated = this.getRotatedFilePath(1)
      if (existsSync(firstRotated)) {
        unlinkSync(firstRotated)
      }
      const fs = require('fs')
      fs.renameSync(currentFile, firstRotated)
    } catch {
      // Rotation failed — non-critical, just continue writing
    }
  }

  /** Write a log entry to the current file */
  write(entry: Record<string, unknown>) {
    this.init()
    if (!this.initialized) return

    try {
      this.rotateIfNeeded()
      const line = JSON.stringify(entry) + '\n'
      appendFileSync(this.getCurrentFilePath(), line, 'utf-8')
    } catch {
      // File write failed — fall back to console
      console.log('[LogRotator:WriteFailed]', entry)
    }
  }

  /** Get total size of all log files in bytes */
  getTotalSize(): number {
    this.init()
    let total = 0
    try {
      const files = readdirSync(this.config.logDir)
      for (const file of files) {
        if (file.startsWith(this.config.baseName)) {
          const stats = statSync(join(this.config.logDir, file))
          total += stats.size
        }
      }
    } catch {
      // Ignore
    }
    return total
  }

  /** Get count of log files */
  getFileCount(): number {
    this.init()
    try {
      const files = readdirSync(this.config.logDir)
      return files.filter(f => f.startsWith(this.config.baseName) && f.endsWith('.log') || f.endsWith('.log.1') || f.endsWith('.log.2') || f.endsWith('.log.3') || f.endsWith('.log.4')).length
    } catch {
      return 0
    }
  }

  /** Clean up old log files beyond retention limit */
  cleanup(): number {
    this.init()
    let removed = 0
    try {
      const files = readdirSync(this.config.logDir)
        .filter(f => f.startsWith(this.config.baseName))
        .sort()
        // Reverse to get newest first
        .reverse()

      // Keep the main file + maxFiles rotated files
      const toKeep = files.slice(0, this.config.maxFiles + 1)
      for (const file of files) {
        if (!toKeep.includes(file)) {
          try {
            unlinkSync(join(this.config.logDir, file))
            removed++
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // Ignore
    }
    return removed
  }
}

// Singleton instances for different log types
export const appLogRotator = new LogRotator({ baseName: 'application' })
export const apiLogRotator = new LogRotator({ baseName: 'api-access' })
export const errorLogRotator = new LogRotator({ baseName: 'errors' })

export { LogRotator }
