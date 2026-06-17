/**
 * API Integration Tests — AI Routes: decisions, audit, assistant (list), copilot memory, copilot suggest-automation
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    decisionRecord: { create: vi.fn(), findMany: vi.fn() },
    aiAuditLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    aiSuggestion: { findMany: vi.fn() },
    aiConversation: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    userPreference: { findUnique: vi.fn(), upsert: vi.fn() },
    workflowPipeline: { findMany: vi.fn() },
    analysisRun: { create: vi.fn() },
  }

  function setupMockDb() {
    _db.decisionRecord.create.mockResolvedValue({
      id: 'dec-1', visitorId: null, projectId: null, pipelineId: null,
      context: 'workspace', question: 'Test question?', aiAnalysis: '{}',
      options: null, selectedOption: null, outcome: null, confidence: 0.8, createdAt: now,
    })
    _db.decisionRecord.findMany.mockResolvedValue([])

    _db.aiAuditLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'ai_query', details: '{}', error: null, durationMs: 500, tokensUsed: 100, visitorId: null, inputData: null, outputData: null, ipAddress: null, userAgent: null, createdAt: now },
    ])
    _db.aiAuditLog.count.mockResolvedValue(10)
    _db.aiAuditLog.aggregate.mockResolvedValue({ _avg: { durationMs: 450 } })
    _db.aiAuditLog.create.mockResolvedValue({})

    _db.aiSuggestion.findMany.mockResolvedValue([
      { id: 'sug-1', visitorId: 'a@b.com', context: 'general', category: 'next_action', title: 'Try regression', content: '{}', confidence: 0.9, isAccepted: true, isDismissed: false, createdAt: now },
    ])

    _db.aiConversation.findMany.mockResolvedValue([])
    _db.aiConversation.upsert.mockResolvedValue({})
    _db.aiConversation.updateMany.mockResolvedValue({ count: 0 })

    _db.userPreference.findUnique.mockResolvedValue({
      id: 'pref-1', visitorId: 'a@b.com', skillLevel: 'intermediate', preferredLang: 'en',
      interfaceMode: 'standard', theme: 'dark', aiSensitivity: 0.7, notificationsEnabled: true,
      recentPages: '["/workspace"]', frequentActions: '{}', createdAt: now, updatedAt: now,
    })
    _db.userPreference.upsert.mockResolvedValue({ id: 'pref-1' })

    _db.workflowPipeline.findMany.mockResolvedValue([
      { id: 'wp-1', name: 'Sales Analysis', intent: 'analyze-sales', status: 'completed', executiveSummary: null, steps: '[]', durationMs: 5000, createdAt: now, updatedAt: now },
    ])
    _db.analysisRun.create.mockResolvedValue({ id: 'ar-1' })
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))
vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}))

// ── Route imports ──

import { POST as decisionsPost, GET as decisionsGet } from '../ai/decisions/route'
import { GET as auditGet } from '../ai/audit/route'
import { GET as assistantGet } from '../ai/assistant/route'
import { GET as memoryGet, POST as memoryPost } from '../ai/copilot/memory/route'

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
//  AI DECISIONS
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/decisions', () => {
  it('should create a decision record with valid input', async () => {
    const req = makeJsonRequest('/api/ai/decisions', {
      context: 'workspace',
      question: 'Should I use t-test or ANOVA?',
      aiAnalysis: { recommendation: 'Use ANOVA' },
    }, { headers: { 'x-visitor-id': 'a@b.com' } })
    const res = await decisionsPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.decision).toBeDefined()
    expect(data.decision.context).toBe('workspace')
    expect(data.decision.question).toBe('Should I use t-test or ANOVA?')
    expect(getMockDb().decisionRecord.create).toHaveBeenCalled()
    expect(getMockDb().aiAuditLog.create).toHaveBeenCalled()
  })

  it('should return 400 for missing context', async () => {
    const res = await decisionsPost(makeJsonRequest('/api/ai/decisions', {
      question: 'Q?',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 for missing question', async () => {
    const res = await decisionsPost(makeJsonRequest('/api/ai/decisions', {
      context: 'workspace',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid context', async () => {
    const res = await decisionsPost(makeJsonRequest('/api/ai/decisions', {
      context: 'invalid_context',
      question: 'Q?',
    }))
    expect(res.status).toBe(400)
  })

  it('should accept confidence and options', async () => {
    const req = makeJsonRequest('/api/ai/decisions', {
      context: 'automation',
      question: 'Which model to use?',
      aiAnalysis: '{}',
      options: ['GPT-4o', 'Claude'],
      selectedOption: 'GPT-4o',
      confidence: 0.92,
    })
    const res = await decisionsPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.decision.confidence).toBe(0.92)
    expect(data.decision.selectedOption).toBe('GPT-4o')
  })
})

describe('GET /api/ai/decisions', () => {
  it('should return decisions with default pagination', async () => {
    const res = await decisionsGet(makeRequest('/api/ai/decisions'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.decisions).toBeDefined()
  })

  it('should filter by visitorId', async () => {
    await decisionsGet(makeRequest('/api/ai/decisions?visitorId=a@b.com'))
    expect(getMockDb().decisionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ visitorId: 'a@b.com' }) })
    )
  })

  it('should filter by context', async () => {
    await decisionsGet(makeRequest('/api/ai/decisions?context=workspace'))
    expect(getMockDb().decisionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ context: 'workspace' }) })
    )
  })

  it('should filter by pipelineId', async () => {
    await decisionsGet(makeRequest('/api/ai/decisions?pipelineId=pipeline-1'))
    expect(getMockDb().decisionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ pipelineId: 'pipeline-1' }) })
    )
  })

  it('should respect limit parameter', async () => {
    await decisionsGet(makeRequest('/api/ai/decisions?limit=5'))
    expect(getMockDb().decisionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('should clamp limit to 100', async () => {
    await decisionsGet(makeRequest('/api/ai/decisions?limit=500'))
    expect(getMockDb().decisionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI AUDIT
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/audit', () => {
  it('should return audit logs with stats', async () => {
    const res = await auditGet(makeRequest('/api/ai/audit'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.logs).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.todayQueries).toBeDefined()
    expect(data.stats.weekQueries).toBeDefined()
    expect(data.stats.totalQueries).toBeDefined()
    expect(data.stats.avgDurationMs).toBeDefined()
  })

  it('should filter by action', async () => {
    await auditGet(makeRequest('/api/ai/audit?action=ai_query'))
    expect(getMockDb().aiAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: 'ai_query' }) })
    )
  })

  it('should respect limit and offset', async () => {
    await auditGet(makeRequest('/api/ai/audit?limit=10&offset=20'))
    expect(getMockDb().aiAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI ASSISTANT (GET — list specialists)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/assistant', () => {
  it('should list all specialists with metadata', async () => {
    const res = await assistantGet(makeRequest('/api/ai/assistant'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.specialists).toBeDefined()
    expect(data.count).toBeGreaterThan(0)
    expect(data.specialists[0]).toHaveProperty('id')
    expect(data.specialists[0]).toHaveProperty('name')
    expect(data.specialists[0]).toHaveProperty('title')
    expect(data.specialists[0]).toHaveProperty('capabilities')
  })

  it('should include expected specialist categories', async () => {
    const res = await assistantGet(makeRequest('/api/ai/assistant'))
    const data = await res.json()
    const ids = data.specialists.map((s: { id: string }) => s.id)
    expect(ids).toContain('data_analyst')
    expect(ids).toContain('ml_engineer')
    expect(ids).toContain('statistician')
    expect(ids).toContain('code_generator')
    expect(ids).toContain('report_writer')
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI COPILOT MEMORY
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/copilot/memory', () => {
  it('should return 401 when no auth', async () => {
    // requireAuth returns null by default
    const res = await memoryGet(makeRequest('/api/ai/copilot/memory'))
    expect(res.status).toBe(401)
  })

  it('should return 400 when neither visitorId nor projectId', async () => {
    // Override requireAuth for this test
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)
    const res = await memoryGet(makeRequest('/api/ai/copilot/memory'))
    expect(res.status).toBe(400)
  })

  it('should return memory for a visitorId', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)
    const res = await memoryGet(makeRequest('/api/ai/copilot/memory?visitorId=a@b.com'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.memory).toBeDefined()
    expect(data.memory.stats).toBeDefined()
    expect(data.memory.stats.totalDecisions).toBeDefined()
    expect(data.memory.stats.totalPipelines).toBeDefined()
    expect(data.memory.summary).toBeDefined()
  })

  it('should return memory for a projectId', async () => {
    const { requireAuth } = await import('@/lib/require-auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: 'user-1' } as any)
    const res = await memoryGet(makeRequest('/api/ai/copilot/memory?projectId=proj-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.memory).toBeDefined()
    expect(data.memory.projectId).toBe('proj-1')
  })
})

describe('POST /api/ai/copilot/memory', () => {
  it('should return 400 for missing type', async () => {
    const res = await memoryPost(makeJsonRequest('/api/ai/copilot/memory', {
      content: 'prefers dark theme',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 for missing content', async () => {
    const res = await memoryPost(makeJsonRequest('/api/ai/copilot/memory', {
      type: 'preference',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid type', async () => {
    const res = await memoryPost(makeJsonRequest('/api/ai/copilot/memory', {
      type: 'invalid_type',
      content: 'test',
    }))
    expect(res.status).toBe(400)
  })

  it('should store a preference memory', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'preference',
      content: { skillLevel: 'expert', theme: 'light' },
    }, { headers: { 'x-visitor-id': 'a@b.com' } })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.result.type).toBe('preference_updated')
    expect(getMockDb().userPreference.upsert).toHaveBeenCalled()
  })

  it('should store a decision_context memory', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'decision_context',
      content: 'User prefers statistical significance testing',
      context: 'workspace',
    }, { headers: { 'x-visitor-id': 'a@b.com' } })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.result.type).toBe('decision_context_stored')
    expect(getMockDb().decisionRecord.create).toHaveBeenCalled()
  })

  it('should store a conversation_insight with sessionId', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'conversation_insight',
      content: 'User is interested in NLP pipelines',
      sessionId: 'sess-1',
    })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.result.type).toBe('conversation_insight_stored')
    expect(getMockDb().aiConversation.updateMany).toHaveBeenCalled()
  })

  it('should ignore conversation_insight without sessionId', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'conversation_insight',
      content: 'Test',
    })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.result.type).toBe('conversation_insight_ignored')
  })

  it('should store a workflow_preference memory', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'workflow_preference',
      content: 'Prefers automated scheduling',
    }, { headers: { 'x-visitor-id': 'a@b.com' } })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).result.type).toBe('workflow_preference_stored')
  })

  it('should store a custom memory', async () => {
    const req = makeJsonRequest('/api/ai/copilot/memory', {
      type: 'custom',
      content: 'User likes concise responses',
    }, { headers: { 'x-visitor-id': 'a@b.com' } })
    const res = await memoryPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).result.type).toBe('custom_memory_stored')
  })
})