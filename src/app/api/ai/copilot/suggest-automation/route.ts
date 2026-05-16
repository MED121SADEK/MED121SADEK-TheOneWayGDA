import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

/* ════════════════════════════════════════════════════════════════
   Proactive Automation Suggestions from Copilot

   GET: Returns AI-generated automation suggestions based on
   the user's recent activity patterns. Analyzes:
   - Frequency of manual actions
   - Repeated patterns in AiAuditLog
   - Common workflows from AiConversation
   - Existing automation rules (to avoid duplicates)

   Stores suggestions in AiSuggestion table with confidence scores.
   ════════════════════════════════════════════════════════════════ */

const SUGGEST_AUTOMATION_PROMPT = `You are an intelligent copilot for "The One-Way" — an AI-powered statistical analysis platform. Given a user's recent activity patterns, suggest automations they could benefit from.

Analyze the patterns and return a JSON array of suggestions (no markdown fences). Each suggestion:

{
  "title": "Short title (max 60 chars)",
  "description": "One-sentence description of what the automation would do",
  "trigger": "schedule" | "new_data" | "event" | "manual",
  "triggerConfig": { ... } or {},
  "actions": [
    { "type": "clean_data" | "run_model" | "generate_report" | "send_notification", "config": { "key": "value" } }
  ],
  "reason": "Why this would help this specific user (1-2 sentences)",
  "confidence": 0.0 to 1.0
}

Rules:
- Max 5 suggestions
- Only suggest automations NOT already in the user's existing rules
- Confidence should reflect how strongly the pattern supports this suggestion
- Don't suggest obvious / trivial automations
- Focus on patterns that repeat: same action at same time, same workflow steps, same data preparation steps
- Prefer schedule triggers for recurring patterns, event triggers for reactive patterns

Valid action types and configs:
- clean_data: { "strategy": "auto" | "standard" | "aggressive" }
- run_model: { "model": "descriptive-stats" | "regression" | "random-forest" | "anomaly-detection" }
- generate_report: { "format": "pdf" | "html" | "csv", "includeCharts": "true" | "false" }
- send_notification: { "channel": "email" | "push" | "webhook", "recipients": "team" | "admin" | "self" }

Return ONLY a JSON array, no extra text.`

interface AutomationSuggestion {
  title: string
  description: string
  trigger: string
  triggerConfig: Record<string, unknown>
  actions: Array<{ type: string; config: Record<string, unknown> }>
  reason: string
  confidence: number
}

function parseSuggestionArray(text: string): AutomationSuggestion[] {
  let cleaned = text.trim()

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s: unknown): s is Record<string, unknown> =>
          s !== null && typeof s === 'object' && typeof (s as Record<string, unknown>).title === 'string'
        )
        .map((s: Record<string, unknown>) => ({
          title: String(s.title || ''),
          description: String(s.description || ''),
          trigger: String(s.trigger || 'manual'),
          triggerConfig: (typeof s.triggerConfig === 'object' && s.triggerConfig ? s.triggerConfig : {}) as Record<string, unknown>,
          actions: Array.isArray(s.actions)
            ? s.actions.map((a: Record<string, unknown>) => ({
                type: String(a.type || 'clean_data'),
                config: (typeof a.config === 'object' && a.config ? a.config : {}) as Record<string, unknown>,
              }))
            : [],
          reason: String(s.reason || ''),
          confidence: typeof s.confidence === 'number' ? Math.min(Math.max(s.confidence, 0), 1) : 0.5,
        }))
        .filter(s => s.title.length > 0)
        .slice(0, 5)
    }
    return []
  } catch {
    // Try to find JSON array in the text
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) {
          return parsed
            .filter((s: unknown): s is Record<string, unknown> =>
              s !== null && typeof s === 'object' && typeof (s as Record<string, unknown>).title === 'string'
            )
            .map((s: Record<string, unknown>) => ({
              title: String(s.title || ''),
              description: String(s.description || ''),
              trigger: String(s.trigger || 'manual'),
              triggerConfig: (typeof s.triggerConfig === 'object' && s.triggerConfig ? s.triggerConfig : {}) as Record<string, unknown>,
              actions: Array.isArray(s.actions)
                ? s.actions.map((a: Record<string, unknown>) => ({
                    type: String(a.type || 'clean_data'),
                    config: (typeof a.config === 'object' && a.config ? a.config : {}) as Record<string, unknown>,
                  }))
                : [],
              reason: String(s.reason || ''),
              confidence: typeof s.confidence === 'number' ? Math.min(Math.max(s.confidence, 0), 1) : 0.5,
            }))
            .filter(s => s.title.length > 0)
            .slice(0, 5)
        }
      } catch {
        // ignore
      }
    }
    return []
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

    // ─── Gather user activity signals ───

    // 1. Recent audit log entries (last 7 days) — shows what actions user performed
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentAuditLogs = await prisma.aiAuditLog.findMany({
      where: {
        visitorId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
    })

    // 2. Count action frequency
    const actionFrequency: Record<string, number> = {}
    for (const log of recentAuditLogs) {
      actionFrequency[log.action] = (actionFrequency[log.action] || 0) + 1
    }

    // 3. Analyze action timing patterns (hourly distribution)
    const hourlyDistribution: Record<number, number> = {}
    for (const log of recentAuditLogs) {
      const hour = new Date(log.createdAt).getHours()
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
    }

    // 4. Recent AI conversations — what the user has been asking about
    const recentConversations = await prisma.aiConversation.findMany({
      where: {
        visitorId,
        updatedAt: { gte: sevenDaysAgo },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        context: true,
        title: true,
        messages: true,
      },
    })

    // Extract common themes from conversations
    const conversationContexts: Record<string, number> = {}
    for (const conv of recentConversations) {
      conversationContexts[conv.context] = (conversationContexts[conv.context] || 0) + 1
    }

    // 5. Existing automation rules — avoid duplicating
    const existingRules = await prisma.automationRule.findMany({
      where: { visitorId },
      select: {
        name: true,
        trigger: true,
        actions: true,
        isActive: true,
      },
    })

    // 6. User preferences
    const userPrefs = await prisma.userPreference.findUnique({
      where: { visitorId: visitorId || '__none__' },
    })

    // ─── Check for cached suggestions (last 6 hours) ───
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const cachedSuggestions = await prisma.aiSuggestion.findMany({
      where: {
        visitorId,
        context: 'automation_suggestion',
        isDismissed: false,
        createdAt: { gte: sixHoursAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    if (cachedSuggestions.length > 0) {
      return NextResponse.json({
        suggestions: cachedSuggestions.map(s => ({
          id: s.id,
          title: s.title,
          content: JSON.parse(s.content),
          confidence: s.confidence,
          context: s.context,
          category: s.category,
          createdAt: s.createdAt,
        })),
        source: 'cache',
        analyzedPatterns: {
          auditLogEntries: recentAuditLogs.length,
          conversationsAnalyzed: recentConversations.length,
          existingRules: existingRules.length,
        },
      })
    }

    // ─── Build activity summary for AI ───
    const activitySummary = {
      period: 'last_7_days',
      actionFrequency,
      peakActivityHours: Object.entries(hourlyDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), count })),
      conversationContexts,
      conversationCount: recentConversations.length,
      totalAuditEntries: recentAuditLogs.length,
      existingAutomations: existingRules.map(r => ({
        name: r.name,
        trigger: r.trigger,
        isActive: r.isActive,
      })),
      userSkillLevel: userPrefs?.skillLevel || 'intermediate',
      aiSensitivity: userPrefs?.aiSensitivity || 0.7,
      recentActions: recentAuditLogs.slice(0, 20).map(l => ({
        action: l.action,
        details: l.details,
        timestamp: l.createdAt,
      })),
    }

    // ─── Call AI for suggestions ───
    let suggestions: AutomationSuggestion[] = []

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SUGGEST_AUTOMATION_PROMPT },
          {
            role: 'user',
            content: `Based on this user's recent activity patterns, suggest automations they could benefit from:\n\n${JSON.stringify(activitySummary, null, 2)}`,
          },
        ],
      })

      const aiMessage = completion.choices?.[0]?.message?.content || ''
      suggestions = parseSuggestionArray(aiMessage)

      // Log AI usage to audit
      const durationMs = Date.now() - startTime
      try {
        await prisma.aiAuditLog.create({
          data: {
            visitorId,
            action: 'ai_query',
            details: JSON.stringify({ context: 'suggest_automation' }),
            inputData: JSON.stringify({ auditLogCount: recentAuditLogs.length, convCount: recentConversations.length }),
            outputData: JSON.stringify({ suggestionCount: suggestions.length }),
            tokensUsed: completion.usage?.total_tokens || 0,
            durationMs,
            ipAddress,
            userAgent,
          },
        })
      } catch { /* silent */ }
    } catch {
      // AI call failed — use heuristic-based suggestions
      suggestions = generateHeuristicSuggestions(activitySummary)
    }

    // ─── Store suggestions in AiSuggestion table ───
    if (suggestions.length > 0 && visitorId) {
      // Mark old suggestions of this type as dismissed
      try {
        await prisma.aiSuggestion.updateMany({
          where: {
            visitorId,
            context: 'automation_suggestion',
            createdAt: { lt: sixHoursAgo },
          },
          data: { isDismissed: true },
        })
      } catch { /* silent */ }

      // Store new suggestions
      const storedSuggestions = []
      for (const suggestion of suggestions.slice(0, limit)) {
        try {
          const stored = await prisma.aiSuggestion.create({
            data: {
              visitorId,
              context: 'automation_suggestion',
              category: 'automation',
              title: suggestion.title,
              content: JSON.stringify({
                description: suggestion.description,
                trigger: suggestion.trigger,
                triggerConfig: suggestion.triggerConfig,
                actions: suggestion.actions,
                reason: suggestion.reason,
              }),
              confidence: suggestion.confidence,
            },
          })
          storedSuggestions.push({
            id: stored.id,
            title: stored.title,
            content: JSON.parse(stored.content),
            confidence: stored.confidence,
            context: stored.context,
            category: stored.category,
            createdAt: stored.createdAt,
          })
        } catch {
          // If storing fails, still return the suggestion in-memory
          storedSuggestions.push({
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: suggestion.title,
            content: {
              description: suggestion.description,
              trigger: suggestion.trigger,
              triggerConfig: suggestion.triggerConfig,
              actions: suggestion.actions,
              reason: suggestion.reason,
            },
            confidence: suggestion.confidence,
            context: 'automation_suggestion',
            category: 'automation',
            createdAt: new Date(),
          })
        }
      }

      return NextResponse.json({
        suggestions: storedSuggestions,
        source: 'ai_generated',
        analyzedPatterns: {
          auditLogEntries: recentAuditLogs.length,
          conversationsAnalyzed: recentConversations.length,
          existingRules: existingRules.length,
        },
      })
    }

    // No visitorId — return suggestions without storing
    return NextResponse.json({
      suggestions: suggestions.map((s, i) => ({
        id: `anon-${Date.now()}-${i}`,
        title: s.title,
        content: {
          description: s.description,
          trigger: s.trigger,
          triggerConfig: s.triggerConfig,
          actions: s.actions,
          reason: s.reason,
        },
        confidence: s.confidence,
        context: 'automation_suggestion',
        category: 'automation',
        createdAt: new Date(),
      })),
      source: suggestions.length > 0 ? 'ai_generated' : 'none',
      analyzedPatterns: {
        auditLogEntries: recentAuditLogs.length,
        conversationsAnalyzed: recentConversations.length,
        existingRules: existingRules.length,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({ context: 'suggest_automation', error: true }),
          error: errorMsg,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch { /* silent */ }

    return NextResponse.json(
      { error: 'Failed to generate automation suggestions' },
      { status: 500 }
    )
  }
}

/* ─── Heuristic fallback when AI is unavailable ─── */
function generateHeuristicSuggestions(activity: Record<string, unknown>): AutomationSuggestion[] {
  const suggestions: AutomationSuggestion[] = []
  const actionFrequency = (activity.actionFrequency || {}) as Record<string, number>
  const existingAutomations = (activity.existingAutomations || []) as Array<{ name: string; trigger: string }>

  const existingNames = new Set(existingAutomations.map(r => r.name.toLowerCase()))

  // If user runs models frequently, suggest automation
  if ((actionFrequency['ai_query'] || 0) > 10) {
    if (!existingNames.has('automated model analysis')) {
      suggestions.push({
        title: 'Automated Model Analysis',
        description: 'Schedule a daily automated analysis run based on your frequent AI queries.',
        trigger: 'schedule',
        triggerConfig: { frequency: 'daily', time: '08:00' },
        actions: [
          { type: 'run_model', config: { model: 'descriptive-stats' } },
          { type: 'generate_report', config: { format: 'pdf', includeCharts: 'true' } },
        ],
        reason: `You've made ${actionFrequency['ai_query']} AI queries in the past week — automating recurring analysis would save time.`,
        confidence: 0.75,
      })
    }
  }

  // If user uses workspace context frequently
  const conversationContexts = (activity.conversationContexts || {}) as Record<string, number>
  if ((conversationContexts['workspace'] || 0) > 5) {
    if (!existingNames.has('daily workspace data check')) {
      suggestions.push({
        title: 'Daily Workspace Data Check',
        description: 'Automatically clean and validate your workspace data every morning.',
        trigger: 'schedule',
        triggerConfig: { frequency: 'daily', time: '06:00' },
        actions: [
          { type: 'clean_data', config: { strategy: 'auto' } },
          { type: 'send_notification', config: { channel: 'push', recipients: 'self' } },
        ],
        reason: `You frequently work in the workspace (${conversationContexts['workspace']} sessions) — a daily data cleanup would ensure clean data each morning.`,
        confidence: 0.65,
      })
    }
  }

  // If no existing report automation
  if (!existingAutomations.some(r => r.name.toLowerCase().includes('report'))) {
    suggestions.push({
      title: 'Weekly Summary Report',
      description: 'Generate a weekly analytics summary with charts every Monday.',
      trigger: 'schedule',
      triggerConfig: { frequency: 'weekly', time: '09:00', dayOfWeek: 'monday' },
      actions: [
        { type: 'run_model', config: { model: 'descriptive-stats' } },
        { type: 'generate_report', config: { format: 'pdf', includeCharts: 'true' } },
        { type: 'send_notification', config: { channel: 'email', recipients: 'self' } },
      ],
      reason: 'No report automation exists yet. A weekly summary keeps you informed about data trends.',
      confidence: 0.5,
    })
  }

  return suggestions.slice(0, 5)
}
