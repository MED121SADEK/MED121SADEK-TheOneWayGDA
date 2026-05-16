import { NextRequest, NextResponse } from 'next/server'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */
interface RegistryEntry {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  apiVersion: string
  author: string
  license: string
  type: 'visualization' | 'data_source' | 'statistical' | 'export' | 'integration' | 'ai_model'
  hooks: string[]
  configSchema: Record<string, unknown>
  healthEndpoint: string
  installed: boolean
  validationStatus: 'valid' | 'invalid' | 'warning'
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  validationReport: ValidationReport
  installedAt: string
  registeredAt: string
}

interface ValidationIssue {
  field: string
  level: 'error' | 'warning'
  message: string
}

interface ValidationReport {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  checkedAt: string
}

/* ══════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════ */
const VALID_EXTENSION_TYPES = [
  'visualization',
  'data_source',
  'statistical',
  'export',
  'integration',
  'ai_model',
] as const

const VALID_HOOK_NAMES = [
  'workspace:init',
  'workspace:chart',
  'workspace:report',
  'ai:before_query',
  'ai:after_query',
  'automation:before_run',
  'automation:after_run',
  'data:import',
  'data:export',
  'workspace:import',
  'workspace:export',
  'report:export',
  'report:generate',
  'ai:pre-process',
  'ai:post-process',
] as const

const VERSION_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/

/* ══════════════════════════════════════════════════════
   Validation helpers
   ══════════════════════════════════════════════════════ */
function validateExtensionManifest(
  manifest: Record<string, unknown>
): ValidationReport {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // Required string fields
  const requiredFields = ['name', 'displayName', 'version', 'author', 'type'] as const
  for (const field of requiredFields) {
    if (!manifest[field] || typeof manifest[field] !== 'string' || (manifest[field] as string).trim() === '') {
      errors.push({
        field,
        level: 'error',
        message: `"${field}" is required and must be a non-empty string`,
      })
    }
  }

  // Version format validation (semver)
  if (typeof manifest.version === 'string' && !VERSION_REGEX.test(manifest.version)) {
    errors.push({
      field: 'version',
      level: 'error',
      message: `Version "${manifest.version}" does not match semver format (e.g., 1.0.0 or 2.1.0-beta)`,
    })
  }

  // Type validation
  if (typeof manifest.type === 'string' && !VALID_EXTENSION_TYPES.includes(manifest.type as typeof VALID_EXTENSION_TYPES[number])) {
    errors.push({
      field: 'type',
      level: 'error',
      message: `Invalid type "${manifest.type}". Must be one of: ${VALID_EXTENSION_TYPES.join(', ')}`,
    })
  }

  // Hook names validation
  if (Array.isArray(manifest.hooks)) {
    for (const hook of manifest.hooks) {
      if (typeof hook !== 'string') {
        warnings.push({
          field: 'hooks',
          level: 'warning',
          message: 'Hook entry is not a string and will be ignored',
        })
        continue
      }
      if (!VALID_HOOK_NAMES.includes(hook as typeof VALID_HOOK_NAMES[number])) {
        warnings.push({
          field: 'hooks',
          level: 'warning',
          message: `Unrecognized hook "${hook}". It may not be invoked by the platform.`,
        })
      }
    }
  } else if (manifest.hooks !== undefined) {
    warnings.push({
      field: 'hooks',
      level: 'warning',
      message: '"hooks" should be an array of strings',
    })
  }

  // apiVersion warning
  if (!manifest.apiVersion) {
    warnings.push({
      field: 'apiVersion',
      level: 'warning',
      message: 'apiVersion is not specified. Defaulting to "1.0.0"',
    })
  }

  // Description warning
  if (!manifest.description || (typeof manifest.description === 'string' && manifest.description.trim().length < 10)) {
    warnings.push({
      field: 'description',
      level: 'warning',
      message: 'A description of at least 10 characters is recommended',
    })
  }

  // License warning
  if (!manifest.license) {
    warnings.push({
      field: 'license',
      level: 'warning',
      message: 'License not specified. Consider adding a license field.',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  }
}

/* ══════════════════════════════════════════════════════
   Health check helper (simulated)
   In production, this would make HTTP requests to the
   extension's health endpoint.
   ══════════════════════════════════════════════════════ */
async function checkExtensionHealth(
  healthEndpoint: string
): Promise<'healthy' | 'unhealthy' | 'unknown'> {
  if (!healthEndpoint || healthEndpoint.trim() === '') {
    return 'unknown'
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const url = healthEndpoint.startsWith('http') ? healthEndpoint : `${baseUrl}${healthEndpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      return 'healthy'
    }
    return 'unhealthy'
  } catch {
    // Network error or timeout — assume unhealthy rather than crashing
    return 'unhealthy'
  }
}

/* ══════════════════════════════════════════════════════
   In-memory registry via globalThis
   ══════════════════════════════════════════════════════ */
declare global {
  var __extensionRegistry: RegistryEntry[] | undefined
}

function getExtensionRegistry(): RegistryEntry[] {
  if (!globalThis.__extensionRegistry) {
    const now = new Date().toISOString()
    const baseReport: ValidationReport = {
      valid: true,
      errors: [],
      warnings: [],
      checkedAt: now,
    }

    globalThis.__extensionRegistry = [
      {
        id: 'reg-1',
        name: 'plotly-enhanced-charts',
        displayName: 'Plotly Enhanced Charts',
        description: 'Advanced interactive chart types including 3D plots, heatmaps, and statistical visualizations powered by Plotly.js.',
        version: '2.1.0',
        apiVersion: '1.0.0',
        author: 'The One-Way Team',
        license: 'MIT',
        type: 'visualization',
        hooks: ['workspace:chart'],
        configSchema: { theme: { type: 'string', default: 'auto' }, interactive: { type: 'boolean', default: true } },
        healthEndpoint: '/api/ai/extensions/ext-1/health',
        installed: true,
        validationStatus: 'valid',
        healthStatus: 'healthy',
        validationReport: baseReport,
        installedAt: now,
        registeredAt: now,
      },
      {
        id: 'reg-2',
        name: 'google-sheets-connector',
        displayName: 'Google Sheets Connector',
        description: 'Import and sync datasets directly from Google Sheets with real-time collaboration support and automatic refresh.',
        version: '1.5.0',
        apiVersion: '1.0.0',
        author: 'The One-Way Team',
        license: 'MIT',
        type: 'data_source',
        hooks: ['data:import'],
        configSchema: { autoSync: { type: 'boolean', default: false }, refreshInterval: { type: 'number', default: 300 } },
        healthEndpoint: '/api/ai/extensions/ext-2/health',
        installed: true,
        validationStatus: 'valid',
        healthStatus: 'healthy',
        validationReport: baseReport,
        installedAt: now,
        registeredAt: now,
      },
      {
        id: 'reg-3',
        name: 'advanced-stats-pack',
        displayName: 'Advanced Stats Pack',
        description: 'Extended statistical tests including MANOVA, factor analysis, structural equation modeling, and nonparametric methods.',
        version: '2.0.0',
        apiVersion: '1.0.0',
        author: 'The One-Way Team',
        license: 'Apache-2.0',
        type: 'statistical',
        hooks: ['ai:before_query', 'ai:after_query'],
        configSchema: { significanceLevel: { type: 'number', default: 0.05 }, effectSizeThreshold: { type: 'number', default: 0.3 } },
        healthEndpoint: '/api/ai/extensions/ext-7/health',
        installed: true,
        validationStatus: 'valid',
        healthStatus: 'healthy',
        validationReport: baseReport,
        installedAt: now,
        registeredAt: now,
      },
      {
        id: 'reg-4',
        name: 'pdf-report-builder',
        displayName: 'PDF Report Builder',
        description: 'Generate publication-ready PDF reports with custom templates, headers, footers, and brand styling.',
        version: '3.2.0',
        apiVersion: '1.0.0',
        author: 'The One-Way Team',
        license: 'MIT',
        type: 'export',
        hooks: ['workspace:report'],
        configSchema: { template: { type: 'string', default: 'default' }, pageSize: { type: 'string', default: 'A4' } },
        healthEndpoint: '/api/ai/extensions/ext-4/health',
        installed: true,
        validationStatus: 'valid',
        healthStatus: 'healthy',
        validationReport: baseReport,
        installedAt: now,
        registeredAt: now,
      },
      {
        id: 'reg-5',
        name: 'slack-integration',
        displayName: 'Slack Integration',
        description: 'Send analysis results, alerts, and report summaries directly to Slack channels and team members.',
        version: '1.1.0',
        apiVersion: '1.0.0',
        author: 'The One-Way Team',
        license: 'MIT',
        type: 'integration',
        hooks: ['data:export'],
        configSchema: { webhookUrl: { type: 'string', default: '' }, channelName: { type: 'string', default: 'analytics' } },
        healthEndpoint: '/api/ai/extensions/ext-5/health',
        installed: false,
        validationStatus: 'valid',
        healthStatus: 'unknown',
        validationReport: baseReport,
        installedAt: now,
        registeredAt: now,
      },
    ]
  }
  return globalThis.__extensionRegistry
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/extensions/registry
   List all extensions with metadata, validation, and health
   Query params:
     - healthCheck: "true" to trigger live health checks
     - validationStatus: filter by "valid" | "invalid" | "warning"
     - type: filter by extension type
   ══════════════════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const runHealthCheck = searchParams.get('healthCheck') === 'true'
  const validationFilter = searchParams.get('validationStatus')
  const typeFilter = searchParams.get('type')

  const registry = getExtensionRegistry()

  // Optionally run live health checks
  if (runHealthCheck) {
    await Promise.allSettled(
      registry.map(async (entry) => {
        entry.healthStatus = await checkExtensionHealth(entry.healthEndpoint)
      })
    )
  }

  // Apply filters
  let filtered = registry
  if (validationFilter) {
    filtered = filtered.filter((e) => e.validationStatus === validationFilter)
  }
  if (typeFilter) {
    filtered = filtered.filter((e) => e.type === typeFilter)
  }

  return NextResponse.json({
    extensions: filtered,
    summary: {
      total: registry.length,
      installed: registry.filter((e) => e.installed).length,
      healthy: registry.filter((e) => e.healthStatus === 'healthy').length,
      unhealthy: registry.filter((e) => e.healthStatus === 'unhealthy').length,
      valid: registry.filter((e) => e.validationStatus === 'valid').length,
      invalid: registry.filter((e) => e.validationStatus === 'invalid').length,
      warnings: registry.filter((e) => e.validationStatus === 'warning').length,
    },
  })
}

/* ══════════════════════════════════════════════════════
   POST /api/ai/extensions/registry
   Register a new extension with full manifest validation
   Body: full extension manifest
   ══════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const manifest = await request.json()

    if (!manifest || typeof manifest !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object' },
        { status: 400 }
      )
    }

    // Validate manifest
    const report = validateExtensionManifest(manifest)

    if (!report.valid) {
      return NextResponse.json(
        {
          error: 'Extension manifest validation failed',
          validationReport: report,
        },
        { status: 400 }
      )
    }

    const registry = getExtensionRegistry()

    // Check for duplicate name
    const existingName = registry.find((e) => e.name === manifest.name)
    if (existingName) {
      return NextResponse.json(
        {
          error: `An extension with name "${manifest.name}" is already registered`,
          existingId: existingName.id,
        },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // Determine initial health status
    let healthStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown'
    if (manifest.healthEndpoint) {
      healthStatus = await checkExtensionHealth(manifest.healthEndpoint as string)
    }

    const newEntry: RegistryEntry = {
      id: `reg-${Date.now()}`,
      name: manifest.name as string,
      displayName: manifest.displayName || manifest.name as string,
      description: manifest.description || '',
      version: manifest.version as string,
      apiVersion: manifest.apiVersion || '1.0.0',
      author: manifest.author as string,
      license: manifest.license || 'unknown',
      type: manifest.type as RegistryEntry['type'],
      hooks: Array.isArray(manifest.hooks) ? manifest.hooks as string[] : [],
      configSchema: manifest.configSchema || {},
      healthEndpoint: manifest.healthEndpoint || '',
      installed: false,
      validationStatus: report.warnings.length > 0 ? 'warning' : 'valid',
      healthStatus,
      validationReport: report,
      installedAt: now,
      registeredAt: now,
    }

    registry.push(newEntry)

    return NextResponse.json(
      {
        extension: newEntry,
        message: report.warnings.length > 0
          ? 'Extension registered with warnings. Review the validation report.'
          : 'Extension registered successfully.',
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to register extension. Invalid request body.' },
      { status: 400 }
    )
  }
}
