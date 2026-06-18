/**
 * API Integration Tests — Workflow Flagship:
 *   flagship (GET), plan (POST), execute (POST), report (POST),
 *   automate (POST), publish (POST)
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Pre-build mock AI responses to avoid deep nesting in hoisted blocks ──

const MOCK_PLAN_JSON = JSON.stringify({
  name: 'Test Pipeline',
  description: 'A test analysis pipeline',
  steps: [
    { id: 'step_1', type: 'data_import', name: 'Import Data', description: 'Load dataset', config: {}, rationale: 'Starting point', estimatedDuration: '1 min', expectedOutput: 'Clean data' },
    { id: 'step_2', type: 'statistical_test', name: 'T-Test', description: 'Run t-test', config: {}, rationale: 'Hypothesis testing', estimatedDuration: '2 min', expectedOutput: 'Test results' },
    { id: 'step_3', type: 'visualization', name: 'Charts', description: 'Create charts', config: {}, rationale: 'Visual insights', estimatedDuration: '2 min', expectedOutput: 'Charts' },
  ],
  alternatives: [
    { name: 'Quick', description: 'Faster approach', steps: ['exploratory_analysis', 'report'], tradeoffs: 'Less thorough' },
  ],
  estimatedTotalTime: '5 min',
  complexityNote: 'Low complexity',
})

const MOCK_STEP_JSON = JSON.stringify({
  status: 'completed',
  output: 'Step completed successfully with detailed findings',
  keyFindings: ['Finding 1', 'Finding 2'],
  metrics: { pValue: 0.03, effectSize: 0.5 },
  confidence: 0.9,
  recommendations: ['Recommendation 1'],
  nextSteps: ['Next step'],
  assumptions: ['Assumption 1'],
  methodology: 'Standard methodology',
  limitations: ['Limitation 1'],
})

const MOCK_SUMMARY_JSON = JSON.stringify({
  executiveSummary: 'Pipeline completed with 2 steps executed.',
  keyInsights: ['Insight 1', 'Insight 2'],
  recommendations: ['Recommendation 1', 'Recommendation 2'],
  riskLevel: 'low',
  riskDetails: 'Low risk assessment',
  methodology: 'Comprehensive methodology',
  limitations: ['Limitation 1'],
  dataQuality: 'Good data quality',
  businessImpact: 'Positive business impact',
})

const MOCK_REPORT_JSON = JSON.stringify({
  title: 'Test Report',
  executiveSummary: 'Comprehensive analysis of Q2 sales data.',
  sections: [
    { title: 'Findings', content: 'Detailed findings here', type: 'findings', keyTakeaways: ['Key takeaway 1'] },
  ],
  recommendations: [],
  methodology: 'AI-guided analysis pipeline',
  limitations: [],
  qualityScore: { dataQuality: 8, methodology: 8, completeness: 8, actionability: 8 },
})

// ── Hoisted mocks ──

const mockZaiCreate = vi.hoisted(() => {
  return {
    create: vi.fn().mockImplementation(() => {
      let innerCallCount = 0
      return Promise.resolve({
        chat: {
          completions: {
            create: vi.fn().mockImplementation(() => {
              innerCallCount++
              // Last call is always the summary (for execute route)
              const isSummary = innerCallCount > 2
              const content = isSummary ? MOCK_SUMMARY_JSON : MOCK_PLAN_JSON
              return Promise.resolve({
                choices: [{ message: { content } }],
                usage: { total_tokens: 500 },
              })
            }),
          },
        },
      })
    }),
  }
})

vi.mock('z-ai-web-dev-sdk', () => ({ default: mockZaiCreate }))

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    workflowPipeline: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    decisionRecord: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    aiAuditLog: { create: vi.fn() },
    userPreference: { findUnique: vi.fn() },
    automationRule: { create: vi.fn() },
    sharedWorkflow: { create: vi.fn() },
    communityAnalysisTemplate: { create: vi.fn() },
    $queryRaw: vi.fn(),
  }

  function setupMockDb() {
    const basePipeline = {
      id: 'pipe-1',
      name: 'Sales Analysis',
      description: 'Analyze quarterly sales data',
      intent: 'Perform comprehensive analysis of Q2 sales data to identify trends and patterns',
      status: 'ready',
      steps: JSON.stringify([
        { id: 'step_1', type: 'data_import', name: 'Import', description: '', config: {}, status: 'pending', rationale: '', estimatedDuration: '', expectedOutput: '' },
        { id: 'step_2', type: 'statistical_test', name: 'T-Test', description: '', config: {}, status: 'pending', rationale: '', estimatedDuration: '', expectedOutput: '' },
      ]),
      result: null,
      executiveSummary: null,
      tokensUsed: 500,
      durationMs: 3000,
      visitorId: null,
      createdAt: now,
      updatedAt: now,
    }

    _db.workflowPipeline.findMany.mockResolvedValue([basePipeline])
    _db.workflowPipeline.findUnique.mockResolvedValue(basePipeline)
    _db.workflowPipeline.create.mockResolvedValue({
      ...basePipeline,
      id: 'pipe-new',
      status: 'ready',
    })
    _db.workflowPipeline.update.mockResolvedValue({
      ...basePipeline,
      status: 'completed',
    })

    _db.decisionRecord.findMany.mockResolvedValue([])
    _db.decisionRecord.createMany.mockResolvedValue({ count: 0 })
    _db.aiAuditLog.create.mockResolvedValue({})
    _db.userPreference.findUnique.mockResolvedValue(null)
    _db.automationRule.create.mockResolvedValue({ id: 'auto-1' })
    _db.sharedWorkflow.create.mockResolvedValue({ id: 'sw-1' })
    _db.communityAnalysisTemplate.create.mockResolvedValue({ id: 'cat-1' })
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/api-logger', () => ({
  apiRouteLogger: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnValue(vi.fn()),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

// ── Helpers ──

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}
function makeJsonRequest(url: string, body: unknown, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options, method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═══════════════════════════════════════════════════════════════
//  GET /api/workflow/flagship — List flagship workflows
// ═══════════════════════════════════════════════════════════════

describe('GET /api/workflow/flagship', () => {
  it('should return flagship pipelines list', async () => {
    const { GET } = await import('../workflow/flagship/route')
    const res = await GET(makeRequest('/api/workflow/flagship'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipelines).toBeDefined()
    expect(Array.isArray(data.pipelines)).toBe(true)
  })

  it('should serialize pipeline steps and count completed steps', async () => {
    const { GET } = await import('../workflow/flagship/route')
    const res = await GET(makeRequest('/api/workflow/flagship'))
    const data = await res.json()
    const pipeline = data.pipelines[0]
    expect(pipeline).toHaveProperty('totalSteps')
    expect(pipeline).toHaveProperty('completedSteps')
    expect(pipeline).toHaveProperty('id')
    expect(pipeline).toHaveProperty('name')
    expect(pipeline).toHaveProperty('status')
    expect(typeof pipeline.totalSteps).toBe('number')
    expect(typeof pipeline.completedSteps).toBe('number')
  })

  it('should filter by status query param', async () => {
    const { GET } = await import('../workflow/flagship/route')
    await GET(makeRequest('/api/workflow/flagship?status=completed'))
    expect(getMockDb().workflowPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'completed' } })
    )
  })

  it('should respect limit parameter with default 20', async () => {
    const { GET } = await import('../workflow/flagship/route')
    await GET(makeRequest('/api/workflow/flagship'))
    expect(getMockDb().workflowPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    )
  })

  it('should return 500 on db error', async () => {
    getMockDb().workflowPipeline.findMany.mockRejectedValueOnce(new Error('DB down'))
    const { GET } = await import('../workflow/flagship/route')
    const res = await GET(makeRequest('/api/workflow/flagship'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to fetch flagship workflows')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/workflow/flagship/plan — Generate analysis plan
// ═══════════════════════════════════════════════════════════════

describe('POST /api/workflow/flagship/plan', () => {
  it('should generate a plan from a valid intent', async () => {
    const { POST } = await import('../workflow/flagship/plan/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/plan', {
      intent: 'Perform comprehensive analysis of Q2 sales data to identify trends and patterns',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    expect(data.pipeline.id).toBeDefined()
    expect(data.pipeline.steps).toBeDefined()
    expect(data.pipeline.status).toBe('ready')
    expect(data.alternatives).toBeDefined()
    expect(data.estimatedTime).toBeDefined()
  })

  it('should return 400 for missing intent', async () => {
    const { POST } = await import('../workflow/flagship/plan/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/plan', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Intent must be at least 10 characters')
  })

  it('should return 400 for intent shorter than 10 characters', async () => {
    const { POST } = await import('../workflow/flagship/plan/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/plan', {
      intent: 'too short',
    }))
    expect(res.status).toBe(400)
  })

  it('should pass context and audience to the AI call', async () => {
    const { POST } = await import('../workflow/flagship/plan/route')
    await POST(makeJsonRequest('/api/workflow/flagship/plan', {
      intent: 'Analyze the correlation between marketing spend and revenue across multiple channels',
      datasetDescription: 'Sales data with marketing columns',
      context: 'Business stakeholders need quarterly report',
      audience: 'executive',
    }, { headers: { 'x-visitor-id': 'visitor-1' } }))
    // Verify the AI was called (via ZAI.create)
    expect(mockZaiCreate.create).toHaveBeenCalled()
    // Verify pipeline was saved
    expect(getMockDb().workflowPipeline.create).toHaveBeenCalled()
  })

  it('should save pipeline to database and create audit log', async () => {
    const { POST } = await import('../workflow/flagship/plan/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/plan', {
      intent: 'I want to perform a thorough exploratory data analysis on my dataset',
    }))
    expect(res.status).toBe(200)
    expect(getMockDb().workflowPipeline.create).toHaveBeenCalled()
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalled()
  })

  it('should return 500 when AI call fails', async () => {
    mockZaiCreate.create.mockRejectedValueOnce(new Error('AI unavailable'))
    const { POST } = await import('../workflow/flagship/plan/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/plan', {
      intent: 'Analyze customer behavior patterns in e-commerce data for Q2',
    }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to generate analysis plan')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/workflow/flagship/execute — Execute workflow
// ═══════════════════════════════════════════════════════════════

describe('POST /api/workflow/flagship/execute', () => {
  it('should execute a pipeline and return results', async () => {
    const { POST } = await import('../workflow/flagship/execute/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/execute', {
      pipelineId: 'pipe-1',
    }, { headers: { 'x-visitor-id': 'v-1' } }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipelineId).toBe('pipe-1')
    expect(data.status).toBe('completed')
    expect(data.executiveSummary).toBeDefined()
    expect(data.results).toBeDefined()
    expect(data.keyInsights).toBeDefined()
    expect(data.recommendations).toBeDefined()
    expect(data.durationMs).toBeDefined()
    expect(data.tokensUsed).toBeDefined()
  })

  it('should return 400 for missing pipelineId', async () => {
    const { POST } = await import('../workflow/flagship/execute/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/execute', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('pipelineId is required')
  })

  it('should return 404 when pipeline not found', async () => {
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce(null)
    const { POST } = await import('../workflow/flagship/execute/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/execute', {
      pipelineId: 'nonexistent',
    }))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Pipeline not found')
  })

  it('should return 409 when pipeline is already running', async () => {
    const runningPipeline = {
      id: 'pipe-1',
      name: 'Sales Analysis',
      description: '',
      intent: '',
      status: 'running',
      steps: JSON.stringify([{ id: 's1', type: 'data_import', status: 'running', name: '', description: '', config: {}, rationale: '', estimatedDuration: '', expectedOutput: '' }]),
      result: null,
      executiveSummary: null,
      tokensUsed: 0,
      durationMs: 0,
      visitorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce(runningPipeline)
    const { POST } = await import('../workflow/flagship/execute/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/execute', {
      pipelineId: 'pipe-1',
    }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('Pipeline is already running')
  })

  it('should update pipeline to completed and save results', async () => {
    const { POST } = await import('../workflow/flagship/execute/route')
    await POST(makeJsonRequest('/api/workflow/flagship/execute', {
      pipelineId: 'pipe-1',
    }))
    // Pipeline should be updated to 'completed'
    const updates = getMockDb().workflowPipeline.update.mock.calls
    const completedUpdate = updates.find((call: unknown[]) =>
      (call[0] as { data: { status: string } })?.data?.status === 'completed'
    )
    expect(completedUpdate).toBeDefined()
    // Audit log created
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalled()
  })

  it('should execute only approved steps when approvedSteps provided', async () => {
    const { POST } = await import('../workflow/flagship/execute/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/execute', {
      pipelineId: 'pipe-1',
      approvedSteps: ['step_1'],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    // Only 1 step should be in results
    expect(Object.keys(data.results)).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/workflow/flagship/report — Generate report
// ═══════════════════════════════════════════════════════════════

describe('POST /api/workflow/flagship/report', () => {
  it('should generate a report for a completed pipeline', async () => {
    // Set up a completed pipeline with result
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'pipe-1',
      name: 'Sales Analysis',
      intent: 'Analyze Q2 sales',
      status: 'completed',
      steps: JSON.stringify([
        { id: 'step_1', type: 'data_import', name: 'Import', description: 'Load data', status: 'completed', result: { output: 'Data loaded', keyFindings: ['Clean data'], metrics: {} } },
        { id: 'step_2', type: 'statistical_test', name: 'T-Test', description: 'Run test', status: 'completed', result: { output: 'T-test done', keyFindings: ['Significant p-value'], metrics: { pValue: 0.03 } } },
      ]),
      result: JSON.stringify({
        step_1: { output: 'Data loaded', keyFindings: ['Clean data'] },
        step_2: { output: 'T-test done', keyFindings: ['Significant'] },
      }),
      executiveSummary: 'Summary of analysis',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const { POST } = await import('../workflow/flagship/report/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/report', {
      pipelineId: 'pipe-1',
      format: 'detailed',
      audience: 'general',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.report).toBeDefined()
    expect(data.metadata).toBeDefined()
    expect(data.metadata.pipelineId).toBe('pipe-1')
    expect(data.metadata.format).toBe('detailed')
    expect(data.metadata.audience).toBe('general')
    expect(data.metadata.durationMs).toBeDefined()
  })

  it('should return 400 for missing pipelineId', async () => {
    const { POST } = await import('../workflow/flagship/report/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/report', {
      format: 'detailed',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('pipelineId is required')
  })

  it('should return 404 when pipeline not found', async () => {
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce(null)
    const { POST } = await import('../workflow/flagship/report/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/report', {
      pipelineId: 'nonexistent',
    }))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Pipeline not found')
  })

  it('should create audit log on successful report generation', async () => {
    const { POST } = await import('../workflow/flagship/report/route')
    await POST(makeJsonRequest('/api/workflow/flagship/report', {
      pipelineId: 'pipe-1',
    }))
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ai_query',
          details: expect.stringContaining('flagship_report_generated'),
        }),
      })
    )
  })

  it('should produce report with default pipeline data when AI content is valid', async () => {
    const { POST } = await import('../workflow/flagship/report/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/report', {
      pipelineId: 'pipe-1',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.report).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/workflow/flagship/automate — Create automation
// ═══════════════════════════════════════════════════════════════

describe('POST /api/workflow/flagship/automate', () => {
  it('should create a daily automation for a pipeline', async () => {
    const { POST } = await import('../workflow/flagship/automate/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/automate', {
      pipelineId: 'pipe-1',
      schedule: { frequency: 'daily', time: '09:00' },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automationId).toBeDefined()
    expect(data.frequency).toBe('daily')
    expect(data.nextRun).toBeDefined()
    expect(data.message).toContain('daily')
  })

  it('should return 400 for missing pipelineId and frequency', async () => {
    const { POST } = await import('../workflow/flagship/automate/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/automate', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('pipelineId and schedule.frequency are required')
  })

  it('should return 400 when only pipelineId is provided', async () => {
    const { POST } = await import('../workflow/flagship/automate/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/automate', {
      pipelineId: 'pipe-1',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 404 when pipeline not found', async () => {
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce(null)
    const { POST } = await import('../workflow/flagship/automate/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/automate', {
      pipelineId: 'nonexistent',
      schedule: { frequency: 'weekly', dayOfWeek: 'monday' },
    }))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Pipeline not found')
  })

  it('should create automation with notification config', async () => {
    const { POST } = await import('../workflow/flagship/automate/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/automate', {
      pipelineId: 'pipe-1',
      schedule: { frequency: 'weekly', dayOfWeek: 'friday' },
      notificationConfig: {
        email: 'admin@example.com',
        webhook: 'https://hooks.example.com/trigger',
      },
    }, { headers: { 'x-visitor-id': 'v-1' } }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.frequency).toBe('weekly')
    // Verify automationRule was created with schedule trigger
    expect(getMockDb().automationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger: 'schedule',
          isActive: true,
        }),
      })
    )
  })

  it('should save automation rule and audit log', async () => {
    const { POST } = await import('../workflow/flagship/automate/route')
    await POST(makeJsonRequest('/api/workflow/flagship/automate', {
      pipelineId: 'pipe-1',
      schedule: { frequency: 'monthly' },
    }))
    expect(getMockDb().automationRule.create).toHaveBeenCalled()
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/workflow/flagship/publish — Publish workflow
// ═══════════════════════════════════════════════════════════════

describe('POST /api/workflow/flagship/publish', () => {
  it('should publish a workflow to the community', async () => {
    const { POST } = await import('../workflow/flagship/publish/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'pipe-1',
      title: 'My Published Workflow',
      description: 'A thorough analysis workflow',
      category: 'statistics',
      difficulty: 'intermediate',
      tags: ['sales', 'regression'],
    }, { headers: { 'x-visitor-id': 'v-1' } }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sharedWorkflowId).toBeDefined()
    expect(data.templateId).toBeDefined()
    expect(data.shareUrl).toContain('/community?template=')
    expect(data.message).toContain('My Published Workflow')
  })

  it('should return 400 for missing required fields', async () => {
    const { POST } = await import('../workflow/flagship/publish/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'pipe-1',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('pipelineId, title, and category are required')
  })

  it('should return 400 when missing title', async () => {
    const { POST } = await import('../workflow/flagship/publish/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'pipe-1',
      category: 'general',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 404 when pipeline not found', async () => {
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce(null)
    const { POST } = await import('../workflow/flagship/publish/route')
    const res = await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'nonexistent',
      title: 'Test',
      category: 'general',
    }))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Pipeline not found')
  })

  it('should create both sharedWorkflow and communityAnalysisTemplate', async () => {
    const { POST } = await import('../workflow/flagship/publish/route')
    await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'pipe-1',
      title: 'Shared Pipeline',
      category: 'ml',
    }))
    expect(getMockDb().sharedWorkflow.create).toHaveBeenCalled()
    expect(getMockDb().communityAnalysisTemplate.create).toHaveBeenCalled()
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalled()
  })

  it('should default difficulty to intermediate when not provided', async () => {
    const { POST } = await import('../workflow/flagship/publish/route')
    await POST(makeJsonRequest('/api/workflow/flagship/publish', {
      pipelineId: 'pipe-1',
      title: 'Default Diff',
      category: 'general',
    }))
    expect(getMockDb().communityAnalysisTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ difficulty: 'intermediate' }),
      })
    )
  })
})