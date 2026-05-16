import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/plan')

const FLAGSHIP_SYSTEM_PROMPT = `You are the flagship AI workflow engine for The One-Way statistical analysis platform. Your role is to design comprehensive, end-to-end analysis pipelines that take users from raw data to actionable insights.

You MUST respond with ONLY valid JSON in this exact format:
{
  "name": "Short Pipeline Name",
  "description": "One-sentence description",
  "steps": [
    {
      "id": "step_1",
      "type": "data_import",
      "name": "Step Name",
      "description": "What this step does and why",
      "config": {},
      "rationale": "Why this step is needed",
      "estimatedDuration": "2 min"
    }
  ],
  "alternatives": [
    { "name": "Alternative Approach", "description": "Brief description", "steps": ["step_type_1", "step_type_2"] }
  ],
  "estimatedTotalTime": "15 min"
}

Available step types:
- "data_import": Loading and validating data
- "data_cleaning": Handling missing values, outliers, type conversion, normalization
- "exploratory_analysis": Summary statistics, distributions, patterns, correlations
- "statistical_test": Regression, t-test, ANOVA, chi-square, Mann-Whitney, etc.
- "visualization": Charts, graphs, heatmaps, scatter plots, box plots
- "interpretation": AI-powered insight extraction, pattern explanation
- "report": Structured report generation with findings and recommendations

Guidelines:
- Generate 4-7 steps forming a logical pipeline
- Always start with data preparation unless data is already clean
- Include at least one statistical test
- End with interpretation and reporting
- Each step config should contain relevant parameters
- Provide rationale for every step
- Suggest 1-2 alternative approaches if applicable
- Tailor complexity to the user's described context and audience`

const VALID_STEP_TYPES = ['data_import', 'data_cleaning', 'exploratory_analysis', 'statistical_test', 'visualization', 'interpretation', 'report']

export async function POST(request: NextRequest) {
  const end = log.start('POST')
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { intent, datasetDescription, dataSummary, context, audience } = body as {
      intent: string
      datasetDescription?: string
      dataSummary?: { variables?: string[]; rowCount?: number; types?: Record<string, string> }
      context?: string
      audience?: string
    }

    if (!intent || typeof intent !== 'string' || intent.trim().length < 10) {
      end(400)
      return NextResponse.json({ error: 'Intent must be at least 10 characters' }, { status: 400 })
    }

    // Build rich context
    let contextBlock = ''
    if (datasetDescription) contextBlock += `\nDataset description: ${datasetDescription}`
    if (dataSummary) {
      contextBlock += `\nData summary: ${dataSummary.rowCount || 'unknown'} rows`
      if (dataSummary.variables?.length) contextBlock += `, variables: ${dataSummary.variables.join(', ')}`
      if (dataSummary.types) contextBlock += `, types: ${JSON.stringify(dataSummary.types)}`
    }
    if (context) contextBlock += `\nAnalysis context: ${context}`
    if (audience) contextBlock += `\nTarget audience: ${audience}`

    // Build memory context
    let memoryBlock = ''
    try {
      const where: Record<string, unknown> = {}
      if (visitorId) where.visitorId = visitorId

      const [pastDecisions, pastPipelines, preferences] = await Promise.all([
        prisma.decisionRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.workflowPipeline.findMany({ where, orderBy: { createdAt: 'desc' }, take: 3 }),
        visitorId ? prisma.userPreference.findUnique({ where: { visitorId } }) : null,
      ])

      const parts: string[] = []
      if (pastPipelines.length > 0) {
        parts.push(`User's past workflows: ${pastPipelines.map(p => `"${p.name}" (${p.status})`).join(', ')}`)
      }
      if (preferences) {
        parts.push(`Skill level: ${preferences.skillLevel}, language: ${preferences.preferredLang}`)
      }
      if (parts.length > 0) memoryBlock = `\n\nUser context: ${parts.join('. ')}`
    } catch { /* memory fetch failure is non-blocking */ }

    // Call AI
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: FLAGSHIP_SYSTEM_PROMPT },
        { role: 'user', content: `${intent.trim()}${contextBlock}${memoryBlock}` },
      ],
      temperature: 0.7,
    })

    const rawContent = completion.choices?.[0]?.message?.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    // Parse response with fallback
    let planData: Record<string, unknown>
    try {
      let cleaned = rawContent.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      planData = JSON.parse(cleaned)
    } catch {
      planData = {
        name: `Analysis: ${intent.slice(0, 50)}`,
        description: `Flagship workflow for: ${intent}`,
        steps: [
          { id: 'step_1', type: 'data_import', name: 'Data Import', description: 'Load and validate dataset', config: {}, rationale: 'Required starting point', estimatedDuration: '1 min' },
          { id: 'step_2', type: 'data_cleaning', name: 'Data Cleaning', description: 'Handle missing values and outliers', config: { action: 'auto_clean' }, rationale: 'Ensure data quality', estimatedDuration: '2 min' },
          { id: 'step_3', type: 'exploratory_analysis', name: 'Exploratory Analysis', description: 'Summary statistics and distributions', config: { methods: ['summary', 'distribution', 'correlation'] }, rationale: 'Understand data patterns', estimatedDuration: '3 min' },
          { id: 'step_4', type: 'statistical_test', name: 'Statistical Testing', description: 'Run appropriate statistical tests', config: { test: 'auto_detect' }, rationale: 'Validate hypotheses', estimatedDuration: '3 min' },
          { id: 'step_5', type: 'visualization', name: 'Visualization', description: 'Create informative charts', config: { charts: ['auto'] }, rationale: 'Visual communication', estimatedDuration: '2 min' },
          { id: 'step_6', type: 'interpretation', name: 'AI Interpretation', description: 'Extract key insights and patterns', config: {}, rationale: 'Actionable understanding', estimatedDuration: '2 min' },
          { id: 'step_7', type: 'report', name: 'Report Generation', description: 'Generate structured report', config: { format: 'detailed' }, rationale: 'Deliverable output', estimatedDuration: '2 min' },
        ],
        alternatives: [{ name: 'Quick Analysis', description: 'Streamlined analysis with fewer steps', steps: ['exploratory_analysis', 'statistical_test', 'report'] }],
        estimatedTotalTime: '15 min',
      }
    }

    // Validate and normalize steps
    const rawSteps = (planData.steps || []) as Array<Record<string, unknown>>
    const steps = rawSteps.map((step, idx) => ({
      id: (step.id as string) || `step_${idx + 1}`,
      type: VALID_STEP_TYPES.includes(step.type as string) ? step.type : 'exploratory_analysis',
      name: (step.name as string) || `Step ${idx + 1}`,
      description: (step.description as string) || '',
      config: (step.config && typeof step.config === 'object' ? step.config : {}) as Record<string, unknown>,
      status: 'pending' as const,
      rationale: (step.rationale as string) || '',
      estimatedDuration: (step.estimatedDuration as string) || '',
    }))

    // Save pipeline
    const pipeline = await prisma.workflowPipeline.create({
      data: {
        visitorId,
        name: (planData.name as string) || `Workflow: ${intent.slice(0, 40)}`,
        description: (planData.description as string) || null,
        intent: intent.trim(),
        steps: JSON.stringify(steps),
        status: 'ready',
        tokensUsed,
        durationMs,
      },
    })

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'ai_query',
        details: JSON.stringify({ action: 'flagship_plan_generated', pipelineId: pipeline.id, stepCount: steps.length }),
        inputData: JSON.stringify({ intent: intent.trim().slice(0, 500), dataSummary, context, audience }),
        outputData: JSON.stringify({ pipelineId: pipeline.id, stepCount: steps.length }),
        tokensUsed,
        durationMs,
      },
    }).catch(() => {})

    end(200)
    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        steps,
        status: pipeline.status,
        createdAt: pipeline.createdAt,
      },
      alternatives: planData.alternatives || [],
      estimatedTime: (planData.estimatedTotalTime as string) || `${steps.length * 2} min`,
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to generate analysis plan' }, { status: 500 })
  }
}
