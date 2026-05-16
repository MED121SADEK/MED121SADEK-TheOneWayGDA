import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/report')

const REPORT_PROMPT = `You are generating a professional analysis report for The One-Way platform.
Given the completed pipeline results, produce a structured report document.

Respond with ONLY valid JSON:
{
  "title": "Report Title",
  "executiveSummary": "2-3 paragraph executive overview",
  "sections": [
    { "title": "Section Title", "content": "Detailed content (3-5 paragraphs)", "type": "text|findings|methodology|recommendation" }
  ],
  "recommendations": ["Actionable recommendation 1", "Recommendation 2"],
  "methodology": "Description of methods used",
  "limitations": ["Limitation 1"],
  "appendix": { "dataSummary": "Summary of data analyzed", "tools": "Tools and methods" }
}

Guidelines:
- Tailor depth to the requested format (executive = concise, detailed = thorough, technical = include formulas)
- Match the audience level (executive = no jargon, technical = include statistical details)
- Include 3-5 sections minimum
- Recommendations should be specific and actionable
- Executive summary should stand alone`

export async function POST(request: NextRequest) {
  const end = log.start('POST')
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { pipelineId, format = 'detailed', audience = 'general' } = body as {
      pipelineId: string
      format?: 'executive' | 'detailed' | 'technical'
      audience?: 'executive' | 'technical' | 'general'
    }

    if (!pipelineId) {
      end(400)
      return NextResponse.json({ error: 'pipelineId is required' }, { status: 400 })
    }

    const pipeline = await prisma.workflowPipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline) {
      end(404)
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    const steps = JSON.parse(pipeline.steps) as Array<Record<string, unknown>>
    const results = pipeline.result ? JSON.parse(pipeline.result) : {}

    // Build context for report generation
    const stepsContext = steps
      .filter(s => s.status === 'completed' && (s.result as Record<string, unknown>)?.output)
      .map(s => ({
        name: s.name,
        type: s.type,
        output: (s.result as Record<string, unknown>)?.output,
        findings: (s.result as Record<string, unknown>)?.keyFindings,
        metrics: (s.result as Record<string, unknown>)?.metrics,
      }))

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${REPORT_PROMPT}\n\nFormat: ${format}\nAudience: ${audience}\n${format === 'executive' ? 'Keep the report concise, focus on business impact. Maximum 3 sections.' : format === 'technical' ? 'Include statistical details, test parameters, confidence intervals. Be thorough.' : 'Balanced approach with clear explanations.'}`,
        },
        {
          role: 'user',
          content: `Pipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\nExecutive Summary: ${pipeline.executiveSummary || 'Not available'}\n\nStep Results:\n${JSON.stringify(stepsContext, null, 2)}`,
        },
      ],
      temperature: 0.6,
    })

    const rawContent = completion.choices?.[0]?.message?.content || '{}'
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    let report: Record<string, unknown>
    try {
      let cleaned = rawContent.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      report = JSON.parse(cleaned)
    } catch {
      report = {
        title: pipeline.name,
        executiveSummary: pipeline.executiveSummary || 'Analysis pipeline completed successfully.',
        sections: stepsContext.map(s => ({
          title: s.name as string,
          content: s.output as string,
          type: 'findings',
        })),
        recommendations: [],
        methodology: 'AI-guided analysis pipeline',
        limitations: [],
      }
    }

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'ai_query',
        details: JSON.stringify({ action: 'flagship_report_generated', pipelineId, format, audience }),
        outputData: JSON.stringify({ sectionCount: (report.sections as unknown[])?.length || 0 }),
        tokensUsed,
        durationMs,
      },
    }).catch(() => {})

    end(200)
    return NextResponse.json({
      report,
      metadata: {
        generatedAt: new Date().toISOString(),
        pipelineId,
        pipelineName: pipeline.name,
        format,
        audience,
        durationMs,
        tokensUsed,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
