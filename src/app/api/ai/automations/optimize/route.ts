import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

/* ════════════════════════════════════════════════════════════════
   AI-Powered Automation Rule Optimization

   POST: Accepts an automation rule ID, analyzes its performance
   history (AutomationLog entries), and returns an optimized
   version alongside an explanation.
   ════════════════════════════════════════════════════════════════ */

const OPTIMIZE_SYSTEM_PROMPT = `You are an automation optimization engine for "The One-Way" — an AI-powered statistical analysis platform. Given an automation rule and its performance history, you must suggest an optimized version. Return ONLY a JSON object (no markdown fences) with this exact structure:

{
  "optimizedRule": {
    "name": "Improved name (keep close to original)",
    "description": "Improved description",
    "trigger": "schedule" | "new_data" | "event" | "manual",
    "triggerConfig": { ... } or {},
    "actions": [
      { "type": "clean_data" | "run_model" | "generate_report" | "send_notification", "config": { "key": "value" } }
    ]
  },
  "explanation": "2-4 sentence explanation of what changed and why",
  "performanceInsights": [
    "Insight about rule performance based on logs"
  ],
  "estimatedImprovement": "e.g. 30% faster, 2x fewer errors"
}

Optimization focus areas:
- If error rate > 20%: suggest more resilient action order or error-handling config
- If average duration > 5 min: suggest splitting into smaller rules or lighter strategies
- If triggered less than weekly for a daily rule: downgrade frequency
- If actions are redundant (e.g. clean_data followed by clean_data): merge or remove
- If rule hasn't been run in 30+ days: suggest pausing or rescheduling
- If success rate is high but no notification: suggest adding notification action

Valid action types and their configs:
- clean_data: { "strategy": "auto" | "standard" | "aggressive" }
- run_model: { "model": "descriptive-stats" | "regression" | "random-forest" | "anomaly-detection" }
- generate_report: { "format": "pdf" | "html" | "csv", "includeCharts": "true" | "false" }
- send_notification: { "channel": "email" | "push" | "webhook", "recipients": "team" | "admin" | "self" }

Return ONLY valid JSON, no extra text.`

function parseOptimizeResponse(text: string): {
  optimizedRule: Record<string, unknown>
  explanation: string
  performanceInsights: string[]
  estimatedImprovement: string
} | null {
  let cleaned = text.trim()

  // Strip markdown code block fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object' && parsed.optimizedRule) {
      return {
        optimizedRule: parsed.optimizedRule as Record<string, unknown>,
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'Optimization applied based on performance analysis.',
        performanceInsights: Array.isArray(parsed.performanceInsights)
          ? parsed.performanceInsights.filter((s: unknown): s is string => typeof s === 'string')
          : [],
        estimatedImprovement: typeof parsed.estimatedImprovement === 'string'
          ? parsed.estimatedImprovement
          : 'Improved efficiency',
      }
    }
    return null
  } catch {
    // Try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed && typeof parsed === 'object' && parsed.optimizedRule) {
          return {
            optimizedRule: parsed.optimizedRule as Record<string, unknown>,
            explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'Optimization applied.',
            performanceInsights: Array.isArray(parsed.performanceInsights)
              ? parsed.performanceInsights.filter((s: unknown): s is string => typeof s === 'string')
              : [],
            estimatedImprovement: typeof parsed.estimatedImprovement === 'string'
              ? parsed.estimatedImprovement
              : 'Improved efficiency',
          }
        }
      } catch {
        // ignore
      }
    }
    return null
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { ruleId } = body as { ruleId: string }

    if (!ruleId || typeof ruleId !== 'string') {
      return NextResponse.json(
        { error: 'ruleId is required' },
        { status: 400 }
      )
    }

    // Fetch the automation rule from DB
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      )
    }

    // Fetch performance logs for this rule
    const logs = await prisma.automationLog.findMany({
      where: { ruleId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    // Compute performance stats
    const totalRuns = logs.length
    const successCount = logs.filter(l => l.status === 'success' as const).length
    const errorCount = logs.filter(l => l.status === 'error' as const).length
    const avgDuration = totalRuns > 0
      ? Math.round(
          logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / totalRuns
        )
      : 0
    const errorRate = totalRuns > 0 ? Math.round((errorCount / totalRuns) * 100) : 0
    const lastRun = logs[0]?.startedAt || null
    const daysSinceLastRun = lastRun
      ? Math.round((Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Parse rule config for AI context
    let triggerConfig = {}
    let actions = []
    try {
      triggerConfig = rule.triggerConfig ? JSON.parse(rule.triggerConfig) : {}
    } catch {
      triggerConfig = {}
    }
    try {
      actions = rule.actions ? JSON.parse(rule.actions) : []
    } catch {
      actions = []
    }

    // Build performance summary for AI
    const performanceSummary = {
      ruleName: rule.name,
      ruleDescription: rule.description || '',
      trigger: rule.trigger,
      triggerConfig,
      actions,
      isActive: rule.isActive,
      runCount: rule.runCount,
      lastStatus: rule.lastStatus,
      stats: {
        totalRuns,
        successCount,
        errorCount,
        errorRate,
        avgDurationMs: avgDuration,
        daysSinceLastRun,
        recentErrors: logs
          .filter(l => l.status === 'error' as const)
          .slice(0, 5)
          .map(l => ({ error: l.error, startedAt: l.startedAt })),
      },
    }

    // Call AI for optimization analysis
    let optimization: ReturnType<typeof parseOptimizeResponse> = null

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: OPTIMIZE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze and optimize this automation rule based on its performance history:\n\n${JSON.stringify(performanceSummary, null, 2)}`,
          },
        ],
      })

      const aiMessage = completion.choices?.[0]?.message?.content || ''
      optimization = parseOptimizeResponse(aiMessage)

      // Log AI usage to audit
      const durationMs = Date.now() - startTime
      try {
        await prisma.aiAuditLog.create({
          data: {
            visitorId,
            action: 'ai_query',
            details: JSON.stringify({ context: 'automation_optimize', ruleId }),
            inputData: JSON.stringify({ ruleName: rule.name }),
            outputData: JSON.stringify({ responseLength: aiMessage.length }),
            tokensUsed: completion.usage?.total_tokens || 0,
            durationMs,
            ipAddress,
            userAgent,
          },
        })
      } catch { /* silent */ }
    } catch {
      // AI call failed — generate a rule-of-thumb optimization
      optimization = null
    }

    // Fallback: generate heuristic-based optimization
    if (!optimization) {
      const improvements: string[] = []
      let optimizedTrigger = rule.trigger
      let optimizedTriggerConfig = { ...triggerConfig as Record<string, unknown> }
      const optimizedActions = [...actions]

      if (errorRate > 20) {
        improvements.push('High error rate detected — consider reviewing action configurations for compatibility')
      }
      if (avgDuration > 300000) {
        improvements.push('Long average duration — consider splitting into smaller rules or using lighter strategies')
      }
      if (daysSinceLastRun !== null && daysSinceLastRun > 30) {
        improvements.push(`Rule hasn't run in ${daysSinceLastRun} days — consider pausing or rescheduling`)
        optimizedTrigger = 'manual'
        optimizedTriggerConfig = {}
      }
      if (totalRuns > 50 && errorRate < 5 && !actions.some((a: Record<string, unknown>) => a.type === 'send_notification')) {
        improvements.push('Rule runs reliably — consider adding a notification action for result awareness')
        optimizedActions.push({ type: 'send_notification', config: { channel: 'email', recipients: 'self' } })
      }

      optimization = {
        optimizedRule: {
          name: rule.name,
          description: rule.description || '',
          trigger: optimizedTrigger,
          triggerConfig: optimizedTriggerConfig,
          actions: optimizedActions,
        },
        explanation: improvements.length > 0
          ? `Heuristic analysis found ${improvements.length} area(s) for improvement: ${improvements.join('. ')}.`
          : 'Rule appears well-configured. No immediate changes recommended.',
        performanceInsights: [
          `Total runs: ${totalRuns}`,
          `Success rate: ${totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0}%`,
          `Average duration: ${avgDuration > 60000 ? `${Math.round(avgDuration / 60000)}m ${Math.round((avgDuration % 60000) / 1000)}s` : `${Math.round(avgDuration / 1000)}s`}`,
          ...(daysSinceLastRun !== null ? [`Days since last run: ${daysSinceLastRun}`] : []),
        ],
        estimatedImprovement: improvements.length > 0 ? 'See explanation above' : 'Already optimal',
      }
    }

    return NextResponse.json({
      ruleId,
      originalRule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        triggerConfig,
        actions,
        isActive: rule.isActive,
      },
      optimizedRule: optimization.optimizedRule,
      explanation: optimization.explanation,
      performanceInsights: optimization.performanceInsights,
      estimatedImprovement: optimization.estimatedImprovement,
      performanceSummary: {
        totalRuns,
        successCount,
        errorCount,
        errorRate,
        avgDurationMs: avgDuration,
        daysSinceLastRun,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    // Log error to audit
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({ context: 'automation_optimize', error: true }),
          error: errorMsg,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch { /* silent */ }

    return NextResponse.json(
      { error: 'Failed to optimize automation rule' },
      { status: 500 }
    )
  }
}
