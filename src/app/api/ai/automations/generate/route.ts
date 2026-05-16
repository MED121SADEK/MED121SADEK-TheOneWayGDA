import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/* ─── Types ─── */
interface GeneratedAction {
  type: string
  config: Record<string, string>
}

interface GeneratedAutomation {
  name: string
  description: string
  trigger: string
  triggerConfig?: Record<string, string>
  actions: GeneratedAction[]
  explanation?: string
}

/* ─── Valid action / trigger types ─── */
const VALID_TRIGGERS = ['schedule', 'new_data', 'event', 'manual']
const VALID_ACTIONS = ['clean_data', 'run_model', 'generate_report', 'send_notification']
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly']

/* ─── System prompt ─── */
const GENERATE_SYSTEM_PROMPT = `You are an automation rule generator for "The One-Way" — an AI-powered statistical analysis platform. Given a natural language description of a desired automation, you must return a single JSON object (no markdown, no explanation outside the JSON) with the following structure:

{
  "name": "Short descriptive name (max 50 chars)",
  "description": "One sentence describing what this automation does",
  "trigger": "schedule" | "new_data" | "event" | "manual",
  "triggerConfig": {
    "frequency": "daily" | "weekly" | "monthly" (only if trigger is "schedule"),
    "time": "HH:MM" (only if trigger is "schedule"),
    "dayOfWeek": "monday"|"tuesday"|... (only if frequency is "weekly"),
    "dayOfMonth": "1"-"28" (only if frequency is "monthly")
  },
  "actions": [
    {
      "type": "clean_data" | "run_model" | "generate_report" | "send_notification",
      "config": { "key": "value" }
    }
  ],
  "explanation": "Brief explanation of what this automation does and why it's configured this way"
}

Valid action types and their config keys:
- clean_data: { "strategy": "auto" | "standard" | "aggressive" }
- run_model: { "model": "descriptive-stats" | "regression" | "random-forest" | "anomaly-detection" }
- generate_report: { "format": "pdf" | "html" | "csv", "includeCharts": "true" | "false" }
- send_notification: { "channel": "email" | "push" | "webhook", "recipients": "team" | "admin" | "self" }

If trigger is not "schedule", omit the triggerConfig entirely or set it to {}.
Return ONLY valid JSON, no extra text.`

/* ─── Parse AI JSON response (handles markdown code blocks) ─── */
function parseAIJson(text: string): GeneratedAutomation | null {
  let cleaned = text.trim()

  // Strip markdown code block fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    return parsed as GeneratedAutomation
  } catch {
    // Try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as GeneratedAutomation
      } catch {
        return null
      }
    }
    return null
  }
}

/* ─── Validate generated automation ─── */
function validateAutomation(data: GeneratedAutomation): {
  valid: boolean
  warnings: string[]
  errors: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required')
  }

  if (!data.trigger || !VALID_TRIGGERS.includes(data.trigger)) {
    errors.push(`Invalid trigger type. Must be one of: ${VALID_TRIGGERS.join(', ')}`)
  }

  // Validate triggerConfig for schedule triggers
  if (data.trigger === 'schedule') {
    const tc = data.triggerConfig || {}
    if (!tc.frequency || !VALID_FREQUENCIES.includes(tc.frequency)) {
      errors.push('Schedule trigger requires a valid frequency (daily, weekly, or monthly)')
    }
    if (!tc.time || !/^\d{2}:\d{2}$/.test(tc.time)) {
      errors.push('Schedule trigger requires a valid time in HH:MM format')
    }
    if (tc.frequency === 'weekly' && !tc.dayOfWeek) {
      warnings.push('Weekly schedule should specify a day of week')
    }
    if (tc.frequency === 'monthly' && !tc.dayOfMonth) {
      warnings.push('Monthly schedule should specify a day of month')
    }
  }

  // Validate actions
  if (!Array.isArray(data.actions) || data.actions.length === 0) {
    errors.push('At least one action is required')
  } else {
    for (const action of data.actions) {
      if (!action.type || !VALID_ACTIONS.includes(action.type)) {
        errors.push(`Invalid action type: ${action.type}. Must be one of: ${VALID_ACTIONS.join(', ')}`)
      }
    }
  }

  // Warnings
  if (data.actions && data.actions.length > 5) {
    warnings.push('Automation has more than 5 actions — consider splitting into multiple automations')
  }

  if (!data.description) {
    warnings.push('No description provided — adding one helps with future management')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/* ─── Pre-built templates ─── */
const AUTOMATION_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Morning Data Cleanup',
    description: 'Clean and normalize datasets every morning at 6 AM',
    trigger: 'schedule',
    triggerConfig: { frequency: 'daily', time: '06:00' },
    actions: [
      { type: 'clean_data', config: { strategy: 'auto' } },
      { type: 'generate_report', config: { format: 'pdf', includeCharts: 'true' } },
    ],
    category: 'Data Quality',
  },
  {
    id: 'tpl-2',
    name: 'Anomaly Detection Alert',
    description: 'Monitor data for anomalies and send real-time alerts',
    trigger: 'event',
    triggerConfig: {},
    actions: [
      { type: 'run_model', config: { model: 'anomaly-detection' } },
      { type: 'send_notification', config: { channel: 'push' } },
    ],
    category: 'Monitoring',
  },
  {
    id: 'tpl-3',
    name: 'Weekly Analytics Summary',
    description: 'Generate weekly analytics report every Monday at 9 AM',
    trigger: 'schedule',
    triggerConfig: { frequency: 'weekly', time: '09:00', dayOfWeek: 'monday' },
    actions: [
      { type: 'run_model', config: { model: 'descriptive-stats' } },
      { type: 'generate_report', config: { format: 'pdf', includeCharts: 'true' } },
      { type: 'send_notification', config: { channel: 'email', recipients: 'team' } },
    ],
    category: 'Reporting',
  },
  {
    id: 'tpl-4',
    name: 'Auto Retrain on New Data',
    description: 'Retrain predictive models whenever new labeled data is uploaded',
    trigger: 'new_data',
    triggerConfig: {},
    actions: [
      { type: 'clean_data', config: { strategy: 'standard' } },
      { type: 'run_model', config: { model: 'random-forest' } },
      { type: 'send_notification', config: { channel: 'email' } },
    ],
    category: 'ML Pipeline',
  },
  {
    id: 'tpl-5',
    name: 'Monthly Regression Report',
    description: 'Run regression analysis on the 1st of each month',
    trigger: 'schedule',
    triggerConfig: { frequency: 'monthly', time: '08:00', dayOfMonth: '1' },
    actions: [
      { type: 'run_model', config: { model: 'regression' } },
      { type: 'generate_report', config: { format: 'html', includeCharts: 'true' } },
      { type: 'send_notification', config: { channel: 'email', recipients: 'admin' } },
    ],
    category: 'Reporting',
  },
  {
    id: 'tpl-6',
    name: 'Data Quality Pipeline',
    description: 'Full data cleaning pipeline with aggressive strategy',
    trigger: 'schedule',
    triggerConfig: { frequency: 'daily', time: '03:00' },
    actions: [
      { type: 'clean_data', config: { strategy: 'aggressive' } },
      { type: 'generate_report', config: { format: 'csv', includeCharts: 'false' } },
    ],
    category: 'Data Quality',
  },
]

/* ════════════════════════════════════════════════════════════════
   POST: Generate automation from natural language
   ════════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, context } = body as {
      description: string
      context?: string
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    let generated: GeneratedAutomation | null = null

    try {
      const zai = await ZAI.create()
      const contextNote = context
        ? `\n\nAdditional context from the user: ${context}`
        : ''

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: GENERATE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate an automation rule for this request: "${description}"${contextNote}`,
          },
        ],
      })

      const aiMessage = completion.choices?.[0]?.message?.content || ''
      generated = parseAIJson(aiMessage)
    } catch {
      // AI call failed — return fallback
      generated = null
    }

    // Fallback if AI failed to produce valid JSON
    if (!generated) {
      generated = {
        name: 'Custom Automation',
        description: description.slice(0, 200),
        trigger: 'manual',
        actions: [
          { type: 'clean_data', config: { strategy: 'auto' } },
          { type: 'generate_report', config: { format: 'pdf' } },
        ],
        explanation:
          'AI could not generate a specific automation from your description. This is a default template you can customize.',
      }
    }

    const validation = validateAutomation(generated)

    // Convert to the format expected by the automations API
    const automation = {
      name: generated.name || 'Untitled Automation',
      description: generated.description || '',
      trigger: (VALID_TRIGGERS.includes(generated.trigger)
        ? generated.trigger
        : 'manual') as 'schedule' | 'new_data' | 'event' | 'manual',
      scheduleConfig:
        generated.trigger === 'schedule' && generated.triggerConfig
          ? {
              frequency: generated.triggerConfig.frequency || 'daily',
              time: generated.triggerConfig.time || '08:00',
              dayOfWeek: generated.triggerConfig.dayOfWeek,
              dayOfMonth: generated.triggerConfig.dayOfMonth,
            }
          : null,
      actions: (generated.actions || []).map((a, i) => ({
        id: `act-${Date.now()}-${i}`,
        type: (VALID_ACTIONS.includes(a.type) ? a.type : 'clean_data') as
          | 'clean_data'
          | 'run_model'
          | 'generate_report'
          | 'send_notification',
        config: a.config || {},
      })),
      isActive: true,
    }

    return NextResponse.json({
      automation,
      validation: {
        valid: validation.valid,
        warnings: validation.warnings,
        errors: validation.errors,
      },
      explanation: generated.explanation || '',
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate automation: ${errorMsg}` },
      { status: 500 }
    )
  }
}

/* ════════════════════════════════════════════════════════════════
   GET: Return pre-built automation templates
   ════════════════════════════════════════════════════════════════ */
export async function GET() {
  return NextResponse.json({ templates: AUTOMATION_TEMPLATES })
}
