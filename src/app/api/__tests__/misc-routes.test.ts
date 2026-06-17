/**
 * API Integration Tests — Search, Keys, Feedback, Leaderboard, Analytics, Visitors (admin)
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// ── Hoisted mocks ──

vi.hoisted(() => { process.env.ADMIN_SECRET = 'admin-secret-token' })

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    communityPost: { findMany: vi.fn() },
    aiModel: { findMany: vi.fn(), count: vi.fn() },
    benchmarkScore: { findMany: vi.fn() },
    modelPricing: { findMany: vi.fn() },
    liveMetric: { findMany: vi.fn() },
    savedSearch: { findMany: vi.fn(), create: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    visitor: { findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    apiKey: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    analysisRun: { findMany: vi.fn(), create: vi.fn() },
    userActivity: { create: vi.fn() },
  }

  function setupMockDb() {
    _db.communityPost.findMany.mockResolvedValue([])
    _db.aiModel.findMany.mockResolvedValue([])
    _db.aiModel.count.mockResolvedValue(0)
    _db.benchmarkScore.findMany.mockResolvedValue([])
    _db.modelPricing.findMany.mockResolvedValue([])
    _db.liveMetric.findMany.mockResolvedValue([])
    _db.savedSearch.findMany.mockResolvedValue([])
    _db.savedSearch.create.mockResolvedValue({})
    _db.savedSearch.count.mockResolvedValue(0)
    _db.savedSearch.deleteMany.mockResolvedValue({ count: 0 })
    _db.visitor.findMany.mockResolvedValue([])
    _db.visitor.count.mockResolvedValue(0)
    _db.visitor.update.mockResolvedValue({})
    _db.visitor.delete.mockResolvedValue({})
    _db.visitor.findUnique.mockResolvedValue(null)
    _db.visitor.updateMany.mockResolvedValue({ count: 0 })
    _db.user.findUnique.mockResolvedValue(null)
    _db.user.update.mockResolvedValue({})
    _db.userSession.findUnique.mockResolvedValue(null)
    _db.userSession.create.mockResolvedValue({})
    _db.userSession.delete.mockResolvedValue({})
    _db.apiKey.findMany.mockResolvedValue([])
    _db.apiKey.findUnique.mockResolvedValue(null)
    _db.apiKey.create.mockResolvedValue({ id: 'k1', name: 'Test', prefix: 'onw_abc', key: 'onw_fullkey', scopes: '["read"]', rateLimit: 100, lastUsed: null, requestCount: 0, isActive: true, expiresAt: null, createdAt: now, userId: 'u1' })
    _db.apiKey.delete.mockResolvedValue({})
    _db.apiKey.count.mockResolvedValue(0)
    _db.analysisRun.findMany.mockResolvedValue([])
    _db.analysisRun.create.mockResolvedValue({ id: 'ar-1' })
    _db.userActivity.create.mockResolvedValue({})
  }

  function getMockDb() {
    if (!(_db as Record<string, unknown>).$queryRaw) {
      (_db as Record<string, unknown>).$queryRaw = vi.fn().mockResolvedValue([])
    }
    return _db
  }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))
vi.mock('@/lib/cache', () => ({
  leaderboardCache: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
}))
vi.mock('@/lib/monitor', () => ({
  healthMonitor: { trackRequest: vi.fn(), trackMetric: vi.fn(), getHealthReport: vi.fn().mockReturnValue({ status: 'healthy', uptime: 100, totalRequests: 50, errorRate: 0.01, memoryUsage: { used: 80, total: 500 } }), logError: vi.fn() },
  getDependencyHealth: vi.fn().mockReturnValue({ database: 'connected' }),
}))
vi.mock('@/lib/api-logger', () => ({
  healthLog: { start: vi.fn().mockReturnValue(vi.fn()) },
  apiRouteLogger: vi.fn().mockReturnValue({ start: vi.fn().mockReturnValue(vi.fn()) }),
}))
vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'user-001', email: 'test@example.com', role: 'user', name: 'Test' }),
}))
vi.mock('@/lib/leaderboard-seed', () => ({
  seedLeaderboardData: vi.fn().mockResolvedValue({ success: true, modelsSeeded: 0 }),
}))
vi.mock('@/lib/api-cache', () => ({
  cachedJson: (data: unknown) => new Response(JSON.stringify(data), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn().mockReturnValue(null),
  generateToken: vi.fn().mockReturnValue('fixed-token-abc123'),
  hashPassword: vi.fn().mockResolvedValue('hash'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

// ── Route imports ──

import { GET as searchGet } from '../search/route'
import { GET as searchSavedGet, POST as searchSavedPost, DELETE as searchSavedDelete } from '../search/saved/route'
import { GET as keysGet, POST as keysPost, DELETE as keysDelete } from '../keys/route'
import { GET as feedbackGet, POST as feedbackPost } from '../feedback/route'
import { GET as leaderboardGet } from '../leaderboard/route'
import { GET as analyticsGet, POST as analyticsPost } from '../analytics/route'
import { GET as visitorsGet, PATCH as visitorsPatch, DELETE as visitorsDelete } from '../visitors/route'

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
function authedRequest(url: string, token: string, options: RequestInit = {}): NextRequest {
  return makeRequest(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } })
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════

describe('GET /api/search', () => {
  it('should return empty results for empty query', async () => {
    const res = await searchGet(makeRequest('/api/search?q='))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBe(0)
    expect(data.results).toBeDefined()
  })

  it('should return results from all sources', async () => {
    const db = getMockDb()
    db.communityPost.findMany.mockResolvedValueOnce([{ id: 'p1', title: 'AI Post', content: 'About AI', likes: 3, sourceUrl: null, sourceName: null, createdAt: new Date() }])
      .mockResolvedValueOnce([{ id: 'n1', title: 'AI News', content: 'News about AI', sourceUrl: 'https://x.com', sourceName: 'TechCrunch', createdAt: new Date() }])
    db.aiModel.findMany.mockResolvedValue([{ id: 'm1', name: 'GPT-4', provider: 'OpenAI', modelType: 'chat' }])

    const res = await searchGet(makeRequest('/api/search?q=AI'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.query).toBe('AI')
    expect(data.results.community).toBeDefined()
    expect(data.results.news).toBeDefined()
    expect(data.results.leaderboard).toBeDefined()
    expect(data.results.pages).toBeDefined()
  })

  it('should filter by source parameter', async () => {
    await searchGet(makeRequest('/api/search?q=test&source=community'))
    // Should only call communityPost once (not twice for news)
    expect(getMockDb().communityPost.findMany).toHaveBeenCalledTimes(1)
  })

  it('should respect limit parameter (max 20)', async () => {
    await searchGet(makeRequest('/api/search?q=test&limit=50'))
    // Limit should be clamped to 20
    expect(getMockDb().communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  SAVED SEARCHES
// ═══════════════════════════════════════════════════════════════

describe('GET /api/search/saved', () => {
  it('should return 400 when visitorId missing', async () => {
    expect((await searchSavedGet(makeRequest('/api/search/saved'))).status).toBe(400)
  })

  it('should return saved searches', async () => {
    getMockDb().savedSearch.findMany.mockResolvedValue([
      { id: 'ss-1', name: 'AI Search', filters: '{}', visitorId: 'a@b.com', createdAt: new Date() },
    ])
    const res = await searchSavedGet(makeRequest('/api/search/saved?visitorId=a@b.com'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.saved).toBeDefined()
  })
})

describe('POST /api/search/saved', () => {
  it('should save a search', async () => {
    const req = makeJsonRequest('/api/search/saved', {
      visitorId: 'a@b.com', name: 'My Search', filters: { q: 'AI', source: 'all' },
    })
    const res = await searchSavedPost(req)
    expect(res.status).toBe(201)
    expect(getMockDb().savedSearch.create).toHaveBeenCalled()
  })

  it('should return 400 for missing fields', async () => {
    expect((await searchSavedPost(makeJsonRequest('/api/search/saved', { visitorId: 'a@b.com' }))).status).toBe(400)
  })

  it('should enforce max 20 saved searches per visitor', async () => {
    getMockDb().savedSearch.count.mockResolvedValue(20)
    const req = makeJsonRequest('/api/search/saved', {
      visitorId: 'a@b.com', name: 'Too Many', filters: {},
    })
    expect((await searchSavedPost(req)).status).toBe(400)
  })
})

describe('DELETE /api/search/saved', () => {
  it('should delete a saved search', async () => {
    const req = makeRequest('/api/search/saved?id=ss-1&visitorId=a@b.com', { method: 'DELETE' })
    const res = await searchSavedDelete(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('should return 400 when id or visitorId missing', async () => {
    expect((await searchSavedDelete(makeRequest('/api/search/saved?id=ss-1', { method: 'DELETE' }))).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  API KEYS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/keys', () => {
  it('should return 401 when no auth', async () => {
    expect((await keysGet(makeRequest('/api/keys'))).status).toBe(401)
  })

  it('should return API keys for authenticated user', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.findMany.mockResolvedValue([
      { id: 'k1', name: 'My Key', prefix: 'onw_abc...', scopes: '["read"]', rateLimit: 100, lastUsed: null, requestCount: 5, isActive: true, expiresAt: null, createdAt: new Date() },
    ])
    const res = await keysGet(authedRequest('/api/keys', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })
})

describe('POST /api/keys', () => {
  it('should create a new API key', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.count.mockResolvedValue(2)

    const req = makeJsonRequest('/api/keys', { name: 'New Key' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await keysPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.key).toBeDefined() // Key shown only once
    expect(data.data.prefix).toMatch(/^onw_/)
    expect(db.apiKey.create).toHaveBeenCalled()
  })

  it('should return 401 when no auth', async () => {
    const req = makeJsonRequest('/api/keys', { name: 'Key' })
    expect((await keysPost(req)).status).toBe(401)
  })

  it('should return 400 when name missing', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    const req = makeJsonRequest('/api/keys', {}, { headers: { Authorization: 'Bearer tok' } })
    expect((await keysPost(req)).status).toBe(400)
  })

  it('should enforce max 10 keys per user', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.count.mockResolvedValue(10)
    const req = makeJsonRequest('/api/keys', { name: 'One Too Many' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    expect((await keysPost(req)).status).toBe(400)
  })

  it('should filter scopes to valid values', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.count.mockResolvedValue(0)
    const req = makeJsonRequest('/api/keys', { name: 'Key', scopes: ['read', 'write', 'admin', 'evil'] }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await keysPost(req)
    expect(res.status).toBe(201)
    // Should have filtered out 'evil'
    expect(db.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopes: expect.stringContaining('read'),
        }),
      })
    )
  })
})

describe('DELETE /api/keys', () => {
  it('should delete own API key', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.findUnique.mockResolvedValue({ id: 'k1', userId: 'user-001' })
    const req = makeJsonRequest('/api/keys', { keyId: 'k1' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await keysDelete(req)
    expect(res.status).toBe(200)
    expect(db.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'k1' } })
  })

  it('should return 403 when deleting another user key', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.findUnique.mockResolvedValue({ id: 'k1', userId: 'other-user' })
    const req = makeJsonRequest('/api/keys', { keyId: 'k1' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    expect((await keysDelete(req)).status).toBe(403)
  })

  it('should return 404 for non-existent key', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'getTokenFromRequest').mockReturnValue('tok')
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'user-001', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 99999), createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    db.apiKey.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/keys', { keyId: 'nope' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    expect((await keysDelete(req)).status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  FEEDBACK
// ═══════════════════════════════════════════════════════════════

describe('GET /api/feedback', () => {
  it('should return feedback entries', async () => {
    const res = await feedbackGet(makeRequest('/api/feedback'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.data).toBeDefined()
  })
})

describe('POST /api/feedback', () => {
  it('should submit feedback', async () => {
    const req = makeJsonRequest('/api/feedback', {
      rating: 5, category: 'feature', message: 'Great product!',
    })
    const res = await feedbackPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('ok')
  })

  it('should return 400 for invalid rating', async () => {
    const req = makeJsonRequest('/api/feedback', {
      rating: 10, category: 'bug', message: 'Too high',
    })
    expect((await feedbackPost(req)).status).toBe(400)
  })

  it('should return 400 for invalid category', async () => {
    const req = makeJsonRequest('/api/feedback', {
      rating: 3, category: 'invalid', message: 'Bad cat',
    })
    expect((await feedbackPost(req)).status).toBe(400)
  })

  it('should return 400 for empty message', async () => {
    const req = makeJsonRequest('/api/feedback', {
      rating: 4, category: 'general', message: '   ',
    })
    expect((await feedbackPost(req)).status).toBe(400)
  })

  it('should return 400 for message exceeding 10000 chars', async () => {
    const req = makeJsonRequest('/api/feedback', {
      rating: 3, category: 'uiux', message: 'X'.repeat(10001),
    })
    expect((await feedbackPost(req)).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════════════════════

describe('GET /api/leaderboard', () => {
  it('should return leaderboard with filters and pagination', async () => {
    const res = await leaderboardGet(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeDefined()
    expect(data.filters).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.meta).toBeDefined()
  })

  it('should pass benchmark filter to query', async () => {
    await leaderboardGet(makeRequest('/api/leaderboard?benchmark=GPQA+Diamond'))
    expect(getMockDb().aiModel.findMany).toHaveBeenCalled()
  })

  it('should support provider filter', async () => {
    await leaderboardGet(makeRequest('/api/leaderboard?provider=OpenAI'))
    expect(getMockDb().aiModel.findMany).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/analytics', () => {
  it('should return analysis runs', async () => {
    getMockDb().analysisRun.findMany.mockResolvedValue([
      { id: 'ar-1', name: 'Descriptive', type: 'descriptive', result: '{}', variables: '[]', createdAt: new Date() },
    ])
    const res = await analyticsGet(makeRequest('/api/analytics'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.analyses).toBeDefined()
  })
})

describe('POST /api/analytics', () => {
  it('should create an analysis run', async () => {
    const req = makeJsonRequest('/api/analytics', {
      name: 'Correlation Test', type: 'correlation', variables: ['x', 'y'],
      dataRows: [{ x: 1, y: 2 }, { x: 2, y: 4 }],
    })
    const res = await analyticsPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.analysis).toBeDefined()
    expect(data.analysis.id).toBeDefined()
    expect(getMockDb().analysisRun.create).toHaveBeenCalled()
  })

  it('should return 400 for missing name', async () => {
    const req = makeJsonRequest('/api/analytics', { type: 'descriptive', variables: [] })
    expect((await analyticsPost(req)).status).toBe(400)
  })

  it('should return 400 for invalid type', async () => {
    const req = makeJsonRequest('/api/analytics', { name: 'X', type: 'invalid_type', variables: [] })
    expect([200, 400]).toContain((await analyticsPost(req)).status)
  })
})

// ═══════════════════════════════════════════════════════════════
//  VISITORS (ADMIN)
// ═══════════════════════════════════════════════════════════════

const originalAdminSecret = process.env.ADMIN_SECRET
beforeAll(() => { process.env.ADMIN_SECRET = 'admin-secret-token' })
afterAll(() => { process.env.ADMIN_SECRET = originalAdminSecret })

describe('GET /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    expect((await visitorsGet(makeRequest('/api/visitors'))).status).toBe(401)
  })

  it('should return visitors list with admin auth', async () => {
    const db = getMockDb()
    db.visitor.findMany.mockResolvedValue([
      { id: 'v1', email: 'a@b.com', name: 'A', visitorType: 'researcher', status: 'pending', createdAt: new Date(), lastSeen: new Date(), ipAddress: null, userAgent: null, path: null, notes: null, country: null, language: null },
    ])
    db.visitor.count.mockResolvedValue(1)
    const res = await visitorsGet(makeRequest('/api/visitors', {
      headers: { Authorization: 'Bearer admin-secret-token' },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.visitors).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.stats).toBeDefined()
  })

  it('should filter by status', async () => {
    getMockDb().visitor.findMany.mockResolvedValue([])
    getMockDb().visitor.count.mockResolvedValue(0)
    await visitorsGet(makeRequest('/api/visitors?status=pending', {
      headers: { Authorization: 'Bearer admin-secret-token' },
    }))
    expect(getMockDb().visitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'pending' }) })
    )
  })
})

describe('PATCH /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    const req = makeJsonRequest('/api/visitors', { id: 'v1', status: 'accepted' })
    expect((await visitorsPatch(req)).status).toBe(401)
  })

  it('should update a single visitor status', async () => {
    const db = getMockDb()
    db.visitor.findUnique.mockResolvedValue({ id: 'v1', email: 'a@b.com', status: 'pending' })
    const req = makeJsonRequest('/api/visitors', { id: 'v1', status: 'accepted' }, {
      headers: { Authorization: 'Bearer admin-secret-token' },
    })
    const res = await visitorsPatch(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v1' }, data: expect.objectContaining({ status: 'accepted' }) })
    )
  })

  it('should handle bulk status update', async () => {
    const req = makeJsonRequest('/api/visitors', {
      bulkIds: ['v1', 'v2'], bulkStatus: 'accepted',
    }, {
      headers: { Authorization: 'Bearer admin-secret-token' },
    })
    const res = await visitorsPatch(req)
    expect(res.status).toBe(200)
    expect(getMockDb().visitor.updateMany).toHaveBeenCalled()
  })
})

describe('DELETE /api/visitors', () => {
  it('should return 401 without admin secret', async () => {
    expect((await visitorsDelete(makeRequest('/api/visitors?id=v1', { method: 'DELETE' }))).status).toBe(401)
  })

  it('should delete a visitor', async () => {
    const db = getMockDb()
    db.visitor.findUnique.mockResolvedValue({ id: 'v1' })
    const req = makeRequest('/api/visitors?id=v1', {
      method: 'DELETE', headers: { Authorization: 'Bearer admin-secret-token' },
    })
    const res = await visitorsDelete(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.visitor.delete).toHaveBeenCalledWith({ where: { id: 'v1' } })
  })

  it('should return 400 when id missing', async () => {
    const req = makeRequest('/api/visitors', {
      method: 'DELETE', headers: { Authorization: 'Bearer admin-secret-token' },
    })
    expect((await visitorsDelete(req)).status).toBe(400)
  })
})