import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/execute')

const STEP_EXEC_PROMPT = `You are executing a single step in an AI-powered data analysis pipeline for The One-Way platform.
Given the step description, its configuration, and the results of prior steps, produce a structured result.

Respond with ONLY valid JSON:
{
  "status": "completed",
  "output": "Human-readable summary of what was done and found",
  "keyFindings": ["Finding 1", "Finding 2"],
  "metrics": { "metric_name": value },
  "dataPoints": { "key": "value" },
  "confidence": 0.9,
  "recommendations": ["Recommendation 1"]
}

If the step cannot complete, return status "error" with an errorMessage field.`

const SUMMARY_PROMPT = `You are generating an executive summary for a completed analysis pipeline.
Based on all step results, produce a comprehensive summary.

Respond with ONLY valid JSON:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Actionable recommendation 1", "Recommendation 2"],
  "riskLevel": "low|medium|high",
  "methodology": "Brief description of the methodology used",
  "limitations": ["Known limitation 1"]
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

        // Build step context with prior results
        const priorResults = Object.entries(allResults)
          .slice(-3) // last 3 steps for context
          .map(([id, r]) => `- Step ${id}: ${(r as Record<string, unknown>)?.output || 'completed'}`)
          .join('\n')

        const stepPrompt = `Pipeline: "${pipeline.name}"\nCurrent step: "${step.name}" (type: ${step.type})\nDescription: ${step.description}\nConfig: ${JSON.stringify(step.config || {})}${priorResults ? `\n\nPrior step results:\n${priorResults}` : ''}`

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: STEP_EXEC_PROMPT },
            { role: 'user', content: stepPrompt },
          ],
          temperature: 0.5,
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
            output: `Step "${step.name}" executed successfully.`,
            keyFindings: [],
            metrics: {},
            confidence: 0.8,
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
        if ((step.type === 'statistical_test' || step.type === 'interpretation') && stepResult.keyFindings) {
          decisionRecords.push({
            visitorId,
            pipelineId,
            context: 'workflow',
            question: `Step: ${step.name} — ${step.description}`,
            aiAnalysis: JSON.stringify({ stepType: step.type, findings: stepResult.keyFindings, metrics: stepResult.metrics }),
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

    // Generate executive summary
    let summary: Record<string, unknown> = {}
    try {
      const stepsSummary = Object.entries(allResults)
        .map(([id, r]) => `- ${steps.find(s => s.id === id)?.name || id}: ${(r as Record<string, unknown>)?.output || 'completed'}`)
        .join('\n')

      const summaryCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: `Pipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\n\nStep results:\n${stepsSummary}` },
        ],
        temperature: 0.5,
      })

      const rawSummary = summaryCompletion.choices?.[0]?.message?.content || '{}'
      totalTokens += summaryCompletion.usage?.total_tokens || 0
      let cleaned = rawSummary.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      summary = JSON.parse(cleaned)
    } catch {
      summary = {
        executiveSummary: `Pipeline "${pipeline.name}" completed with ${Object.keys(allResults).length} steps executed.`,
        keyInsights: [],
        recommendations: [],
        riskLevel: 'medium',
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
        outputData: JSON.stringify({ steps: Object.keys(allResults).length, insights: (summary.keyInsights as unknown[])?.length || 0 }),
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
      methodology: summary.methodology,
      limitations: summary.limitations,
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
