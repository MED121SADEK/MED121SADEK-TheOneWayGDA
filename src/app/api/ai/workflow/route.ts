import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'

// System prompt for workflow generation
const WORKFLOW_SYSTEM_PROMPT = `You are an expert data analysis workflow designer for The One-Way statistical analysis platform. When the user provides an intent, generate a structured analysis pipeline.

You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "name": "Short descriptive pipeline name",
  "description": "One sentence describing what this pipeline does",
  "steps": [
    {
      "id": "step_1",
      "type": "data_prep",
      "name": "Step Name",
      "description": "What this step does",
      "config": {}
    },
    {
      "id": "step_2",
      "type": "statistical_test",
      "name": "Step Name",
      "description": "What this step does",
      "config": {}
    }
  ]
}

Step types you can use:
- "data_prep": Data cleaning, transformation, filtering, imputation
- "statistical_test": Descriptive stats, correlation, regression, t-test, ANOVA, chi-square, etc.
- "visualization": Charts, graphs, plots (histogram, scatter, boxplot, heatmap, etc.)
- "report": Summary generation, export, documentation

Each step's config should contain relevant parameters for that step type. For example:
- data_prep: { "action": "clean_missing", "method": "mean_imputation" }
- statistical_test: { "test": "pearson_correlation", "variables": ["x", "y"], "alpha": 0.05 }
- visualization: { "chartType": "scatter", "xAxis": "var1", "yAxis": "var2" }
- report: { "format": "summary", "sections": ["findings", "conclusions"] }

Generate 3-6 steps that form a logical analysis workflow. Start with data preparation if needed, then statistical analysis, visualization, and end with a report.`

interface WorkflowStep {
  id: string
  type: 'data_prep' | 'statistical_test' | 'visualization' | 'report'
  name: string
  description: string
  config: Record<string, unknown>
}

interface WorkflowResponse {
  name: string
  description: string
  steps: WorkflowStep[]
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { intent, context = 'workspace', pageData } = body as {
      intent: string
      context?: string
      pageData?: Record<string, unknown>
    }

    if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Intent is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Build context-aware prompt
    let contextInfo = ''
    if (context === 'workspace' && pageData?.datasetInfo) {
      contextInfo = `\n\nDataset context: ${JSON.stringify(pageData.datasetInfo)}`
    } else if (context === 'leaderboard') {
      contextInfo = '\n\nThe user is on the AI Model Leaderboard page.'
    } else if (context === 'automation') {
      contextInfo = '\n\nThe user wants to automate an analysis workflow.'
    }

    // Call ZAI SDK to generate workflow
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: WORKFLOW_SYSTEM_PROMPT + contextInfo },
        { role: 'user', content: intent.trim() },
      ],
    })

    const rawContent = completion.choices?.[0]?.message?.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    // Parse the JSON response
    let workflowData: WorkflowResponse
    try {
      // Strip markdown code fences if present
      let cleaned = rawContent.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      workflowData = JSON.parse(cleaned) as WorkflowResponse
    } catch {
      // If AI didn't return valid JSON, create a fallback workflow
      workflowData = {
        name: `Analysis: ${intent.slice(0, 50)}`,
        description: `Workflow generated for: ${intent}`,
        steps: [
          {
            id: 'step_1',
            type: 'data_prep',
            name: 'Data Preparation',
            description: 'Clean and prepare data for analysis',
            config: { action: 'auto_clean' },
          },
          {
            id: 'step_2',
            type: 'statistical_test',
            name: 'Statistical Analysis',
            description: 'Run appropriate statistical tests based on the data',
            config: { test: 'auto_detect' },
          },
          {
            id: 'step_3',
            type: 'visualization',
            name: 'Generate Visualizations',
            description: 'Create charts and plots for key findings',
            config: { chartType: 'auto' },
          },
          {
            id: 'step_4',
            type: 'report',
            name: 'Summary Report',
            description: 'Generate a summary of findings and conclusions',
            config: { format: 'summary' },
          },
        ],
      }
    }

    // Validate and sanitize steps
    const validTypes = ['data_prep', 'statistical_test', 'visualization', 'report']
    const steps = workflowData.steps.map((step, idx) => ({
      id: step.id || `step_${idx + 1}`,
      type: validTypes.includes(step.type) ? step.type : 'data_prep',
      name: step.name || `Step ${idx + 1}`,
      description: step.description || '',
      config: step.config && typeof step.config === 'object' ? step.config : {},
      status: 'pending' as const,
    }))

    // Save to database
    const pipeline = await prisma.workflowPipeline.create({
      data: {
        visitorId,
        projectId: (body.projectId as string) || null,
        name: workflowData.name || `Workflow: ${intent.slice(0, 40)}`,
        description: workflowData.description || null,
        intent: intent.trim(),
        steps: JSON.stringify(steps),
        status: 'ready',
        tokensUsed,
        durationMs,
      },
    })

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({ action: 'workflow_generated', pipelineId: pipeline.id, stepCount: steps.length }),
          inputData: JSON.stringify({ intent: intent.trim().slice(0, 500) }),
          outputData: JSON.stringify({ pipelineId: pipeline.id, stepCount: steps.length }),
          tokensUsed,
          durationMs,
        },
      })
    } catch {
      // Audit log failure should not block response
    }

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        steps: steps,
        status: pipeline.status,
        createdAt: pipeline.createdAt,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({ action: 'workflow_generation_failed', error: true }),
          error: errorMsg,
          durationMs,
        },
      })
    } catch { /* silent */ }

    return NextResponse.json(
      { error: 'Failed to generate workflow pipeline' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (visitorId) where.visitorId = visitorId
    if (status) where.status = status

    const pipelines = await prisma.workflowPipeline.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const serialized = pipelines.map((p) => ({
      id: p.id,
      visitorId: p.visitorId,
      projectId: p.projectId,
      name: p.name,
      description: p.description,
      intent: p.intent,
      steps: JSON.parse(p.steps),
      status: p.status,
      executiveSummary: p.executiveSummary,
      tokensUsed: p.tokensUsed,
      durationMs: p.durationMs,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))

    return NextResponse.json({ pipelines: serialized })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}
