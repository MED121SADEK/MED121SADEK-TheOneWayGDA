import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/report')

const REPORT_PROMPT = `You are generating a professional, comprehensive analysis report for The One-Way platform.
You are a senior data scientist writing for stakeholders. Produce a THOROUGH, PUBLICATION-QUALITY report.

CRITICAL GUIDELINES:
- Each section should be 3-6 paragraphs — not brief one-liners
- Include specific numbers, percentages, confidence intervals, and statistical measures
- Explain methodology in enough detail that it could be reproduced
- Provide actionable recommendations with implementation steps
- Cover limitations honestly and suggest mitigation strategies
- Use professional, authoritative language
- Structure the report for the target audience

Respond with ONLY valid JSON:
{
  "title": "Report Title",
  "executiveSummary": "Comprehensive executive overview (4-6 paragraphs) covering objectives, methodology summary, key findings with specific data, implications, and strategic recommendations",
  "sections": [
    {
      "title": "Section Title",
      "content": "Detailed section content (4-6 paragraphs with specific data points, analysis, and context)",
      "type": "text|findings|methodology|recommendation",
      "keyTakeaways": ["Key takeaway 1", "Takeaway 2 with specific data"]
    }
  ],
  "recommendations": [
    { "title": "Recommendation Title", "description": "Detailed recommendation (2-3 paragraphs)", "priority": "high|medium|low", "effort": "low|medium|high", "impact": "description of expected impact", "timeline": "suggested timeline" }
  ],
  "methodology": "Detailed description of methods used (2-3 paragraphs) including data sources, tools, statistical tests, and validation approaches",
  "limitations": [
    { "description": "Detailed limitation description", "impact": "How this affects the results", "mitigation": "How to address this limitation" }
  ],
  "appendix": {
    "dataSummary": "Comprehensive summary of data analyzed including sample sizes, time periods, variables",
    "tools": "Tools, libraries, and methods used",
    "statisticalDetails": "Detailed statistical results (test statistics, p-values, effect sizes)",
    "reproducibility": "Steps to reproduce this analysis"
  },
  "qualityScore": { "dataQuality": 8, "methodology": 9, "completeness": 8, "actionability": 9 },
  "nextAnalysis": ["Suggested follow-up analysis 1 with rationale", "Analysis 2"]
}

Section type guidelines:
- "findings": Present data-driven findings with evidence
- "methodology": Explain the analytical approach in detail
- "recommendation": Provide specific, actionable recommendations
- "text": General narrative or background context

Format-specific instructions:
- executive format: Focus on business impact, 3-4 sections max, strategic recommendations
- detailed format: Balanced depth, 5-8 sections, comprehensive findings and recommendations
- technical format: Include formulas, statistical details, code snippets, validation methodology`

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

    // Build comprehensive context for report generation
    const stepsContext = steps
      .filter(s => s.status === 'completed' && (s.result as Record<string, unknown>)?.output)
      .map(s => ({
        name: s.name,
        type: s.type,
        description: s.description,
        rationale: s.rationale,
        output: (s.result as Record<string, unknown>)?.output,
        findings: (s.result as Record<string, unknown>)?.keyFindings,
        metrics: (s.result as Record<string, unknown>)?.metrics,
        methodology: (s.result as Record<string, unknown>)?.methodology,
        limitations: (s.result as Record<string, unknown>)?.limitations,
        recommendations: (s.result as Record<string, unknown>)?.recommendations,
        confidence: (s.result as Record<string, unknown>)?.confidence,
      }))

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${REPORT_PROMPT}\n\nCurrent format: ${format}\nTarget audience: ${audience}\n${
            format === 'executive'
              ? 'EXECUTIVE MODE: Keep it strategic, focus on business impact, ROI, competitive advantage. Maximum 4 sections. Every recommendation must have clear business value.'
              : format === 'technical'
              ? 'TECHNICAL MODE: Include statistical formulas, confidence intervals, p-values, effect sizes, model parameters, validation metrics. Be exhaustive. Include code-like methodology descriptions. Target audience: data scientists and statisticians.'
              : 'DETAILED MODE: Balanced depth — clear enough for business stakeholders but with enough technical detail for analysts. 5-8 sections with thorough coverage.'
          }`,
        },
        {
          role: 'user',
          content: `Pipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\nExecutive Summary: ${pipeline.executiveSummary || 'Not available'}\nSteps completed: ${stepsContext.length} of ${steps.length}\n\nDetailed Step Results:\n${JSON.stringify(stepsContext, null, 2)}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 8192,
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
          keyTakeaways: (s.findings as string[]) || [],
        })),
        recommendations: [],
        methodology: 'AI-guided analysis pipeline',
        limitations: [],
        qualityScore: { dataQuality: 7, methodology: 7, completeness: 6, actionability: 6 },
      }
    }

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'ai_query',
        details: JSON.stringify({ action: 'flagship_report_generated', pipelineId, format, audience }),
        outputData: JSON.stringify({ sectionCount: (report.sections as unknown[])?.length || 0, recommendationCount: (report.recommendations as unknown[])?.length || 0 }),
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
        qualityScore: report.qualityScore || null,
        nextAnalysis: report.nextAnalysis || [],
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
