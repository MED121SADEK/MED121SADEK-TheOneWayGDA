import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { messages, data, variables } = await request.json()
    const zai = await ZAI.create()

    // Build rich system prompt with data context
    const varsInfo = (variables || []).map((v: any) => `${v.name} (${v.type})`).join(', ')
    const varCount = (variables || []).length

    // Build sample data preview (first 3 rows of first 5 columns)
    let sampleData = ''
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      const cols = Object.keys(data).slice(0, 5)
      const rows = Math.max(...cols.map(k => (data[k] || []).length), 0)
      const previewRows = Math.min(rows, 3)
      if (previewRows > 0) {
        sampleData = `\n\nSample data (first ${previewRows} rows):\n`
        sampleData += cols.join(', ') + '\n'
        for (let i = 0; i < previewRows; i++) {
          sampleData += cols.map(c => {
            const val = data[c]?.[i]
            return val !== undefined && val !== null ? String(val) : '(empty)'
          }).join(', ') + '\n'
        }
        if (rows > 3) sampleData += `...and ${rows - 3} more rows`
      }
    }

    const systemPrompt = `You are an expert data analyst assistant for TheOneWayGDA (The One Way General Data Analysis) platform. You help users understand their data, suggest analyses, interpret results, and provide statistical guidance.

IMPORTANT GUIDELINES:
- Be concise but thorough in responses
- Use plain language that non-statisticians can understand
- When suggesting statistical tests, explain why that test is appropriate
- When interpreting results, explain practical significance alongside statistical significance
- If the user asks you to perform an analysis they can do in the workspace, guide them to use the appropriate analysis button
- Format numbers to reasonable precision (3-4 decimal places max)

DATASET CONTEXT:
The user has ${varCount > 0 ? `a dataset loaded with ${varCount} variables: ${varsInfo}` : 'no data loaded yet'}.${sampleData}

If no data is loaded, help them understand what kinds of analyses are available and how to import data.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.7,
    })

    return NextResponse.json(completion)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('AI API error:', message)
    return NextResponse.json(
      { error: message, choices: [{ message: { content: 'Sorry, I could not process your request. Please try again.' } }] },
      { status: 500 }
    )
  }
}
