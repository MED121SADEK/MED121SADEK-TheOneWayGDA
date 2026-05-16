import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

// Context-specific system prompts
function getSystemPrompt(context: string, pageData: Record<string, unknown> | undefined): string {
  const basePrompt = `You are the AI Copilot for "The One-Way" platform — an AI-powered statistical analysis and data science platform. You are helpful, concise, and technically accurate. When providing code, use proper syntax highlighting. When explaining concepts, be clear but thorough. Always indicate when you are providing an AI-generated suggestion.`

  const contextPrompts: Record<string, string> = {
    workspace: `The user is on the Workspace page — their data analysis environment.
Dataset context: ${JSON.stringify(pageData?.datasetInfo || 'No data loaded')}.
Variables: ${JSON.stringify(pageData?.variables || [])}.
Help them with: data preparation, statistical analysis, visualization suggestions, interpreting results, cleaning data, and generating reports. When they ask to run a test, provide the statistical procedure step by step.`,

    leaderboard: `The user is on the AI Model Leaderboard page comparing AI models.
They can see models, benchmarks, pricing, and performance metrics.
Help them with: model comparison, benchmark interpretation, cost analysis, choosing the right model for their use case, and understanding model capabilities.`,

    community: `The user is on the Community & AI News page.
Help them with: finding relevant discussions, understanding AI news trends, summarizing articles, and engaging with the community.`,

    general: `The user is browsing The One-Way platform generally.
Help them navigate, understand features, and get started with their analysis workflow.`,
  }

  return basePrompt + '\n\n' + (contextPrompts[context] || contextPrompts.general)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let visitorId = request.headers.get('x-visitor-id')
  let ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  let userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { messages, context = 'general', pageData } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const systemPrompt = getSystemPrompt(context, pageData)

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const aiMessage = completion.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    // Log to audit trail
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({ context, messageCount: messages.length }),
          inputData: JSON.stringify({ lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 500) }),
          outputData: JSON.stringify({ responseLength: aiMessage.length }),
          tokensUsed,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch {
      // Audit log failure should not block the response
    }

    // Save conversation
    try {
      const sessionId = body.sessionId || `session_${Date.now()}`
      await prisma.aiConversation.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          sessionId,
          visitorId: visitorId || null,
          context,
          messages: JSON.stringify([...messages, { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }]),
        },
        update: {
          messages: JSON.stringify([...messages, { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }]),
          updatedAt: new Date(),
        },
      })
    } catch {
      // Conversation save failure should not block the response
    }

    return NextResponse.json({
      message: aiMessage,
      meta: { tokensUsed, durationMs, context },
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
          details: JSON.stringify({ context: 'general', error: true }),
          error: errorMsg,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const context = searchParams.get('context') || 'general'
    const visitorId = searchParams.get('visitorId')

    const suggestions = await prisma.aiSuggestion.findMany({
      where: {
        context,
        ...(visitorId ? { visitorId } : {}),
        isDismissed: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
