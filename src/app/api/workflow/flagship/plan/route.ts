import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/plan')

const FLAGSHIP_SYSTEM_PROMPT = `You are the flagship AI workflow engine for The One-Way statistical analysis platform. You are a world-class data scientist and workflow architect. Your role is to design comprehensive, end-to-end analysis pipelines that take users from raw data to actionable insights.

You MUST respond with ONLY valid JSON in this exact format:
{
  "name": "Short Pipeline Name",
  "description": "One-sentence description",
  "steps": [
    {
      "id": "step_1",
      "type": "data_import",
      "name": "Step Name",
      "description": "Detailed description of what this step does and why (2-3 sentences)",
      "config": {},
      "rationale": "Deep explanation of why this step is critical for this specific analysis",
      "estimatedDuration": "2 min",
      "expectedOutput": "What we expect to learn/produce from this step"
    }
  ],
  "alternatives": [
    { "name": "Alternative Approach", "description": "Detailed description of why this alternative might be better", "steps": ["step_type_1", "step_type_2"], "tradeoffs": "When to choose this over the main approach" }
  ],
  "estimatedTotalTime": "15 min",
  "complexityNote": "Notes about expected complexity and potential challenges"
}

Available step types:
- "data_import": Loading and validating data (CSV, JSON, database connections, APIs)
- "data_cleaning": Missing values (mean/median/mode/KNN imputation), outlier detection (IQR, Z-score, isolation forest), type conversion, normalization, deduplication, encoding
- "exploratory_analysis": Summary statistics, distributions, correlations, cross-tabulations, pattern mining, anomaly detection
- "statistical_test": Hypothesis testing (t-test, ANOVA, chi-square, Mann-Whitney, Kruskal-Wallis, regression, logistic regression, time-series analysis, Bayesian inference)
- "visualization": Charts, graphs, heatmaps, scatter plots, box plots, pair plots, violin plots, geographic maps, interactive dashboards
- "interpretation": AI-powered insight extraction, pattern explanation, causal analysis, sensitivity analysis, what-if scenarios
- "report": Structured report generation with findings, recommendations, executive summary, technical appendix
- "feature_engineering": Create new features, polynomial features, interaction terms, dimensionality reduction (PCA, t-SNE, UMAP)
- "model_training": Train predictive models (regression, classification, clustering), cross-validation, hyperparameter tuning
- "model_evaluation": Evaluate model performance (confusion matrix, ROC-AUC, precision-recall, calibration plots), compare models
- "deployment_prep": Export results, create reproducible scripts, generate API endpoints for predictions

Guidelines:
- Generate 5-10 steps forming a logical pipeline — be thorough
- Always start with data preparation unless data is already clean
- Include at least two statistical/analytical steps for depth
- Add feature engineering when working with predictive tasks
- Include model training and evaluation for ML tasks
- End with interpretation and reporting
- Each step config should contain relevant parameters with explanations
- Provide detailed rationale for every step — explain the "why" deeply
- Suggest 2-3 alternative approaches with tradeoff analysis
- Tailor complexity to the user's described context and audience
- Add complexity notes about potential challenges
- Think like a senior data scientist planning a rigorous analysis`

const VALID_STEP_TYPES = ['data_import', 'data_cleaning', 'exploratory_analysis', 'statistical_test', 'visualization', 'interpretation', 'report', 'feature_engineering', 'model_training', 'model_evaluation', 'deployment_prep']

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
      if (pastDecisions.length > 0) {
        parts.push(`User's past decisions: ${pastDecisions.map(d => `"${d.question}" [${d.context}]`).join(', ')}`)
      }
      if (preferences) {
        parts.push(`Skill level: ${preferences.skillLevel}, language: ${preferences.preferredLang}`)
      }
      if (parts.length > 0) memoryBlock = `\n\nUser context: ${parts.join('. ')}`
    } catch { /* memory fetch failure is non-blocking */ }

    // Call AI with increased token limit for deeper plans
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: FLAGSHIP_SYSTEM_PROMPT },
        { role: 'user', content: `${intent.trim()}${contextBlock}${memoryBlock}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
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
          { id: 'step_1', type: 'data_import', name: 'Data Import', description: 'Load and validate dataset', config: {}, rationale: 'Required starting point', estimatedDuration: '1 min', expectedOutput: 'Clean dataset ready for analysis' },
          { id: 'step_2', type: 'data_cleaning', name: 'Data Cleaning', description: 'Handle missing values, outliers, type conversion', config: { action: 'auto_clean' }, rationale: 'Ensure data quality for reliable results', estimatedDuration: '2 min', expectedOutput: 'Cleaned dataset with quality report' },
          { id: 'step_3', type: 'exploratory_analysis', name: 'Exploratory Analysis', description: 'Summary statistics, distributions, correlations, patterns', config: { methods: ['summary', 'distribution', 'correlation'] }, rationale: 'Understand data structure and patterns before testing', estimatedDuration: '3 min', expectedOutput: 'Comprehensive EDA report with visualizations' },
          { id: 'step_4', type: 'statistical_test', name: 'Statistical Testing', description: 'Run appropriate statistical tests with assumption checks', config: { test: 'auto_detect' }, rationale: 'Validate hypotheses with rigorous testing', estimatedDuration: '3 min', expectedOutput: 'Test results with p-values, effect sizes, confidence intervals' },
          { id: 'step_5', type: 'visualization', name: 'Visualization', description: 'Create publication-quality charts and graphs', config: { charts: ['auto'] }, rationale: 'Visual communication of findings', estimatedDuration: '2 min', expectedOutput: 'Multiple publication-ready visualizations' },
          { id: 'step_6', type: 'interpretation', name: 'AI Interpretation', description: 'Extract key insights, causal analysis, what-if scenarios', config: {}, rationale: 'Deep understanding of what the data tells us', estimatedDuration: '2 min', expectedOutput: 'Detailed insights with actionable recommendations' },
          { id: 'step_7', type: 'report', name: 'Report Generation', description: 'Generate structured, comprehensive report', config: { format: 'detailed' }, rationale: 'Professional deliverable for stakeholders', estimatedDuration: '2 min', expectedOutput: 'Complete analysis report with executive summary' },
        ],
        alternatives: [
          { name: 'Quick Analysis', description: 'Streamlined analysis with fewer steps', steps: ['exploratory_analysis', 'statistical_test', 'report'], tradeoffs: 'Faster but less thorough' },
          { name: 'ML Pipeline', description: 'Machine learning approach with model training', steps: ['data_import', 'data_cleaning', 'feature_engineering', 'model_training', 'model_evaluation', 'report'], tradeoffs: 'More complex but can predict future outcomes' },
        ],
        estimatedTotalTime: '15 min',
        complexityNote: 'Standard analysis complexity — well-structured dataset expected',
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
      expectedOutput: (step.expectedOutput as string) || '',
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
        inputData: JSON.stringify({ intent: intent.trim().slice(0, 1000), dataSummary, context, audience }),
        outputData: JSON.stringify({ pipelineId: pipeline.id, stepCount: steps.length, alternatives: (planData.alternatives as unknown[])?.length || 0 }),
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
      complexityNote: (planData.complexityNote as string) || null,
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to generate analysis plan' }, { status: 500 })
  }
}
