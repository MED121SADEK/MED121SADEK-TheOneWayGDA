/**
 * API Integration Tests — Admin Routes & Studio Copilots
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

vi.hoisted(() => { process.env.ADMIN_SECRET = 'admin-secret-token' })

const { setupMockDb, getMockDb, baseUser, adminUser, pendingUser, rejectedUser, sessionWithUser } = vi.hoisted(() => {
  const now = new Date('2024-06-15')
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const baseUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-001', email: 'test@example.com', name: 'Test User',
    password: 'hash', role: 'user',
    createdAt: now, updatedAt: now, lastSeen: now, preferences: '{}',
    bio: null, company: null, location: null, website: null,
    skills: null, isOnboarded: true,
    image: null, avatarUrl: null, github: null, linkedin: null,
    resetToken: null, resetTokenExpiry: null,
    ...overrides,
  })

  const adminUser = baseUser({ id: 'admin-001', email: 'admin@test.com', name: 'Admin', role: 'admin' })
  const pendingUser = baseUser({ id: 'pending-001', email: 'pending@test.com', name: 'Pending', role: 'pending' })
  const rejectedUser = baseUser({ id: 'rejected-001', email: 'rejected@test.com', name: 'Rejected', role: 'rejected' })

  const sessionWithUser = (userId: string, role: string, token = 'tok') => ({
    id: 's1', userId, token, ipAddress: '', userAgent: '',
    expiresAt: future, createdAt: now,
    user: { ...baseUser({ id: userId, role }), email: role === 'admin' ? 'admin@test.com' : 'test@example.com' },
  })

  const _db = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    userActivity: { create: vi.fn() },
    visitor: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn(), delete: vi.fn(), updateMany: vi.fn() },
    subscription: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityPost: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), delete: vi.fn(), $queryRaw: vi.fn() },
    postComment: { deleteMany: vi.fn() },
    postInteraction: { deleteMany: vi.fn() },
    cronJob: { findMany: vi.fn() },
    customCopilot: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), delete: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
    copilotReview: { findMany: vi.fn(), upsert: vi.fn(), aggregate: vi.fn() },
    copilotInstall: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  }

  function setupMockDb() {
    _db.user.findUnique.mockResolvedValue(baseUser())
    _db.user.findFirst.mockResolvedValue(null)
    _db.user.findMany.mockResolvedValue([])
    _db.user.create.mockResolvedValue(baseUser())
    _db.user.update.mockResolvedValue(baseUser())

    _db.userSession.findUnique.mockResolvedValue({
      id: 'session-001', userId: 'user-001', token: 'valid-token',
      ipAddress: '127.0.0.1', userAgent: 'test', expiresAt: future, createdAt: now,
      user: baseUser(),
    })
    _db.userSession.create.mockResolvedValue({ id: 's1' })
    _db.userSession.delete.mockResolvedValue({})

    _db.userActivity.create.mockResolvedValue({})
    _db.visitor.findUnique.mockResolvedValue(null)
    _db.visitor.upsert.mockResolvedValue({})
    _db.visitor.update.mockResolvedValue({})
    _db.visitor.findMany.mockResolvedValue([])
    _db.visitor.count.mockResolvedValue(0)
    _db.visitor.delete.mockResolvedValue({})
    _db.visitor.updateMany.mockResolvedValue({ count: 0 })

    _db.subscription.findMany.mockResolvedValue([])
    _db.subscription.findUnique.mockResolvedValue(null)
    _db.subscription.update.mockResolvedValue({})

    _db.communityPost.findMany.mockResolvedValue([])
    _db.communityPost.count.mockResolvedValue(0)
    _db.communityPost.findUnique.mockResolvedValue(null)
    _db.communityPost.update.mockResolvedValue({})
    _db.communityPost.deleteMany.mockResolvedValue({ count: 0 })
    _db.communityPost.delete.mockResolvedValue({})
    _db.communityPost.$queryRaw.mockResolvedValue([])

    _db.postComment.deleteMany.mockResolvedValue({ count: 0 })
    _db.postInteraction.deleteMany.mockResolvedValue({ count: 0 })
    _db.cronJob.findMany.mockResolvedValue([])

    _db.customCopilot.count.mockResolvedValue(0)
    _db.customCopilot.findMany.mockResolvedValue([])
    _db.customCopilot.findUnique.mockResolvedValue(null)
    _db.customCopilot.create.mockResolvedValue({ id: 'cop-1' })
    _db.customCopilot.createMany.mockResolvedValue({})
    _db.customCopilot.update.mockResolvedValue({})
    _db.customCopilot.delete.mockResolvedValue({})
    _db.customCopilot.groupBy.mockResolvedValue([])
    _db.customCopilot.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } })

    _db.copilotReview.findMany.mockResolvedValue([])
    _db.copilotReview.upsert.mockResolvedValue({ id: 'rev-1' })
    _db.copilotReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } })

    _db.copilotInstall.findUnique.mockResolvedValue(null)
    _db.copilotInstall.create.mockResolvedValue({})
    _db.copilotInstall.delete.mockResolvedValue({})
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, baseUser, adminUser, pendingUser, rejectedUser, sessionWithUser }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn().mockImplementation((req: Request) => req.headers.get('authorization')?.replace('Bearer ', '') || null),
  hashPassword: vi.fn().mockResolvedValue('new-hash'),
}))
vi.mock('@/lib/email', () => ({
  sendUserApprovalEmail: vi.fn().mockResolvedValue(undefined),
  sendUserRejectionEmail: vi.fn().mockResolvedValue(undefined),
  sendUserSubscriptionApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendUserSubscriptionRejectedEmail: vi.fn().mockResolvedValue(undefined),
  verifyActionToken: vi.fn(),
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

// ═══════════════════════════════════════════════════════════════
//  ADMIN: USERS PENDING
// ═══════════════════════════════════════════════════════════════

describe('GET /api/admin/users/pending', () => {
  it('should return 401 when not authenticated', async () => {
    const res = await (await import('../admin/users/pending/route')).GET(makeRequest('/api/admin/users/pending'))
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-admin user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user'))
    const res = await (await import('../admin/users/pending/route')).GET(authedRequest('/api/admin/users/pending', 'tok'))
    expect(res.status).toBe(403)
  })

  it('should return pending and rejected users for admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findMany.mockResolvedValueOnce([pendingUser]).mockResolvedValueOnce([rejectedUser])
    const res = await (await import('../admin/users/pending/route')).GET(authedRequest('/api/admin/users/pending', 'atok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pending).toHaveLength(1)
    expect(data.rejected).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE USER
// ═══════════════════════════════════════════════════════════════

describe('POST /api/admin/users/[id]/approve', () => {
  it('should return 401 when not authenticated', async () => {
    const res = await (await import('../admin/users/[id]/approve/route')).POST(
      makeRequest('/api/admin/users/pending-001', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pending-001' }) },
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user'))
    const res = await (await import('../admin/users/[id]/approve/route')).POST(
      authedRequest('/api/admin/users/pending-001', 'tok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pending-001' }) },
    )
    expect(res.status).toBe(403)
  })

  it('should approve a pending user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValueOnce(pendingUser)
    const res = await (await import('../admin/users/[id]/approve/route')).POST(
      authedRequest('/api/admin/users/pending-001', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pending-001' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pending-001' }, data: expect.objectContaining({ role: 'user' }) })
    )
    expect(db.userActivity.create).toHaveBeenCalled()
    expect(db.visitor.upsert).toHaveBeenCalled()
  })

  it('should return 400 if user is not pending or rejected', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValueOnce(baseUser()) // role is 'user'
    const res = await (await import('../admin/users/[id]/approve/route')).POST(
      authedRequest('/api/admin/users/user-001', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'user-001' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValueOnce(null)
    const res = await (await import('../admin/users/[id]/approve/route')).POST(
      authedRequest('/api/admin/users/nonexistent', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ADMIN: REJECT USER
// ═══════════════════════════════════════════════════════════════

describe('POST /api/admin/users/[id]/reject', () => {
  it('should reject a pending user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValueOnce(pendingUser)
    const res = await (await import('../admin/users/[id]/reject/route')).POST(
      makeJsonRequest('/api/admin/users/pending-001', { reason: 'Not qualified' }, { method: 'POST', headers: { Authorization: 'Bearer atok' } }),
      { params: Promise.resolve({ id: 'pending-001' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'rejected' }) })
    )
    expect(db.userActivity.create).toHaveBeenCalled()
  })

  it('should return 400 if user is not pending', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValueOnce(baseUser())
    const res = await (await import('../admin/users/[id]/reject/route')).POST(
      makeJsonRequest('/api/admin/users/user-001', {}, { method: 'POST', headers: { Authorization: 'Bearer atok' } }),
      { params: Promise.resolve({ id: 'user-001' }) },
    )
    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ADMIN: SUBSCRIPTIONS PENDING
// ═══════════════════════════════════════════════════════════════

describe('GET /api/admin/subscriptions/pending', () => {
  it('should return 403 for non-admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user'))
    const res = await (await import('../admin/subscriptions/pending/route')).GET(authedRequest('/api/admin/subscriptions/pending', 'tok'))
    expect(res.status).toBe(403)
  })

  it('should return pending subscriptions for admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.subscription.findMany.mockResolvedValue([{ id: 'sub-1', status: 'pending_approval', userId: 'u1' }])
    const res = await (await import('../admin/subscriptions/pending/route')).GET(authedRequest('/api/admin/subscriptions/pending', 'atok'))
    expect(res.status).toBe(200)
    expect((await res.json()).pending).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

describe('POST /api/admin/subscriptions/[id]/approve', () => {
  it('should approve a pending subscription', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1', userId: 'u1', plan: 'pro', status: 'pending_approval',
      user: { email: 'u@test.com', name: 'User' },
    })
    const res = await (await import('../admin/subscriptions/[id]/approve/route')).POST(
      authedRequest('/api/admin/subscriptions/sub-1', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'sub-1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { status: 'active' } })
    )
    expect(db.user.update).toHaveBeenCalled() // role upgrade for pro plan
  })

  it('should return 400 if subscription not pending_approval', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1', userId: 'u1', plan: 'pro', status: 'active',
      user: { email: 'u@test.com', name: 'User' },
    })
    const res = await (await import('../admin/subscriptions/[id]/approve/route')).POST(
      authedRequest('/api/admin/subscriptions/sub-1', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'sub-1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent subscription', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.subscription.findUnique.mockResolvedValueOnce(null)
    const res = await (await import('../admin/subscriptions/[id]/approve/route')).POST(
      authedRequest('/api/admin/subscriptions/nope', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'nope' }) },
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ADMIN: REJECT SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

describe('POST /api/admin/subscriptions/[id]/reject', () => {
  it('should reject a pending subscription', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1', userId: 'u1', plan: 'pro', status: 'pending_approval', stripeSubscriptionId: 'sub_stripe_123',
      user: { email: 'u@test.com', name: 'User' },
    })
    const res = await (await import('../admin/subscriptions/[id]/reject/route')).POST(
      authedRequest('/api/admin/subscriptions/sub-1', 'atok', { method: 'POST' }),
      { params: Promise.resolve({ id: 'sub-1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { status: 'canceled' } })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  STUDIO: COPILOTS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/studio/copilots', () => {
  it('should return copilots list with stats', async () => {
    const db = getMockDb()
    db.customCopilot.count.mockResolvedValue(5)
    db.customCopilot.findMany.mockResolvedValue([
      { id: 'c1', name: 'BioData Analyst', category: 'data_analyst', rating: 4.8, installCount: 100, isPublished: true, isFeatured: true },
    ])
    db.customCopilot.aggregate.mockResolvedValue({ _sum: { installCount: 500 } })
    db.customCopilot.groupBy.mockResolvedValue([{ category: 'data_analyst', _count: 1 }])
    const res = await (await import('../studio/copilots/route')).GET(makeRequest('/api/studio/copilots'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.copilots).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.total).toBe(5)
  })

  it('should filter by category', async () => {
    getMockDb().customCopilot.count.mockResolvedValue(10)
    await (await import('../studio/copilots/route')).GET(makeRequest('/api/studio/copilots?category=statistician'))
    expect(getMockDb().customCopilot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'statistician' }) })
    )
  })

  it('should seed sample data when DB is empty', async () => {
    getMockDb().customCopilot.count.mockResolvedValue(0)
    await (await import('../studio/copilots/route')).GET(makeRequest('/api/studio/copilots'))
    expect(getMockDb().customCopilot.createMany).toHaveBeenCalled()
  })
})

describe('POST /api/studio/copilots', () => {
  it('should create a copilot with valid input', async () => {
    const res = await (await import('../studio/copilots/route')).POST(
      makeJsonRequest('/api/studio/copilots', {
        name: 'Test Copilot', description: 'A test copilot', category: 'data_analyst',
        systemPrompt: 'You are a data analyst.', authorId: 'a@b.com',
      }),
    )
    expect(res.status).toBe(201)
    expect(getMockDb().customCopilot.create).toHaveBeenCalled()
  })

  it('should return 400 for missing required fields', async () => {
    const res = await (await import('../studio/copilots/route')).POST(
      makeJsonRequest('/api/studio/copilots', { name: 'Test' }),
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /api/studio/copilots/[id]', () => {
  it('should return copilot with reviews', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({
      id: 'c1', name: 'Test', reviews: [], _count: { reviews: 0, installs: 0 },
    })
    const res = await (await import('../studio/copilots/[id]/route')).GET(
      makeRequest('/api/studio/copilots/c1'),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).copilot.id).toBe('c1')
  })

  it('should return 404 for non-existent copilot', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue(null)
    expect((await (await import('../studio/copilots/[id]/route')).GET(
      makeRequest('/api/studio/copilots/nope'),
      { params: Promise.resolve({ id: 'nope' }) },
    )).status).toBe(404)
  })
})

describe('PATCH /api/studio/copilots/[id]', () => {
  it('should update copilot fields', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    const res = await (await import('../studio/copilots/[id]/route')).PATCH(
      makeJsonRequest('/api/studio/copilots/c1', { name: 'Updated Name' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(200)
    expect(db.customCopilot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ name: 'Updated Name' }) })
    )
  })

  it('should return 404 for non-existent', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue(null)
    expect((await (await import('../studio/copilots/[id]/route')).PATCH(
      makeJsonRequest('/api/studio/copilots/nope', { name: 'X' }),
      { params: Promise.resolve({ id: 'nope' }) },
    )).status).toBe(404)
  })
})

describe('DELETE /api/studio/copilots/[id]', () => {
  it('should delete a copilot', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    const res = await (await import('../studio/copilots/[id]/route')).DELETE(
      makeRequest('/api/studio/copilots/c1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(200)
    expect(db.customCopilot.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('should return 404 for non-existent', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue(null)
    expect((await (await import('../studio/copilots/[id]/route')).DELETE(
      makeRequest('/api/studio/copilots/nope', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'nope' }) },
    )).status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  STUDIO: COPILOTS INSTALL
// ═══════════════════════════════════════════════════════════════

describe('POST /api/studio/copilots/[id]/install', () => {
  it('should install a copilot', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    db.copilotInstall.findUnique.mockResolvedValue(null)
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/install', { userId: 'a@b.com', action: 'install' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(201)
    expect((await res.json()).installed).toBe(true)
    expect(db.copilotInstall.create).toHaveBeenCalled()
    expect(db.customCopilot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { installCount: { increment: 1 } } })
    )
  })

  it('should return 200 if already installed', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    db.copilotInstall.findUnique.mockResolvedValue({ id: 'ci-1' })
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/install', { userId: 'a@b.com', action: 'install' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).installed).toBe(true)
  })

  it('should uninstall a copilot', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    db.copilotInstall.findUnique.mockResolvedValue({ id: 'ci-1' })
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/install', { userId: 'a@b.com', action: 'uninstall' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(200)
    expect((await res.json()).installed).toBe(false)
    expect(db.copilotInstall.delete).toHaveBeenCalled()
  })

  it('should return 400 for missing fields', async () => {
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/install', { action: 'install' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid action', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/install', { userId: 'a@b.com', action: 'destroy' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent copilot', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue(null)
    const res = await (await import('../studio/copilots/[id]/install/route')).POST(
      makeJsonRequest('/api/studio/copilots/nope/install', { userId: 'a@b.com', action: 'install' }),
      { params: Promise.resolve({ id: 'nope' }) },
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  STUDIO: COPILOTS REVIEW
// ═══════════════════════════════════════════════════════════════

describe('POST /api/studio/copilots/[id]/review', () => {
  it('should add a review', async () => {
    const db = getMockDb()
    db.customCopilot.findUnique.mockResolvedValue({ id: 'c1' })
    const res = await (await import('../studio/copilots/[id]/review/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/review', {
        reviewerId: 'a@b.com', rating: 5, comment: 'Excellent!',
      }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(201)
    expect((await res.json()).review).toBeDefined()
    expect(db.copilotReview.upsert).toHaveBeenCalled()
    expect(db.customCopilot.update).toHaveBeenCalled()
  })

  it('should return 400 for missing required fields', async () => {
    const res = await (await import('../studio/copilots/[id]/review/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/review', { reviewerId: 'a@b.com' }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid rating', async () => {
    const res = await (await import('../studio/copilots/[id]/review/route')).POST(
      makeJsonRequest('/api/studio/copilots/c1/review', { reviewerId: 'a@b.com', rating: 6 }),
      { params: Promise.resolve({ id: 'c1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent copilot', async () => {
    getMockDb().customCopilot.findUnique.mockResolvedValue(null)
    const res = await (await import('../studio/copilots/[id]/review/route')).POST(
      makeJsonRequest('/api/studio/copilots/nope/review', { reviewerId: 'a@b.com', rating: 5 }),
      { params: Promise.resolve({ id: 'nope' }) },
    )
    expect(res.status).toBe(404)
  })
})