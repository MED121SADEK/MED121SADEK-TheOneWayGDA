import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// ═══════════════════════════════════════════════════════════════
// Smart AI Recommendations API
// POST: Accept user action data for server-side tracking
// GET:  Return AI-generated recommendations using z-ai-web-dev-sdk
// ═══════════════════════════════════════════════════════════════

interface UserProfilePayload {
  actions: Array<{
    action: string
    data?: Record<string, unknown>
    timestamp: number
    page?: string
  }>
  categories: Record<string, number>
  dominantCategory?: string | null
}

/**
 * POST — Accept user action data for server-side processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data, page } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Action field is required' },
        { status: 400 }
      )
    }

    // For now, we just acknowledge the action
    // In production, this would persist to DB and feed into the AI recommendation model
    return NextResponse.json({
      success: true,
      message: 'Action tracked',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

/**
 * GET — Return AI-generated personalized recommendations
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const userProfileRaw = searchParams.get('profile')
    const dominantCategory = searchParams.get('dominantCategory') || null

    // Parse user profile from query (comes from client-side engine)
    let userProfile: UserProfilePayload | null = null
    if (userProfileRaw) {
      try {
        userProfile = JSON.parse(decodeURIComponent(userProfileRaw)) as UserProfilePayload
      } catch {
        userProfile = null
      }
    }

    // If we have enough data, call the AI for smart recommendations
    if (userProfile && userProfile.actions.length >= 3) {
      const zai = await ZAI.create()

      // Build a summary of the user's behavior for the AI
      const categorySummary = Object.entries(userProfile.categories || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, weight]) => `${cat}: ${weight}`)
        .join(', ')

      const recentPages = userProfile.actions
        .filter((a) => a.page)
        .slice(-10)
        .map((a) => a.page)
        .filter(Boolean) as string[]

      const recentActions = userProfile.actions
        .slice(-15)
        .map((a) => a.action)

      const systemPrompt = `You are an AI model recommendation engine for TheOneWayGDA platform — a comprehensive AI model comparison, benchmarking, and data analysis platform.

You analyze user behavior and suggest the most relevant AI models, platform features, and workflows.

AVAILABLE MODELS to suggest: GPT-4o (OpenAI), Claude 3.5 Sonnet (Anthropic), Gemini Pro (Google), DeepSeek V3 (DeepSeek), Llama 3.1 (Meta), GLM-4 (Zhipu AI), Mistral Large (Mistral AI), Qwen 2.5 (Alibaba)

AVAILABLE FEATURES to suggest: Workspace (data analysis), AI Workflow Wizard, Model Comparison, Team Collaboration, Automation Engine, AI Specialist Assistants, Community Hub, API Key Management

AVAILABLE WORKFLOWS to suggest: Compare LLMs on Your Data, Sentiment Analysis Pipeline, Smart Data Cleaning, Full Benchmark Suite, AI Report Generator

RESPONSE FORMAT: You MUST return a valid JSON array of exactly 3 recommendations. Each recommendation must have:
- "type": one of "model", "feature", or "workflow"
- "id": a unique string identifier (e.g., "model-gpt-4o", "feature-workspace", "workflow-compare-llms")
- "title": the name of the recommendation
- "reason": a personalized 1-sentence explanation (e.g., "Based on your interest in coding benchmarks, try GPT-4o for its exceptional code generation abilities")
- "score": a relevance score from 50-99

IMPORTANT: Return ONLY the JSON array, no markdown, no backticks, no extra text.`

      const userPrompt = `Analyze this user's behavior on TheOneWayGDA platform and suggest 3 personalized recommendations.

User behavior summary:
- Dominant interest: ${dominantCategory || categorySummary.split(',')[0] || 'general'}
- Category weights: ${categorySummary}
- Recently visited pages: ${recentPages.join(', ') || 'none specified'}
- Recent actions: ${recentActions.join(', ') || 'none specified'}
- Total tracked actions: ${userProfile.actions.length}

Return exactly 3 recommendations as a JSON array.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.6,
      })

      const aiResponse = completion.choices?.[0]?.message?.content || '[]'

      // Parse the AI response — handle potential markdown wrapping
      let recommendations: Array<{
        type: string
        id: string
        title: string
        reason: string
        score: number
      }> = []

      try {
        // Strip markdown code block if present
        let cleaned = aiResponse.trim()
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        recommendations = JSON.parse(cleaned)
      } catch {
        // If AI response can't be parsed, fall back to category-based recommendations
        recommendations = generateFallbackRecommendations(userProfile, dominantCategory)
      }

      // Validate and sanitize
      const validRecommendations = (Array.isArray(recommendations) ? recommendations : [])
        .filter(
          (r) =>
            r &&
            typeof r.id === 'string' &&
            typeof r.title === 'string' &&
            typeof r.reason === 'string' &&
            ['model', 'feature', 'workflow'].includes(r.type) &&
            typeof r.score === 'number'
        )
        .slice(0, 5)
        .map((r) => ({
          type: r.type as 'model' | 'feature' | 'workflow',
          id: String(r.id),
          title: String(r.title),
          reason: String(r.reason),
          score: Math.min(99, Math.max(50, Math.round(Number(r.score)))),
        }))

      const durationMs = Date.now() - startTime

      return NextResponse.json({
        recommendations: validRecommendations,
        meta: {
          source: 'ai',
          actionCount: userProfile.actions.length,
          dominantCategory,
          durationMs,
        },
      })
    }

    // Not enough data — return empty
    return NextResponse.json({
      recommendations: [],
      meta: {
        source: 'none',
        actionCount: userProfile?.actions.length || 0,
        message: 'Need at least 3 tracked actions for AI recommendations',
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    // Fall back to basic category-based recommendations
    return NextResponse.json({
      recommendations: generateFallbackRecommendations(null, null),
      meta: {
        source: 'fallback',
        error: errorMsg,
        durationMs,
      },
    })
  }
}

// ─── Fallback: Generate basic recommendations without AI ─────

function generateFallbackRecommendations(
  profile: UserProfilePayload | null,
  dominantCategory: string | null
): Array<{ type: 'model' | 'feature' | 'workflow'; id: string; title: string; reason: string; score: number }> {
  const recs: Array<{ type: 'model' | 'feature' | 'workflow'; id: string; title: string; reason: string; score: number }> = []

  const cat = dominantCategory || 'research'

  if (cat === 'coding' || cat === 'research') {
    recs.push({
      type: 'model',
      id: 'model-claude-3.5-sonnet',
      title: 'Claude 3.5 Sonnet',
      reason: 'Excellent for coding and research tasks with strong reasoning abilities',
      score: 85,
    })
  }

  if (cat === 'creative') {
    recs.push({
      type: 'model',
      id: 'model-gpt-4o',
      title: 'GPT-4o',
      reason: 'Strong creative writing and multimodal capabilities',
      score: 82,
    })
  }

  // Add a feature recommendation
  recs.push({
    type: 'feature',
    id: 'feature-flagship-workflow',
    title: 'AI Workflow Wizard',
    reason: 'Try our guided 5-step AI analysis workflow for comprehensive results',
    score: 75,
  })

  // Add a workflow recommendation
  recs.push({
    type: 'workflow',
    id: 'workflow-compare-llms',
    title: 'Compare LLMs on Your Data',
    reason: 'Run multiple models on the same dataset to find the best fit',
    score: 70,
  })

  return recs.slice(0, 3)
}
