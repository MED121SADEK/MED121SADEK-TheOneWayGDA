/**
 * Security Utilities — comprehensive protection suite for TheOneWayGDA
 *
 * Features:
 *  - Rate limiting (in-memory, per-IP)
 *  - Input sanitization (XSS, injection, script tags)
 *  - Request validation (size limits, content-type checks)
 *  - CSRF token generation and validation
 *  - Payload size enforcement
 */

// ─── Rate Limiter ───
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Maximum requests in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
}

const STRICT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 minute
}

const AI_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
}

/**
 * Check rate limit for a given identifier (IP, session, etc.)
 * Returns true if the request should be allowed, false if rate limited.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

export { DEFAULT_RATE_LIMIT, STRICT_RATE_LIMIT, AI_RATE_LIMIT }

// ─── Input Sanitization ───

/**
 * Sanitize a string to prevent XSS attacks.
 * Removes script tags, event handlers, and dangerous HTML.
 */
export function sanitizeInput(input: unknown, maxLength = 50000): string {
  if (input === null || input === undefined) return ''
  const str = String(input)

  if (str.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`)
  }

  return str
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*\S+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, '')
    // Remove data: URLs that could execute scripts
    .replace(/data\s*:\s*text\/html/gi, '')
    // Remove HTML comments that could contain scripts
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove object/embed tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove form tags with actions
    .replace(/<form\b[^>]*action\s*=\s*["'][^"']*["'][^>]*>/gi, '')
    // Remove meta refresh redirects
    .replace(/<meta[^>]*http-equiv\s*=\s*["']*refresh["'][^>]*>/gi, '')
    .trim()
}

/**
 * Sanitize a string for use in SQL-like contexts (defensive, not a replacement for parameterized queries)
 */
export function sanitizeForQuery(input: unknown): string {
  const str = String(input ?? '')
  return str
    .replace(/['"\\;]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '')
    .trim()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate a file upload
 */
export interface FileValidation {
  maxSizeBytes: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

export function validateFileUpload(
  file: File,
  validation: FileValidation
): { valid: boolean; error?: string } {
  if (file.size > validation.maxSizeBytes) {
    const maxMB = (validation.maxSizeBytes / (1024 * 1024)).toFixed(0)
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB.` }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!validation.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension: .${ext}. Allowed: ${validation.allowedExtensions.join(', ')}`,
    }
  }

  if (!validation.allowedMimeTypes.includes(file.type)) {
    // For some files, type might be empty — allow if extension matches
    if (file.type && !file.type.startsWith('application/octet-stream')) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed: ${validation.allowedMimeTypes.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

// ─── CSRF Protection ───

/**
 * Generate a cryptographic CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Simple hash function for CSRF validation (server-side only)
 */
export async function hashToken(token: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(token + 'theOneWayGDA_csrf_salt_2026')
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback for environments without crypto.subtle
  let hash = 0
  const str = token + 'theOneWayGDA_csrf_salt_2026'
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// ─── Security Headers Helper ───

export interface SecurityHeaderConfig {
  contentTypePolicy?: boolean
  framePolicy?: 'DENY' | 'SAMEORIGIN'
  hstsEnabled?: boolean
  referrerPolicy?: string
}

/**
 * Generate security headers for API responses
 */
export function getSecurityHeaders(config: SecurityHeaderConfig = {}): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(config.framePolicy && { 'X-Frame-Options': config.framePolicy }),
    ...(config.hstsEnabled && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }),
  }
}

// ─── Payload Size Guard ───

/**
 * Validate JSON payload size before parsing
 */
export const MAX_PAYLOAD_SIZE = {
  small: 10 * 1024,       // 10KB — for chat messages
  medium: 100 * 1024,     // 100KB — for data operations
  large: 5 * 1024 * 1024, // 5MB — for file uploads
  xlarge: 50 * 1024 * 1024, // 50MB — for bulk imports
}

export function validatePayloadSize(body: string, maxSize: number): { valid: boolean; error?: string } {
  if (body.length > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `Request payload too large. Maximum size is ${maxMB}MB.` }
  }
  return { valid: true }
}
