/**
 * API Integration Tests — AI Chat, Copilot, Agent, and Workflow Routes
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════
//  Hoisted mocks — DB, ZAI SDK, session helper
// ═══════════════════════════════════════════════════════════════

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    userSession: { findUnique: vi.fn() },
    decisionRecord: { create: vi.fn(), findMany: vi.fn() },
    aiAuditLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    aiSuggestion: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    aiConversation: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    userPreference: { findUnique: vi.fn(), upsert: vi.fn() },
    workflowPipeline: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    aiModel: { findMany: vi.fn() },
    automationRule: { findMany: vi.fn() },
    communityPost: { findMany: vi.fn() },
    analysisRun: { create: vi.fn() },
  }

  function setupMockDb() {
    _db.userSession.findUnique.mockResolvedValue(null)

    _db.decisionRecord.create.mockResolvedValue({
      id: 'dec-1', visitorId: null, projectId: null, pipelineId: null,
      context: 'workspace', question: 'Test', aiAnalysis: '{}',
      options: null, selectedOption: null, outcome: null, confidence: 0.8, createdAt: now,
    })
    _db.decisionRecord.findMany.mockResolvedValue([])

    _db.aiAuditLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'ai_query', details: '{}', error: null, durationMs: 500, tokensUsed: 100,
        visitorId: null, inputData: null, outputData: null, ipAddress: null, userAgent: null, createdAt: now },
    ])
    _db.aiAuditLog.count.mockResolvedValue(10)
    _db.aiAuditLog.aggregate.mockResolvedValue({ _avg: { durationMs: 450 } })
    _db.aiAuditLog.create.mockResolvedValue({})

    _db.aiSuggestion.findMany.mockResolvedValue([
      { id: 'sug-1', visitorId: 'user-1', context: 'general', category: 'next_action',
        title: 'Try regression analysis', content: '{}', confidence: 0.9,
        isAccepted: true, isDismissed: false, createdAt: now },
    ])
    _db.aiSuggestion.create.mockResolvedValue({
      id: 'sug-new', visitorId: 'user-1', context: 'automation_suggestion', category: 'automation',
      title: 'Automated Analysis', content: '{"description":"Run daily","trigger":"schedule"}',
      confidence: 0.8, isAccepted: false, isDismissed: false, createdAt: now,
    })
    _db.aiSuggestion.updateMany.mockResolvedValue({ count: 0 })

    _db.aiConversation.findMany.mockResolvedValue([])
    _db.aiConversation.upsert.mockResolvedValue({})
    _db.aiConversation.updateMany.mockResolvedValue({ count: 0 })

    _db.userPreference.findUnique.mockResolvedValue(null)
    _db.userPreference.upsert.mockResolvedValue({ id: 'pref-1' })

    _db.workflowPipeline.findMany.mockResolvedValue([
      { id: 'wp-1', name: 'Sales Analysis', intent: 'analyze-sales', status: 'completed',
        description: 'Analyze sales data', steps: '[]', result: null, executiveSummary: null,
        visitorId: 'user-1', projectId: null, tokensUsed: 100, durationMs: 5000,
        createdAt: now, updatedAt: now },
    ])
    _db.workflowPipeline.findUnique.mockResolvedValue(null)
    _db.workflowPipeline.create.mockResolvedValue({
      id: 'wp-new', name: 'New Pipeline', intent: 'test-intent', status: 'ready',
      description: null, steps: '[]', result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 100, durationMs: 500,
      createdAt: now, updatedAt: now,
    })
    _db.workflowPipeline.update.mockResolvedValue({
      id: 'wp-1', name: 'Updated Pipeline', intent: 'test', status: 'completed',
      description: 'A pipeline', steps: '[]', result: '{}', executiveSummary: 'Done.',
      visitorId: 'user-1', projectId: null, tokensUsed: 200, durationMs: 1000,
      createdAt: now, updatedAt: now,
    })

    _db.aiModel.findMany.mockResolvedValue([])
    _db.automationRule.findMany.mockResolvedValue([])
    _db.communityPost.findMany.mockResolvedValue([])
    _db.analysisRun.create.mockResolvedValue({ id: 'ar-1' })
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

// ZAI SDK mock — controllable completion function
const { mockZaiCompletion } = vi.hoisted(() => {
  const fn = vi.fn()
  fn.mockResolvedValue({
    choices: [{ message: { content: 'AI generated response' } }],
    usage: { total_tokens: 150 },
  })
  return { mockZaiCompletion: fn }
})

// Session helper for agent auth (getTokenFromRequest + db.userSession.findUnique)
const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
const sessionWithUser = (userId: string, role: string, token = 'tok') => ({
  id: 's1', userId, token, ipAddress: '', userAgent: '',
  expiresAt: future, createdAt: new Date('2024-06-15'),
  user: { id: userId, email: 'test@example.com', name: 'Test', role },
})

// ═══════════════════════════════════════════════════════════════
//  vi.mock declarations (hoisted automatically by Vitest)
// ═══════════════════════════════════════════════════════════════

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))
vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn().mockReturnValue(null),
}))
vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: { completions: { create: mockZaiCompletion } },
    }),
  },
  __esModule: true,
}))
vi.mock('@/lib/prompts/copilot-base', () => ({
  BASE_SYSTEM_PROMPT: 'You are a helpful AI assistant.',
}))
vi.mock('@/lib/prompts/copilot-contexts', () => ({
  getContextPrompt: vi.fn().mockReturnValue(''),
}))
vi.mock('@/lib/prompts/context-detector', () => ({
  detectContextFromMessage: vi.fn().mockImplementation((_msg: string, fallback: string) => fallback),
}))
vi.mock('@/lib/analysis-cache', () => ({
  getAnalysisCacheKey: vi.fn().mockReturnValue('cache-key-test'),
  getCachedResponse: vi.fn().mockReturnValue(null),
  setCachedResponse: vi.fn(),
}))
vi.mock('@/lib/stats', () => ({
  calcFrequencies: vi.fn().mockReturnValue({ table: [] }),
  calcCrosstabs: vi.fn().mockReturnValue(null),
  calcTTest: vi.fn().mockReturnValue(null),
  calcANOVA: vi.fn().mockReturnValue(null),
  calcChiSquare: vi.fn().mockReturnValue(null),
  formatPValue: vi.fn().mockReturnValue('0.001'),
  fmt: vi.fn().mockImplementation((v: number) => String(v)),
}))

// ── Route imports (after mocks) ──

import { POST as aiChatPost } from '../ai/route'
import { POST as copilotPost, GET as copilotGet } from '../ai/copilot/route'
import { GET as suggestAutomationGet } from '../ai/copilot/suggest-automation/route'
import { POST as agentPost } from '../ai/agent/route'
import { POST as workflowPost, GET as workflowGet } from '../ai/workflow/route'
import { POST as workflowIdPost, GET as workflowIdGet } from '../ai/workflow/[id]/route'
import { POST as workflowExecutePost } from '../ai/workflow/[id]/execute/route'

// ── Helper functions ──

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

beforeEach(() => {
  vi.clearAllMocks()
  setupMockDb()
  mockZaiCompletion.mockResolvedValue({
    choices: [{ message: { content: 'AI generated response' } }],
    usage: { total_tokens: 150 },
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai — Basic AI Chat (no auth required)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai', () => {
  it('should return AI completion for a valid message', async () => {
    const req = makeJsonRequest('/api/ai', {
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const res = await aiChatPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.choices).toBeDefined()
    expect(data.choices[0].message.content).toBe('AI generated response')
    expect(mockZaiCompletion).toHaveBeenCalled()
  })

  it('should include dataset context when data is provided', async () => {
    const req = makeJsonRequest('/api/ai', {
      messages: [{ role: 'user', content: 'Analyze my data' }],
      data: { age: [25, 30, 35], income: [50000, 60000, 70000] },
      variables: [
        { name: 'age', type: 'numeric' },
        { name: 'income', type: 'numeric' },
      ],
    })
    const res = await aiChatPost(req)
    expect(res.status).toBe(200)
    expect(mockZaiCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
        ]),
      }),
    )
  })

  it('should return 413 for oversized requests', async () => {
    const req = makeJsonRequest('/api/ai', {
      messages: [{ role: 'user', content: 'big' }],
    }, {
      headers: { 'Content-Type': 'application/json', 'Content-Length': '3000000' },
    })
    const res = await aiChatPost(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toContain('too large')
  })

  it('should return 500 when ZAI SDK throws an error', async () => {
    mockZaiCompletion.mockRejectedValueOnce(new Error('API connection failed'))
    const req = makeJsonRequest('/api/ai', {
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const res = await aiChatPost(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('API connection failed')
  })

  it('should return 504 when ZAI SDK times out (AbortError)', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    mockZaiCompletion.mockRejectedValueOnce(abortError)
    const req = makeJsonRequest('/api/ai', {
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const res = await aiChatPost(req)
    expect(res.status).toBe(504)
    const data = await res.json()
    expect(data.error).toContain('timed out')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/copilot — Suggestions (no auth required)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/copilot', () => {
  it('should return suggestions with default context', async () => {
    const res = await copilotGet(makeRequest('/api/ai/copilot'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toBeDefined()
    expect(Array.isArray(data.suggestions)).toBe(true)
  })

  it('should filter suggestions by context query param', async () => {
    await copilotGet(makeRequest('/api/ai/copilot?context=leaderboard'))
    expect(getMockDb().aiSuggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ context: 'leaderboard' }),
      }),
    )
  })

  it('should filter suggestions by visitorId query param', async () => {
    await copilotGet(makeRequest('/api/ai/copilot?visitorId=user-1'))
    expect(getMockDb().aiSuggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visitorId: 'user-1' }),
      }),
    )
  })

  it('should not require visitorId in query when omitted', async () => {
    await copilotGet(makeRequest('/api/ai/copilot'))
    expect(getMockDb().aiSuggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ visitorId: expect.anything() }),
      }),
    )
  })

  it('should return 500 when DB query fails', async () => {
    getMockDb().aiSuggestion.findMany.mockRejectedValueOnce(new Error('DB down'))
    const res = await copilotGet(makeRequest('/api/ai/copilot'))
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/copilot — Deep-Context AI Chat
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/copilot', () => {
  it('should return AI response with valid messages', async () => {
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: [{ role: 'user', content: 'What is regression analysis?' }],
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('AI generated response')
    expect(data.meta).toBeDefined()
    expect(data.meta.context).toBeDefined()
    expect(data.meta.version).toBe('v4')
    expect(data.meta.tokensUsed).toBe(150)
  })

  it('should return 400 when messages is missing', async () => {
    const req = makeJsonRequest('/api/ai/copilot', {
      context: 'general',
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Messages array is required')
  })

  it('should return 400 when messages is an empty array', async () => {
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: [],
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Messages array is required')
  })

  it('should return 400 when messages is not an array', async () => {
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: 'just a string',
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(400)
  })

  it('should include context layers in meta response', async () => {
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: [{ role: 'user', content: 'Compare AI models' }],
      context: 'leaderboard',
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.meta.contextLayers).toBeDefined()
    expect(data.meta.contextLayers).toHaveProperty('liveData')
    expect(data.meta.contextLayers).toHaveProperty('memory')
    expect(data.meta.contextLayers).toHaveProperty('conversationHistory')
  })

  it('should use cached response when available', async () => {
    const { getCachedResponse } = await import('@/lib/analysis-cache')
    vi.mocked(getCachedResponse).mockReturnValueOnce('Cached AI response text')
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Cached AI response text')
    expect(data.meta.cacheHit).toBe(true)
  })

  it('should return 500 when ZAI SDK fails', async () => {
    mockZaiCompletion.mockRejectedValueOnce(new Error('AI service unavailable'))
    const req = makeJsonRequest('/api/ai/copilot', {
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const res = await copilotPost(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Failed to get AI response')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/copilot/suggest-automation — Proactive Suggestions
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/copilot/suggest-automation', () => {
  it('should return 401 when requireAuth returns null', async () => {
    const res = await suggestAutomationGet(makeRequest('/api/ai/copilot/suggest-automation'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should return cached suggestions when available', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    // Cached suggestions (recent, not dismissed)
    getMockDb().aiSuggestion.findMany.mockResolvedValueOnce([
      { id: 'sug-cache', visitorId: 'user-1', context: 'automation_suggestion',
        category: 'automation', title: 'Cached suggestion', content: '{}',
        confidence: 0.85, isAccepted: false, isDismissed: false,
        createdAt: new Date() },
    ])

    const res = await suggestAutomationGet(makeRequest('/api/ai/copilot/suggest-automation'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toHaveLength(1)
    expect(data.source).toBe('cache')
    expect(data.analyzedPatterns).toBeDefined()
  })

  it('should return AI-generated suggestions when no cache exists', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    // No cached suggestions (empty first call)
    getMockDb().aiSuggestion.findMany
      .mockResolvedValueOnce([]) // cache check
      .mockResolvedValueOnce([]) // existing rules

    // ZAI returns JSON array of suggestions
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{
        message: { content: JSON.stringify([
          { title: 'Automated Model Run', description: 'Run analysis daily',
            trigger: 'schedule', triggerConfig: { frequency: 'daily' },
            actions: [{ type: 'run_model', config: { model: 'descriptive-stats' } }],
            reason: 'High query frequency', confidence: 0.8 },
        ]) },
      }],
      usage: { total_tokens: 200 },
    })

    const res = await suggestAutomationGet(makeRequest('/api/ai/copilot/suggest-automation'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toHaveLength(1)
    expect(data.source).toBe('ai_generated')
    expect(data.analyzedPatterns).toBeDefined()
  })

  it('should fall back to heuristic suggestions when AI fails', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().aiSuggestion.findMany
      .mockResolvedValueOnce([]) // cache check
      .mockResolvedValueOnce([]) // existing rules

    // Make AI call fail — first call is audit logs query (aiAuditLog.findMany),
    // ZAI is called later for suggestions
    getMockDb().aiAuditLog.findMany.mockResolvedValueOnce(
      Array(15).fill(null).map((_, i) => ({
        id: `log-${i}`, action: 'ai_query', details: '{}',
        createdAt: new Date(), visitorId: 'user-1',
      })),
    )

    mockZaiCompletion.mockRejectedValueOnce(new Error('AI down'))

    const res = await suggestAutomationGet(makeRequest('/api/ai/copilot/suggest-automation'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // Should still return suggestions from heuristic fallback
    expect(data.suggestions).toBeDefined()
    expect(Array.isArray(data.suggestions)).toBe(true)
  })

  it('should respect the limit query parameter', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const res = await suggestAutomationGet(makeRequest('/api/ai/copilot/suggest-automation?limit=3'))
    expect(res.status).toBe(200)
    // The limit param is used internally; response structure should still be valid
    const data = await res.json()
    expect(data.suggestions).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/agent — AI Data Analysis Agent
//  Auth: getTokenFromRequest + db.userSession.findUnique
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/agent', () => {
  it('should return 401 when no session token is present', async () => {
    const req = makeJsonRequest('/api/ai/agent', {
      data: { age: [25, 30] },
      variables: [{ name: 'age', type: 'numeric' }],
    })
    const res = await agentPost(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 when token exists but session not found', async () => {
    const { getTokenFromRequest } = await import('@/lib/auth')
    vi.mocked(getTokenFromRequest).mockReturnValueOnce('bad-token')
    // userSession.findUnique returns null by default from setupMockDb

    const req = makeJsonRequest('/api/ai/agent', {
      data: { age: [25, 30] },
      variables: [{ name: 'age', type: 'numeric' }],
    })
    const res = await agentPost(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 when data is missing', async () => {
    const { getTokenFromRequest } = await import('@/lib/auth')
    vi.mocked(getTokenFromRequest).mockReturnValueOnce('tok')
    getMockDb().userSession.findUnique.mockResolvedValueOnce(sessionWithUser('user-1', 'user'))

    const req = makeJsonRequest('/api/ai/agent', {
      variables: [{ name: 'age', type: 'numeric' }],
    })
    const res = await agentPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No data provided')
  })

  it('should return 400 when variables array is empty', async () => {
    const { getTokenFromRequest } = await import('@/lib/auth')
    vi.mocked(getTokenFromRequest).mockReturnValueOnce('tok')
    getMockDb().userSession.findUnique.mockResolvedValueOnce(sessionWithUser('user-1', 'user'))

    const req = makeJsonRequest('/api/ai/agent', {
      data: { age: [25, 30] },
      variables: [],
    })
    const res = await agentPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No data provided')
  })

  it('should execute analysis and return results with valid input', async () => {
    const { getTokenFromRequest } = await import('@/lib/auth')
    vi.mocked(getTokenFromRequest).mockReturnValueOnce('tok')
    getMockDb().userSession.findUnique.mockResolvedValueOnce(sessionWithUser('user-1', 'user'))

    const req = makeJsonRequest('/api/ai/agent', {
      data: {
        age: [25, 30, 35, 40, 45, 50, 55, 60],
        income: [50000, 60000, 55000, 70000, 75000, 80000, 85000, 90000],
      },
      variables: [
        { name: 'age', type: 'numeric' },
        { name: 'income', type: 'numeric' },
      ],
      goal: 'Find patterns between age and income',
    })
    const res = await agentPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results).toBeDefined()
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.summary).toBeDefined()
    expect(data.insightsCount).toBeDefined()
    expect(data.timestamp).toBeDefined()
  })

  it('should return 413 for oversized request payload', async () => {
    const { getTokenFromRequest } = await import('@/lib/auth')
    vi.mocked(getTokenFromRequest).mockReturnValueOnce('tok')
    getMockDb().userSession.findUnique.mockResolvedValueOnce(sessionWithUser('user-1', 'user'))

    const req = makeJsonRequest('/api/ai/agent', {
      data: { col: [1] },
      variables: [{ name: 'col', type: 'numeric' }],
    }, {
      headers: { 'Content-Type': 'application/json', 'Content-Length': '15000000' },
    })
    const res = await agentPost(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toContain('too large')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/workflow — List Workflows (no auth required)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/workflow', () => {
  it('should return list of workflows', async () => {
    const res = await workflowGet(makeRequest('/api/ai/workflow'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipelines).toBeDefined()
    expect(Array.isArray(data.pipelines)).toBe(true)
    expect(data.pipelines.length).toBeGreaterThan(0)
  })

  it('should filter by visitorId query param', async () => {
    await workflowGet(makeRequest('/api/ai/workflow?visitorId=user-1'))
    expect(getMockDb().workflowPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visitorId: 'user-1' }),
      }),
    )
  })

  it('should filter by status query param', async () => {
    await workflowGet(makeRequest('/api/ai/workflow?status=completed'))
    expect(getMockDb().workflowPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'completed' }),
      }),
    )
  })

  it('should combine visitorId and status filters', async () => {
    await workflowGet(makeRequest('/api/ai/workflow?visitorId=user-1&status=ready'))
    expect(getMockDb().workflowPipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visitorId: 'user-1', status: 'ready' }),
      }),
    )
  })

  it('should return 500 on DB error', async () => {
    getMockDb().workflowPipeline.findMany.mockRejectedValueOnce(new Error('DB failure'))
    const res = await workflowGet(makeRequest('/api/ai/workflow'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Failed to fetch workflows')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/workflow — Create Workflow Pipeline
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/workflow', () => {
  it('should return 401 when requireAuth returns null', async () => {
    const res = await workflowPost(makeJsonRequest('/api/ai/workflow', {
      intent: 'analyze sales data',
    }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should create a workflow pipeline with valid intent', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    // ZAI returns valid workflow JSON
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        name: 'Sales Analysis Pipeline',
        description: 'Analyze quarterly sales data',
        steps: [
          { id: 'step_1', type: 'data_prep', name: 'Clean Data', description: 'Remove nulls', config: { action: 'clean_missing' } },
          { id: 'step_2', type: 'statistical_test', name: 'Regression', description: 'Run regression', config: { test: 'pearson_correlation' } },
          { id: 'step_3', type: 'report', name: 'Summary', description: 'Generate report', config: { format: 'summary' } },
        ],
      }) } }],
      usage: { total_tokens: 200 },
    })

    const req = makeJsonRequest('/api/ai/workflow', {
      intent: 'Analyze quarterly sales data trends',
    })
    const res = await workflowPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    expect(data.pipeline.id).toBe('wp-new')
    expect(data.pipeline.status).toBe('ready')
    expect(data.pipeline.steps).toBeDefined()
    expect(data.pipeline.steps.length).toBeGreaterThan(0)
    expect(getMockDb().workflowPipeline.create).toHaveBeenCalled()
  })

  it('should return 400 when intent is missing', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const req = makeJsonRequest('/api/ai/workflow', { context: 'workspace' })
    const res = await workflowPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Intent is required')
  })

  it('should return 400 when intent is empty or whitespace', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const req = makeJsonRequest('/api/ai/workflow', { intent: '   ' })
    const res = await workflowPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Intent is required')
  })

  it('should use fallback workflow when AI returns invalid JSON', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    // AI returns non-JSON text
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: 'I cannot generate a workflow for that.' } }],
      usage: { total_tokens: 50 },
    })

    const req = makeJsonRequest('/api/ai/workflow', {
      intent: 'Some analysis task',
    })
    const res = await workflowPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    // Fallback pipeline has 4 default steps
    expect(data.pipeline.steps.length).toBeGreaterThanOrEqual(4)
  })

  it('should pass pageData context to ZAI prompt', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        name: 'Test', description: 'Test', steps: [],
      }) } }],
      usage: { total_tokens: 100 },
    })

    const req = makeJsonRequest('/api/ai/workflow', {
      intent: 'Analyze workspace data',
      context: 'workspace',
      pageData: { datasetInfo: { rows: 100, columns: 5 } },
    })
    const res = await workflowPost(req)
    expect(res.status).toBe(200)
    // Verify ZAI was called with context-aware system prompt containing dataset info
    expect(mockZaiCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Dataset context'),
          }),
        ]),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/workflow/[id] — Get Single Pipeline
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/workflow/[id]', () => {
  it('should return 401 when requireAuth returns null', async () => {
    const res = await workflowIdGet(
      makeRequest('/api/ai/workflow/wp-1'),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 404 when pipeline not found', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)
    // findUnique returns null by default

    const res = await workflowIdGet(
      makeRequest('/api/ai/workflow/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })

  it('should return pipeline details when found', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const now = new Date('2024-06-15')
    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-1', name: 'Sales Analysis', intent: 'analyze-sales', status: 'completed',
      description: 'Analyze sales data', steps: JSON.stringify([
        { id: 'step_1', type: 'data_prep', name: 'Clean', status: 'completed' },
      ]),
      result: JSON.stringify({ step_1: { status: 'completed', output: 'Done' } }),
      executiveSummary: 'Analysis complete.',
      visitorId: 'user-1', projectId: null, tokensUsed: 200, durationMs: 3000,
      createdAt: now, updatedAt: now,
    })

    const res = await workflowIdGet(
      makeRequest('/api/ai/workflow/wp-1'),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    expect(data.pipeline.id).toBe('wp-1')
    expect(data.pipeline.name).toBe('Sales Analysis')
    expect(data.pipeline.steps).toBeDefined()
    expect(data.pipeline.result).toBeDefined()
    expect(data.pipeline.executiveSummary).toBe('Analysis complete.')
  })

  it('should return pipeline with null result when no result stored', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-2', name: 'Draft Pipeline', intent: 'draft', status: 'ready',
      description: null, steps: '[]', result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const res = await workflowIdGet(
      makeRequest('/api/ai/workflow/wp-2'),
      { params: Promise.resolve({ id: 'wp-2' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline.result).toBeNull()
  })

  it('should return 500 on DB error', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)
    getMockDb().workflowPipeline.findUnique.mockRejectedValueOnce(new Error('DB error'))

    const res = await workflowIdGet(
      makeRequest('/api/ai/workflow/wp-1'),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/workflow/[id] — Execute Pipeline (single call)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/workflow/[id]', () => {
  it('should return 401 when requireAuth returns null', async () => {
    const res = await workflowIdPost(
      makeJsonRequest('/api/ai/workflow/wp-1', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 404 when pipeline not found', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const res = await workflowIdPost(
      makeJsonRequest('/api/ai/workflow/nonexistent', {}),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    expect(res.status).toBe(404)
  })

  it('should return 409 when pipeline is already running', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-1', name: 'Running Pipeline', intent: 'test', status: 'running',
      description: null, steps: '[]', result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const res = await workflowIdPost(
      makeJsonRequest('/api/ai/workflow/wp-1', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('already running')
  })

  it('should execute pipeline and return results', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-1', name: 'Test Pipeline', intent: 'test analysis', status: 'ready',
      description: 'A test pipeline', steps: JSON.stringify([
        { id: 'step_1', type: 'data_prep', name: 'Clean Data', description: 'Clean', config: {} },
        { id: 'step_2', type: 'statistical_test', name: 'T-Test', description: 'Run test', config: {} },
      ]),
      result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        results: {
          step_step_1: { status: 'completed', output: 'Data cleaned', keyFindings: ['Removed 5 nulls'] },
          step_step_2: { status: 'completed', output: 'T-test completed', keyFindings: ['p = 0.023'] },
        },
        executiveSummary: 'The analysis found a significant difference.',
      }) } }],
      usage: { total_tokens: 300 },
    })

    const res = await workflowIdPost(
      makeJsonRequest('/api/ai/workflow/wp-1', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    expect(data.pipeline.status).toBe('completed')
    expect(data.pipeline.result).toBeDefined()
    // Verify DB update was called with AI-parsed executiveSummary
    expect(getMockDb().workflowPipeline.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executiveSummary: 'The analysis found a significant difference.',
          status: 'completed',
        }),
      }),
    )
    expect(getMockDb().workflowPipeline.update).toHaveBeenCalled()
  })

  it('should use fallback execution when AI returns invalid JSON', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-1', name: 'Test', intent: 'test', status: 'ready',
      description: null, steps: JSON.stringify([
        { id: 'step_1', type: 'data_prep', name: 'Step 1', description: 'Desc', config: {} },
      ]),
      result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    // AI returns unparseable text
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: 'Sorry, I cannot process this.' } }],
      usage: { total_tokens: 20 },
    })

    const res = await workflowIdPost(
      makeJsonRequest('/api/ai/workflow/wp-1', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline.status).toBe('completed')
    expect(data.pipeline.result).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/workflow/[id]/execute — Per-Step Pipeline Execution
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/workflow/[id]/execute', () => {
  it('should return 401 when requireAuth returns null', async () => {
    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/wp-1/execute', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 404 when pipeline not found', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/nonexistent/execute', {}),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    expect(res.status).toBe(404)
  })

  it('should return 409 when pipeline is already running', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-1', name: 'Running', intent: 'test', status: 'running',
      description: null, steps: '[]', result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/wp-1/execute', {}),
      { params: Promise.resolve({ id: 'wp-1' }) },
    )
    expect(res.status).toBe(409)
  })

  it('should return 400 when pipeline has no steps', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-empty', name: 'Empty Pipeline', intent: 'test', status: 'ready',
      description: null, steps: '[]', result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/wp-empty/execute', {}),
      { params: Promise.resolve({ id: 'wp-empty' }) },
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('no steps')
  })

  it('should execute all steps sequentially and return results with summary', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-exec', name: 'Multi-Step Pipeline', intent: 'Full analysis',
      status: 'ready', description: 'Multi-step pipeline',
      steps: JSON.stringify([
        { id: 'step_1', type: 'data_prep', name: 'Clean Data', description: 'Clean and normalize', config: { action: 'auto_clean' }, status: 'pending' },
        { id: 'step_2', type: 'statistical_test', name: 'ANOVA', description: 'Run ANOVA test', config: { test: 'anova' }, status: 'pending' },
        { id: 'step_3', type: 'report', name: 'Generate Report', description: 'Create summary report', config: { format: 'pdf' }, status: 'pending' },
      ]),
      result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 50, durationMs: 200,
      createdAt: new Date(), updatedAt: new Date(),
    })

    // Step 1 execution response
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        status: 'completed', output: 'Data cleaned: removed 12 nulls, normalized 3 columns',
        keyFindings: ['12 null values removed', '3 columns normalized'],
        metrics: { nullsRemoved: 12 }, dataPoints: 500, confidence: 0.95,
      }) } }],
      usage: { total_tokens: 100 },
    })
    // Step 2 execution response
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        status: 'completed', output: 'ANOVA test completed across 3 groups',
        keyFindings: ['F(2,497) = 4.32', 'p = 0.014 — significant'],
        metrics: { fStat: 4.32, pValue: 0.014 }, dataPoints: 500, confidence: 0.92,
      }) } }],
      usage: { total_tokens: 120 },
    })
    // Step 3 execution response
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        status: 'completed', output: 'Executive report generated with 3 key findings',
        keyFindings: ['Significant group differences detected', 'Confidence > 90%'],
        metrics: { pages: 5 }, dataPoints: 500, confidence: 0.95,
      }) } }],
      usage: { total_tokens: 80 },
    })
    // Summary generation response
    mockZaiCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        executiveSummary: 'The multi-step analysis pipeline identified significant group differences (p=0.014) after data cleaning.',
        keyInsights: ['Group B outperformed Group A and C', 'ANOVA F-statistic indicates strong effect'],
        recommendations: ['Investigate Group B characteristics', 'Conduct post-hoc Tukey test'],
        riskLevel: 'low',
      }) } }],
      usage: { total_tokens: 150 },
    })

    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/wp-exec/execute', {}),
      { params: Promise.resolve({ id: 'wp-exec' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline).toBeDefined()
    expect(data.pipeline.status).toBe('completed')
    expect(data.pipeline.result).toBeDefined()
    expect(data.pipeline.result.stepResults).toBeDefined()
    expect(data.pipeline.result.stepResults.step_1).toBeDefined()
    expect(data.pipeline.result.stepResults.step_1.status).toBe('completed')
    expect(data.pipeline.result.stepResults.step_2).toBeDefined()
    expect(data.pipeline.result.stepResults.step_3).toBeDefined()
    expect(data.pipeline.result.summary).toBeDefined()
    expect(data.pipeline.result.summary.executiveSummary).toContain('significant group differences')
    expect(data.pipeline.result.summary.keyInsights).toBeDefined()
    expect(data.pipeline.result.summary.recommendations).toBeDefined()
    expect(data.pipeline.result.summary.riskLevel).toBe('low')
    // Verify DB update was called with AI-parsed executiveSummary
    expect(getMockDb().workflowPipeline.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executiveSummary: expect.stringContaining('significant group differences'),
        }),
      }),
    )
  })

  it('should handle step errors gracefully and mark remaining as skipped', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)

    getMockDb().workflowPipeline.findUnique.mockResolvedValueOnce({
      id: 'wp-err', name: 'Error Pipeline', intent: 'test', status: 'ready',
      description: null,
      steps: JSON.stringify([
        { id: 'step_1', type: 'data_prep', name: 'Step 1', description: 'S1', config: {}, status: 'pending' },
        { id: 'step_2', type: 'statistical_test', name: 'Step 2', description: 'S2', config: {}, status: 'pending' },
      ]),
      result: null, executiveSummary: null,
      visitorId: 'user-1', projectId: null, tokensUsed: 0, durationMs: 0,
      createdAt: new Date(), updatedAt: new Date(),
    })

    // First step fails
    mockZaiCompletion.mockRejectedValueOnce(new Error('AI step timeout'))

    const res = await workflowExecutePost(
      makeJsonRequest('/api/ai/workflow/wp-err/execute', {}),
      { params: Promise.resolve({ id: 'wp-err' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pipeline.result.stepResults.step_1.status).toBe('error')
    expect(data.pipeline.result.stepResults.step_1.error).toBeDefined()
    // Second step should be skipped
    const steps = data.pipeline.steps as Array<{ id: string; status: string }>
    const step2 = steps.find((s) => s.id === 'step_2')
    expect(step2?.status).toBe('skipped')
    expect(getMockDb().workflowPipeline.update).toHaveBeenCalled()
  })
})
