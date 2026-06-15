import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/require-auth'
import { BASE_SYSTEM_PROMPT } from '@/lib/prompts/copilot-base'
import { getContextPrompt, type PageDataContext } from '@/lib/prompts/copilot-contexts'

// ═══════════════════════════════════════════════════════════════
// AI Copilot v4 — Deep-Context Expert with Live Data + Memory
// Upgrades from v3: live benchmark injection, conversation history,
// cross-session memory, adaptive depth, meta-cognition
//
// Architecture: 3-layer prompt assembly
//   Layer 1 (STATIC):  BASE_SYSTEM_PROMPT — imported once, never rebuilt
//   Layer 2 (CONTEXT): getContextPrompt() — per-page-context, cached per key
//   Layer 3 (DYNAMIC): live benchmarks, user memory, conversation history
// ═══════════════════════════════════════════════════════════════

// ─── Live Data: Fetch real benchmark data from the database ───
async function fetchLiveBenchmarkData(): Promise<string> {
  try {
    const models = await prisma.aiModel.findMany({
      where: { isActive: true },
      include: {
        benchmarkScores: true,
        pricing: { where: { isActive: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    })

    if (models.length === 0) return ''

    const benchmarkNames = [...new Set(models.flatMap(m => m.benchmarkScores.map(b => b.benchmark)))]
    const pricingMap: Record<string, { input: number; output: number }> = {}

    // Build benchmark comparison table
    const header = '| Model | ' + benchmarkNames.map(b => b).join(' | ') + ' | Price (in/out per 1M) |'
    const separator = '|---|' + benchmarkNames.map(() => '---:').join('|') + '|---:|'

    const rows = models.map(model => {
      const scores = benchmarkNames.map(bench => {
        const score = model.benchmarkScores.find(s => s.benchmark === bench)
        return score ? `${score.score}/${score.maxScore}` : '-'
      })
      const price = model.pricing[0]
      const priceStr = price ? `$${price.inputPrice}/$${price.outputPrice}` : '-'
      pricingMap[model.name] = price ? { input: price.inputPrice, output: price.outputPrice } : { input: 0, output: 0 }
      return `| ${model.name} (${model.provider}) | ${scores.join(' | ')} | ${priceStr} |`
    }).join('\n')

    // Find top model per benchmark
    const topPerBenchmark = benchmarkNames.map(bench => {
      const best = models
        .map(m => ({ name: m.name, score: m.benchmarkScores.find(s => s.benchmark === bench)?.score || 0 }))
        .sort((a, b) => b.score - a.score)[0]
      return `  - ${bench}: ${best.name} (${best.score})`
    }).join('\n')

    return `
## LIVE LEADERBOARD DATA (from database, not hallucinated)
${header}
${separator}
${rows}

### Top Models per Benchmark
${topPerBenchmark}

### Pricing Reference
${Object.entries(pricingMap).map(([name, p]) => `  - ${name}: $${p.input}/$${p.output} per 1M tokens`).join('\n')}

> CRITICAL: Always use these REAL numbers when comparing models. Never fabricate benchmark scores. If you don't have data for a specific model, say so explicitly.`
  } catch {
    return ''
  }
}

// ─── Conversation History: Fetch recent conversation for continuity ───
async function fetchConversationHistory(visitorId: string | null | undefined, currentSessionId?: string): Promise<string> {
  if (!visitorId) return ''
  try {
    const recentConversations = await prisma.aiConversation.findMany({
      where: { visitorId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { id: true, sessionId: true, context: true, messages: true, updatedAt: true },
    })

    if (recentConversations.length === 0) return ''

    const parts: string[] = ['### Recent Conversations (for continuity)']
    for (const conv of recentConversations) {
      if (conv.id === currentSessionId) continue // Skip current session
      try {
        const msgs = JSON.parse(conv.messages) as Array<{ role: string; content: string }>
        const lastExchange = msgs.slice(-4) // Last 2 exchanges
        if (lastExchange.length > 0) {
          const summary = lastExchange.map(m => `${m.role}: ${m.content.slice(0, 150)}...`).join('\n  ')
          parts.push(`- [${conv.context}, ${conv.updatedAt.toISOString().slice(0, 10)}]:\n  ${summary}`)
        }
      } catch {
        // Skip malformed conversations
      }
    }

    return parts.length > 1 ? '\n\n[CONVERSATION HISTORY]\n' + parts.join('\n') + '\nUse this to maintain conversation continuity — reference past topics naturally when relevant.' : ''
  } catch {
    return ''
  }
}

// ─── Enhanced Memory: Fetch comprehensive user context ───
async function fetchMemoryContext(visitorId: string | null | undefined): Promise<string> {
  if (!visitorId) return ''
  try {
    const [pastPipelines, preferences, recentDecisions, recentSuggestions, communityPosts] = await Promise.all([
      prisma.workflowPipeline.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { name: true, intent: true, status: true, createdAt: true },
      }),
      prisma.userPreference.findUnique({ where: { visitorId } }),
      prisma.decisionRecord.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { question: true, context: true, confidence: true, selectedOption: true, createdAt: true },
      }),
      prisma.aiSuggestion.findMany({
        where: { visitorId, isAccepted: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { title: true, category: true, context: true },
      }),
      prisma.communityPost.findMany({
        where: { author: visitorId || '' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { title: true, content: true, likes: true, createdAt: true },
      }),
    ])

    const parts: string[] = []

    // User profile with behavioral adaptation
    if (preferences) {
      const skillGuide: Record<string, string> = {
        beginner: 'Explain concepts step-by-step with analogies. Avoid jargon without explanation. Use simpler code examples.',
        intermediate: 'Assume basic statistical/ML knowledge. Use technical terms but explain advanced ones. Provide practical code.',
        expert: 'Skip basic explanations. Focus on edge cases, advanced techniques, and optimization. Use mathematical notation freely.',
      }
      parts.push(`### User Profile
- Skill level: ${preferences.skillLevel} → ${skillGuide[preferences.skillLevel] || skillGuide.intermediate}
- Preferred language: ${preferences.preferredLang}
- Interface mode: ${preferences.interfaceMode}
- AI proactivity sensitivity: ${preferences.aiSensitivity}/1.0`)
    }

    if (pastPipelines.length > 0) {
      parts.push(`### User's Workflows (${pastPipelines.length} recent)
${pastPipelines.map(p => `- "${p.name}" — ${p.intent} [${p.status}, ${p.createdAt.toISOString().slice(0, 10)}]`).join('\n')}`)
    }

    if (recentDecisions.length > 0) {
      parts.push(`### User's Decision Patterns
${recentDecisions.map(d => `- Asked: "${d.question}" → chose: ${d.selectedOption || 'undecided'} [${d.context}, confidence: ${d.confidence || 'N/A'}]`).join('\n')}`)
    }

    if (recentSuggestions.length > 0) {
      parts.push(`### Accepted AI Suggestions
${recentSuggestions.map(s => `- [${s.category}] ${s.title} (in ${s.context} context)`).join('\n')}`)
    }

    if (communityPosts.length > 0) {
      parts.push(`### User's Community Contributions
${communityPosts.map(p => `- "${p.title}" [${p.likes} likes, ${p.createdAt.toISOString().slice(0, 10)}]`).join('\n')}`)
    }

    return parts.length > 0 ? '\n\n[COMPREHENSIVE USER MEMORY]\n' + parts.join('\n\n') + '\n\nAdapt your response depth, tone, and terminology to this user profile. Reference their past work and decisions naturally when relevant.' : ''
  } catch {
    return ''
  }
}

// ─── Context prompt cache (Layer 2: per-context, static within context) ───
const _contextPromptCache = new Map<string, string>()

function getAssembledBasePrompt(context: string, pageData?: PageDataContext): string {
  // Workspace context changes with pageData, others are fully static
  const cacheKey = context + ':' + (pageData?.datasetInfo ? 'd' : '') + (pageData?.projectName ? 'p' : '')
  const cached = _contextPromptCache.get(cacheKey)
  if (cached) return cached

  // Layer 1 (imported constant) + Layer 2 (context-specific)
  const assembled = BASE_SYSTEM_PROMPT + '\n\n' + getContextPrompt(context, pageData)
  _contextPromptCache.set(cacheKey, assembled)
  return assembled
}

// Benchmark data changes only when models/scores update. Cache for 15 minutes.
const _benchmarkCache = { data: '', fetchedAt: 0, TTL: 15 * 60 * 1000 }
async function getCachedBenchmarkData(): Promise<string> {
  const now = Date.now()
  if (_benchmarkCache.data && now - _benchmarkCache.fetchedAt < _benchmarkCache.TTL) {
    return _benchmarkCache.data
  }
  _benchmarkCache.data = await fetchLiveBenchmarkData()
  _benchmarkCache.fetchedAt = now
  return _benchmarkCache.data
}

// Memory context: cache per visitor for 5 minutes (user profile rarely changes)
const _memoryCache = new Map<string, { data: string; fetchedAt: number }>()
const MEMORY_TTL = 5 * 60 * 1000
async function getCachedMemoryContext(visitorId: string | null | undefined): Promise<string> {
  if (!visitorId) return ''
  const cached = _memoryCache.get(visitorId)
  if (cached && Date.now() - cached.fetchedAt < MEMORY_TTL) return cached.data
  const data = await fetchMemoryContext(visitorId)
  _memoryCache.set(visitorId, { data, fetchedAt: Date.now() })
  // Cleanup old entries every 50 calls
  if (_memoryCache.size > 500) {
    const now = Date.now()
    for (const [k, v] of _memoryCache) {
      if (now - v.fetchedAt > MEMORY_TTL) _memoryCache.delete(k)
    }
  }
  return data
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const user = await requireAuth(request)
  const visitorId = user?.userId || request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { messages, context = 'general', pageData, stream = false } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const sessionId = body.sessionId || `session_${Date.now()}`

    // Smart context injection: only include expensive data when relevant
    const isFirstMessage = messages.length <= 1
    const shouldIncludeLiveData = context === 'leaderboard' || context === 'general'
    const shouldIncludeMemory = isFirstMessage
    const shouldIncludeHistory = isFirstMessage && messages.length === 1 // skip for single-shot

    // ─── Parallel data fetch (cached internally) ───
    const [baseSystemPrompt, liveData, memoryContext, conversationHistory] = await Promise.all([
      Promise.resolve(getAssembledBasePrompt(context, pageData as PageDataContext | undefined)),
      shouldIncludeLiveData ? getCachedBenchmarkData() : Promise.resolve(''),
      shouldIncludeMemory ? getCachedMemoryContext(visitorId) : Promise.resolve(''),
      shouldIncludeHistory ? fetchConversationHistory(visitorId, sessionId) : Promise.resolve(''),
    ])

    // Assemble the full system prompt with all context layers
    const systemPrompt = baseSystemPrompt
      + (liveData ? '\n\n' + liveData : '')
      + memoryContext
      + conversationHistory

    // Build user messages preserving conversation flow
    const userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

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
              max_tokens: 8192,
              temperature: 0.7,
              stream: true as unknown as boolean,
            } as any)

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

      // Fire-and-forget: audit log + conversation save
      const lastUserMsg = messages[messages.length - 1]?.content || ''
      ;(async () => {
        try {
          await prisma.aiAuditLog.create({
            data: {
              visitorId: visitorId || null,
              action: 'ai_query',
              details: JSON.stringify({ context, messageCount: messages.length, mode: 'stream', version: 'v4', withLiveData: !!liveData, withHistory: !!conversationHistory }),
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
      max_tokens: 8192,
      temperature: 0.7,
    })

    const aiMessage = completion.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({
            context, messageCount: messages.length, mode: 'standard', version: 'v4',
            withLiveData: !!liveData, withMemory: !!memoryContext, withHistory: !!conversationHistory,
          }),
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

    // Save conversation with proper history
    try {
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
      meta: {
        tokensUsed,
        durationMs,
        context,
        version: 'v4',
        contextLayers: {
          liveData: !!liveData,
          memory: !!memoryContext,
          conversationHistory: !!conversationHistory,
        },
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({ context: 'general', error: true, version: 'v4' }),
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
