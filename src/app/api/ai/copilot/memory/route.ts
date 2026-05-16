import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// GET: Retrieve AI's memory/context for a project or visitor
// Returns structured memory summary built from past decisions, pipelines, and conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    const projectId = searchParams.get('projectId')

    if (!visitorId && !projectId) {
      return NextResponse.json(
        { error: 'Either visitorId or projectId is required' },
        { status: 400 }
      )
    }

    const memory: {
      visitorId: string | null
      projectId: string | null
      pastDecisions: Array<Record<string, unknown>>
      pastPipelines: Array<Record<string, unknown>>
      conversationHistory: Array<Record<string, unknown>>
      preferences: Record<string, unknown> | null
      preferences_: Record<string, unknown> | null
      summary: string
      stats: {
        totalDecisions: number
        totalPipelines: number
        completedPipelines: number
        totalConversations: number
        lastActivity: string | null
      }
    } = {
      visitorId: visitorId || null,
      projectId: projectId || null,
      pastDecisions: [],
      pastPipelines: [],
      conversationHistory: [],
      preferences: null,
      preferences_: null,
      summary: '',
      stats: {
        totalDecisions: 0,
        totalPipelines: 0,
        completedPipelines: 0,
        totalConversations: 0,
        lastActivity: null,
      },
    }

    // Fetch past decisions
    const decisionWhere: Record<string, unknown> = {}
    if (visitorId) decisionWhere.visitorId = visitorId
    if (projectId) decisionWhere.projectId = projectId

    const decisions = await prisma.decisionRecord.findMany({
      where: decisionWhere,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    memory.pastDecisions = decisions.map((d) => ({
      id: d.id,
      context: d.context,
      question: d.question,
      aiAnalysis: safeJsonParse(d.aiAnalysis),
      selectedOption: d.selectedOption,
      confidence: d.confidence,
      createdAt: d.createdAt.toISOString(),
    }))
    memory.stats.totalDecisions = decisions.length

    // Fetch past pipelines
    const pipelineWhere: Record<string, unknown> = {}
    if (visitorId) pipelineWhere.visitorId = visitorId
    if (projectId) pipelineWhere.projectId = projectId

    const pipelines = await prisma.workflowPipeline.findMany({
      where: pipelineWhere,
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    memory.pastPipelines = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      intent: p.intent,
      status: p.status,
      executiveSummary: p.executiveSummary,
      stepCount: (JSON.parse(p.steps) as unknown[]).length,
      durationMs: p.durationMs,
      createdAt: p.createdAt.toISOString(),
    }))
    memory.stats.totalPipelines = pipelines.length
    memory.stats.completedPipelines = pipelines.filter((p) => p.status === 'completed').length

    // Fetch recent conversation summaries
    const conversationWhere: Record<string, unknown> = {}
    if (visitorId) conversationWhere.visitorId = visitorId

    const conversations = await prisma.aiConversation.findMany({
      where: conversationWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    memory.conversationHistory = conversations.map((c) => ({
      id: c.id,
      sessionId: c.sessionId,
      context: c.context,
      title: c.title,
      summary: c.summary,
      messageCount: (JSON.parse(c.messages) as unknown[]).length,
      lastUpdated: c.updatedAt.toISOString(),
    }))
    memory.stats.totalConversations = conversations.length

    // Fetch user preferences
    if (visitorId) {
      const preference = await prisma.userPreference.findUnique({
        where: { visitorId },
      })
      if (preference) {
        memory.preferences = {
          skillLevel: preference.skillLevel,
          preferredLang: preference.preferredLang,
          interfaceMode: preference.interfaceMode,
          theme: preference.theme,
          aiSensitivity: preference.aiSensitivity,
          notificationsEnabled: preference.notificationsEnabled,
        }
      }
    }

    // Determine last activity
    const allDates: Date[] = [
      ...decisions.map((d) => d.createdAt),
      ...pipelines.map((p) => p.createdAt),
      ...conversations.map((c) => c.updatedAt),
    ]
    if (allDates.length > 0) {
      const latest = allDates.sort((a, b) => b.getTime() - a.getTime())[0]
      memory.stats.lastActivity = latest.toISOString()
    }

    // Generate a memory summary string (for injection into AI prompts)
    const parts: string[] = []

    if (memory.stats.totalDecisions > 0) {
      parts.push(`The user has made ${memory.stats.totalDecisions} AI-assisted decisions. Recent decisions include: ${memory.pastDecisions.slice(0, 5).map((d) => `"${d.question}" (${d.context})`).join(', ')}.`)
    }

    if (memory.stats.totalPipelines > 0) {
      const completedIntents = memory.pastPipelines
        .filter((p) => p.status === 'completed')
        .map((p) => `"${p.intent}"`)
        .slice(0, 5)
        .join(', ')
      parts.push(`The user has created ${memory.stats.totalPipelines} analysis pipelines (${memory.stats.completedPipelines} completed). Past intents: ${completedIntents || 'none completed yet'}.`)
    }

    if (memory.preferences) {
      parts.push(`User preferences: skill level=${memory.preferences.skillLevel}, language=${memory.preferences.preferredLang}, interface mode=${memory.preferences.interfaceMode}, theme=${memory.preferences.theme}.`)
    }

    if (memory.conversationHistory.length > 0) {
      parts.push(`The user has had ${memory.stats.totalConversations} recent conversations, primarily in ${memory.conversationHistory[0]?.context || 'general'} context.`)
    }

    memory.summary = parts.join('\n') || 'No prior context available for this user/project.'

    return NextResponse.json({ memory })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to retrieve AI memory' },
      { status: 500 }
    )
  }
}

// POST: Store new memories from copilot interactions
export async function POST(request: NextRequest) {
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { type, content, context = 'general', sessionId, projectId } = body as {
      type: 'preference' | 'decision_context' | 'conversation_insight' | 'workflow_preference' | 'custom'
      content: string | Record<string, unknown>
      context?: string
      sessionId?: string
      projectId?: string
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Memory type is required' },
        { status: 400 }
      )
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Memory content is required' },
        { status: 400 }
      )
    }

    const validTypes = ['preference', 'decision_context', 'conversation_insight', 'workflow_preference', 'custom']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Memory type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content)

    let result: Record<string, unknown> = {}

    switch (type) {
      case 'preference': {
        // Store as a user preference update
        if (visitorId && typeof content === 'object' && content !== null) {
          const prefData = content as Record<string, unknown>
          const updatableFields: Record<string, unknown> = {}
          if (typeof prefData.skillLevel === 'string') updatableFields.skillLevel = prefData.skillLevel
          if (typeof prefData.preferredLang === 'string') updatableFields.preferredLang = prefData.preferredLang
          if (typeof prefData.interfaceMode === 'string') updatableFields.interfaceMode = prefData.interfaceMode
          if (typeof prefData.theme === 'string') updatableFields.theme = prefData.theme
          if (typeof prefData.aiSensitivity === 'number') updatableFields.aiSensitivity = prefData.aiSensitivity
          if (typeof prefData.notificationsEnabled === 'boolean') updatableFields.notificationsEnabled = prefData.notificationsEnabled

          if (Object.keys(updatableFields).length > 0) {
            const pref = await prisma.userPreference.upsert({
              where: { visitorId },
              create: {
                visitorId,
                ...updatableFields,
              },
              update: updatableFields,
            })
            result = { type: 'preference_updated', preferenceId: pref.id }
          } else {
            result = { type: 'preference_ignored', reason: 'No valid preference fields provided' }
          }
        } else {
          result = { type: 'preference_ignored', reason: 'visitorId required and content must be an object' }
        }
        break
      }

      case 'decision_context': {
        // Store as a decision record
        const decision = await prisma.decisionRecord.create({
          data: {
            visitorId,
            projectId: projectId || null,
            context: context,
            question: typeof content === 'string' ? content : 'Memory: decision context stored',
            aiAnalysis: contentStr,
            confidence: null,
          },
        })
        result = { type: 'decision_context_stored', decisionId: decision.id }
        break
      }

      case 'conversation_insight': {
        // Update the conversation summary with the new insight
        if (sessionId) {
          await prisma.aiConversation.updateMany({
            where: { sessionId },
            data: { summary: contentStr.slice(0, 2000) },
          })
          result = { type: 'conversation_insight_stored', sessionId }
        } else {
          result = { type: 'conversation_insight_ignored', reason: 'sessionId required for conversation insights' }
        }
        break
      }

      case 'workflow_preference': {
        // Store as a decision record with automation context
        const decision = await prisma.decisionRecord.create({
          data: {
            visitorId,
            projectId: projectId || null,
            context: 'automation',
            question: 'Workflow preference recorded',
            aiAnalysis: contentStr,
            confidence: null,
          },
        })
        result = { type: 'workflow_preference_stored', decisionId: decision.id }
        break
      }

      case 'custom': {
        // Store as a decision record with general context
        const decision = await prisma.decisionRecord.create({
          data: {
            visitorId,
            projectId: projectId || null,
            context: context,
            question: typeof content === 'string' ? content.slice(0, 200) : 'Custom memory stored',
            aiAnalysis: contentStr,
            confidence: null,
          },
        })
        result = { type: 'custom_memory_stored', decisionId: decision.id }
        break
      }
    }

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({
            action: 'memory_stored',
            memoryType: type,
            memoryId: (result as Record<string, unknown>).decisionId || (result as Record<string, unknown>).preferenceId || null,
          }),
          inputData: contentStr.slice(0, 500),
          outputData: JSON.stringify(result),
        },
      })
    } catch {
      // Audit log failure should not block response
    }

    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to store AI memory' },
      { status: 500 }
    )
  }
}

// Helper: safely parse JSON
function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}
