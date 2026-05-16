import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/* ─── Valid types ─── */
const VALID_TRIGGERS = ['schedule', 'new_data', 'event', 'manual']
const VALID_ACTIONS = ['clean_data', 'run_model', 'generate_report', 'send_notification']
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly']
const VALID_CLEAN_STRATEGIES = ['auto', 'standard', 'aggressive']
const VALID_MODELS = ['descriptive-stats', 'regression', 'random-forest', 'anomaly-detection']
const VALID_REPORT_FORMATS = ['pdf', 'html', 'csv']
const VALID_CHANNELS = ['email', 'push', 'webhook']

/* ─── Validation rules ─── */
function validateRule(
  automation: Record<string, unknown>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Name
  const name = automation.name as string | undefined
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Automation name is required')
  } else if (name.length > 100) {
    errors.push('Automation name must be 100 characters or less')
  }

  // Trigger
  const trigger = automation.trigger as string | undefined
  if (!trigger || !VALID_TRIGGERS.includes(trigger)) {
    errors.push(`Invalid trigger type "${trigger}". Must be one of: ${VALID_TRIGGERS.join(', ')}`)
  }

  // Schedule config
  const scheduleConfig = automation.scheduleConfig as Record<string, unknown> | null | undefined
  if (trigger === 'schedule') {
    if (!scheduleConfig || typeof scheduleConfig !== 'object') {
      errors.push('Schedule trigger requires schedule configuration')
    } else {
      const frequency = scheduleConfig.frequency as string | undefined
      const time = scheduleConfig.time as string | undefined

      if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
        errors.push(`Invalid frequency "${frequency}". Must be one of: ${VALID_FREQUENCIES.join(', ')}`)
      }
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        errors.push('Invalid time format. Must be HH:MM (e.g., "09:00")')
      }
      if (frequency === 'weekly' && !scheduleConfig.dayOfWeek) {
        warnings.push('Weekly schedule without a specified day of week defaults to Monday')
      }
      if (frequency === 'monthly' && !scheduleConfig.dayOfMonth) {
        warnings.push('Monthly schedule without a specified day defaults to the 1st')
      }
    }
  } else if (trigger !== 'schedule' && scheduleConfig) {
    warnings.push('Schedule configuration is ignored for non-schedule triggers')
  }

  // Actions
  const actions = automation.actions as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(actions) || actions.length === 0) {
    errors.push('At least one action is required')
  } else {
    if (actions.length > 10) {
      warnings.push('Automation has many actions — consider splitting for better reliability')
    }

    const actionTypes = new Set<string>()
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const actionType = action.type as string | undefined

      if (!actionType || !VALID_ACTIONS.includes(actionType)) {
        errors.push(`Action ${i + 1} has invalid type "${actionType}"`)
      } else {
        actionTypes.add(actionType)
      }

      // Validate action configs
      const config = (action.config || {}) as Record<string, string>

      if (actionType === 'clean_data') {
        if (config.strategy && !VALID_CLEAN_STRATEGIES.includes(config.strategy)) {
          errors.push(
            `Action ${i + 1} (clean_data) has invalid strategy "${config.strategy}"`
          )
        }
      }

      if (actionType === 'run_model') {
        if (config.model && !VALID_MODELS.includes(config.model)) {
          errors.push(
            `Action ${i + 1} (run_model) has invalid model "${config.model}"`
          )
        }
      }

      if (actionType === 'generate_report') {
        if (config.format && !VALID_REPORT_FORMATS.includes(config.format)) {
          errors.push(
            `Action ${i + 1} (generate_report) has invalid format "${config.format}"`
          )
        }
      }

      if (actionType === 'send_notification') {
        if (config.channel && !VALID_CHANNELS.includes(config.channel)) {
          errors.push(
            `Action ${i + 1} (send_notification) has invalid channel "${config.channel}"`
          )
        }
      }
    }

    // Logical warnings
    if (actionTypes.has('generate_report') && !actionTypes.has('clean_data') && !actionTypes.has('run_model')) {
      warnings.push('Generating a report without prior data cleaning or analysis may produce less accurate results')
    }
    if (actionTypes.has('send_notification') && !actionTypes.has('generate_report') && !actionTypes.has('run_model')) {
      warnings.push('Sending a notification without generating results may not be useful')
    }
    if (actions.length > 2 && !actionTypes.has('send_notification')) {
      warnings.push('Consider adding a notification action to stay informed about automation results')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/* ─── AI suggestion prompt ─── */
const SUGGESTION_PROMPT = `You are an automation optimization advisor for "The One-Way" platform — an AI-powered statistical analysis tool. Given an automation rule, provide up to 3 concise suggestions to improve it. Focus on: performance, reliability, best practices, and cost efficiency. Return a JSON array of strings. Example: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]. Return ONLY the JSON array, no extra text.`

function parseAIArray(text: string): string[] {
  let cleaned = text.trim()

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string').slice(0, 5)
    }
    return []
  } catch {
    const arrMatch = cleaned.match(/\[[\s\S]*?\]/)
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) {
          return parsed.filter((s): s is string => typeof s === 'string').slice(0, 5)
        }
      } catch {
        // ignore
      }
    }
    return []
  }
}

/* ════════════════════════════════════════════════════════════════
   POST: Validate an automation rule + get AI suggestions
   ════════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const automation = body as Record<string, unknown>

    if (!automation || typeof automation !== 'object') {
      return NextResponse.json(
        { error: 'Automation object is required' },
        { status: 400 }
      )
    }

    // Run validation
    const validation = validateRule(automation)

    // Get AI suggestions (non-blocking)
    let suggestions: string[] = []

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SUGGESTION_PROMPT },
          {
            role: 'user',
            content: `Review this automation rule and suggest improvements:\n${JSON.stringify(automation, null, 2)}`,
          },
        ],
      })

      const aiMessage = completion.choices?.[0]?.message?.content || ''
      suggestions = parseAIArray(aiMessage)
    } catch {
      // AI suggestions are optional — don't fail the whole request
      suggestions = [
        'Consider adding error handling to your action pipeline',
        'Review the schedule timing to avoid peak hours',
        'Add notification actions to stay informed about results',
      ]
    }

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Validation failed: ${errorMsg}` },
      { status: 500 }
    )
  }
}
