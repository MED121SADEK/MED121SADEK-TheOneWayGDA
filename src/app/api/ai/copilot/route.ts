import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════
// Enhanced AI Copilot — Deep, Unlimited Responses with Memory
// ═══════════════════════════════════════════════════════════════

// Domain-expert system prompts — no longer limited to "concise"
function getSystemPrompt(context: string, pageData: Record<string, unknown> | undefined): string {
  const basePrompt = `You are the AI Copilot for "The One-Way" platform — a comprehensive AI-powered statistical analysis, data science, and AI model comparison platform. You are a world-class expert in your field.

RESPONSE GUIDELINES (CRITICAL):
- Provide THOROUGH, DETAILED, and COMPREHENSIVE responses — never cut short or say "in summary" to end abruptly
- Each response should be as detailed as the question demands — simple questions get clear multi-paragraph answers, complex questions get deep analysis
- Always explain the "why" and "how", not just the "what"
- Use specific examples, data points, and real-world analogies
- When providing code, include full working examples with comments, edge cases, and best practices
- When explaining concepts, start with intuition then go into technical depth
- Structure long answers with clear sections, headers, and bullet points
- If a topic has nuance, cover multiple perspectives
- Never refuse to go deep — the user wants maximum depth and detail
- Always indicate when you are providing an AI-generated suggestion
- You have access to platform features: AI model leaderboard, workflow automation, team collaboration, data analysis, benchmarking`

  const contextPrompts: Record<string, string> = {
    workspace: `The user is on the Workspace page — their data analysis environment.
Dataset context: ${JSON.stringify(pageData?.datasetInfo || 'No data loaded')}.
Variables: ${JSON.stringify(pageData?.variables || [])}.

As a DATA SCIENCE EXPERT, help them with:
- Data preparation: cleaning strategies, missing value imputation methods (with pros/cons of each), outlier detection (IQR, Z-score, DBSCAN), type conversion, normalization vs standardization (when to use which), feature engineering techniques
- Statistical analysis: Choose the right test (explain assumptions, effect sizes, power analysis), interpret p-values and confidence intervals correctly, Bayesian vs frequentist approaches
- Visualization: Recommend chart types with rationale (when bar vs line vs scatter vs heatmap), color theory for data viz, accessibility considerations
- Interpreting results: Statistical significance vs practical significance, common pitfalls in data interpretation, how to communicate findings
- Machine learning: Model selection guidance, cross-validation strategies, hyperparameter tuning, bias-variance tradeoff, ensemble methods
- When they ask to run a test, provide the complete statistical procedure step by step with formulas, assumptions checks, and interpretation guidelines`,

    leaderboard: `The user is on the AI Model Leaderboard page comparing AI models.
They can see models, benchmarks, pricing, and performance metrics.

As an AI MODEL EXPERT, help them with:
- Model comparison: Deep analysis of architecture differences, training data, context windows, and how they affect real-world performance
- Benchmark interpretation: What each benchmark actually measures, limitations of benchmarks, benchmark gaming concerns, real-world performance vs benchmark scores
- Cost analysis: Detailed TCO calculations, token pricing breakdowns, caching strategies, batch processing economics
- Model selection: Use-case specific recommendations with detailed reasoning, tradeoff analysis (speed vs quality vs cost), multi-model routing strategies
- Understanding capabilities: Code generation quality, reasoning abilities, multilingual support, safety guardrails, instruction following, tool use capabilities
- Emerging trends: Recent model releases, industry direction, open vs closed source considerations`,

    community: `The user is on the Community & AI News page.

As an AI INDUSTRY ANALYST, help them with:
- Finding relevant discussions and trends in AI
- Deep analysis of AI news: what it really means, implications, historical context
- Summarizing articles with key takeaways and critical analysis
- Engaging with the community: how to ask better questions, share insights
- Understanding AI research papers: methodology, reproducibility, real-world impact
- AI safety and ethics discussions: balanced perspectives on current debates`,

    general: `The user is browsing The One-Way platform.
As a PLATFORM EXPERT, help them with:
- Platform navigation and feature discovery (all features available)
- Getting started with analysis workflows
- Understanding the AI model comparison system
- Team collaboration features and best practices
- API key management and integration
- Billing and subscription plans
- Automation setup and optimization
- Any technical questions about the platform or AI/ML in general`,
  }

  return basePrompt + '\n\n' + (contextPrompts[context] || contextPrompts.general)
}

// Fetch user's memory context for richer responses
async function fetchMemoryContext(visitorId: string | null | undefined): Promise<string> {
  if (!visitorId) return ''
  try {
    const [pastPipelines, preferences, recentDecisions] = await Promise.all([
      prisma.workflowPipeline.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { name: true, intent: true, status: true },
      }),
      prisma.userPreference.findUnique({ where: { visitorId } }),
      prisma.decisionRecord.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { question: true, context: true, confidence: true },
      }),
    ])

    const parts: string[] = []
    if (pastPipelines.length > 0) {
      parts.push(`User's recent workflows: ${pastPipelines.map(p => `"${p.name}" — ${p.intent} (${p.status})`).join('; ')}`)
    }
    if (recentDecisions.length > 0) {
      parts.push(`Recent AI-assisted decisions: ${recentDecisions.map(d => `"${d.question}" [${d.context}, confidence: ${d.confidence || 'N/A'}]`).join('; ')}`)
    }
    if (preferences) {
      parts.push(`User profile: skill level ${preferences.skillLevel}, prefers ${preferences.preferredLang} language, ${preferences.interfaceMode} interface mode`)
    }
    return parts.length > 0 ? `\n\n[USER MEMORY CONTEXT]\n${parts.join('\n')}\nUse this context to personalize your response — reference their past work when relevant.` : ''
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let visitorId = request.headers.get('x-visitor-id')
  let ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  let userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { messages, context = 'general', pageData, stream = false } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const systemPrompt = getSystemPrompt(context, pageData)

    // Fetch memory context for personalization (non-blocking)
    const memoryPromise = fetchMemoryContext(visitorId)
    const memoryContext = await memoryPromise

    // Build messages with memory context
    const userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Inject memory into the last user message for context-awareness
    if (memoryContext && userMessages.length > 0 && userMessages[userMessages.length - 1].role === 'user') {
      userMessages[userMessages.length - 1] = {
        ...userMessages[userMessages.length - 1],
        content: userMessages[userMessages.length - 1].content + memoryContext,
      }
    }

    // ─── Streaming mode ───
    if (stream) {
      const encoder = new TextEncoder()
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            const completion = await zai.chat.completions.create({
              messages: [
                { role: 'system', content: systemPrompt },
                ...userMessages,
              ],
              max_tokens: 4096,
              temperature: 0.7,
              stream: true as unknown as boolean,
            } as any)

            // Handle streaming response
            if (completion && typeof completion === 'object') {
              const streamable = completion as any
              if (streamable.body && typeof streamable.body.getReader === 'function') {
                const reader = streamable.body.getReader()
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  controller.enqueue(value)
                }
              } else if (Array.isArray(streamable.choices)) {
                // Non-streaming fallback — send full response
                const text = streamable.choices[0]?.message?.content || ''
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`))
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Stream error'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`))
            controller.close()
          }
        },
      })

      // Save conversation asynchronously
      const sessionId = body.sessionId || `session_${Date.now()}`
      const lastUserMsg = messages[messages.length - 1]?.content || ''

      // Fire-and-forget conversation save + audit log
      ;(async () => {
        try {
          await prisma.aiAuditLog.create({
            data: {
              visitorId: visitorId || null,
              action: 'ai_query',
              details: JSON.stringify({ context, messageCount: messages.length, mode: 'stream' }),
              inputData: JSON.stringify({ lastUserMessage: lastUserMsg.slice(0, 1000) }),
              durationMs: Date.now() - startTime,
              ipAddress,
              userAgent,
            },
          })
        } catch { /* silent */ }
      })()

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // ─── Standard mode (deep response) ───
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages,
      ],
      max_tokens: 4096,
      temperature: 0.7,
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
          details: JSON.stringify({ context, messageCount: messages.length, mode: 'standard', withMemory: !!memoryContext }),
          inputData: JSON.stringify({ lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 1000) }),
          outputData: JSON.stringify({ responseLength: aiMessage.length, tokensUsed }),
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
      meta: { tokensUsed, durationMs, context, withMemory: !!memoryContext },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

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
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
