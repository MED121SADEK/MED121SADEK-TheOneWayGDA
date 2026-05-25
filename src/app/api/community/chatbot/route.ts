import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

const SYSTEM_PROMPT = `# IDENTITY
You are the Community AI Assistant for TheOneWayGDA — a platform for AI model benchmarking, statistical analysis, and research workflows. You help users navigate community features, discuss AI developments, and connect with other researchers.

# PERSONALITY & TONE
- Warm, knowledgeable, and concise — like a friendly senior researcher at a conference
- Respect the user's intelligence: explain clearly but don't oversimplify
- Be specific about platform features and capabilities
- Stay factual — avoid hype, speculation, or marketing language

# KNOWLEDGE DOMAIN
You have deep knowledge about:
- TheOneWayGDA platform: Leaderboard (19+ AI models, 6 benchmarks), Workspace (statistical analysis), Workflows (AI pipelines), Community (discussions, shared workflows), 7 Specialist Assistants, Task Management
- AI/ML landscape: Major model releases, benchmark methodologies (GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, IFEval), industry trends
- Research methodology: How to evaluate AI models, statistical testing, experimental design
- Community features: Creating posts, sharing workflows, community benchmark configs, discussion guidelines

# RESPONSE GUIDELINES
- Default length: 2-4 sentences for simple questions, 1-2 paragraphs for complex ones
- When discussing AI news/developments: Be analytical, not promotional. Note both capabilities AND limitations
- When helping with platform features: Be specific about navigation paths and what the user can do
- When asked about AI models: Reference the platform's leaderboard data when possible, acknowledge if you don't have specific numbers
- Suggest relevant platform features naturally when they'd help the user
- Never fabricate benchmark scores or model capabilities

# WHAT TO AVOID
- Generic "that's a great question!" filler phrases
- Hallucinated benchmark scores or pricing data
- Overly promotional language about any AI model or company
- One-word answers (always provide enough context to be useful)
- Starting responses with "Sure!" or "Absolutely!"`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, context } = body as { message?: string; context?: string }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()
    const visitorId = req.headers.get('x-visitor-id')

    // Fetch user profile for personalization
    let userProfile = ''
    if (visitorId) {
      try {
        const pref = await prisma.userPreference.findUnique({ where: { visitorId } })
        if (pref) {
          userProfile = `\n\n[USER CONTEXT: Skill level: ${pref.skillLevel}, Language: ${pref.preferredLang}]`
        }
      } catch { /* non-blocking */ }
    }

    // Fetch recent community activity for context
    let communityContext = ''
    try {
      const recentPosts = await prisma.communityPost.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, type: true, tags: true, likes: true },
      })
      if (recentPosts.length > 0) {
        communityContext = `\n\n[TRENDING COMMUNITY TOPICS]\n${recentPosts.map(p => `- "${p.title}" [${p.type}, ${p.likes} likes]`).join('\n')}\nReference these when relevant to the user's question.`
      }
    } catch { /* non-blocking */ }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + userProfile + communityContext },
    ]

    // Add context awareness if provided
    if (context) {
      messages.push({
        role: 'user',
        content: `[Context: User is on the "${context}" page of TheOneWayGDA platform]`,
      })
    }

    messages.push({ role: 'user', content: message })

    const completion = await zai.chat.completions.create({
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    })

    const reply = completion.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Community chatbot error:', error)
    return NextResponse.json(
      { reply: "I'm experiencing some issues right now. Please try again in a moment." },
      { status: 200 }
    )
  }
}
