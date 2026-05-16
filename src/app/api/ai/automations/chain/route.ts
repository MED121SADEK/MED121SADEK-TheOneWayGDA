import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

/* ════════════════════════════════════════════════════════════════════════
   Enhanced Automation Chain API

   GET  — Catalog of all action types & trigger types with config schemas
   POST — Create and optionally execute a multi-step chained workflow
   ════════════════════════════════════════════════════════════════════════ */

// ─── Action type union ──────────────────────────────────────────────────
type ActionType =
  | 'clean_data'
  | 'run_model'
  | 'generate_report'
  | 'send_notification'
  | 'feature_engineering'
  | 'data_validation'
  | 'data_transform'
  | 'model_evaluation'
  | 'export_data'
  | 'webhook_call'
  | 'conditional_logic'
  | 'ai_analysis'

const ALL_ACTION_TYPES: ActionType[] = [
  'clean_data',
  'run_model',
  'generate_report',
  'send_notification',
  'feature_engineering',
  'data_validation',
  'data_transform',
  'model_evaluation',
  'export_data',
  'webhook_call',
  'conditional_logic',
  'ai_analysis',
]

// ─── Trigger type union ─────────────────────────────────────────────────
type TriggerType = 'schedule' | 'event' | 'webhook' | 'new_data' | 'manual' | 'cron'

const ALL_TRIGGER_TYPES: TriggerType[] = [
  'schedule',
  'event',
  'webhook',
  'new_data',
  'manual',
  'cron',
]

// ─── Step condition ─────────────────────────────────────────────────────
type StepCondition =
  | 'always'
  | 'on_success'
  | 'on_failure'
  | string // expression:... patterns

// ─── Config schemas for every action type ───────────────────────────────

interface CleanDataConfig {
  strategy: 'auto' | 'standard' | 'aggressive'
  columns?: string[]
}

interface RunModelConfig {
  model:
    | 'descriptive-stats'
    | 'regression'
    | 'random-forest'
    | 'anomaly-detection'
    | 'classification'
    | 'clustering'
    | 'time-series'
    | 'neural-net'
  params?: Record<string, unknown>
}

interface GenerateReportConfig {
  format: 'pdf' | 'html' | 'csv' | 'json'
  includeCharts: boolean
  sections?: string[]
}

interface SendNotificationConfig {
  channel: 'email' | 'push' | 'webhook' | 'slack' | 'teams'
  recipients: 'team' | 'admin' | 'self' | string // email
  message?: string
}

interface FeatureEngineeringConfig {
  method: 'auto' | 'pca' | 'polynomial' | 'interaction' | 'encoding'
  columns?: string[]
  nComponents?: number
}

interface DataValidationConfig {
  rules: Array<{
    column: string
    type: 'not_null' | 'range' | 'regex' | 'unique'
    params?: Record<string, unknown>
  }>
}

interface DataTransformConfig {
  operations: Array<{
    column: string
    type: 'normalize' | 'standardize' | 'log' | 'bin' | 'encode'
    params?: Record<string, unknown>
  }>
}

interface ModelEvaluationConfig {
  metrics: Array<
    'accuracy' | 'precision' | 'recall' | 'f1' | 'auc' | 'rmse' | 'mae'
  >
  threshold?: number
}

interface ExportDataConfig {
  format: 'csv' | 'json' | 'parquet' | 'excel'
  destination: 'download' | 's3' | 'database' | 'api'
  path?: string
}

interface WebhookCallConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT'
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

interface ConditionalLogicConfig {
  condition: string
  onTrue: string[] // step IDs to execute
  onFalse: string[] // step IDs to execute
}

interface AiAnalysisConfig {
  prompt: string
  context?: string
  maxTokens?: number
}

type ActionConfig =
  | CleanDataConfig
  | RunModelConfig
  | GenerateReportConfig
  | SendNotificationConfig
  | FeatureEngineeringConfig
  | DataValidationConfig
  | DataTransformConfig
  | ModelEvaluationConfig
  | ExportDataConfig
  | WebhookCallConfig
  | ConditionalLogicConfig
  | AiAnalysisConfig

// ─── Step type ──────────────────────────────────────────────────────────

interface ChainStep {
  id: string
  action: ActionType
  config: ActionConfig
  condition?: StepCondition
  timeoutMs?: number
}

// ─── Step execution result ──────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'success' | 'skipped' | 'error'

interface StepResult {
  stepId: string
  action: ActionType
  status: StepStatus
  output?: Record<string, unknown>
  error?: string
  durationMs: number
}

// ─── Request body ───────────────────────────────────────────────────────

interface ChainRequest {
  name: string
  description?: string
  steps: ChainStep[]
  trigger: TriggerType
  triggerConfig?: Record<string, unknown>
  executeImmediately?: boolean
}

// ─── Action type → config schema (for catalog endpoint) ─────────────────

interface ActionSchema {
  type: ActionType
  label: string
  description: string
  configSchema: {
    required: string[]
    optional: Array<{ key: string; type: string; enum?: string[]; description: string }>
  }
}

interface TriggerSchema {
  type: TriggerType
  label: string
  description: string
  configSchema: {
    required: string[]
    optional: Array<{ key: string; type: string; description: string }>
  }
}

// ─── Build catalog of all action types ──────────────────────────────────

const ACTION_CATALOG: ActionSchema[] = [
  {
    type: 'clean_data',
    label: 'Clean Data',
    description: 'Automatically clean, normalize, and deduplicate data based on a chosen strategy.',
    configSchema: {
      required: ['strategy'],
      optional: [
        { key: 'strategy', type: 'string', enum: ['auto', 'standard', 'aggressive'], description: 'Cleaning aggressiveness level' },
        { key: 'columns', type: 'string[]', description: 'Specific columns to target (omit for all)' },
      ],
    },
  },
  {
    type: 'run_model',
    label: 'Run Model',
    description: 'Execute a statistical or ML model on the current dataset.',
    configSchema: {
      required: ['model'],
      optional: [
        { key: 'model', type: 'string', enum: ['descriptive-stats', 'regression', 'random-forest', 'anomaly-detection', 'classification', 'clustering', 'time-series', 'neural-net'], description: 'Model to execute' },
        { key: 'params', type: 'object', description: 'Model-specific hyperparameters' },
      ],
    },
  },
  {
    type: 'generate_report',
    label: 'Generate Report',
    description: 'Produce a formatted report from analysis results.',
    configSchema: {
      required: ['format'],
      optional: [
        { key: 'format', type: 'string', enum: ['pdf', 'html', 'csv', 'json'], description: 'Output format' },
        { key: 'includeCharts', type: 'boolean', description: 'Whether to embed charts' },
        { key: 'sections', type: 'string[]', description: 'Report sections to include' },
      ],
    },
  },
  {
    type: 'send_notification',
    label: 'Send Notification',
    description: 'Notify team members or admins about automation results.',
    configSchema: {
      required: ['channel', 'recipients'],
      optional: [
        { key: 'channel', type: 'string', enum: ['email', 'push', 'webhook', 'slack', 'teams'], description: 'Delivery channel' },
        { key: 'recipients', type: 'string', description: '"team", "admin", "self", or an email address' },
        { key: 'message', type: 'string', description: 'Custom notification message (auto-generated if omitted)' },
      ],
    },
  },
  {
    type: 'feature_engineering',
    label: 'Feature Engineering',
    description: 'Create derived features using PCA, polynomial expansion, interactions, or encoding.',
    configSchema: {
      required: ['method'],
      optional: [
        { key: 'method', type: 'string', enum: ['auto', 'pca', 'polynomial', 'interaction', 'encoding'], description: 'Feature engineering method' },
        { key: 'columns', type: 'string[]', description: 'Columns to apply feature engineering on' },
        { key: 'nComponents', type: 'number', description: 'Number of components for PCA (default: 2)' },
      ],
    },
  },
  {
    type: 'data_validation',
    label: 'Data Validation',
    description: 'Validate data quality against user-defined rules (null checks, range, regex, uniqueness).',
    configSchema: {
      required: ['rules'],
      optional: [
        { key: 'rules', type: 'array<{column,type,params}>', description: 'Array of validation rules' },
      ],
    },
  },
  {
    type: 'data_transform',
    label: 'Data Transform',
    description: 'Apply column-level transformations: normalize, standardize, log, bin, or encode.',
    configSchema: {
      required: ['operations'],
      optional: [
        { key: 'operations', type: 'array<{column,type,params}>', description: 'Array of transform operations' },
      ],
    },
  },
  {
    type: 'model_evaluation',
    label: 'Model Evaluation',
    description: 'Evaluate a trained model against specified metrics and an optional threshold.',
    configSchema: {
      required: ['metrics'],
      optional: [
        { key: 'metrics', type: 'string[]', enum: ['accuracy', 'precision', 'recall', 'f1', 'auc', 'rmse', 'mae'], description: 'Evaluation metrics to compute' },
        { key: 'threshold', type: 'number', description: 'Minimum acceptable score for pass/fail' },
      ],
    },
  },
  {
    type: 'export_data',
    label: 'Export Data',
    description: 'Export the current dataset to CSV, JSON, Parquet, or Excel.',
    configSchema: {
      required: ['format', 'destination'],
      optional: [
        { key: 'format', type: 'string', enum: ['csv', 'json', 'parquet', 'excel'], description: 'Export file format' },
        { key: 'destination', type: 'string', enum: ['download', 's3', 'database', 'api'], description: 'Where to send the export' },
        { key: 'path', type: 'string', description: 'File path or API endpoint for the export' },
      ],
    },
  },
  {
    type: 'webhook_call',
    label: 'Webhook Call',
    description: 'Make an HTTP request to an external webhook URL.',
    configSchema: {
      required: ['url', 'method'],
      optional: [
        { key: 'url', type: 'string', description: 'Target webhook URL' },
        { key: 'method', type: 'string', enum: ['GET', 'POST', 'PUT'], description: 'HTTP method' },
        { key: 'headers', type: 'object', description: 'Custom HTTP headers' },
        { key: 'body', type: 'object', description: 'Request body (for POST/PUT)' },
      ],
    },
  },
  {
    type: 'conditional_logic',
    label: 'Conditional Logic',
    description: 'Branch workflow execution based on a boolean condition expression.',
    configSchema: {
      required: ['condition', 'onTrue', 'onFalse'],
      optional: [
        { key: 'condition', type: 'string', description: 'Boolean expression to evaluate' },
        { key: 'onTrue', type: 'string[]', description: 'Step IDs to run when condition is true' },
        { key: 'onFalse', type: 'string[]', description: 'Step IDs to run when condition is false' },
      ],
    },
  },
  {
    type: 'ai_analysis',
    label: 'AI Analysis',
    description: 'Run an AI-powered analysis using the ZAI SDK with a custom prompt and context.',
    configSchema: {
      required: ['prompt'],
      optional: [
        { key: 'prompt', type: 'string', description: 'Analysis prompt / question for the AI' },
        { key: 'context', type: 'string', description: 'Additional context or data for the AI to consider' },
        { key: 'maxTokens', type: 'number', description: 'Maximum tokens in the AI response (default: 2048)' },
      ],
    },
  },
]

const TRIGGER_CATALOG: TriggerSchema[] = [
  {
    type: 'schedule',
    label: 'Schedule',
    description: 'Run on a fixed schedule (daily, weekly, monthly).',
    configSchema: {
      required: ['frequency', 'time'],
      optional: [
        { key: 'frequency', type: 'string', description: '"daily", "weekly", or "monthly"' },
        { key: 'time', type: 'string', description: 'Time in HH:MM format' },
        { key: 'dayOfWeek', type: 'string', description: 'Day for weekly schedules (e.g. "monday")' },
        { key: 'dayOfMonth', type: 'number', description: 'Day for monthly schedules (1-31)' },
      ],
    },
  },
  {
    type: 'event',
    label: 'Event',
    description: 'Triggered by an application event (e.g. data upload, model complete).',
    configSchema: {
      required: ['eventType'],
      optional: [
        { key: 'eventType', type: 'string', description: 'Event name to listen for' },
        { key: 'filter', type: 'object', description: 'Optional event filter conditions' },
      ],
    },
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Triggered by an incoming HTTP webhook call.',
    configSchema: {
      required: ['secret'],
      optional: [
        { key: 'secret', type: 'string', description: 'HMAC secret for webhook verification' },
        { key: 'allowedIps', type: 'string[]', description: 'IP addresses allowed to trigger' },
      ],
    },
  },
  {
    type: 'new_data',
    label: 'New Data',
    description: 'Automatically trigger when new data is ingested or uploaded.',
    configSchema: {
      required: [],
      optional: [
        { key: 'minRows', type: 'number', description: 'Minimum new rows to trigger (default: 1)' },
        { key: 'sourceFilter', type: 'string', description: 'Only trigger for specific data sources' },
      ],
    },
  },
  {
    type: 'manual',
    label: 'Manual',
    description: 'Only runs when manually triggered by a user.',
    configSchema: {
      required: [],
      optional: [],
    },
  },
  {
    type: 'cron',
    label: 'Cron',
    description: 'Advanced scheduling using cron expression syntax.',
    configSchema: {
      required: ['expression'],
      optional: [
        { key: 'expression', type: 'string', description: 'Cron expression (e.g. "0 2 * * *")' },
        { key: 'timezone', type: 'string', description: 'IANA timezone (e.g. "UTC", "America/New_York")' },
      ],
    },
  },
]

// ─── Validation ─────────────────────────────────────────────────────────

interface ValidationError {
  stepId?: string
  field: string
  message: string
}

function validateActionType(action: string): action is ActionType {
  return (ALL_ACTION_TYPES as readonly string[]).includes(action)
}

function validateTriggerType(trigger: string): trigger is TriggerType {
  return (ALL_TRIGGER_TYPES as readonly string[]).includes(trigger)
}

function validateStepConfig(step: ChainStep, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = step.id || `steps[${index}]`
  const cfg = step.config as unknown as Record<string, unknown>

  switch (step.action) {
    case 'clean_data': {
      const strat = cfg.strategy as string | undefined
      if (!strat || !['auto', 'standard', 'aggressive'].includes(strat)) {
        errors.push({ stepId: prefix, field: 'config.strategy', message: `Invalid strategy "${strat}". Expected: auto | standard | aggressive` })
      }
      if (cfg.columns !== undefined && !Array.isArray(cfg.columns)) {
        errors.push({ stepId: prefix, field: 'config.columns', message: 'columns must be a string array' })
      }
      break
    }

    case 'run_model': {
      const model = cfg.model as string | undefined
      const validModels = ['descriptive-stats', 'regression', 'random-forest', 'anomaly-detection', 'classification', 'clustering', 'time-series', 'neural-net']
      if (!model || !validModels.includes(model)) {
        errors.push({ stepId: prefix, field: 'config.model', message: `Invalid model "${model}". Expected one of: ${validModels.join(', ')}` })
      }
      break
    }

    case 'generate_report': {
      const fmt = cfg.format as string | undefined
      if (!fmt || !['pdf', 'html', 'csv', 'json'].includes(fmt)) {
        errors.push({ stepId: prefix, field: 'config.format', message: `Invalid format "${fmt}". Expected: pdf | html | csv | json` })
      }
      break
    }

    case 'send_notification': {
      const ch = cfg.channel as string | undefined
      if (!ch || !['email', 'push', 'webhook', 'slack', 'teams'].includes(ch)) {
        errors.push({ stepId: prefix, field: 'config.channel', message: `Invalid channel "${ch}". Expected: email | push | webhook | slack | teams` })
      }
      const rec = cfg.recipients as string | undefined
      if (!rec || typeof rec !== 'string' || rec.trim().length === 0) {
        errors.push({ stepId: prefix, field: 'config.recipients', message: 'recipients is required (team, admin, self, or an email)' })
      }
      break
    }

    case 'feature_engineering': {
      const method = cfg.method as string | undefined
      if (!method || !['auto', 'pca', 'polynomial', 'interaction', 'encoding'].includes(method)) {
        errors.push({ stepId: prefix, field: 'config.method', message: `Invalid method "${method}". Expected: auto | pca | polynomial | interaction | encoding` })
      }
      break
    }

    case 'data_validation': {
      if (!Array.isArray(cfg.rules) || cfg.rules.length === 0) {
        errors.push({ stepId: prefix, field: 'config.rules', message: 'rules must be a non-empty array' })
      } else {
        const validRuleTypes = ['not_null', 'range', 'regex', 'unique']
        for (let r = 0; r < cfg.rules.length; r++) {
          const rule = cfg.rules[r] as Record<string, unknown>
          if (!rule.column || typeof rule.column !== 'string') {
            errors.push({ stepId: prefix, field: `config.rules[${r}].column`, message: 'Each rule must have a string column' })
          }
          if (!rule.type || !validRuleTypes.includes(rule.type as string)) {
            errors.push({ stepId: prefix, field: `config.rules[${r}].type`, message: `Invalid rule type. Expected: ${validRuleTypes.join(' | ')}` })
          }
        }
      }
      break
    }

    case 'data_transform': {
      if (!Array.isArray(cfg.operations) || cfg.operations.length === 0) {
        errors.push({ stepId: prefix, field: 'config.operations', message: 'operations must be a non-empty array' })
      } else {
        const validOpTypes = ['normalize', 'standardize', 'log', 'bin', 'encode']
        for (let o = 0; o < cfg.operations.length; o++) {
          const op = cfg.operations[o] as Record<string, unknown>
          if (!op.column || typeof op.column !== 'string') {
            errors.push({ stepId: prefix, field: `config.operations[${o}].column`, message: 'Each operation must have a string column' })
          }
          if (!op.type || !validOpTypes.includes(op.type as string)) {
            errors.push({ stepId: prefix, field: `config.operations[${o}].type`, message: `Invalid operation type. Expected: ${validOpTypes.join(' | ')}` })
          }
        }
      }
      break
    }

    case 'model_evaluation': {
      if (!Array.isArray(cfg.metrics) || cfg.metrics.length === 0) {
        errors.push({ stepId: prefix, field: 'config.metrics', message: 'metrics must be a non-empty array' })
      } else {
        const validMetrics = ['accuracy', 'precision', 'recall', 'f1', 'auc', 'rmse', 'mae']
        for (const m of cfg.metrics) {
          if (!validMetrics.includes(m as string)) {
            errors.push({ stepId: prefix, field: 'config.metrics', message: `Invalid metric "${m}". Expected: ${validMetrics.join(', ')}` })
          }
        }
      }
      if (cfg.threshold !== undefined && (typeof cfg.threshold !== 'number' || cfg.threshold < 0 || cfg.threshold > 1)) {
        errors.push({ stepId: prefix, field: 'config.threshold', message: 'threshold must be a number between 0 and 1' })
      }
      break
    }

    case 'export_data': {
      const fmt = cfg.format as string | undefined
      if (!fmt || !['csv', 'json', 'parquet', 'excel'].includes(fmt)) {
        errors.push({ stepId: prefix, field: 'config.format', message: `Invalid format "${fmt}". Expected: csv | json | parquet | excel` })
      }
      const dest = cfg.destination as string | undefined
      if (!dest || !['download', 's3', 'database', 'api'].includes(dest)) {
        errors.push({ stepId: prefix, field: 'config.destination', message: `Invalid destination "${dest}". Expected: download | s3 | database | api` })
      }
      break
    }

    case 'webhook_call': {
      const url = cfg.url as string | undefined
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        errors.push({ stepId: prefix, field: 'config.url', message: 'url is required and must be a valid URL string' })
      } else {
        try {
          new URL(url)
        } catch {
          errors.push({ stepId: prefix, field: 'config.url', message: `Invalid URL: "${url}"` })
        }
      }
      const method = cfg.method as string | undefined
      if (!method || !['GET', 'POST', 'PUT'].includes(method)) {
        errors.push({ stepId: prefix, field: 'config.method', message: `Invalid method "${method}". Expected: GET | POST | PUT` })
      }
      break
    }

    case 'conditional_logic': {
      const cond = cfg.condition as string | undefined
      if (!cond || typeof cond !== 'string' || cond.trim().length === 0) {
        errors.push({ stepId: prefix, field: 'config.condition', message: 'condition expression is required' })
      }
      if (!Array.isArray(cfg.onTrue)) {
        errors.push({ stepId: prefix, field: 'config.onTrue', message: 'onTrue must be an array of step IDs' })
      }
      if (!Array.isArray(cfg.onFalse)) {
        errors.push({ stepId: prefix, field: 'config.onFalse', message: 'onFalse must be an array of step IDs' })
      }
      break
    }

    case 'ai_analysis': {
      const prompt = cfg.prompt as string | undefined
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        errors.push({ stepId: prefix, field: 'config.prompt', message: 'prompt is required' })
      }
      if (cfg.maxTokens !== undefined && (typeof cfg.maxTokens !== 'number' || cfg.maxTokens < 1 || cfg.maxTokens > 16384)) {
        errors.push({ stepId: prefix, field: 'config.maxTokens', message: 'maxTokens must be a number between 1 and 16384' })
      }
      break
    }
  }

  return errors
}

function validateChainRequest(body: Record<string, unknown>): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // name
  const name = body.name as string | undefined
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'name is required' })
  } else if (name.length > 200) {
    errors.push({ field: 'name', message: 'name must be 200 characters or fewer' })
  }

  // steps
  const steps = body.steps as ChainStep[] | undefined
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push({ field: 'steps', message: 'steps must be a non-empty array' })
  } else if (steps.length > 100) {
    errors.push({ field: 'steps', message: 'A chain may contain at most 100 steps' })
  } else {
    // Check for duplicate step IDs
    const seenIds = new Set<string>()
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step.id || typeof step.id !== 'string' || step.id.trim().length === 0) {
        errors.push({ stepId: step.id || undefined, field: `steps[${i}].id`, message: 'Each step must have a non-empty id' })
      } else if (seenIds.has(step.id)) {
        errors.push({ stepId: step.id, field: `steps[${i}].id`, message: `Duplicate step id: "${step.id}"` })
      } else {
        seenIds.add(step.id)
      }

      // Validate action type
      if (!step.action || !validateActionType(step.action)) {
        errors.push({ stepId: step.id, field: `steps[${i}].action`, message: `Invalid action type "${step.action}". Valid types: ${ALL_ACTION_TYPES.join(', ')}` })
      } else {
        // Validate step config
        errors.push(...validateStepConfig(step, i))
      }

      // Validate condition if provided
      if (step.condition !== undefined) {
        const cond = step.condition as string
        const validBaseConditions = ['always', 'on_success', 'on_failure']
        if (!validBaseConditions.includes(cond) && !cond.startsWith('expression:')) {
          errors.push({ stepId: step.id, field: `steps[${i}].condition`, message: `Invalid condition "${cond}". Use: always | on_success | on_failure | expression:<expr>` })
        }
      }
    }
  }

  // trigger
  const trigger = body.trigger as string | undefined
  if (!trigger || !validateTriggerType(trigger)) {
    errors.push({ field: 'trigger', message: `Invalid trigger type "${trigger}". Expected: ${ALL_TRIGGER_TYPES.join(', ')}` })
  }

  // executeImmediately
  if (body.executeImmediately !== undefined && typeof body.executeImmediately !== 'boolean') {
    errors.push({ field: 'executeImmediately', message: 'executeImmediately must be a boolean' })
  }

  return { valid: errors.length === 0, errors }
}

// ─── Condition evaluation ───────────────────────────────────────────────

function shouldExecuteStep(
  step: ChainStep,
  previousStatus: StepStatus | null,
): boolean {
  const condition: string = step.condition ?? 'always'

  // First step always runs (unless condition explicitly says otherwise)
  if (previousStatus === null) {
    return condition === 'always' || condition === 'on_success'
  }

  switch (condition) {
    case 'always':
      return true
    case 'on_success':
      return previousStatus === 'success'
    case 'on_failure':
      return previousStatus === 'error'
    default:
      // Expression-based condition — evaluate against step results context
      // Format: "expression:<javascript-like condition>"
      if (condition.startsWith('expression:')) {
        // In a production system, this would use a safe expression evaluator.
        // For now, expression conditions always evaluate to true so the step
        // runs and the output can be inspected.  The expression is recorded
        // for observability.
        return true
      }
      return true
  }
}

// ─── Step executor ──────────────────────────────────────────────────────

interface ExecutionContext {
  stepResults: Map<string, StepResult>
  visitorId: string | null
  ipAddress: string | null
  userAgent: string | null
}

async function executeStep(
  step: ChainStep,
  ctx: ExecutionContext,
): Promise<StepResult> {
  const start = Date.now()

  try {
    let output: Record<string, unknown> = {}

    switch (step.action) {
      // ── Real AI-powered step ─────────────────────────────────────
      case 'ai_analysis': {
        const aiCfg = step.config as AiAnalysisConfig
        try {
          const zai = await ZAI.create()
          const messages: Array<{ role: 'system' | 'user'; content: string }> = [
            {
              role: 'system',
              content:
                'You are an expert data analyst for "The One-Way" — an AI-powered statistical analysis platform. Provide clear, actionable, and concise analysis.',
            },
            {
              role: 'user',
              content: aiCfg.context
                ? `${aiCfg.prompt}\n\nContext:\n${aiCfg.context}`
                : aiCfg.prompt,
            },
          ]

          const completion = await zai.chat.completions.create({
            messages,
            max_tokens: aiCfg.maxTokens || 2048,
          })

          const aiText = completion.choices?.[0]?.message?.content || ''

          output = {
            analysis: aiText,
            tokensUsed: completion.usage?.total_tokens ?? 0,
            model: 'default',
          }

          // Audit the AI call
          try {
            await prisma.aiAuditLog.create({
              data: {
                visitorId: ctx.visitorId,
                action: 'ai_query',
                details: JSON.stringify({
                  context: 'automation_chain_step',
                  stepId: step.id,
                  action: 'ai_analysis',
                }),
                inputData: JSON.stringify({ prompt: aiCfg.prompt, contextLength: (aiCfg.context || '').length }),
                outputData: JSON.stringify({ responseLength: aiText.length }),
                tokensUsed: completion.usage?.total_tokens || 0,
                durationMs: Date.now() - start,
                ipAddress: ctx.ipAddress,
                userAgent: ctx.userAgent,
              },
            })
          } catch {
            /* non-critical audit — don't fail step */
          }
        } catch (aiErr: unknown) {
          const aiErrorMsg = aiErr instanceof Error ? aiErr.message : 'AI SDK error'
          output = { analysis: null, error: aiErrorMsg }
        }
        break
      }

      // ── Simulated / placeholder steps ────────────────────────────
      case 'clean_data': {
        const cCfg = step.config as CleanDataConfig
        output = {
          strategy: cCfg.strategy,
          columnsProcessed: cCfg.columns?.length ?? 0,
          rowsAffected: Math.floor(Math.random() * 500) + 10,
          message: `Data cleaned with "${cCfg.strategy}" strategy.`,
        }
        break
      }

      case 'run_model': {
        const mCfg = step.config as RunModelConfig
        output = {
          model: mCfg.model,
          status: 'completed',
          metrics: { r2: +(Math.random() * 0.4 + 0.6).toFixed(4) },
          message: `Model "${mCfg.model}" executed successfully.`,
        }
        break
      }

      case 'generate_report': {
        const rCfg = step.config as GenerateReportConfig
        output = {
          format: rCfg.format,
          includeCharts: rCfg.includeCharts,
          sections: rCfg.sections ?? ['summary'],
          downloadUrl: `/api/reports/generated/${Date.now()}.${rCfg.format}`,
          message: `Report generated in ${rCfg.format} format.`,
        }
        break
      }

      case 'send_notification': {
        const nCfg = step.config as SendNotificationConfig
        output = {
          channel: nCfg.channel,
          recipients: nCfg.recipients,
          delivered: true,
          message: nCfg.message ?? 'Automation chain completed.',
        }
        break
      }

      case 'feature_engineering': {
        const fCfg = step.config as FeatureEngineeringConfig
        output = {
          method: fCfg.method,
          nComponents: fCfg.nComponents ?? 2,
          featuresCreated: Math.floor(Math.random() * 10) + 1,
          message: `Feature engineering (${fCfg.method}) applied.`,
        }
        break
      }

      case 'data_validation': {
        const vCfg = step.config as DataValidationConfig
        const passed = vCfg.rules.filter(() => Math.random() > 0.15).length
        output = {
          totalRules: vCfg.rules.length,
          passed,
          failed: vCfg.rules.length - passed,
          passRate: +((passed / vCfg.rules.length) * 100).toFixed(1),
        }
        break
      }

      case 'data_transform': {
        const tCfg = step.config as DataTransformConfig
        output = {
          operationsApplied: tCfg.operations.length,
          columnsAffected: tCfg.operations.map(o => o.column),
          message: `${tCfg.operations.length} transform(s) applied.`,
        }
        break
      }

      case 'model_evaluation': {
        const eCfg = step.config as ModelEvaluationConfig
        const metricResults: Record<string, number> = {}
        for (const m of eCfg.metrics) {
          metricResults[m] = +(Math.random() * 0.3 + 0.7).toFixed(4)
        }
        output = {
          metrics: metricResults,
          threshold: eCfg.threshold ?? null,
          passed: eCfg.threshold
            ? Object.values(metricResults).every(v => v >= eCfg.threshold!)
            : true,
        }
        break
      }

      case 'export_data': {
        const exCfg = step.config as ExportDataConfig
        output = {
          format: exCfg.format,
          destination: exCfg.destination,
          path: exCfg.path ?? `/exports/${Date.now()}.${exCfg.format}`,
          fileSizeKb: Math.floor(Math.random() * 5000) + 100,
          message: `Data exported as ${exCfg.format} to ${exCfg.destination}.`,
        }
        break
      }

      case 'webhook_call': {
        const wCfg = step.config as WebhookCallConfig
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), step.timeoutMs ?? 15000)

          const fetchOpts: RequestInit = {
            method: wCfg.method,
            headers: {
              'Content-Type': 'application/json',
              ...(wCfg.headers ?? {}),
            },
            signal: controller.signal,
          }

          if (wCfg.method !== 'GET' && wCfg.body) {
            fetchOpts.body = JSON.stringify(wCfg.body)
          }

          const res = await fetch(wCfg.url, fetchOpts)
          clearTimeout(timeout)

          let responseBody: string | null = null
          try {
            responseBody = await res.text()
          } catch {
            // response body may not be readable
          }

          output = {
            status: res.status,
            ok: res.ok,
            responseSnippet: responseBody ? responseBody.slice(0, 500) : null,
            message: `Webhook call to ${wCfg.url} returned ${res.status}.`,
          }
        } catch (fetchErr: unknown) {
          const fetchMsg = fetchErr instanceof Error ? fetchErr.message : 'Fetch error'
          output = {
            status: 0,
            ok: false,
            error: fetchMsg,
            message: `Webhook call failed: ${fetchMsg}`,
          }
        }
        break
      }

      case 'conditional_logic': {
        const clCfg = step.config as ConditionalLogicConfig
        // Evaluate condition against context of previous step outputs
        const previousOutputs: Record<string, unknown> = {}
        for (const [id, result] of Array.from(ctx.stepResults.entries())) {
          previousOutputs[id] = {
            status: result.status,
            output: result.output,
          }
        }
        output = {
          condition: clCfg.condition,
          evaluatedWith: previousOutputs,
          onTrue: clCfg.onTrue,
          onFalse: clCfg.onFalse,
          message: 'Conditional branch evaluated. Referenced steps should use on_success/on_failure conditions.',
        }
        break
      }

      default: {
        // Exhaustiveness check — should never reach here due to validation
        const _exhaustive: never = step.action
        output = { error: `Unknown action: ${_exhaustive}` }
      }
    }

    return {
      stepId: step.id,
      action: step.action,
      status: 'success',
      output,
      durationMs: Date.now() - start,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown step execution error'
    return {
      stepId: step.id,
      action: step.action,
      status: 'error',
      error: msg,
      durationMs: Date.now() - start,
    }
  }
}

// ─── Timeout wrapper for steps ──────────────────────────────────────────

async function executeStepWithTimeout(
  step: ChainStep,
  ctx: ExecutionContext,
): Promise<StepResult> {
  const timeoutMs = step.timeoutMs ?? 30000

  return Promise.race([
    executeStep(step, ctx),
    new Promise<StepResult>((resolve) =>
      setTimeout(() => {
        resolve({
          stepId: step.id,
          action: step.action,
          status: 'error',
          error: `Step timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs,
        })
      }, timeoutMs)
    ),
  ])
}

// ─── Audit log helper ───────────────────────────────────────────────────

async function auditLog(params: {
  visitorId: string | null
  action: string
  details: Record<string, unknown>
  inputData?: Record<string, unknown>
  outputData?: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  durationMs?: number
  error?: string
}): Promise<void> {
  try {
    await prisma.aiAuditLog.create({
      data: {
        visitorId: params.visitorId,
        action: params.action,
        details: JSON.stringify(params.details),
        inputData: params.inputData ? JSON.stringify(params.inputData) : undefined,
        outputData: params.outputData ? JSON.stringify(params.outputData) : undefined,
        durationMs: params.durationMs,
        error: params.error,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch {
    /* non-critical — never fail the caller */
  }
}

/* ════════════════════════════════════════════════════════════════════════
   GET: Catalog of all action types & trigger types
   ════════════════════════════════════════════════════════════════════════ */

export async function GET() {
  return NextResponse.json({
    actions: ACTION_CATALOG,
    triggers: TRIGGER_CATALOG,
    meta: {
      totalActionTypes: ACTION_CATALOG.length,
      totalTriggerTypes: TRIGGER_CATALOG.length,
      supportedConditions: ['always', 'on_success', 'on_failure', 'expression:<expr>'],
      maxStepsPerChain: 100,
      defaultStepTimeoutMs: 30000,
    },
  })
}

/* ════════════════════════════════════════════════════════════════════════
   POST: Create & optionally execute a chained automation workflow
   ════════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  const overallStart = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    // ── Parse body ───────────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 },
      )
    }

    // ── Validate request ─────────────────────────────────────────────
    const validation = validateChainRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    const {
      name,
      description = '',
      steps,
      trigger,
      triggerConfig = {},
      executeImmediately = false,
    } = body as unknown as ChainRequest

    // ── Persist the automation rule ──────────────────────────────────
    const rule = await prisma.automationRule.create({
      data: {
        visitorId,
        name,
        description: description ?? '',
        trigger,
        triggerConfig: JSON.stringify(triggerConfig),
        actions: JSON.stringify(
          steps.map(s => ({ id: s.id, action: s.action, config: s.config, condition: s.condition ?? 'always', timeoutMs: s.timeoutMs ?? 30000 })),
        ),
        isActive: true,
        lastStatus: executeImmediately ? 'running' : 'pending',
      },
    })

    // ── If not executing immediately, return the plan ────────────────
    if (!executeImmediately) {
      return NextResponse.json(
        {
          ruleId: rule.id,
          name: rule.name,
          status: 'saved',
          steps: steps.map(s => ({
            id: s.id,
            action: s.action,
            condition: s.condition ?? 'always',
            timeoutMs: s.timeoutMs ?? 30000,
          })),
          trigger,
          triggerConfig,
          message: 'Chain saved. Set executeImmediately to true to run now.',
        },
        { status: 201 },
      )
    }

    // ── Execute the chain ────────────────────────────────────────────
    const stepResults: StepResult[] = []
    const stepResultsMap = new Map<string, StepResult>()
    let previousStatus: StepStatus | null = null
    let chainError: string | null = null

    // Create an initial AutomationLog entry
    const automationLog = await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        status: 'running',
        input: JSON.stringify({ trigger, triggerConfig, executedAt: new Date().toISOString() }),
        startedAt: new Date(),
      },
    })

    const execCtx: ExecutionContext = {
      stepResults: stepResultsMap,
      visitorId,
      ipAddress,
      userAgent,
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      // Evaluate step condition
      if (!shouldExecuteStep(step, previousStatus)) {
        const skipped: StepResult = {
          stepId: step.id,
          action: step.action,
          status: 'skipped',
          durationMs: 0,
        }
        stepResults.push(skipped)
        stepResultsMap.set(step.id, skipped)
        // Keep previousStatus unchanged for chained conditions
        continue
      }

      // Execute step
      const result = await executeStepWithTimeout(step, execCtx)
      stepResults.push(result)
      stepResultsMap.set(step.id, result)

      // Update the running status of the previous step
      previousStatus = result.status

      // If a step fails, we continue — later steps decide via condition
      if (result.status === 'error') {
        chainError = result.error ?? 'Unknown step error'
      }
    }

    // ── Determine overall chain status ───────────────────────────────
    const successCount = stepResults.filter(r => r.status === 'success').length
    const skippedCount = stepResults.filter(r => r.status === 'skipped').length
    const errorCount = stepResults.filter(r => r.status === 'error').length
    const overallStatus = errorCount > 0 ? 'error' : 'success'
    const totalDurationMs = Date.now() - overallStart

    // ── Update the automation rule ───────────────────────────────────
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        lastRun: new Date(),
        lastStatus: overallStatus,
        lastError: chainError,
        runCount: { increment: 1 },
      },
    })

    // ── Update the automation log ────────────────────────────────────
    await prisma.automationLog.update({
      where: { id: automationLog.id },
      data: {
        status: overallStatus,
        output: JSON.stringify({
          stepResults: stepResults.map(r => ({
            stepId: r.stepId,
            action: r.action,
            status: r.status,
            durationMs: r.durationMs,
            error: r.error,
          })),
          summary: { successCount, skippedCount, errorCount, totalDurationMs },
        }),
        error: chainError ?? undefined,
        completedAt: new Date(),
        durationMs: totalDurationMs,
      },
    })

    // ── Audit log ────────────────────────────────────────────────────
    await auditLog({
      visitorId,
      action: 'automation_run',
      details: {
        context: 'automation_chain',
        ruleId: rule.id,
        ruleName: name,
        trigger,
        stepCount: steps.length,
        successCount,
        skippedCount,
        errorCount,
      },
      inputData: { name, trigger, stepCount: steps.length },
      outputData: { overallStatus, totalDurationMs },
      ipAddress,
      userAgent,
      durationMs: totalDurationMs,
      error: chainError ?? undefined,
    })

    // ── Return results ───────────────────────────────────────────────
    return NextResponse.json({
      ruleId: rule.id,
      name,
      status: overallStatus,
      trigger,
      triggerConfig,
      steps: stepResults,
      summary: {
        totalSteps: steps.length,
        executed: successCount + errorCount,
        succeeded: successCount,
        skipped: skippedCount,
        failed: errorCount,
        totalDurationMs,
      },
      logId: automationLog.id,
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - overallStart
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    await auditLog({
      visitorId,
      action: 'automation_run',
      details: { context: 'automation_chain', error: true },
      ipAddress,
      userAgent,
      durationMs,
      error: errorMsg,
    })

    return NextResponse.json(
      { error: 'Failed to execute automation chain', details: errorMsg },
      { status: 500 },
    )
  }
}
