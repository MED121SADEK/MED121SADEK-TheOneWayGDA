/**
 * Environment Configuration Validator
 *
 * Validates all required env vars at startup, providing clear error messages
 * when configuration is missing or invalid. This prevents runtime surprises
 * and ensures all deployments have proper configuration.
 *
 * Usage: Called automatically from next.config.ts or middleware
 */

interface EnvVarSpec {
  name: string
  required: boolean
  defaultValue?: string
  validator?: (value: string) => boolean
  errorMessage?: string
}

const ENV_SPECS: EnvVarSpec[] = [
  // ── Required ──
  { name: 'DATABASE_URL', required: true, validator: (v) => v.startsWith('file:') || v.startsWith('postgresql://') || v.startsWith('mysql://') },
  { name: 'ADMIN_SECRET', required: true, validator: (v) => v.length >= 8, errorMessage: 'ADMIN_SECRET must be at least 8 characters' },

  // ── Optional with defaults ──
  { name: 'NODE_ENV', required: false, defaultValue: 'development', validator: (v) => ['development', 'production', 'test'].includes(v) },
  { name: 'NEXT_PUBLIC_BASE_URL', required: false, defaultValue: 'http://localhost:3000' },
  { name: 'AI_PROACTIVITY_LEVEL', required: false, defaultValue: '0.7', validator: (v) => { const n = parseFloat(v); return n >= 0 && n <= 1; } },
  { name: 'AI_RATE_LIMIT_HOURLY', required: false, defaultValue: '60', validator: (v) => parseInt(v) > 0 },
  { name: 'DATA_RETENTION_DAYS', required: false, defaultValue: '90', validator: (v) => parseInt(v) > 0 },
  { name: 'AUDIT_LOGGING', required: false, defaultValue: 'true' },
  { name: 'GDPR_MODE', required: false, defaultValue: 'true' },
  { name: 'LOG_LEVEL', required: false, defaultValue: 'info', validator: (v) => ['debug', 'info', 'warn', 'error'].includes(v) },
  { name: 'LOG_FORMAT', required: false, defaultValue: 'json', validator: (v) => ['json', 'text'].includes(v) },
]

interface ValidationResult {
  valid: boolean
  errors: Array<{ var: string; message: string }>
  warnings: Array<{ var: string; message: string }>
  config: Record<string, string>
}

/**
 * Validate all environment variables and return a clean config object.
 * In production, missing required vars cause the app to fail fast.
 * In development, warnings are logged but the app continues.
 */
export function validateEnvironment(): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []
  const config: Record<string, string> = {}

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name] || spec.defaultValue || ''

    // Check required
    if (spec.required && !process.env[spec.name]) {
      errors.push({
        var: spec.name,
        message: spec.errorMessage || `Missing required environment variable: ${spec.name}`,
      })
      continue
    }

    // Check validator
    if (value && spec.validator && !spec.validator(value)) {
      const msg = spec.errorMessage || `Invalid value for ${spec.name}: "${value.slice(0, 20)}..."`
      if (spec.required) {
        errors.push({ var: spec.name, message: msg })
      } else {
        warnings.push({ var: spec.name, message: msg })
      }
    }

    // Security warnings
    if (spec.name === 'ADMIN_SECRET' && process.env[spec.name] === 'change-me-to-a-strong-secret') {
      warnings.push({ var: 'ADMIN_SECRET', message: 'Using default ADMIN_SECRET — change this in production!' })
    }
    if (spec.name === 'ADMIN_SECRET' && process.env[spec.name] && process.env[spec.name]!.length < 16) {
      warnings.push({ var: 'ADMIN_SECRET', message: 'ADMIN_SECRET is shorter than 16 characters — consider a stronger secret' })
    }

    config[spec.name] = value
  }

  // Log results
  if (warnings.length > 0) {
    console.warn('[Env] Configuration warnings:')
    for (const w of warnings) {
      console.warn(`  - ${w.var}: ${w.message}`)
    }
  }

  if (errors.length > 0) {
    console.error('[Env] Configuration errors:')
    for (const e of errors) {
      console.error(`  - ${e.var}: ${e.message}`)
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('[Env] Failing fast — fix configuration errors before deploying to production')
      throw new Error(`Invalid configuration: ${errors.map((e) => e.var).join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  }
}

/**
 * Get a validated configuration value with type safety.
 */
export function getEnvString(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

export function getEnvNumber(key: string, fallback = 0): number {
  const val = parseInt(process.env[key] || '', 10)
  return isNaN(val) ? fallback : val
}

export function getEnvBool(key: string, fallback = false): boolean {
  return process.env[key] === 'true' || fallback
}
