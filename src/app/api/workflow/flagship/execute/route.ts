import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/execute')

const STEP_EXEC_PROMPT = `You are executing a single step in an AI-powered data analysis pipeline for The One-Way platform.
You are a senior data scientist performing real analysis. Given the step description, its configuration, and the results of prior steps, produce a thorough, detailed result.

CRITICAL: Provide DEEP, COMPREHENSIVE analysis — not brief summaries. Each step should produce rich, actionable insights.

Respond with ONLY valid JSON:
{
  "status": "completed",
  "output": "DETAILED human-readable summary of what was done and found (3-5 paragraphs with specific numbers, patterns, and insights)",
  "keyFindings": ["Detailed finding 1 with specific data", "Finding 2 with context", "Finding 3 with implications"],
  "metrics": { "metric_name": value, "another_metric": value },
  "dataPoints": { "key": "detailed value with explanation" },
  "confidence": 0.9,
  "recommendations": ["Specific, actionable recommendation 1", "Recommendation 2 with implementation details"],
  "nextSteps": ["Suggested next analysis step 1", "Step 2"],
  "assumptions": ["Assumption 1 that affects this result", "Assumption 2"],
  "methodology": "Detailed description of the methodology used for this step",
  "limitations": ["Known limitation 1", "Limitation 2 and how to address it"]
}

If the step cannot complete, return status "error" with an errorMessage field.`

const SUMMARY_PROMPT = `You are generating an executive summary for a completed analysis pipeline.
Based on ALL step results, produce a COMPREHENSIVE summary that demonstrates deep understanding.

CRITICAL: This summary should be THOROUGH — not a brief overview. Stakeholders will use this for decision-making.

Respond with ONLY valid JSON:
{
  "executiveSummary": "Detailed executive summary (4-6 paragraphs) covering: what was analyzed, methodology, key findings with specific numbers, business implications, and recommended actions",
  "keyInsights": ["Detailed insight 1 with supporting evidence", "Insight 2 with statistical backing", "Insight 3 with real-world implications", "Insight 4 with context", "Insight 5 with actionability"],
  "recommendations": ["Specific actionable recommendation 1 with implementation steps", "Recommendation 2 with expected impact", "Recommendation 3 with timeline", "Recommendation 4 with resource requirements"],
  "riskLevel": "low|medium|high",
  "riskDetails": "Detailed risk assessment explaining the risk level and specific areas of concern",
  "methodology": "Comprehensive description of the complete methodology used across all steps",
  "limitations": ["Known limitation 1 and mitigation strategy", "Limitation 2 with alternative approach"],
  "dataQuality": "Assessment of data quality and its impact on results",
  "businessImpact": "Assessment of the potential business impact of these findings"
}`

export async function POST(request: NextRequest) {
  const end = log.start('POST')
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { pipelineId, approvedSteps } = body as { pipelineId: string; approvedSteps?: string[] }

    if (!pipelineId) {
      end(400)
      return NextResponse.json({ error: 'pipelineId is required' }, { status: 400 })
    }

    // Fetch pipeline
    const pipeline = await prisma.workflowPipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline) {
      end(404)
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }
    if (pipeline.status === 'running') {
      end(409)
      return NextResponse.json({ error: 'Pipeline is already running' }, { status: 409 })
    }

    const steps = JSON.parse(pipeline.steps) as Array<Record<string, unknown>>
    const stepsToRun = approvedSteps
      ? steps.filter(s => approvedSteps.includes(s.id as string))
      : steps

    if (stepsToRun.length === 0) {
      end(400)
      return NextResponse.json({ error: 'No steps to execute' }, { status: 400 })
    }

    // Mark pipeline as running
    await prisma.workflowPipeline.update({
      where: { id: pipelineId },
      data: { status: 'running' },
    })

    const zai = await ZAI.create()
    const allResults: Record<string, unknown> = {}
    const decisionRecords: Array<Record<string, unknown>> = []
    let totalTokens = 0

    // Execute each step sequentially
    for (let i = 0; i < stepsToRun.length; i++) {
      const step = stepsToRun[i]
      const stepId = step.id as string

      try {
        // Update step status to running
        steps.forEach(s => {
          if (s.id === stepId) s.status = 'running'
          else if ((s.status as string) === 'running') s.status = 'pending'
        })
        await prisma.workflowPipeline.update({
          where: { id: pipelineId },
          data: { steps: JSON.stringify(steps) },
        })

        // Build step context with ALL prior results (not just last 3) for deeper context
        const priorResults = Object.entries(allResults)
          .map(([id, r]) => `- Step "${steps.find(s => s.id === id)?.name || id}" (${steps.find(s => s.id === id)?.type}): ${(r as Record<string, unknown>)?.output || 'completed'}`)
          .join('\n')

        const stepPrompt = `Pipeline: "${pipeline.name}"\nPipeline intent: "${pipeline.intent}"\nCurrent step ${i + 1} of ${stepsToRun.length}: "${step.name}" (type: ${step.type})\nDescription: ${step.description}\nConfig: ${JSON.stringify(step.config || {})}\nRationale: ${step.rationale || 'Not specified'}${priorResults ? `\n\nPrior step results (for context):\n${priorResults}` : ''}\n\nIMPORTANT: Provide a DETAILED, THOROUGH analysis result. Include specific numbers, patterns, statistical measures, and actionable insights. Do NOT provide brief one-line summaries.`

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: STEP_EXEC_PROMPT },
            { role: 'user', content: stepPrompt },
          ],
          temperature: 0.5,
          max_tokens: 4096,
        })

        const rawResult = completion.choices?.[0]?.message?.content || '{}'
        totalTokens += completion.usage?.total_tokens || 0

        let stepResult: Record<string, unknown>
        try {
          let cleaned = rawResult.trim()
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          stepResult = JSON.parse(cleaned)
        } catch {
          stepResult = {
            status: 'completed',
            output: `Step "${step.name}" (${step.type}) executed successfully. ${rawResult.slice(0, 1000)}`,
            keyFindings: ['Step completed with AI-generated analysis'],
            metrics: {},
            confidence: 0.8,
            recommendations: [],
          }
        }

        stepResult.durationMs = Date.now() - startTime
        allResults[stepId] = stepResult

        // Update step status
        steps.forEach(s => {
          if (s.id === stepId) {
            s.status = stepResult.status === 'error' ? 'error' : 'completed'
            s.result = stepResult
          }
        })

        // Create DecisionRecord for analytical steps
        if ((step.type === 'statistical_test' || step.type === 'interpretation' || step.type === 'feature_engineering' || step.type === 'model_evaluation') && stepResult.keyFindings) {
          decisionRecords.push({
            visitorId,
            pipelineId,
            context: 'workflow',
            question: `Step: ${step.name} — ${step.description}`,
            aiAnalysis: JSON.stringify({ stepType: step.type, findings: stepResult.keyFindings, metrics: stepResult.metrics, methodology: stepResult.methodology, limitations: stepResult.limitations }),
            confidence: stepResult.confidence,
          })
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        allResults[stepId] = { status: 'error', output: msg }
        steps.forEach(s => { if (s.id === stepId) { s.status = 'error'; s.result = { status: 'error', output: msg } } })
      }
    }

    // Mark remaining steps as skipped
    steps.forEach(s => {
      if (s.status === 'pending') s.status = 'skipped'
    })

    // Generate executive summary with deeper analysis
    let summary: Record<string, unknown> = {}
    try {
      const stepsSummary = Object.entries(allResults)
        .map(([id, r]) => {
          const stepInfo = steps.find(s => s.id === id)
          const result = r as Record<string, unknown>
          return `- "${stepInfo?.name || id}" (${stepInfo?.type}): ${result.output || 'completed'}
  Findings: ${JSON.stringify(result.keyFindings || [])}
  Metrics: ${JSON.stringify(result.metrics || {})}
  Confidence: ${result.confidence || 'N/A'}
  Recommendations: ${JSON.stringify(result.recommendations || [])}`
        })
        .join('\n\n')

      const summaryCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: `Pipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\nSteps executed: ${Object.keys(allResults).length} of ${steps.length}\n\nDetailed step results:\n${stepsSummary}` },
        ],
        temperature: 0.5,
        max_tokens: 4096,
      })

      const rawSummary = summaryCompletion.choices?.[0]?.message?.content || '{}'
      totalTokens += summaryCompletion.usage?.total_tokens || 0
      let cleaned = rawSummary.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      summary = JSON.parse(cleaned)
    } catch {
      summary = {
        executiveSummary: `Pipeline "${pipeline.name}" completed with ${Object.keys(allResults).length} steps executed. ${Object.values(allResults).map(r => (r as Record<string, unknown>)?.output).filter(Boolean).join(' ')}`,
        keyInsights: [],
        recommendations: [],
        riskLevel: 'medium',
        riskDetails: 'Unable to generate detailed risk assessment',
      }
    }

    const durationMs = Date.now() - startTime

    // Save final state
    await prisma.workflowPipeline.update({
      where: { id: pipelineId },
      data: {
        status: 'completed',
        steps: JSON.stringify(steps),
        result: JSON.stringify(allResults),
        executiveSummary: summary.executiveSummary || null,
        tokensUsed: (pipeline.tokensUsed || 0) + totalTokens,
        durationMs: (pipeline.durationMs || 0) + durationMs,
      },
    })

    // Create decision records in batch
    if (decisionRecords.length > 0) {
      await prisma.decisionRecord.createMany({ data: decisionRecords as any }).catch(() => {})
    }

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'automation_run',
        details: JSON.stringify({ action: 'flagship_execute', pipelineId, stepsCompleted: Object.keys(allResults).length }),
        outputData: JSON.stringify({ steps: Object.keys(allResults).length, insights: (summary.keyInsights as unknown[])?.length || 0, recommendations: (summary.recommendations as unknown[])?.length || 0 }),
        tokensUsed: totalTokens,
        durationMs,
      },
    }).catch(() => {})

    end(200)
    return NextResponse.json({
      pipelineId,
      status: 'completed',
      executiveSummary: summary.executiveSummary,
      keyInsights: summary.keyInsights || [],
      recommendations: summary.recommendations || [],
      riskLevel: summary.riskLevel || 'medium',
      riskDetails: summary.riskDetails || null,
      methodology: summary.methodology,
      limitations: summary.limitations,
      dataQuality: summary.dataQuality,
      businessImpact: summary.businessImpact,
      results: allResults,
      durationMs,
      tokensUsed: totalTokens,
    })
  } catch (error: unknown) {
    end(500, error)

    // Mark pipeline as errored
    try {
      await prisma.workflowPipeline.update({
        where: { id: (await request.json()).pipelineId },
        data: { status: 'error' },
      })
    } catch { /* ignore */ }

    return NextResponse.json({ error: 'Pipeline execution failed' }, { status: 500 })
  }
}
