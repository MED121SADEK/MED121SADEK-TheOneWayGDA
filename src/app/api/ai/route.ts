import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { messages, data, variables } = await request.json()
    const zai = await ZAI.create()

    const varsInfo = (variables || []).map((v: any) => `${v.name} (${v.type})`).join(', ')
    const dataPreview = JSON.stringify(data || {}).slice(0, 2000)

    const systemPrompt = `You are an expert statistical analysis AI assistant for "TheOneWayGDAGDA" platform.
Help users analyze their data professionally. When they ask to run statistical tests, provide structured results.
Current variables: ${varsInfo}
Data preview: ${dataPreview}

Respond in a helpful, concise manner. When performing calculations, show your work. If asked about specific tests, explain assumptions and interpret results clearly.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    })

    return NextResponse.json(completion)
  } catch (error: any) {
    console.error('AI API error:', error.message)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
