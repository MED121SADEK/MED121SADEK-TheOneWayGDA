import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `You are a helpful community assistant for TheOneWayGDA, an AI model comparison and leaderboard platform. Be concise and friendly. Help users with:

- AI model questions and comparisons
- Community features (posts, discussions, sharing)
- Platform navigation and features
- Trending AI topics and news
- Contribution guidelines
- General AI knowledge

Keep responses short (2-4 sentences unless the user asks for detail). Use a warm, professional tone. When referencing platform features, be specific about what users can do on TheOneWayGDA platform.`

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

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
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
      max_tokens: 512,
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
