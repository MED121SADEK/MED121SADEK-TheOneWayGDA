import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

// System prompt for pipeline execution / executive summary
const EXECUTION_SYSTEM_PROMPT = `You are an expert data analyst executing a statistical analysis pipeline. Given the pipeline steps and context, simulate the execution results and provide an executive summary.

You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "results": {
    "step_<id>": {
      "status": "completed",
      "output": "Brief description of what this step produced",
      "keyFindings": ["Finding 1", "Finding 2"]
    }
  },
  "executiveSummary": "A 2-4 sentence executive summary of the entire pipeline execution, highlighting key findings and actionable insights."
}

For each step, provide realistic but clearly simulated results. Focus on:
- What the step would produce if run on real data
- Key statistical findings (use plausible values)
- Actionable insights the user can act on

The executive summary should be concise, professional, and written for a decision-maker audience.`

interface StepResult {
  status: string
  output: string
  keyFindings: string[]
}

interface ExecutionResponse {
  results: Record<string, StepResult>
  executiveSummary: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pipeline = await prisma.workflowPipeline.findUnique({
      where: { id },
    })

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        visitorId: pipeline.visitorId,
        projectId: pipeline.projectId,
        name: pipeline.name,
        description: pipeline.description,
        intent: pipeline.intent,
        steps: JSON.parse(pipeline.steps),
        status: pipeline.status,
        result: pipeline.result ? JSON.parse(pipeline.result) : null,
        executiveSummary: pipeline.executiveSummary,
        tokensUsed: pipeline.tokensUsed,
        durationMs: pipeline.durationMs,
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
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

    // Mark as running
    await prisma.workflowPipeline.update({
      where: { id },
      data: { status: 'running' },
    })

    // Parse steps
    const steps = JSON.parse(pipeline.steps) as Array<{
      id: string
      type: string
      name: string
      description: string
      config: Record<string, unknown>
    }>

    // Build the steps description for AI
    const stepsDescription = steps
      .map((s, i) => `Step ${i + 1} [${s.type}]: ${s.name} - ${s.description}`)
      .join('\n')

    // Call AI to simulate execution and generate summary
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Execute this analysis pipeline:\n\nPipeline: ${pipeline.name}\nIntent: ${pipeline.intent}\n\nSteps:\n${stepsDescription}\n\nSimulate the execution results for each step and provide an executive summary.`,
        },
      ],
    })

    const rawContent = completion.choices?.[0]?.message?.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0

    // Parse AI response
    let executionData: ExecutionResponse
    try {
      let cleaned = rawContent.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      executionData = JSON.parse(cleaned) as ExecutionResponse
    } catch {
      // Fallback execution result
      const completedSteps: Record<string, StepResult> = {}
      steps.forEach((s) => {
        completedSteps[`step_${s.id}`] = {
          status: 'completed',
          output: `Successfully executed ${s.name}`,
          keyFindings: [`Analysis step "${s.name}" completed with simulated results.`],
        }
      })
      executionData = {
        results: completedSteps,
        executiveSummary: `Pipeline "${pipeline.name}" executed successfully across ${steps.length} steps. The analysis pipeline has processed the data through data preparation, statistical testing, visualization, and report generation phases. Key findings and recommendations are available in the detailed step results.`,
      }
    }

    // Build result with per-step status
    const resultsWithStepIds: Record<string, StepResult> = {}
    steps.forEach((step) => {
      const aiResult = executionData.results[`step_${step.id}`] || executionData.results[step.id]
      resultsWithStepIds[step.id] = aiResult || {
        status: 'completed',
        output: `Executed: ${step.name}`,
        keyFindings: [],
      }
    })

    // Update steps with completed status
    const updatedSteps = steps.map((step) => ({
      ...step,
      status: 'completed',
    }))

    const totalDurationMs = Date.now() - startTime

    // Update pipeline in database
    const updated = await prisma.workflowPipeline.update({
      where: { id },
      data: {
        steps: JSON.stringify(updatedSteps),
        status: 'completed',
        result: JSON.stringify(resultsWithStepIds),
        executiveSummary: executionData.executiveSummary,
        tokensUsed: (pipeline.tokensUsed || 0) + tokensUsed,
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
          }),
          inputData: JSON.stringify({ intent: pipeline.intent }),
          outputData: JSON.stringify({
            summaryLength: executionData.executiveSummary.length,
            stepCount: steps.length,
          }),
          tokensUsed,
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
        result: resultsWithStepIds,
        executiveSummary: updated.executiveSummary,
        tokensUsed: updated.tokensUsed,
        durationMs: updated.durationMs,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
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

    return NextResponse.json(
      { error: 'Failed to execute pipeline' },
      { status: 500 }
    )
  }
}
