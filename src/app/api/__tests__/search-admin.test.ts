/**
 * API Integration Tests — Search, Admin Action, Visitor Action,
 *   Admin Community, Health Deep, News Cron, Notifications Stream,
 *   Stripe Webhook, Stripe Portal
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

vi.hoisted(() => { process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret' })

const {
  mockVerifyActionToken,
  mockSendUserApprovalEmail,
  mockSendUserRejectionEmail,
  mockSendAdminSubscriptionNotificationEmail,
  mockFetchNewsFromWeb,
} = vi.hoisted(() => ({
  mockVerifyActionToken: vi.fn(),
  mockSendUserApprovalEmail: vi.fn(),
  mockSendUserRejectionEmail: vi.fn(),
  mockSendAdminSubscriptionNotificationEmail: vi.fn(),
  mockFetchNewsFromWeb: vi.fn().mockResolvedValue([]),
}))

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const baseUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-001', email: 'test@example.com', name: 'Test User',
    password: 'hash', role: 'user',
    createdAt: now, updatedAt: now, lastSeen: now, preferences: '{}',
    bio: null, company: null, location: null, website: null,
    skills: null, isOnboarded: true, image: null,
    avatarUrl: null, github: null, linkedin: null,
    resetToken: null, resetTokenExpiry: null,
    ...overrides,
  })

  const _db = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    userSession: { findUnique: vi.fn(), delete: vi.fn() },
    userActivity: { create: vi.fn() },
    visitor: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    communityPost: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    aiModel: { findMany: vi.fn(), count: vi.fn() },
    cronJob: { findMany: vi.fn(), upsert: vi.fn() },
    notification: { findMany: vi.fn() },
    postComment: { deleteMany: vi.fn() },
    postInteraction: { deleteMany: vi.fn() },
    subscription: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    automationRule: { create: vi.fn() },
    sharedWorkflow: { create: vi.fn() },
    communityAnalysisTemplate: { create: vi.fn() },
    aiAuditLog: { create: vi.fn(), count: vi.fn() },
    workflowPipeline: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    decisionRecord: { findMany: vi.fn(), createMany: vi.fn() },
    userPreference: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  }

  function setupMockDb() {
    _db.user.findUnique.mockResolvedValue(baseUser({ role: 'pending' }))
    _db.user.findFirst.mockResolvedValue(null)
    _db.user.update.mockResolvedValue(baseUser({ role: 'user' }))

    _db.userSession.findUnique.mockResolvedValue(null)
    _db.userSession.delete.mockResolvedValue({})

    _db.userActivity.create.mockResolvedValue({})

    _db.visitor.findUnique.mockResolvedValue({
      id: 'visitor-1', email: 'visitor@test.com', name: 'Visitor',
      status: 'pending', country: null, company: null, visitorType: 'general',
      createdAt: now, updatedAt: now, lastSeen: now,
    })
    _db.visitor.update.mockResolvedValue({})
    _db.visitor.upsert.mockResolvedValue({})

    _db.communityPost.findMany.mockResolvedValue([])
    _db.communityPost.findFirst.mockResolvedValue(null)
    _db.communityPost.findUnique.mockResolvedValue(null)
    _db.communityPost.count.mockResolvedValue(0)
    _db.communityPost.create.mockResolvedValue({ id: 'post-1' })
    _db.communityPost.update.mockResolvedValue({})
    _db.communityPost.delete.mockResolvedValue({})
    _db.communityPost.deleteMany.mockResolvedValue({ count: 0 })

    _db.aiModel.findMany.mockResolvedValue([])
    _db.aiModel.count.mockResolvedValue(0)
    _db.cronJob.findMany.mockResolvedValue([])
    _db.cronJob.upsert.mockResolvedValue({})

    _db.notification.findMany.mockResolvedValue([])

    _db.postComment.deleteMany.mockResolvedValue({ count: 0 })
    _db.postInteraction.deleteMany.mockResolvedValue({ count: 0 })

    _db.subscription.findUnique.mockResolvedValue(null)
    _db.subscription.findFirst.mockResolvedValue(null)
    _db.subscription.upsert.mockResolvedValue({ id: 'sub-1' })
    _db.subscription.update.mockResolvedValue({})

    _db.$queryRaw
      .mockResolvedValueOnce([{ author: 'THEONEWAYGDA_AI', count: 10n }])
      .mockResolvedValueOnce([{ count: 5n }])
      .mockResolvedValueOnce([{ category: 'AI', count: 100n }])
      .mockResolvedValueOnce([{ type: 'community', count: 80n }])

    _db.aiAuditLog.create.mockResolvedValue({})
    _db.aiAuditLog.count.mockResolvedValue(0)
    _db.userPreference.findUnique.mockResolvedValue(null)
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, baseUser }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn().mockImplementation((req: Request) => req.headers.get('authorization')?.replace('Bearer ', '') || null),
}))
vi.mock('@/lib/email', () => ({
  verifyActionToken: (...args: unknown[]) => mockVerifyActionToken(...args),
  sendUserApprovalEmail: (...args: unknown[]) => { mockSendUserApprovalEmail(...args); return Promise.resolve() },
  sendUserRejectionEmail: (...args: unknown[]) => { mockSendUserRejectionEmail(...args); return Promise.resolve() },
  sendAdminSubscriptionNotificationEmail: (...args: unknown[]) => { mockSendAdminSubscriptionNotificationEmail(...args); return Promise.resolve() },
}))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  isRedisAvailable: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/lib/api-cache', () => ({
  cachedJson: (data: unknown, _preset: string, init?: ResponseInit) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(data, init)
  },
}))
vi.mock('@/lib/monitor', () => ({
  healthMonitor: {
    getMemoryTrend: vi.fn().mockReturnValue('stable'),
    getHealthReport: vi.fn().mockReturnValue({
      uptime: 'healthy',
      memory: { heapUsed: '50MB', heapTotal: '100MB', rss: '80MB', pressure: '50%', trend: 'stable' },
      performance: { avgResponseTime: '120ms', errorRate: '1.2%', requestsPerMinute: '5', cacheHitRate: '85%' },
      security: { blockedIPs: 0, rateLimitViolations: 0, threatLevel: 'low' },
    }),
  },
}))
vi.mock('@/lib/api-logger', () => ({
  apiRouteLogger: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnValue(vi.fn()),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        current_period_start: Math.floor(Date.now() / 1000) - 86400,
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at: null,
        trial_end: null,
      }),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session/test' }),
      },
    },
  },
}))
vi.mock('@/app/api/community/news/route', () => ({
  fetchNewsFromWeb: (...args: unknown[]) => mockFetchNewsFromWeb(...args),
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

// ═══════════════════════════════════════════════════════════════
//  GET /api/search — Unified multi-source search
// ═══════════════════════════════════════════════════════════════

describe('GET /api/search', () => {
  it('should return empty results for empty query', async () => {
    const { GET } = await import('../search/route')
    const res = await GET(makeRequest('/api/search'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.query).toBe('')
    expect(data.total).toBe(0)
    expect(data.results.community).toEqual([])
    expect(data.results.news).toEqual([])
    expect(data.results.leaderboard).toEqual([])
    expect(data.results.pages).toEqual([])
  })

  it('should return results from all sources for a valid query', async () => {
    getMockDb().communityPost.findMany
      .mockResolvedValueOnce([
        { id: 'cp-1', title: 'Community Post', content: 'Analysis discussion', likes: 5, sourceUrl: null, sourceName: null, createdAt: new Date() },
      ])
      .mockResolvedValueOnce([
        { id: 'np-1', title: 'AI News', content: 'Latest AI breakthrough', sourceUrl: null, sourceName: 'TechCrunch', createdAt: new Date() },
      ])
    getMockDb().aiModel.findMany.mockResolvedValueOnce([
      { id: 'm-1', name: 'GPT-4o', provider: 'OpenAI', modelType: 'LLM' },
    ])
    const { GET } = await import('../search/route')
    const res = await GET(makeRequest('/api/search?q=analysis'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.query).toBe('analysis')
    expect(data.results.community).toHaveLength(1)
    expect(data.results.news).toHaveLength(1)
    expect(data.results.leaderboard).toHaveLength(1)
    expect(data.total).toBeGreaterThan(0)
  })

  it('should filter by source parameter', async () => {
    getMockDb().aiModel.findMany.mockResolvedValueOnce([
      { id: 'm-1', name: 'Claude', provider: 'Anthropic', modelType: 'LLM' },
    ])
    const { GET } = await import('../search/route')
    const res = await GET(makeRequest('/api/search?q=claude&source=leaderboard'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // Only leaderboard results should be present
    expect(data.results.leaderboard).toHaveLength(1)
    expect(data.results.community).toEqual([])
    expect(data.results.news).toEqual([])
  })

  it('should return internal pages matching the query', async () => {
    const { GET } = await import('../search/route')
    const res = await GET(makeRequest('/api/search?q=workspace'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // "workspace" keyword matches the internal /workspace page
    expect(data.results.pages.length).toBeGreaterThan(0)
    expect(data.results.pages[0].path).toBe('/workspace')
  })

  it('should handle DB errors gracefully and return empty results', async () => {
    getMockDb().communityPost.findMany.mockRejectedValue(new Error('DB error'))
    getMockDb().aiModel.findMany.mockRejectedValue(new Error('DB error'))
    const { GET } = await import('../search/route')
    const res = await GET(makeRequest('/api/search?q=test'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results.community).toEqual([])
    expect(data.results.news).toEqual([])
    expect(data.results.leaderboard).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/admin/action — Email link approve/reject (users)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/admin/action', () => {
  it('should return 400 for missing token', async () => {
    const { GET } = await import('../admin/action/route')
    const res = await GET(makeRequest('/api/admin/action'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Missing token')
  })

  it('should return 410 for expired/invalid token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'user-1', action: 'approve', valid: false })
    const { GET } = await import('../admin/action/route')
    const res = await GET(makeRequest('/api/admin/action?token=expired-token'))
    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('expired')
  })

  it('should approve a pending user with valid token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'user-001', action: 'approve', valid: true })
    getMockDb().user.findUnique.mockResolvedValueOnce({
      id: 'user-001', email: 'pending@test.com', name: 'Pending User', role: 'pending',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date(), preferences: '{}',
      bio: null, company: null, location: null, website: null, skills: null, isOnboarded: false,
      image: null, avatarUrl: null, github: null, linkedin: null,
      resetToken: null, resetTokenExpiry: null,
    })
    getMockDb().user.update.mockResolvedValueOnce({})
    getMockDb().userActivity.create.mockResolvedValueOnce({})
    getMockDb().visitor.upsert.mockResolvedValueOnce({})
    const { GET } = await import('../admin/action/route')
    const res = await GET(makeRequest('/api/admin/action?token=valid-approve-token'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.action).toBe('approved')
    expect(data.userEmail).toBe('pending@test.com')
    expect(getMockDb().user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'user' } })
    )
    expect(mockSendUserApprovalEmail).toHaveBeenCalledWith('pending@test.com', 'Pending User')
  })

  it('should reject a pending user with valid token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'user-001', action: 'reject', valid: true })
    getMockDb().user.findUnique.mockResolvedValueOnce({
      id: 'user-001', email: 'pending@test.com', name: 'Bad User', role: 'pending',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date(), preferences: '{}',
      bio: null, company: null, location: null, website: null, skills: null, isOnboarded: false,
      image: null, avatarUrl: null, github: null, linkedin: null,
      resetToken: null, resetTokenExpiry: null,
    })
    const { GET } = await import('../admin/action/route')
    const res = await GET(makeRequest('/api/admin/action?token=valid-reject-token'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.action).toBe('rejected')
    expect(getMockDb().user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'rejected' } })
    )
    expect(mockSendUserRejectionEmail).toHaveBeenCalled()
  })

  it('should return already_approved when user is not pending', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'user-001', action: 'approve', valid: true })
    getMockDb().user.findUnique.mockResolvedValueOnce({
      id: 'user-001', email: 'approved@test.com', name: 'Approved User', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date(), preferences: '{}',
      bio: null, company: null, location: null, website: null, skills: null, isOnboarded: true,
      image: null, avatarUrl: null, github: null, linkedin: null,
      resetToken: null, resetTokenExpiry: null,
    })
    const { GET } = await import('../admin/action/route')
    const res = await GET(makeRequest('/api/admin/action?token=approve-token'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.action).toBe('already_approved')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/admin/visitor-action — Email link approve/reject (visitors)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/admin/visitor-action', () => {
  it('should return 400 for missing token', async () => {
    const { GET } = await import('../admin/visitor-action/route')
    const res = await GET(makeRequest('/api/admin/visitor-action'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Missing token')
  })

  it('should return 410 for expired token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'visitor@test.com', action: 'approve', valid: false })
    const { GET } = await import('../admin/visitor-action/route')
    const res = await GET(makeRequest('/api/admin/visitor-action?token=expired'))
    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('expired')
  })

  it('should approve a visitor with valid token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'visitor@test.com', action: 'approve', valid: true })
    getMockDb().visitor.findUnique.mockResolvedValueOnce({
      id: 'visitor-1', email: 'visitor@test.com', name: 'Visitor',
      status: 'pending', country: null, company: null, visitorType: 'general',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date(),
    })
    getMockDb().visitor.update.mockResolvedValueOnce({})
    getMockDb().user.findUnique.mockResolvedValueOnce(null)
    const { GET } = await import('../admin/visitor-action/route')
    const res = await GET(makeRequest('/api/admin/visitor-action?token=valid-visitor-token'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.action).toBe('approved')
    expect(data.visitorEmail).toBe('visitor@test.com')
    expect(getMockDb().visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'accepted' } })
    )
    expect(mockSendUserApprovalEmail).toHaveBeenCalled()
  })

  it('should reject a visitor with valid token', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'visitor@test.com', action: 'reject', valid: true })
    getMockDb().visitor.findUnique.mockResolvedValueOnce({
      id: 'visitor-1', email: 'visitor@test.com', name: 'Bad Visitor',
      status: 'pending', country: null, company: null, visitorType: 'general',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: new Date(),
    })
    const { GET } = await import('../admin/visitor-action/route')
    const res = await GET(makeRequest('/api/admin/visitor-action?token=valid-reject-visitor'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.action).toBe('rejected')
    expect(getMockDb().visitor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'rejected' } })
    )
    expect(mockSendUserRejectionEmail).toHaveBeenCalled()
  })

  it('should return 404 when visitor not found', async () => {
    mockVerifyActionToken.mockReturnValueOnce({ userId: 'nobody@test.com', action: 'approve', valid: true })
    getMockDb().visitor.findUnique.mockResolvedValueOnce(null)
    const { GET } = await import('../admin/visitor-action/route')
    const res = await GET(makeRequest('/api/admin/visitor-action?token=token'))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('not_found')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/admin/community — Dashboard stats
// ═══════════════════════════════════════════════════════════════

describe('GET /api/admin/community', () => {
  it('should return dashboard stats by default', async () => {
    const { GET } = await import('../admin/community/route')
    const res = await GET(makeRequest('/api/admin/community'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stats).toBeDefined()
    expect(data.stats.totalPosts).toBeDefined()
    expect(data.stats.postsLast24h).toBeDefined()
    expect(data.stats.flaggedPosts).toBeDefined()
    expect(data.stats.hiddenPosts).toBeDefined()
    expect(data.cronHealth).toBeDefined()
    expect(data.cronHealth.summary).toBeDefined()
    expect(data.categoryBreakdown).toBeDefined()
    expect(data.topAuthors).toBeDefined()
    expect(data.recentPosts).toBeDefined()
  })

  it('should return posts list for section=posts', async () => {
    getMockDb().communityPost.findMany
      .mockResolvedValueOnce([{ id: 'p1', title: 'Post 1' }])
      .mockResolvedValueOnce([{ id: 'p1' }])
    getMockDb().communityPost.count.mockResolvedValueOnce(1)
    const { GET } = await import('../admin/community/route')
    const res = await GET(makeRequest('/api/admin/community?section=posts'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.posts).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.pagination.total).toBe(1)
  })

  it('should return 400 for invalid section', async () => {
    const { GET } = await import('../admin/community/route')
    const res = await GET(makeRequest('/api/admin/community?section=invalid'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid section')
  })
})

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/admin/community — Moderate posts
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/admin/community', () => {
  it('should return 400 for missing action and postIds', async () => {
    const { PATCH } = await import('../admin/community/route')
    const res = await PATCH(makeJsonRequest('/api/admin/community', {}, { method: 'PATCH' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('action and postIds are required')
  })

  it('should hide a post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValueOnce({
      id: 'p1', title: 'Bad Post', tags: '["Community"]', featured: true,
    })
    getMockDb().communityPost.update.mockResolvedValueOnce({})
    const { PATCH } = await import('../admin/community/route')
    const res = await PATCH(makeJsonRequest('/api/admin/community', {
      action: 'hide',
      postIds: ['p1'],
    }, { method: 'PATCH' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.results[0].success).toBe(true)
  })

  it('should feature a post', async () => {
    getMockDb().communityPost.update.mockResolvedValueOnce({})
    const { PATCH } = await import('../admin/community/route')
    const res = await PATCH(makeJsonRequest('/api/admin/community', {
      action: 'feature',
      postIds: ['p1'],
    }, { method: 'PATCH' }))
    expect(res.status).toBe(200)
    expect(getMockDb().communityPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { featured: true } })
    )
  })

  it('should report per-post failures in results', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValueOnce(null)
    const { PATCH } = await import('../admin/community/route')
    const res = await PATCH(makeJsonRequest('/api/admin/community', {
      action: 'hide',
      postIds: ['nonexistent'],
    }, { method: 'PATCH' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results[0].success).toBe(false)
    expect(data.results[0].error).toBe('Post not found')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/admin/community — Trigger actions
// ═══════════════════════════════════════════════════════════════

describe('POST /api/admin/community', () => {
  it('should return 400 for missing trigger parameter', async () => {
    const { POST } = await import('../admin/community/route')
    const res = await POST(makeJsonRequest('/api/admin/community', {}, { method: 'POST' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('trigger parameter required')
  })

  it('should return 400 for unknown trigger', async () => {
    const { POST } = await import('../admin/community/route')
    const res = await POST(makeJsonRequest('/api/admin/community?trigger=unknown_trigger', {}, { method: 'POST' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Unknown trigger')
  })

  it('should trigger publish and call the target endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) })
    vi.stubGlobal('fetch', mockFetch)
    const { POST } = await import('../admin/community/route')
    const res = await POST(makeJsonRequest('/api/admin/community?trigger=publish', {}, { method: 'POST' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.trigger).toBe('Auto-publish')
    expect(data.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/community/publish'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('should trigger digest', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', mockFetch)
    const { POST } = await import('../admin/community/route')
    const res = await POST(makeJsonRequest('/api/admin/community?trigger=digest', {}, { method: 'POST' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.trigger).toBe('Daily Digest')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/community/engagement?cycle=digest'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/health/deep — Deep diagnostics
// ═══════════════════════════════════════════════════════════════

describe('GET /api/health/deep', () => {
  it('should return deep health diagnostics', async () => {
    // Ensure $queryRaw returns valid data for the DB health check (SELECT 1 as ok)
    getMockDb().$queryRaw.mockResolvedValue([{ ok: 1 }])
    getMockDb().aiModel.count.mockResolvedValue(5)
    getMockDb().aiAuditLog.count.mockResolvedValue(10)
    const { GET } = await import('../health/deep/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBeDefined()
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status)
    expect(data.timestamp).toBeDefined()
    expect(data.version).toBeDefined()
    expect(data.deployment).toBeDefined()
    expect(data.deployment.environment).toBeDefined()
    expect(data.checks).toBeDefined()
    expect(data.checks.database).toBeDefined()
    expect(data.checks.memory).toBeDefined()
    expect(data.checks.apiEndpoints).toBeDefined()
    expect(data.checks.aiSdk).toBeDefined()
    expect(data.checks.redis).toBeDefined()
    expect(data.checks.diskSpace).toBeDefined()
    expect(data.metrics).toBeDefined()
    expect(data.metrics.uptime).toBeDefined()
    expect(data.metrics.errorRate).toBeDefined()
  })

  it('should return no-cache headers', async () => {
    const { GET } = await import('../health/deep/route')
    const res = await GET()
    expect(res.headers.get('cache-control')).toContain('no-cache')
    expect(res.headers.get('x-health-status')).toBeDefined()
  })

  it('should handle database connectivity errors gracefully', async () => {
    getMockDb().$queryRaw.mockReset()
    getMockDb().$queryRaw.mockRejectedValue(new Error('DB connection failed'))
    getMockDb().aiModel.count.mockRejectedValue(new Error('DB down'))
    getMockDb().aiAuditLog.count.mockRejectedValue(new Error('DB down'))
    const { GET } = await import('../health/deep/route')
    const res = await GET()
    // Should still return 200 but with degraded/unhealthy DB check
    expect([200, 503]).toContain(res.status)
    const data = await res.json()
    expect(data.checks.database.status).toBe('unhealthy')
    expect(data.checks.database.details).toContain('Database error')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/news/cron — News fetcher cron
// ═══════════════════════════════════════════════════════════════

describe('GET /api/news/cron', () => {
  it('should return cron status on success', async () => {
    mockFetchNewsFromWeb.mockResolvedValueOnce([
      { title: 'AI News 1', snippet: 'Breaking AI news', url: 'https://example.com/1', hostName: 'example.com', category: 'AI', relevanceScore: 9 },
    ])
    getMockDb().communityPost.findFirst.mockResolvedValueOnce(null) // no existing
    getMockDb().communityPost.create.mockResolvedValueOnce({ id: 'new-1' })
    getMockDb().communityPost.count.mockResolvedValueOnce(1) // no cleanup needed
    const { GET } = await import('../news/cron/route')
    const res = await GET(makeRequest('/api/news/cron?shift=0'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.stats).toBeDefined()
    expect(data.stats.fetched).toBe(1)
    expect(data.stats.saved).toBe(1)
    expect(data.stats.errors).toBe(0)
    expect(data.stats.shift).toBe('0')
  })

  it('should skip duplicate news articles', async () => {
    mockFetchNewsFromWeb.mockResolvedValueOnce([
      { title: 'Duplicate News', snippet: 'Already exists', url: 'https://example.com/dup', hostName: 'example.com', category: 'AI', relevanceScore: 7 },
    ])
    getMockDb().communityPost.findFirst.mockResolvedValueOnce({ id: 'existing' }) // already exists
    getMockDb().communityPost.count.mockResolvedValueOnce(0)
    const { GET } = await import('../news/cron/route')
    const res = await GET(makeRequest('/api/news/cron?shift=1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stats.fetched).toBe(1)
    expect(data.stats.saved).toBe(0)
  })

  it('should handle empty fetch results', async () => {
    mockFetchNewsFromWeb.mockResolvedValueOnce([])
    getMockDb().communityPost.count.mockResolvedValueOnce(0)
    const { GET } = await import('../news/cron/route')
    const res = await GET(makeRequest('/api/news/cron'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stats.fetched).toBe(0)
    expect(data.stats.saved).toBe(0)
  })

  it('should return 500 when fetch fails', async () => {
    mockFetchNewsFromWeb.mockRejectedValueOnce(new Error('Web fetch failed'))
    const { GET } = await import('../news/cron/route')
    const res = await GET(makeRequest('/api/news/cron'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Web fetch failed')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/notifications/stream — SSE endpoint
// ═══════════════════════════════════════════════════════════════

describe('GET /api/notifications/stream', () => {
  it('should return 401 when no token provided', async () => {
    const { GET } = await import('../notifications/stream/route')
    const res = await GET(makeRequest('/api/notifications/stream'))
    expect(res.status).toBe(401)
  })

  it('should return 401 for expired session', async () => {
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() - 1000), // expired
      createdAt: new Date(), user: null,
    })
    getMockDb().userSession.delete.mockResolvedValueOnce({})
    const { GET } = await import('../notifications/stream/route')
    const res = await GET(authedRequest('/api/notifications/stream', 'tok'))
    expect(res.status).toBe(401)
  })

  it('should return SSE stream with correct headers for valid session', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '',
      expiresAt: future,
      createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    const { GET } = await import('../notifications/stream/route')
    const res = await GET(authedRequest('/api/notifications/stream', 'tok'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(res.headers.get('cache-control')).toContain('no-cache')
  })

  it('should accept token via query param for EventSource', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'query-token',
      ipAddress: '', userAgent: '',
      expiresAt: future,
      createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    const { GET } = await import('../notifications/stream/route')
    const res = await GET(makeRequest('/api/notifications/stream?token=query-token'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/stripe/webhook — Stripe webhook handler
// ═══════════════════════════════════════════════════════════════

describe('POST /api/stripe/webhook', () => {
  it('should return 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('../stripe/webhook/route')
    const res = await POST(makeJsonRequest('/api/stripe/webhook', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing stripe-signature header')
  })

  it('should return 401 when signature verification fails', async () => {
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockImplementationOnce(() => { throw new Error('Invalid signature') })
    const { POST } = await import('../stripe/webhook/route')
    const res = await POST(new NextRequest(new URL('/api/stripe/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'stripe-signature': 'bad-sig' },
      body: '{}',
    }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Webhook Error')
  })

  it('should handle checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          metadata: { userId: 'user-001', plan: 'pro' },
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    }
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(mockEvent as any)
    getMockDb().user.findUnique.mockResolvedValueOnce({ name: 'Test User', email: 'test@example.com' })
    const { POST } = await import('../stripe/webhook/route')
    const req = new NextRequest(new URL('/api/stripe/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig', 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(getMockDb().subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-001' },
        create: expect.objectContaining({
          plan: 'pro',
          status: 'pending_approval',
          stripeCustomerId: 'cus_123',
        }),
      })
    )
    expect(mockSendAdminSubscriptionNotificationEmail).toHaveBeenCalled()
  })

  it('should handle customer.subscription.deleted event and revert to free', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          items: { data: [{ price: { id: 'price_pro' } }] },
          metadata: {},
        },
      },
    }
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(mockEvent as any)
    getMockDb().subscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1', userId: 'user-001', plan: 'pro',
    })
    const { POST } = await import('../stripe/webhook/route')
    const res = await POST(new NextRequest(new URL('/api/stripe/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig', 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent),
    }))
    expect(res.status).toBe(200)
    expect(getMockDb().subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'free', status: 'canceled' }),
      })
    )
    expect(getMockDb().user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-001' },
        data: { role: 'user' },
      })
    )
  })

  it('should handle invoice.payment_failed event', async () => {
    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_123',
          customer: 'cus_123',
        },
      },
    }
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(mockEvent as any)
    getMockDb().subscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1', userId: 'user-001',
    })
    const { POST } = await import('../stripe/webhook/route')
    const res = await POST(new NextRequest(new URL('/api/stripe/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig', 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent),
    }))
    expect(res.status).toBe(200)
    expect(getMockDb().subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'past_due' },
      })
    )
  })

  it('should ignore unhandled event types', async () => {
    const mockEvent = {
      type: 'some.unhandled.event',
      data: { object: {} },
    }
    const { stripe } = await import('@/lib/stripe')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(mockEvent as any)
    const { POST } = await import('../stripe/webhook/route')
    const res = await POST(new NextRequest(new URL('/api/stripe/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig', 'Content-Type': 'application/json' },
      body: JSON.stringify(mockEvent),
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.received).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/stripe/portal — Create billing portal session
// ═══════════════════════════════════════════════════════════════

describe('POST /api/stripe/portal', () => {
  it('should return 401 when no auth token provided', async () => {
    const { POST } = await import('../stripe/portal/route')
    const res = await POST(makeJsonRequest('/api/stripe/portal', {}))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 for expired session', async () => {
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() - 1000), // expired
      createdAt: new Date(), user: null,
    })
    getMockDb().userSession.delete.mockResolvedValueOnce({})
    const { POST } = await import('../stripe/portal/route')
    const res = await POST(authedRequest('/api/stripe/portal', 'tok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }))
    expect(res.status).toBe(401)
  })

  it('should return 400 when user has no Stripe customer', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '',
      expiresAt: future,
      createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    getMockDb().subscription.findUnique.mockResolvedValueOnce(null) // no subscription
    const { POST } = await import('../stripe/portal/route')
    const res = await POST(authedRequest('/api/stripe/portal', 'tok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('No Stripe customer found')
  })

  it('should create a portal session for user with subscription', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    getMockDb().userSession.findUnique.mockResolvedValueOnce({
      id: 's1', userId: 'user-001', token: 'tok',
      ipAddress: '', userAgent: '',
      expiresAt: future,
      createdAt: new Date(),
      user: { id: 'user-001', email: 'test@example.com', name: 'Test', role: 'user' },
    })
    getMockDb().subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1', userId: 'user-001', plan: 'pro',
      stripeCustomerId: 'cus_123',
    })
    const { POST } = await import('../stripe/portal/route')
    const res = await POST(authedRequest('/api/stripe/portal', 'tok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://theonewaygda.com' },
      body: '{}',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.url).toBeDefined()
    // Verify Stripe portal session was created
    const { stripe } = await import('@/lib/stripe')
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        return_url: 'https://theonewaygda.com/billing',
      }),
    )
  })
})