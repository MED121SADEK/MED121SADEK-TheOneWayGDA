/**
 * API Integration Tests — Auth extended routes
 * logout, [id] GET/PATCH, stats, activity, forgot-password, reset-password
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb, sessionWithUser, baseUser } = vi.hoisted(() => {
  const now = new Date('2024-06-15T10:00:00Z')
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const baseUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-001', email: 'test@example.com', name: 'Test User',
    password: 'scrypt$abc$def', role: 'user',
    createdAt: now, updatedAt: now, lastSeen: now, preferences: '{}',
    avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null,
    ...overrides,
  })

  const mockUser = baseUser()
  const adminUser = baseUser({ id: 'admin-001', email: 'admin@test.com', name: 'Admin', role: 'admin' })

  const mockSession = {
    id: 'session-001', userId: 'user-001', token: 'valid-token',
    ipAddress: '127.0.0.1', userAgent: 'test', expiresAt: future, createdAt: now,
  }

  const sessionWithUser = (userId: string, role: string, token = 'tok') => ({
    id: 's1', userId, token, ipAddress: '', userAgent: '',
    expiresAt: future, createdAt: now,
    user: { ...baseUser({ id: userId, role }), email: role === 'admin' ? 'admin@test.com' : 'test@example.com' },
  })

  const _db = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    userActivity: { create: vi.fn(), count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    project: { count: vi.fn() },
    workflowPipeline: { count: vi.fn() },
    automationRule: { count: vi.fn() },
    analysisRun: { count: vi.fn() },
  }

  function setupMockDb() {
    _db.user.findUnique.mockResolvedValue(mockUser)
    _db.user.findFirst.mockResolvedValue(null)
    _db.user.create.mockResolvedValue(mockUser)
    _db.user.update.mockResolvedValue(mockUser)
    _db.userSession.findUnique.mockResolvedValue(mockSession)
    _db.userSession.create.mockResolvedValue(mockSession)
    _db.userSession.delete.mockResolvedValue({})
    _db.userActivity.create.mockResolvedValue({})
    _db.userActivity.count.mockResolvedValue(0)
    _db.userActivity.findMany.mockResolvedValue([])
    _db.userActivity.groupBy.mockResolvedValue([])
    _db.project.count.mockResolvedValue(0)
    _db.workflowPipeline.count.mockResolvedValue(0)
    _db.automationRule.count.mockResolvedValue(0)
    _db.analysisRun.count.mockResolvedValue(0)
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, _mockUser: mockUser, _adminUser: adminUser, _mockSession: mockSession, baseUser, sessionWithUser }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendUserApprovalEmail: vi.fn().mockResolvedValue(undefined),
  sendUserRejectionEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminAccessRequestEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

// ── Route imports ──

import { POST as logoutPost } from '../auth/logout/route'
import { GET as userIdGet, PATCH as userIdPatch } from '../auth/[id]/route'
import { GET as statsGet } from '../auth/stats/route'
import { GET as activityGet } from '../auth/activity/route'
import { POST as forgotPost } from '../auth/forgot-password/route'
import { POST as resetPost } from '../auth/reset-password/route'

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
//  AUTH: LOGOUT
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/logout', () => {
  it('should return 401 when no token provided', async () => {
    expect((await logoutPost(makeRequest('/api/auth/logout', { method: 'POST' }))).status).toBe(401)
  })

  it('should delete session by token and return 200', async () => {
    const res = await logoutPost(authedRequest('/api/auth/logout', 'tok', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect((await res.json()).message).toBeDefined()
    expect(getMockDb().userSession.delete).toHaveBeenCalledWith({ where: { token: 'tok' } })
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: /auth/[id] GET — Next.js 16 dynamic route params
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/[id]', () => {
  it('should return 401 when no auth token', async () => {
    const res = await userIdGet(makeRequest('/api/auth/user-001'), { params: Promise.resolve({ id: 'user-001' }) })
    expect(res.status).toBe(401)
  })

  it('should return user profile for own ID', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.user.findUnique.mockResolvedValue({
      id: 'user-001', name: 'Test User', image: null, role: 'user', bio: null,
      company: null, location: null, website: null, skills: null, isOnboarded: true,
      createdAt: new Date(), lastSeen: new Date(), _count: { activities: 10 },
    })
    const res = await userIdGet(authedRequest('/api/auth/user-001', 'tok'), { params: Promise.resolve({ id: 'user-001' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.id).toBe('user-001')
    expect(data.user._count).toBeDefined()
  })

  it('should allow admin to view other user profiles', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('admin-001', 'admin', 'atok'))
    db.user.findUnique.mockResolvedValue({
      id: 'other-user', name: 'Other', image: null, role: 'user', bio: null,
      company: null, location: null, website: null, skills: null, isOnboarded: true,
      createdAt: new Date(), lastSeen: new Date(), _count: { activities: 5 },
    })
    const res = await userIdGet(authedRequest('/api/auth/other-user', 'atok'), { params: Promise.resolve({ id: 'other-user' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).user.id).toBe('other-user')
  })

  it('should return 403 when non-admin views another user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    const res = await userIdGet(authedRequest('/api/auth/other-user-id', 'tok'), { params: Promise.resolve({ id: 'other-user-id' }) })
    expect(res.status).toBe(403)
  })

  it('should return 404 for non-existent user', async () => {
    const db = getMockDb()
    // Session userId must MATCH the requested id to pass auth check
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('nonexistent', 'user', 'tok'))
    db.user.findUnique.mockResolvedValue(null)
    const res = await userIdGet(authedRequest('/api/auth/nonexistent', 'tok'), { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: /auth/[id] PATCH
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/auth/[id]', () => {
  it('should return 401 when no auth token', async () => {
    const res = await userIdPatch(makeRequest('/api/auth/user-001', { method: 'PATCH' }), { params: Promise.resolve({ id: 'user-001' }) })
    expect(res.status).toBe(401)
  })

  it('should update own profile fields', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    const req = makeJsonRequest('/api/auth/user-001', { name: 'Updated Name', bio: 'New bio' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await userIdPatch(req, { params: Promise.resolve({ id: 'user-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).message).toBe('Profile updated')
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-001' } })
    )
    expect(db.userActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'profile_updated' }) })
    )
  })

  it('should return 403 when updating another user (non-admin)', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    const req = makeJsonRequest('/api/auth/other-id', { name: 'Hack' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await userIdPatch(req, { params: Promise.resolve({ id: 'other-id' }) })
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: STATS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/stats', () => {
  it('should return 401 when no auth', async () => {
    expect((await statsGet(makeRequest('/api/auth/stats'))).status).toBe(401)
  })

  it('should return user stats for authenticated user', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.userActivity.count.mockResolvedValue(25)
    db.userActivity.groupBy.mockResolvedValue([
      { createdAt: new Date('2024-06-14'), _count: { createdAt: 5 } },
    ])
    db.project.count.mockResolvedValue(3)
    db.workflowPipeline.count.mockResolvedValue(2)
    db.automationRule.count.mockResolvedValue(1)

    const res = await statsGet(authedRequest('/api/auth/stats', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stats).toBeDefined()
    expect(data.stats.totalActivities).toBe(25)
    expect(data.stats.weeklyActivity).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: ACTIVITY
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/activity', () => {
  it('should return 401 when no auth', async () => {
    expect((await activityGet(makeRequest('/api/auth/activity'))).status).toBe(401)
  })

  it('should return paginated activities', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.userActivity.findMany.mockResolvedValue([
      { id: 'a1', userId: 'user-001', type: 'login', details: '{}', createdAt: new Date() },
      { id: 'a2', userId: 'user-001', type: 'analysis', details: '{}', createdAt: new Date() },
    ])
    db.userActivity.count.mockResolvedValue(2)

    const res = await activityGet(authedRequest('/api/auth/activity?page=1&limit=10', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activities).toHaveLength(2)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.total).toBe(2)
  })

  it('should filter by type query param', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.userActivity.findMany.mockResolvedValue([])
    db.userActivity.count.mockResolvedValue(0)

    await activityGet(authedRequest('/api/auth/activity?type=login', 'tok'))
    expect(db.userActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'login' }),
      })
    )
  })

  it('should clamp limit to max 50', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.userActivity.findMany.mockResolvedValue([])
    db.userActivity.count.mockResolvedValue(0)

    await activityGet(authedRequest('/api/auth/activity?limit=999', 'tok'))
    expect(db.userActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: FORGOT PASSWORD
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/forgot-password', () => {
  it('should return 400 for missing email', async () => {
    const res = await forgotPost(makeJsonRequest('/api/auth/forgot-password', {}))
    expect(res.status).toBe(400)
  })

  it('should return 200 (anti-enumeration) for non-existent user', async () => {
    getMockDb().user.findUnique.mockResolvedValueOnce(null)
    const res = await forgotPost(makeJsonRequest('/api/auth/forgot-password', { email: 'nobody@test.com' }))
    expect(res.status).toBe(200)
    expect((await res.json()).message).toBeDefined()
    // Should NOT have sent email (user doesn't exist)
    const email = await import('@/lib/email')
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled()
    // Should NOT have called user.update (no token generated)
    expect(getMockDb().user.update).not.toHaveBeenCalled()
  })

  it('should return 200 but not send email for pending user', async () => {
    const pendingUser = baseUser({ id: 'u1', email: 'pending@test.com', name: 'P', role: 'pending' })
    getMockDb().user.findUnique.mockResolvedValueOnce(pendingUser)
    const res = await forgotPost(makeJsonRequest('/api/auth/forgot-password', { email: 'pending@test.com' }))
    expect(res.status).toBe(200)
    const email = await import('@/lib/email')
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('should return 200 but not send email for rejected user', async () => {
    getMockDb().user.findUnique.mockResolvedValue({
      id: 'u1', email: 'rejected@test.com', name: 'R', password: 'x', role: 'rejected',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null,
    })
    const res = await forgotPost(makeJsonRequest('/api/auth/forgot-password', { email: 'rejected@test.com' }))
    expect(res.status).toBe(200)
    const email = await import('@/lib/email')
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('should generate reset token and send email for active user', async () => {
    getMockDb().user.findUnique.mockResolvedValue({
      id: 'u1', email: 'active@test.com', name: 'Active', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null,
    })

    const res = await forgotPost(makeJsonRequest('/api/auth/forgot-password', { email: 'active@test.com' }))
    expect(res.status).toBe(200)
    // Should have updated user with reset token
    expect(getMockDb().user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          resetToken: expect.any(String),
          resetTokenExpiry: expect.any(Date),
        }),
      })
    )
    // Should have sent email
    const email = await import('@/lib/email')
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      'active@test.com',
      expect.any(String), // userName
      expect.any(String), // resetToken
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: RESET PASSWORD
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/reset-password', () => {
  it('should return 400 for missing fields', async () => {
    expect((await resetPost(makeJsonRequest('/api/auth/reset-password', { token: 't' }))).status).toBe(400)
    expect((await resetPost(makeJsonRequest('/api/auth/reset-password', { password: 'newpass123' }))).status).toBe(400)
  })

  it('should return 400 for short password', async () => {
    const res = await resetPost(makeJsonRequest('/api/auth/reset-password', { token: 't', password: 'abc' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('6 characters')
  })

  it('should return 400 for invalid/expired token (findFirst returns null)', async () => {
    getMockDb().user.findFirst.mockResolvedValue(null)
    const res = await resetPost(makeJsonRequest('/api/auth/reset-password', { token: 'bad', password: 'newpass123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Invalid')
  })

  it('should return 400 for expired token (findFirst filters by gte)', async () => {
    // In real DB, findFirst with resetTokenExpiry: { gte: now } would not return expired tokens.
    // Our mock must simulate this by returning null.
    getMockDb().user.findFirst.mockResolvedValue(null)
    const res = await resetPost(makeJsonRequest('/api/auth/reset-password', { token: 'valid-token', password: 'newpass123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Invalid')
  })

  it('should update password and clear reset token for valid request', async () => {
    getMockDb().user.findFirst.mockResolvedValue({
      id: 'u1', email: 't@t.com', name: 'T', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null,
      resetToken: 'valid-token', resetTokenExpiry: new Date(Date.now() + 99999),
    })
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'hashPassword').mockResolvedValue('new-hash')

    const res = await resetPost(makeJsonRequest('/api/auth/reset-password', { token: 'valid-token', password: 'newpass123' }))
    expect(res.status).toBe(200)
    expect(getMockDb().user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          password: 'new-hash',
          resetToken: null,
          resetTokenExpiry: null,
        }),
      })
    )
  })
})