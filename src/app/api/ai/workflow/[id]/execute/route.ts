import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

// Per-step execution system prompt
const STEP_EXECUTION_SYSTEM_PROMPT = `You are an expert data analyst executing a specific step in a statistical analysis pipeline. Given the step details and pipeline context, provide a realistic execution result.

You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "status": "completed",
  "output": "Detailed description of what this step produced and the methodology used",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "metrics": { "key": "value" },
  "dataPoints": 150,
  "confidence": 0.92
}

Rules:
- "status" must be "completed" or "error"
- "output" should be 1-3 sentences describing the analysis performed and results
- "keyFindings" should be 1-5 concise findings with plausible statistical values
- "metrics" is an optional object with relevant numeric results (p-values, R², means, counts, etc.)
- "dataPoints" is the approximate number of data points processed
- "confidence" is the confidence level of the results (0.0-1.0)

Provide realistic but clearly simulated statistical results. Use plausible values:
- p-values: 0.001-0.05 range for significant, 0.1-0.5 for non-significant
- R²: 0.3-0.95 for regression
- Correlations: -0.95 to 0.95
- Sample sizes: realistic counts`

// Executive summary generation prompt
const SUMMARY_SYSTEM_PROMPT = `You are a senior data science consultant writing an executive summary for a completed analysis pipeline. 

You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "executiveSummary": "A 3-5 sentence executive summary written for decision-makers",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "riskLevel": "low"
}

Rules:
- The executive summary should synthesize all step results into a cohesive narrative
- Key insights should be 3-5 actionable insights from the analysis
- Recommendations should be 1-3 concrete next steps the user should consider
- riskLevel must be one of: "low", "medium", "high"
- Write in a professional but accessible tone for business decision-makers`

interface StepResult {
  status: string
  output: string
  keyFindings: string[]
  metrics?: Record<string, unknown>
  dataPoints?: number
  confidence?: number
  durationMs: number
  error?: string
}

interface PipelineStep {
  id: string
  type: string
  name: string
  description: string
  config: Record<string, unknown>
  status: string
}

interface SummaryResponse {
  executiveSummary: string
  keyInsights: string[]
  recommendations: string[]
  riskLevel: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pipelineStartTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const { id } = await params

    // Fetch pipeline
    const pipeline = await prisma.workflowPipeline.findUnique({
      where: { id },
    })

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    if (pipeline.status === 'running') {
      return NextResponse.json(
        { error: 'Pipeline is already running' },
        { status: 409 }
      )
    }

    // Parse steps
    const steps = JSON.parse(pipeline.steps) as PipelineStep[]

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Pipeline has no steps to execute' },
        { status: 400 }
      )
    }

    // Mark as running
    await prisma.workflowPipeline.update({
      where: { id },
      data: { status: 'running' },
    })

    // Initialize ZAI SDK once for all steps
    const zai = await ZAI.create()

    // Execute each step sequentially
    const stepResults: Record<string, StepResult> = {}
    const updatedSteps: PipelineStep[] = []
    let totalTokensUsed = 0
    let hasError = false

    // Build pipeline context string for each step
    const pipelineContext = `Pipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\nDescription: "${pipeline.description || 'N/A'}"`

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const stepStartTime = Date.now()

      // Update step status to running in DB
      const runningSteps = steps.map((s, si) => ({
        ...s,
        status: si < i ? 'completed' as const
          : si === i ? 'running' as const
          : s.status,
      }))
      await prisma.workflowPipeline.update({
        where: { id },
        data: { steps: JSON.stringify(runningSteps) },
      })

      try {
        // Build prior context from completed steps
        const priorResults = Object.entries(stepResults)
          .filter(([_, result]) => result.status === 'completed')
          .map(([stepId, result]) => `- ${stepId}: ${result.output}`)
          .join('\n')

        const userMessage = `Execute this step in the analysis pipeline:\n\n${pipelineContext}\n\nThis is Step ${i + 1} of ${steps.length}.\n\nStep: [${step.type}] ${step.name}\nDescription: ${step.description}\nConfig: ${JSON.stringify(step.config)}\n${priorResults ? `\nPrevious step results:\n${priorResults}` : ''}\n\nProvide the execution result for this step.`

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: STEP_EXECUTION_SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        })

        const rawContent = completion.choices?.[0]?.message?.content || ''
        const stepTokens = completion.usage?.total_tokens || 0
        totalTokensUsed += stepTokens

        const stepDurationMs = Date.now() - stepStartTime

        // Parse step result
        let parsed: Partial<StepResult> = {}
        try {
          let cleaned = rawContent.trim()
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          }
          parsed = JSON.parse(cleaned) as Partial<StepResult>
        } catch {
          // Use raw content as output
          parsed = { output: rawContent }
        }

        stepResults[step.id] = {
          status: parsed.status || 'completed',
          output: parsed.output || `Executed: ${step.name}`,
          keyFindings: parsed.keyFindings || [],
          metrics: parsed.metrics || undefined,
          dataPoints: parsed.dataPoints || undefined,
          confidence: parsed.confidence || undefined,
          durationMs: stepDurationMs,
        }

        updatedSteps.push({
          ...step,
          status: 'completed',
        })

        // Record decision for significant steps (statistical_test, report)
        if (step.type === 'statistical_test' || step.type === 'report') {
          try {
            await prisma.decisionRecord.create({
              data: {
                visitorId,
                projectId: pipeline.projectId,
                pipelineId: id,
                context: 'automation',
                question: step.name,
                aiAnalysis: JSON.stringify({
                  stepType: step.type,
                  stepDescription: step.description,
                  stepConfig: step.config,
                  result: stepResults[step.id],
                }),
                outcome: JSON.stringify({
                  status: 'completed',
                  keyFindings: stepResults[step.id].keyFindings,
                  confidence: stepResults[step.id].confidence,
                }),
                confidence: stepResults[step.id].confidence || null,
              },
            })
          } catch {
            // Decision record failure should not stop execution
          }
        }

      } catch (stepError: unknown) {
        hasError = true
        const errorMsg = stepError instanceof Error ? stepError.message : 'Unknown step error'
        stepResults[step.id] = {
          status: 'error',
          output: `Failed to execute step: ${step.name}`,
          keyFindings: [],
          durationMs: Date.now() - stepStartTime,
          error: errorMsg,
        }
        updatedSteps.push({
          ...step,
          status: 'error',
        })
        // Stop execution on step error
        break
      }
    }

    // Mark remaining steps as skipped if there was an error
    if (hasError) {
      for (let i = updatedSteps.length; i < steps.length; i++) {
        updatedSteps.push({
          ...steps[i],
          status: 'skipped',
        })
      }
    }

    // Generate executive summary using AI
    let executiveSummary = ''
    let keyInsights: string[] = []
    let recommendations: string[] = []
    let riskLevel = 'medium'
    let summaryTokens = 0

    const completedStepCount = updatedSteps.filter(s => s.status === 'completed').length

    if (completedStepCount > 0) {
      try {
        const resultsSummary = Object.entries(stepResults)
          .filter(([_, r]) => r.status === 'completed')
          .map(([stepId, result]) => {
            return `${stepId} [${result.durationMs}ms]:\n  Output: ${result.output}\n  Findings: ${result.keyFindings.join('; ')}\n  Confidence: ${result.confidence ?? 'N/A'}`
          })
          .join('\n\n')

        const summaryCompletion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Generate an executive summary for this completed pipeline:\n\nPipeline: "${pipeline.name}"\nIntent: "${pipeline.intent}"\nSteps completed: ${completedStepCount} of ${steps.length}\n${hasError ? 'WARNING: Some steps failed.\n' : ''}\nStep Results:\n${resultsSummary}`,
            },
          ],
        })

        const summaryRaw = summaryCompletion.choices?.[0]?.message?.content || ''
        summaryTokens = summaryCompletion.usage?.total_tokens || 0
        totalTokensUsed += summaryTokens

        try {
          let cleaned = summaryRaw.trim()
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          }
          const parsedSummary = JSON.parse(cleaned) as SummaryResponse
          executiveSummary = parsedSummary.executiveSummary || ''
          keyInsights = parsedSummary.keyInsights || []
          recommendations = parsedSummary.recommendations || []
          riskLevel = parsedSummary.riskLevel || 'medium'
        } catch {
          executiveSummary = summaryRaw.slice(0, 1000)
        }
      } catch {
        // Fallback summary
        executiveSummary = `Pipeline "${pipeline.name}" executed ${completedStepCount} of ${steps.length} steps successfully. ${hasError ? 'Some steps encountered errors.' : 'All steps completed without issues.'}`
      }
    } else {
      executiveSummary = `Pipeline "${pipeline.name}" failed to execute. All ${steps.length} steps encountered errors.`
    }

    const totalDurationMs = Date.now() - pipelineStartTime

    // Update pipeline in database
    const finalStatus = hasError && completedStepCount === 0 ? 'error' as const
      : hasError ? 'error' as const
      : 'completed' as const

    const updated = await prisma.workflowPipeline.update({
      where: { id },
      data: {
        steps: JSON.stringify(updatedSteps),
        status: finalStatus,
        result: JSON.stringify({
          stepResults,
          summary: {
            executiveSummary,
            keyInsights,
            recommendations,
            riskLevel,
          },
        }),
        executiveSummary,
        tokensUsed: (pipeline.tokensUsed || 0) + totalTokensUsed,
        durationMs: totalDurationMs,
      },
    })

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({
            action: 'pipeline_executed',
            pipelineId: id,
            stepCount: steps.length,
            completedSteps: completedStepCount,
            hasError,
            riskLevel,
          }),
          inputData: JSON.stringify({ intent: pipeline.intent, steps: steps.length }),
          outputData: JSON.stringify({
            summaryLength: executiveSummary.length,
            keyInsightsCount: keyInsights.length,
            totalDurationMs,
          }),
          tokensUsed: totalTokensUsed,
          durationMs: totalDurationMs,
        },
      })
    } catch {
      // Audit log failure should not block response
    }

    return NextResponse.json({
      pipeline: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        steps: updatedSteps,
        status: updated.status,
        result: {
          stepResults,
          summary: {
            executiveSummary,
            keyInsights,
            recommendations,
            riskLevel,
          },
        },
        executiveSummary: updated.executiveSummary,
        tokensUsed: updated.tokensUsed,
        durationMs: updated.durationMs,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - pipelineStartTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    // Mark pipeline as error
    try {
      const { id } = await params
      await prisma.workflowPipeline.update({
        where: { id },
        data: { status: 'error' },
      })
    } catch {
      // Ignore update failure
    }

    // Audit log for error
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({ action: 'pipeline_execution_failed', error: true }),
          error: errorMsg,
          durationMs,
        },
      })
    } catch {
      // silent
    }

    return NextResponse.json(
      { error: 'Failed to execute pipeline' },
      { status: 500 }
    )
  }
}
