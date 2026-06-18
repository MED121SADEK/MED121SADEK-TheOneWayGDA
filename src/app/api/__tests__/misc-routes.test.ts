/**
 * API Integration Tests — Misc Routes:
 *   feedback, errors, analytics, clean, validate, notifications, usage,
 *   keys, search/saved, scan, protocol, recommendations, updates,
 *   health, health/deep, metrics, modules, visitors, devops, billing,
 *   checkout, certifications, arena vote, og, stripe, v1 proxy
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

vi.hoisted(() => { process.env.ADMIN_SECRET = 'admin-secret-token' })

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const baseUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-001', email: 'test@example.com', name: 'Test User',
    password: 'hash', role: 'user',
    createdAt: now, updatedAt: now, lastSeen: now, preferences: '{}',
    bio: null, company: null, location: null, website: null,
    skills: null, isOnboarded: true, image: null,
    resetToken: null, resetTokenExpiry: null,
    avatarUrl: null, github: null, linkedin: null,
    ...overrides,
  })

  const _db = {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    userActivity: { create: vi.fn() },
    apiKey: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    usageRecord: { findMany: vi.fn(), create: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    teamMember: { count: vi.fn() },
    project: { count: vi.fn() },
    sharedWorkflow: { count: vi.fn() },
    analysisRun: { findMany: vi.fn(), create: vi.fn() },
    appErrorLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), groupBy: vi.fn() },
    deployLog: { findMany: vi.fn(), groupBy: vi.fn(), create: vi.fn() },
    automationLog: { count: vi.fn() },
    workflowPipeline: { count: vi.fn() },
    aiAuditLog: { count: vi.fn() },
    aiModel: { count: vi.fn() },
    savedSearch: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  }

  function setupMockDb() {
    _db.user.findUnique.mockResolvedValue(baseUser())
    _db.user.findMany.mockResolvedValue([])
    _db.user.create.mockResolvedValue(baseUser())
    _db.user.update.mockResolvedValue(baseUser())

    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '', expiresAt: future, createdAt: now,
    })
    _db.userSession.create.mockResolvedValue({ id: 's1' })
    _db.userSession.delete.mockResolvedValue({})

    _db.userActivity.create.mockResolvedValue({})
    _db.apiKey.findMany.mockResolvedValue([])
    _db.apiKey.findUnique.mockResolvedValue(null)
    _db.apiKey.create.mockResolvedValue({ id: 'key-1', prefix: 'onw_abc12345' })
    _db.apiKey.count.mockResolvedValue(0)
    _db.apiKey.delete.mockResolvedValue({})

    _db.usageRecord.findMany.mockResolvedValue([])
    _db.usageRecord.create.mockResolvedValue({ id: 'ur-1' })

    _db.notification.findMany.mockResolvedValue([])
    _db.notification.count.mockResolvedValue(0)
    _db.notification.create.mockResolvedValue({ id: 'n-1' })
    _db.notification.findUnique.mockResolvedValue(null)
    _db.notification.updateMany.mockResolvedValue({ count: 0 })
    _db.notification.update.mockResolvedValue({})
    _db.notification.delete.mockResolvedValue({})

    _db.subscription.findUnique.mockResolvedValue(null)

    _db.teamMember.count.mockResolvedValue(0)
    _db.project.count.mockResolvedValue(0)
    _db.sharedWorkflow.count.mockResolvedValue(0)

    _db.analysisRun.findMany.mockResolvedValue([])
    _db.analysisRun.create.mockResolvedValue({ id: 'ar-1' })

    _db.appErrorLog.findMany.mockResolvedValue([])
    _db.appErrorLog.count.mockResolvedValue(0)
    _db.appErrorLog.create.mockResolvedValue({ id: 'err-1' })
    _db.appErrorLog.groupBy.mockResolvedValue([])

    _db.deployLog.findMany.mockResolvedValue([])
    _db.deployLog.groupBy.mockResolvedValue([])

    _db.automationLog.count.mockResolvedValue(0)
    _db.workflowPipeline.count.mockResolvedValue(0)
    _db.aiAuditLog.count.mockResolvedValue(0)
    _db.aiModel.count.mockResolvedValue(0)

    _db.savedSearch.findMany.mockResolvedValue([])
    _db.savedSearch.count.mockResolvedValue(3)
    _db.savedSearch.create.mockResolvedValue({ id: 'ss-1' })
    _db.savedSearch.deleteMany.mockResolvedValue({ count: 1 })
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, baseUser }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn().mockImplementation((req: Request) => req.headers.get('authorization')?.replace('Bearer ', '') || null),
  hashPassword: vi.fn().mockResolvedValue('new-hash'),
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
function authedRequest(url: string, token = 'tok', options: RequestInit = {}) {
  return makeRequest(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } })
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═════════════════════════════════════════════════════════════
//  FEEDBACK
// ═════════════════════════════════════════════════════════════

describe('POST /api/feedback', () => {
  it('should submit valid feedback', async () => {
    const res = await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', {
        rating: 5, category: 'feature', message: 'Great product!',
        page: '/workspace', userAgent: 'test',
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.id).toBeDefined()
  })

  it('should return 400 for invalid rating', async () => {
    expect((await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', { rating: 0, category: 'feature', message: 'X' }),
    )).status).toBe(400)
    expect((await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', { rating: 6, category: 'feature', message: 'X' }),
    )).status).toBe(400)
  })

  it('should return 400 for invalid category', async () => {
    expect((await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', { rating: 4, category: 'invalid', message: 'X' }),
    )).status).toBe(400)
  })

  it('should return 400 for empty message', async () => {
    expect((await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', { rating: 4, category: 'bug', message: '   ' }),
    )).status).toBe(400)
  })

  it('should return 400 for message over 10k chars', async () => {
    expect((await (await import('../feedback/route')).POST(
      makeJsonRequest('/api/feedback', { rating: 4, category: 'bug', message: 'X'.repeat(10001) }),
    )).status).toBe(400)
  })
})

describe('GET /api/feedback', () => {
  it('should return feedback entries', async () => {
    const res = await (await import('../feedback/route')).GET(makeRequest('/api/feedback'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.count).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  ERRORS
// ═════════════════════════════════════════════════════════════

describe('GET /api/errors', () => {
  it('should return ok status', async () => {
    const res = await (await import('../errors/route')).GET(makeRequest('/api/errors'))
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('ok')
  })
})

describe('POST /api/errors', () => {
  it('should accept error reports array', async () => {
    const res = await (await import('../errors/route')).POST(
      makeJsonRequest('/api/errors', { errors: [{ msg: 'fail', stack: 'at line 1' }] }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(1)
  })

  it('should return 400 for non-array errors', async () => {
    expect((await (await import('../errors/route')).POST(
      makeJsonRequest('/api/errors', { errors: 'not-array' }),
    )).status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════
//  ANALYTICS
// ═════════════════════════════════════════════════════════════

describe('GET /api/analytics', () => {
  it('should return analytics list', async () => {
    _db.analysisRun.findMany.mockResolvedValue([])
    const res = await (await import('../analytics/route')).GET(makeRequest('/api/analytics'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.analytics).toBeDefined()
  })
})

describe('POST /api/analytics', () => {
  it('should return 400 for missing name', async () => {
    expect((await (await import('../analytics/route')).POST(
      makeJsonRequest('/api/analytics', { type: 'descriptive', variables: [] }),
    )).status).toBe(400)
  })

  it('should return 400 for missing type', async () => {
    expect((await (await import('../analytics/route')).POST(
      makeJsonRequest('/api/analytics', { name: 'Test', variables: [] }),
    )).status).toBe(400)
  })

  it('should create an analysis run with valid input', async () => {
    const res = await (await import('../analytics/route')).POST(
      makeJsonRequest('/api/analytics', {
        name: 'Descriptive Stats', type: 'descriptive', variables: [{ name: 'x', type: 'numeric' }],
      }),
    )
    expect(res.status).toBe(200)
    expect(_db.analysisRun.create).toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════
//  VALIDATE
// ═════════════════════════════════════════════════════════════

describe('POST /api/validate', () => {
  it('should return 400 for no columns', async () => {
    expect((await (await import('../validate/route')).POST(
      makeJsonRequest('/api/validate', { data: {}, variables: [] }),
    )).status).toBe(400)
  })

  it('should return validation report for valid input', async () => {
    const res = await (await import('../validate/route')).POST(
      makeJsonRequest('/api/validate', {
        data: { x: [1, 2, 3], y: [4, 5, 6] },
        variables: [{ name: 'x', type: 'numeric' }, { name: 'y', type: 'numeric' }],
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBeDefined()
  })
})

// ═════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

describe('GET /api/notifications', () => {
  it('should return 401 when no auth', async () => {
    const res = await (await import('../notifications/route')).GET(makeRequest('/api/notifications'))
    expect(res.status).toBe(401)
  })

  it('should return notifications for authed user', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.notification.findMany.mockResolvedValue([{ id: 'n-1' }])
    _db.notification.count.mockResolvedValue(1)
    const res = await (await import('../notifications/route')).GET(authedRequest('/api/notifications', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.notifications).toHaveLength(1)
    expect(data.unreadCount).toBe(1)
  })
})

describe('POST /api/notifications', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../notifications/route')).POST(
      makeJsonRequest('/api/notifications', { type: 'system', title: 'T', message: 'M' }),
    )).status).toBe(401)
  })

  it('should return 400 for missing fields', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../notifications/route')).POST(
      makeJsonRequest('/api/notifications', { title: 'T', message: 'M' }),
    )).status).toBe(400)
  })

  it('should return 400 for invalid type', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../notifications/route')).POST(
      makeJsonRequest('/api/notifications', { type: 'invalid', title: 'T', message: 'M' }),
    )).status).toBe(400)
  })

  it('should create a notification for self', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    const res = await (await import('../notifications/route')).POST(
      makeJsonRequest('/api/notifications', { type: 'system', title: 'Alert', message: 'Low credits' }),
    )
    expect(res.status).toBe(201)
    expect(_db.notification.create).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
//  USAGE
// ═════════════════════════════════════════════════════════════

describe('GET /api/usage', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../usage/route')).GET(makeRequest('/api/usage'))).status).toBe(401)
  })

  it('should return usage records', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.usageRecord.findMany.mockResolvedValue([])
    const res = await (await import('../usage/route')).GET(authedRequest('/api/usage', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.records).toBeDefined()
  })
})

describe('POST /api/usage', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../usage/route')).POST(
      makeJsonRequest('/api/usage', { category: 'ai_query', tokensUsed: 100 }),
    )).status).toBe(401)
  })

  it('should return 400 for invalid category', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../usage/route')).POST(
      makeJsonRequest('/api/usage', { category: 'invalid', tokensUsed: 100 }),
    )).status).toBe(400)
  })

  it('should create a usage record', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    const res = await (await import('../usage/route')).POST(
      makeJsonRequest('/api/usage', { category: 'ai_query', tokensUsed: 100 }),
    )
    expect(res.status).toBe(201)
    expect(_db.usageRecord.create).toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════
//  SEARCH / SAVED
// ═════════════════════════════════════════════════════════════

describe('GET /api/search/saved', () => {
  it('should return 400 without visitorId', async () => {
    expect((await (await import('../search/saved/route')).GET(makeRequest('/api/search/saved'))).status).toBe(400)
  })

  it('should return saved searches', async () => {
    _db.savedSearch.findMany.mockResolvedValue([{ id: 'ss-1', name: 'Test Search' }])
    const res = await (await import('../search/saved/route')).GET(
      makeRequest('/api/search/saved?visitorId=a@b.com'),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).saved).toHaveLength(1)
  })
})

describe('POST /api/search/saved', () => {
  it('should return 400 without visitorId', async () => {
    expect((await (await import('../search/saved/route')).POST(
      makeJsonRequest('/api/search/saved', { name: 'S', filters: {} }),
    )).status).toBe(400)
  })

  it('should return 400 without name', async () => {
    expect((await (await import('../search/saved/route')).POST(
      makeJsonRequest('/api/search/saved', { visitorId: 'a@b.com', filters: {} }),
    )).status).toBe(400)
  })

  it('should return 400 without filters', async () => {
    expect((await (await import('../search/saved/route')).POST(
      makeJsonRequest('/api/search/saved', { visitorId: 'a@b.com', name: 'S' }),
    )).status).toBe(400)
  })

  it('should return 400 when max 20 reached', async () => {
    _db.savedSearch.count.mockResolvedValue(20)
    expect((await (await import('../search/saved/route')).POST(
      makeJsonRequest('/api/search/saved', { visitorId: 'a@b.com', name: 'S', filters: {} }),
    )).status).toBe(400)
  })

  it('should create a saved search', async () => {
    _db.savedSearch.count.mockResolvedValue(0)
    const res = await (await import('../search/saved/route')).POST(
      makeJsonRequest('/api/search/saved', {
        visitorId: 'a@b.com', name: 'My Search', filters: { q: 'AI' },
      }),
    )
    expect(res.status).toBe(201)
    expect(_db.savedSearch.create).toHaveBeenCalled()
  })
})

describe('DELETE /api/search/saved', () => {
  it('should return 400 without id and visitorId', async () => {
    expect((await (await import('../search/saved/route')).DELETE(
      makeRequest('/api/search/saved', { method: 'DELETE' }),
    )).status).toBe(400)
  })

  it('should delete saved searches', async () => {
    _db.savedSearch.deleteMany.mockResolvedValue({ count: 1 })
    const res = await (await import('../search/saved/route')).DELETE(
      makeRequest('/api/search/saved?id=ss-1&visitorId=a@b.com', { method: 'DELETE' }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════
//  PROTOCOL
// ═════════════════════════════════════════════════════════════

describe('GET /api/protocol', () => {
  it('should return protocol info and submissions', async () => {
    _db.protocolVersion.findFirst.mockResolvedValue(null)
    _db.benchmarkSubmission.count.mockResolvedValue(3)
    _db.benchmarkSubmission.findMany.mockResolvedValue([])
    _db.benchmarkSubmission.groupBy.mockResolvedValue([])
    const res = await (await import('../protocol/route')).GET(makeRequest('/api/protocol'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.protocol).toBeDefined()
    expect(data.submissions).toBeDefined()
    expect(data.stats).toBeDefined()
  })

  it('should return protocol info only with type=info', async () => {
    _db.protocolVersion.findFirst.mockResolvedValue({
      id: 'p-1', version: '1.0', name: 'Open Benchmark',
      description: 'D', benchmarks: '[]', criteria: '{}', isActive: true, publishedAt: now,
    })
    const res = await (await import('../protocol/route')).GET(makeRequest('/api/protocol?type=info'))
    expect(res.status).toBe(200)
    expect((await res.json()).protocol).toBeDefined()
  })

  it('should filter by status', async () => {
    await (await import('../protocol/route')).GET(makeRequest('/api/protocol?status=accepted'))
    expect(getMockDb().benchmarkSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'accepted' }) })
    )
  })
})

describe('POST /api/protocol/submit', () => {
  it('should create a benchmark submission', async () => {
    _db.protocolVersion.findFirst.mockResolvedValue({
      id: 'p-1', version: '1.0', name: 'Open Benchmark',
      benchmarks: '[{"id":"gpqa_diamond","name":"GPQA Diamond"}]',
      criteria: '{}',
    })
    const res = await (await import('../protocol/submit/route')).POST(
      makeJsonRequest('/api/protocol/submit', {
        modelName: 'GPT-4o', provider: 'OpenAI', benchmark: 'GPQA Diamond', score: 68.2,
        methodology: 'Chain-of-thought', submitterId: 'r@r.com', submitterName: 'Researcher',
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.submission.status).toBe('pending')
    expect(_db.benchmarkSubmission.create).toHaveBeenCalled()
  })

  it('should return 400 for missing fields', async () => {
    expect((await (await import('../protocol/submit/route')).POST(
      makeJsonRequest('/api/protocol/submit', { modelName: 'GPT-4o' }),
    )).status).toBe(400)
  })

  it('should return 400 for invalid score', async () => {
    _db.protocolVersion.findFirst.mockResolvedValue(null)
    expect((await (await import('../protocol/submit/route')).POST(
      makeJsonRequest('/api/protocol/submit', {
        modelName: 'GPT-4o', provider: 'OpenAI', benchmark: 'GPQA', score: 150,
      }),
    )).status).toBe(400)
  })

  it('should return 400 for unknown benchmark', async () => {
    _db.protocolVersion.findFirst.mockResolvedValue({
      id: 'p-1', version: '1.0', name: 'Open Benchmark',
      benchmarks: '[{"id":"gpqa_diamond","name":"GPQA Diamond"}]',
    })
    expect((await (await import('../protocol/submit/route')).POST(
      makeJsonRequest('/api/protocol/submit', {
        modelName: 'GPT-4o', provider: 'OpenAI', benchmark: 'UnknownBench', score: 90,
      }),
    )).status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════
//  UPDATES
// ═════════════════════════════════════════════════════════════

describe('GET /api/updates', () => {
  it('should return updates list', async () => {
    const res = await (await import('../updates/route')).GET(makeRequest('/api/updates'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updates).toBeDefined()
    expect(data.total).toBeGreaterThan(0)
  })

  it('should filter by category', async () => {
    const res = await (await import('../updates/route')).GET(makeRequest('/api/updates?category=ai'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updates.every((u: { category: string }) => u.category === 'ai'))
  })

  it('should filter by search', async () => {
    const res = await (await import('../updates/route')).GET(makeRequest('/api/updates?search=security'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updates.length).toBeGreaterThan(0)
  })

  it('should return empty for no matches', async () => {
    const res = await (await import('../updates/route')).GET(makeRequest('/api/updates?search=zzzzzzz'))
    expect(res.status).toBe(200)
    expect((await res.json()).total).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════
//  KEYS
// ═════════════════════════════════════════════════════════════

describe('GET /api/keys', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../keys/route')).GET(makeRequest('/api/keys'))).status).toBe(401)
  })

  it('should return API keys', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.apiKey.findMany.mockResolvedValue([
      { id: 'key-1', name: 'My Key', prefix: 'onw_abc1', keyHash: 'hash', scopes: '["read"]', rateLimit: 100, lastUsed: null, requestCount: 5, expiresAt: future, isActive: true, createdAt: now },
    ])
    const res = await (await import('../keys/route')).GET(authedRequest('/api/keys', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.keys).toHaveLength(1)
    // Key should be masked (no raw keyHash)
    expect(data.keys[0].keyHash).toBeUndefined()
  })
})

describe('POST /api/keys', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../keys/route')).POST(
      makeJsonRequest('/api/keys', { name: 'K' }),
    )).status).toBe(401)
  })

  it('should return 400 for missing name', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../keys/route')).POST(
      makeJsonRequest('/api/keys', {}),
    )).status).toBe(400)
  })

  it('should create an API key', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.apiKey.count.mockResolvedValue(0)
    const res = await (await import('../keys/route')).POST(
      makeJsonRequest('/api/keys', { name: 'My Key', scopes: ['read', 'write'] }),
    )
    expect(res.status).toBe(201)
    expect(_db.apiKey.create).toHaveBeenCalled()
    expect(_db.userActivity.create).toHaveBeenCalled()
  })

  it('should limit to 10 keys', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.apiKey.count.mockResolvedValue(10)
    expect((await (await import('../keys/route')).POST(
      makeJsonRequest('/api/keys', { name: 'K11' }),
    )).status).toBe(400)
  })
})

describe('DELETE /api/keys', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../keys/route')).DELETE(
      makeJsonRequest('/api/keys', { keyId: 'k1' }, { method: 'DELETE' }),
    )).status).toBe(401)
  })

  it('should return 400 for missing keyId', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../keys/route')).DELETE(
      makeJsonRequest('/api/keys', {}, { method: 'DELETE' }),
    )).status).toBe(400)
  })

  it('should return 404 for non-existent key', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.apiKey.findUnique.mockResolvedValue(null)
    expect((await (await import('../keys/route')).DELETE(
      makeJsonRequest('/api/keys', { keyId: 'nope' }, { method: 'DELETE' }),
    )).status).toBe(404)
  })

  it('should return 403 for non-owner key', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.apiKey.findUnique.mockResolvedValue({
      id: 'key-other', userId: 'other-user', prefix: 'onw_',
    })
    expect((await (await import('../keys/route')).DELETE(
      makeJsonRequest('/api/keys', { keyId: 'key-other' }, { method: 'DELETE' }),
    )).status).toBe(403)
  })
})

// ═════════════════════════════════════════════════════════════
//  VISITORS (admin)
// ═══════════════════════════════════════════════════════════

describe('GET /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    expect((await (await import('../visitors/route')).GET(makeRequest('/api/visitors'))).status).toBe(401)
  })

  it('should return 401 with wrong secret', async () => {
    expect((await (await import('../visitors/route')).GET(
      makeRequest('/api/visitors', { headers: { Authorization: 'Bearer wrong-secret' } }),
    )).status).toBe(401)
  })

  it('should return visitors for admin', async () => {
    _db.visitor.findMany.mockResolvedValue([{ id: 'v-1', email: 'a@b.com', name: 'Alice' }])
    _db.visitor.count.mockResolvedValue(1)
    _db.visitor.$queryRaw.mockResolvedValue([{ status: 'pending', visitorType: 'general', count: 1n }])
    const res = await (await import('../visitors/route')).GET(
      makeRequest('/api/visitors', { headers: { Authorization: 'Bearer admin-secret-token' } }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visitors).toHaveLength(1)
    expect(data.pagination).toBeDefined()
    expect(data.stats).toBeDefined()
  })

  it('should filter by status', async () => {
    await (await import('../visitors/route')).GET(
      makeRequest('/api/visitors?status=accepted', { headers: { Authorization: 'Bearer admin-secret-token' } }),
    )
    expect(getMockDb().visitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'accepted' }) })
    )
  })

  it('should search by name, email, or country', async () => {
    await (await import('../visitors/route')).GET(
      makeRequest('/api/visitors?search=alice', { headers: { Authorization: 'Bearer admin-secret-token' } }),
    )
    expect(getMockDb().visitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) } }) })
    )
  })

  it('should paginate results', async () => {
    await (await import('../visitors/route')).GET(
      makeRequest('/api/visitors?page=2&limit=10', { headers: { Authorization: 'Bearer admin-secret-token' } }),
    )
    expect(getMockDb().visitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    )
  })
})

describe('PATCH /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    expect((await (await import('../visitors/route')).PATCH(
      makeJsonRequest('/api/visitors', { id: 'v-1', status: 'accepted' }, { method: 'PATCH' }),
    )).status).toBe(401)
  })

  it('should update visitor status', async () => {
    _db.visitor.findUnique.mockResolvedValue({ id: 'v-1', email: 'a@b.com', status: 'pending' })
    _db.visitor.update.mockResolvedValue({})
    const res = await (await import('../visitors/route')).PATCH(
      makeJsonRequest('/api/visitors', { id: 'v-1', status: 'accepted' }, { method: 'PATCH' }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(_db.visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v-1' }, data: { status: 'accepted' } })
    )
  })

  it('should bulk update visitors', async () => {
    const res = await (await import('../visitors/route')).PATCH(
      makeJsonRequest('/api/visitors', { bulkIds: ['v-1', 'v-2'], bulkStatus: 'accepted' }, { method: 'PATCH' }),
    )
    expect(res.status).toBe(200)
    expect(_db.visitor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['v-1', 'v-2'] } } })
    )
  })

  it('should return 400 for invalid status', async () => {
    expect((await (await import('../visitors/route')).PATCH(
      makeJsonRequest('/api/visitors', { id: 'v-1', status: 'invalid' }, { method: 'PATCH' }),
    )).status).toBe(400)
  })

  it('should return 400 when no fields to update', async () => {
    expect((await (await import('../visitors/route')).PATCH(
      makeJsonRequest('/api/visitors', { id: 'v-1' }, { method: 'PATCH' }),
    )).status).toBe(400)
  })
})

describe('DELETE /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    expect((await (await import('../visitors/route')).DELETE(
      makeRequest('/api/visitors?id=v-1', { method: 'DELETE' }),
    )).status).toBe(401)
  })

  it('should return 400 without id', async () => {
    expect((await (await import('../visitors/route')).DELETE(
      makeRequest('/api/visitors', { method: 'DELETE' }),
    )).status).toBe(400)
  })

  it('should delete a visitor', async () => {
    _db.visitor.delete.mockResolvedValue({})
    const res = await (await import('../visitors/route')).DELETE(
      makeRequest('/api/visitors?id=v-1', { method: 'DELETE' }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════
//  ARENA VOTE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/arena/[id]/vote', () => {
  it('should vote on a battle', async () => {
    _db.arenaBattle.findUnique.mockResolvedValue({ id: 'battle-1', isActive: true })
    _db.arenaVote.findUnique.mockResolvedValue(null)
    _db.arenaVote.create.mockResolvedValue({ id: 'vote-1' })
    const res = await (await import('../arena/[id]/vote/route')).POST(
      makeJsonRequest('/api/arena/battle-1/vote', { voterId: 'a@b.com', choice: 'model_a' }),
      { params: Promise.resolve({ id: 'battle-1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).voted).toBe(true)
  })

  it('should return 400 for missing fields', async () => {
    expect((await (await import('../arena/[id]/vote/route')).POST(
      makeJsonRequest('/api/arena/battle-1/vote', {}),
      { params: Promise.resolve({ id: 'battle-1' }) },
    )).status).toBe(400)
  })

  it('should return 404 for non-existent battle', async () => {
    _db.arenaBattle.findUnique.mockResolvedValue(null)
    expect((await (await import('../arena/[id]/vote/route')).POST(
      makeJsonRequest('/api/arena/nope/vote', { voterId: 'a@b.com', choice: 'model_a' }),
      { params: Promise.resolve({ id: 'nope' }) },
    )).status).toBe(404)
  })

  it('should return 400 for invalid choice', async () => {
    _db.arenaBattle.findUnique.mockResolvedValue({ id: 'battle-1', isActive: true })
    expect((await import('../arena/[id]/vote/route')).POST(
      makeJsonRequest('/api/arena/battle-1/vote', { voterId: 'a@b.com', choice: 'invalid' }),
      { params: Promise.resolve({ id: 'battle-1' }) },
    )).status).toBe(400)
  })

  it('should return 400 for inactive battle', async () => {
    _db.arenaBattle.findUnique.mockResolvedValue({ id: 'battle-1', isActive: false })
    expect((await import('../arena/[id]/vote/route')).POST(
      makeJsonRequest('/api/arena/battle-1/vote', { voterId: 'a@b.com', choice: 'model_a' }),
      { params: Promise.resolve({ id: 'battle-1' }) },
    )).status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════
//  V1 PROXY
// ═════════════════════════════════════════════════════════════

describe('GET /api/v1/[...path]', () => {
  it('should proxy GET requests', async () => {
    const handler = (await import('../v1/[[...path]]/route')).GET
    // Mock fetch to avoid real HTTP calls
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), body: '{}' })
    vi.stubGlobal('fetch', mockFetch)
    const req = makeRequest('/api/v1/copilot')
    const res = await handler(req, { params: Promise.resolve({ path: ['copilot'] }) })
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/copilot'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('should proxy POST requests', async () => {
    const handler = (await import('../v1/[[...path]]/route')).POST
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 201, headers: new Headers(), body: '{}' })
    vi.stubGlobal('fetch', mockFetch)
    const req = makeJsonRequest('/api/v1/copilot', { data: {} })
    const res = await handler(req, { params: Promise.resolve({ path: ['copilot'] }) })
    expect(res.status).toBe(201)
  })

  it('should return 400 for empty path', async () => {
    const handler = (await import('../v1/[[...path]]/route')).GET
    const res = await handler(makeRequest('/api/v1/'), { params: Promise.resolve({ path: [] }) })
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════
//  BILLING
// ═════════════════════════════════════════════════════════════

describe('GET /api/billing', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../billing/route')).GET(makeRequest('/api/billing'))).status).toBe(401)
  })

  it('should return plan info and auto-create free subscription', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    _db.subscription.findUnique.mockResolvedValue(null)
    _db.subscription.create.mockResolvedValue({ id: 'sub-1', plan: 'free', status: 'active' })
    _db.usageRecord.count.mockResolvedValue(0)
    const res = await (await import('../billing/route')).GET(authedRequest('/api/billing', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plan).toBeDefined()
    expect(data.limits).toBeDefined()
  })
})

describe('POST /api/billing', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../billing/route')).POST(
      makeJsonRequest('/api/billing', { plan: 'pro' }),
    )).status).toBe(401)
  })

  it('should return 400 for invalid plan', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../billing/route')).POST(
      makeJsonRequest('/api/billing', { plan: 'platinum' }),
    )).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  CHECKOUT
// ═════════════════════════════════════════════════════════════

describe('POST /api/checkout', () => {
  it('should return 401 when no auth', async () => {
    expect((await (await import('../checkout/route')).POST(
      makeJsonRequest('/api/checkout', { plan: 'pro' }),
    )).status).toBe(401)
  })

  it('should return 400 for invalid plan', async () => {
    _db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok',
      expiresAt: future, createdAt: new Date(), user: { ...baseUser(), role: 'user' },
    })
    expect((await (await import('../checkout/route')).POST(
      makeJsonRequest('/api/checkout', { plan: 'invalid' }),
    )).status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════
//  CERTIFICATIONS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/certifications', () => {
  it('should return certifications list', async () => {
    _db.certification.count.mockResolvedValue(5)
    _db.certification.findMany.mockResolvedValue([])
    _db.certification.groupBy
      .mockResolvedValueOnce([{ category: 'gold', _count: 2 }])
      .mockResolvedValueOnce([{ category: 'silver', _count: 2 }])
      .mockResolvedValueOnce([{ category: 'bronze', _count: 1 }])
    const res = await (await import('../certifications/route')).GET(makeRequest('/api/certifications'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.certifications).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.byLevel.length).toBeGreaterThan(0)
  })

  it('should filter by level', async () => {
    await (await import('../certifications/route')).GET(makeRequest('/api/certifications?level=gold'))
    expect(getMockDb().certification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ level: 'gold' }) })
    )
  })

  it('should filter by provider', async () => {
    await (await import('../certifications/route')).GET(makeRequest('/api/certifications?provider=OpenAI'))
    expect(getMockDb().certification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ provider: 'OpenAI' }) })
    )
  })

  it('should filter by category', async () => {
    await (await import('../certifications/route')).GET(makeRequest('/api/certifications?category=reasoning'))
    expect(getMockDb().certification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'reasoning' }) })
    )
  })
})

// ═════════════════════════════════════════════════════════════════
//  DEVOPS: DEPLOYS & ERRORS
// ═══════════════════════════════════════════════════════════

describe('GET /api/devops/deploys', () => {
  it('should return deploy list and summary', async () => {
    _db.deployLog.findMany.mockResolvedValue([])
    _db.deployLog.groupBy.mockResolvedValue([{ status: 'success', _count: 5 }])
    const res = await (await import('../devops/deploys/route')).GET(makeRequest('/api/devops/deploys'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deploys).toBeDefined()
    expect(data.summary).toBeDefined()
  })
})

describe('POST /api/devops/deploys', () => {
  it('should create a deploy log', async () => {
    const res = await (await import('../devops/deploys/route')).POST(
      makeJsonRequest('/api/devops/deploys', {
        environment: 'staging', version: 'v2.4.0', deployer: 'CI',
        status: 'success', durationMs: 45000,
      }),
    )
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBeDefined()
    expect(_db.deployLog.create).toHaveBeenCalled()
  })
})

describe('GET /api/devops/errors', () => {
  it('should return error list with pagination', async () => {
    _db.appErrorLog.findMany.mockResolvedValue([])
    _db.appErrorLog.count.mockResolvedValue(0)
    const res = await (await import('../devops/errors/route')).GET(makeRequest('/api/devops/errors'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.errors).toBeDefined()
    expect(data.pagination).toBeDefined()
  })

  it('should return error stats', async () => {
    const res = await (await import('../devops/errors/route')).GET(
      makeRequest('/api/devops/errors?stats=true'),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.summary).toBeDefined()
    expect(data.summary.totalErrors).toBeDefined()
  })

  it('should filter by level and domain', async () => {
    await (await import('../devops/errors/route')).GET(
      makeRequest('/api/devops/errors?level=fatal&domain=ai'),
    )
    expect(getMockDb().appErrorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ level: 'fatal', domain: 'ai' }) })
    )
  })

  it('should create an error log', async () => {
    const res = await (await import('../devops/errors/route')).POST(
      makeJsonRequest('/api/devops/errors', {
        level: 'warn', domain: 'api', route: '/api/test',
        message: 'Something failed', statusCode: 500,
      }),
    )
    expect(res.status).toBe(201)
    expect(_db.appErrorLog.create).toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════
//  METRICS (Prometheus-style)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/metrics', () => {
  it('should return Prometheus-style metrics output', async () => {
    _db.aiAuditLog.count.mockResolvedValue(5)
    _db.appErrorLog.count.mockResolvedValue(3)
    _db.deployLog.count.mockResolvedValue(2)
    _db.automationLog.count.mockResolvedValue(1)
    _db.workflowPipeline.count.mockResolvedValue(0)
    const res = await (await import('../metrics/route')).GET(makeRequest('/api/metrics'))
    expect(res.status).toBe(200)
    // Prometheus format is text/plain
    expect(res.headers.get('content-type')).toContain('text/plain')
    const text = await res.text()
    expect(text).toContain('oneway_up')
    expect(text).toContain('oneway_memory_bytes')
    expect(text).toContain('oneway_ai_queries_total{period="24h"}')
  })
})

// ═══════════════════════════════════════════════════════════════
//  MODULES
// ═══════════════════════════════════════════════════════════════════

describe('GET /api/modules', () => {
  it('should return module list', async () => {
    const res = await (await import('../modules/route')).GET(makeRequest('/api/modules'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.modules).toBeDefined()
    expect(data.modules.length).toBeGreaterThan(0)
  })
})

describe('POST /api/modules', () => {
  it('should return 400 for invalid action', async () => {
    expect((await (await import('../modules/route')).POST(
      makeJsonRequest('/api/modules', { action: 'invalid' }),
    )).status).toBe(400)
  })

  it('should check for updates', async () => {
    const res = await (await import('../modules/route')).POST(
      makeJsonRequest('/api/modules', { action: 'check-updates' }),
    )
    expect(res.status).toBe(200)
  })

  it('should return 409 for duplicate module', async () => {
    const res = await (await import('../modules/route')).POST(
      makeJsonRequest('/api/modules', {
        action: 'register', module: { id: 'existing', name: 'Dup' },
      }),
    )
    expect(res.status).toBe(409)
  })

  it('should register a new module', async () => {
    const res = await (await import('../modules/route')).POST(
      makeJsonRequest('/api/modules', {
        action: 'register', module: { id: 'new-mod', name: 'New Module', description: 'A new module', version: '1.0' },
      }),
    )
    expect(res.status).toBe(200)
  })

  it('should return 404 for module not found on update', async () => {
    const res = await (await import('../modules/route')).POST(
      makeJsonRequest('/api/modules', {
        action: 'update', moduleId: 'nonexistent', name: 'X',
      }),
    )
    expect(res.status).toBe(404)
  })
})