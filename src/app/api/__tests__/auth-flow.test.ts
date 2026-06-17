/**
 * API Integration Tests — Auth flow + key routes
 *
 * Tests Next.js API route handlers by mocking the Prisma DB layer.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// ── Hoisted mocks (vi.hoisted runs before vi.mock factory) ──

const { createMockDb, getMockDb, resetMockDb } = vi.hoisted(() => {
  const mockUser = {
    id: 'user-001',
    email: 'test@example.com',
    name: 'Test User',
    password: 'scrypt$abc123$def456',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastSeen: null,
    preferences: '{}',
    avatarUrl: null,
    bio: null,
    location: null,
    website: null,
    github: null,
    linkedin: null,
  }

  const mockSession = {
    id: 'session-001',
    userId: 'user-001',
    token: 'test-token-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }

  const mockProject = {
    id: 'proj-001',
    name: 'Test Project',
    description: '',
    data: '{}',
    variables: '[]',
    outputs: '[]',
    shared: false,
    sharedWith: null,
    userId: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  let _db: Record<string, Record<string, Mock>>

  function createMockDb(overrides: Record<string, unknown> = {}) {
    _db = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ ...mockUser }),
        update: vi.fn().mockResolvedValue(mockUser),
        ...overrides.user,
      },
      userSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockSession),
        delete: vi.fn().mockResolvedValue({}),
        ...overrides.userSession,
      },
      userActivity: {
        create: vi.fn().mockResolvedValue({}),
        ...overrides.userActivity,
      },
      visitor: {
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        upsert: vi.fn().mockResolvedValue({
          email: 'test@test.com', status: 'pending',
          createdAt: new Date(), lastSeen: new Date(),
        }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        ...overrides.visitor,
      },
      project: {
        findMany: vi.fn().mockResolvedValue([mockProject]),
        findUnique: vi.fn().mockResolvedValue(mockProject),
        create: vi.fn().mockResolvedValue(mockProject),
        update: vi.fn().mockResolvedValue(mockProject),
        delete: vi.fn().mockResolvedValue({}),
        ...overrides.project,
      },
    } as unknown as Record<string, Record<string, Mock>>
    return _db
  }

  function getMockDb() { return _db }
  function resetMockDb() { _db = createMockDb() }

  return { createMockDb, getMockDb, resetMockDb, _mockUser: mockUser, _mockSession: mockSession, _mockProject: mockProject }
})

// ── Module mocks (factories can use hoisted values) ─────────

vi.mock('@/lib/db', () => ({
  get db() { return getMockDb() },
}))

vi.mock('@/lib/email', () => ({
  sendAdminAccessRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendVisitorNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

vi.mock('@/lib/monitor', () => ({
  healthMonitor: {
    trackRequest: vi.fn(),
    trackMetric: vi.fn(),
    getHealthReport: vi.fn().mockReturnValue({
      status: 'healthy', uptime: 12345, totalRequests: 100,
      errorRate: 0.02, memoryUsage: { used: 100, total: 500 },
    }),
    logError: vi.fn(),
  },
  getDependencyHealth: vi.fn().mockReturnValue({ database: 'connected' }),
}))

vi.mock('@/lib/api-logger', () => ({
  healthLog: { start: vi.fn().mockReturnValue(vi.fn()) },
}))

vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'user-001', email: 'test@example.com', role: 'user', name: 'Test' }),
}))

// ── Route imports (after mocks) ─────────────────────────────

import { POST as registerPost } from '../auth/register/route'
import { POST as loginPost } from '../auth/login/route'
import { GET as meGet } from '../auth/me/route'
import { GET as visitorGet, POST as visitorPost } from '../visitor/route'
import { GET as healthGet } from '../health/route'
import { GET as projectsGet, POST as projectsPost, PUT as projectsPut, DELETE as projectsDelete } from '../projects/route'

// ── Helpers ──────────────────────────────────────────────────

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
  return makeRequest(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...options.headers },
  })
}

// ── Reset before each test ──────────────────────────────────

beforeEach(() => {
  createMockDb()
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: REGISTER
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/register', () => {
  it('should create a pending user with valid input', async () => {
    const db = getMockDb()
    db.user.findUnique.mockResolvedValue(null)
    // Make create return a user with the new email
    db.user.create.mockResolvedValue({
      id: 'new-001', email: 'new@example.com', name: 'New User',
      password: 'scrypt$...$...', role: 'pending',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null,
    })
    const req = makeJsonRequest('/api/auth/register', {
      email: 'new@example.com', name: 'New User', password: 'secure123',
    })

    const res = await registerPost(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.status).toBe('pending')
    expect(data.user.email).toBe('new@example.com')
    expect(data.user.name).toBe('New User')
    expect(db.user.create).toHaveBeenCalledOnce()
    expect(db.userActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'registration_pending' }) })
    )
    expect(db.visitor.upsert).toHaveBeenCalled()
  })

  it('should return 400 when email is missing', async () => {
    const req = makeJsonRequest('/api/auth/register', { password: 'secure123' })
    expect((await registerPost(req)).status).toBe(400)
  })

  it('should return 400 when password is too short', async () => {
    const req = makeJsonRequest('/api/auth/register', { email: 't@t.com', password: 'abc' })
    const res = await registerPost(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('6 characters')
  })

  it('should return 202 when email already exists as pending', async () => {
    const db = getMockDb()
    const mu = { id: 'u1', email: 'test@example.com', name: 'T', password: 'x', role: 'pending' as const,
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null }
    db.user.findUnique.mockResolvedValue(mu)

    const req = makeJsonRequest('/api/auth/register', { email: 'test@example.com', password: 'secure123' })
    const res = await registerPost(req)
    expect(res.status).toBe(202)
    expect((await res.json()).status).toBe('pending')
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it('should return 403 when email was previously rejected', async () => {
    const db = getMockDb()
    const mu = { id: 'u1', email: 'test@example.com', name: 'T', password: 'x', role: 'rejected' as const,
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null }
    db.user.findUnique.mockResolvedValue(mu)

    const req = makeJsonRequest('/api/auth/register', { email: 'test@example.com', password: 'secure123' })
    expect((await registerPost(req)).status).toBe(403)
  })

  it('should return 409 when email already exists as active user', async () => {
    const db = getMockDb()
    const mu = { id: 'u1', email: 'test@example.com', name: 'T', password: 'x', role: 'user' as const,
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null }
    db.user.findUnique.mockResolvedValue(mu)

    const req = makeJsonRequest('/api/auth/register', { email: 'test@example.com', password: 'secure123' })
    expect((await registerPost(req)).status).toBe(409)
  })

  it('should normalize email to lowercase and trim', async () => {
    const db = getMockDb()
    db.user.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/auth/register', {
      email: '  NewUser@Example.COM  ', password: 'secure123',
    })
    await registerPost(req)
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'newuser@example.com' }) })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: LOGIN
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  it('should return 401 for non-existent user', async () => {
    getMockDb().user.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/auth/login', { email: 'nobody@x.com', password: 'pw' })
    expect((await loginPost(req)).status).toBe(401)
  })

  it('should return 401 for wrong password', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(false)
    getMockDb().user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', name: 'T', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })

    const req = makeJsonRequest('/api/auth/login', { email: 't@t.com', password: 'wrong' })
    expect((await loginPost(req)).status).toBe(401)
  })

  it('should return 202 for pending user', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(true)
    getMockDb().user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', name: 'T', password: 'x', role: 'pending',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })

    const req = makeJsonRequest('/api/auth/login', { email: 't@t.com', password: 'pw' })
    const res = await loginPost(req)
    expect(res.status).toBe(202)
    expect((await res.json()).status).toBe('pending')
    expect(getMockDb().userSession.create).not.toHaveBeenCalled()
  })

  it('should return 403 for rejected user', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(true)
    getMockDb().user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', name: 'T', password: 'x', role: 'rejected',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })

    const req = makeJsonRequest('/api/auth/login', { email: 't@t.com', password: 'pw' })
    expect((await loginPost(req)).status).toBe(403)
  })

  it('should issue a token and create session for approved user', async () => {
    const auth = await import('@/lib/auth')
    vi.spyOn(auth, 'verifyPassword').mockResolvedValue(true)
    vi.spyOn(auth, 'generateToken').mockReturnValue('fixed-test-token')
    getMockDb().user.findUnique.mockResolvedValue({ id: 'u1', email: 't@t.com', name: 'T', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })

    const req = makeJsonRequest('/api/auth/login', { email: 't@t.com', password: 'pw' })
    const res = await loginPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('fixed-test-token')
    expect(data.user.email).toBe('t@t.com')
    expect(data.user).not.toHaveProperty('password')
    expect(getMockDb().userSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token: 'fixed-test-token', userId: 'u1' }) })
    )
  })

  it('should return 400 when email or password is missing', async () => {
    const req = makeJsonRequest('/api/auth/login', { email: 't@t.com' })
    expect((await loginPost(req)).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AUTH: /me (session verification)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/me', () => {
  it('should return 401 when no token is provided', async () => {
    expect((await meGet(makeRequest('/api/auth/me'))).status).toBe(401)
  })

  it('should return 401 for an invalid token', async () => {
    getMockDb().userSession.findUnique.mockResolvedValue(null)
    expect((await meGet(authedRequest('/api/auth/me', 'bad-token'))).status).toBe(401)
  })

  it('should return 401 for an expired session and delete it', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({
      id: 's1', userId: 'u1', token: 'expired', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() - 1000), createdAt: new Date(),
    })
    const res = await meGet(authedRequest('/api/auth/me', 'expired'))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toContain('expired')
    expect(db.userSession.delete).toHaveBeenCalled()
  })

  it('should return user data for a valid session', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', token: 'tok', ipAddress: '', userAgent: '',
      expiresAt: new Date(Date.now() + 999999), createdAt: new Date() })
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'me@test.com', name: 'Me', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })

    const res = await meGet(authedRequest('/api/auth/me', 'tok'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.user.email).toBe('me@test.com')
    expect(data.user).not.toHaveProperty('password')
  })
})

// ═══════════════════════════════════════════════════════════════
//  VISITOR (public API)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/visitor', () => {
  it('should register a new visitor', async () => {
    const req = makeJsonRequest('/api/visitor', { email: 'v@test.com', name: 'V', visitorType: 'researcher' })
    const res = await visitorPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(getMockDb().visitor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'v@test.com' } })
    )
  })

  it('should return 400 for missing email', async () => {
    expect((await visitorPost(makeJsonRequest('/api/visitor', { name: 'X' }))).status).toBe(400)
  })

  it('should return 400 for invalid email format', async () => {
    expect((await visitorPost(makeJsonRequest('/api/visitor', { email: 'bad' }))).status).toBe(400)
  })

  it('should reject disposable email domains', async () => {
    const res = await visitorPost(makeJsonRequest('/api/visitor', { email: 'x@mailinator.com' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Disposable')
  })
})

describe('GET /api/visitor', () => {
  it('should return aggregate stats when no email param', async () => {
    getMockDb().visitor.count.mockResolvedValue(42)
    const data = await (await visitorGet(makeRequest('/api/visitor'))).json()
    expect(data.totalVisitors).toBe(42)
  })

  it('should return 400 for invalid email query param', async () => {
    expect((await visitorGet(makeRequest('/api/visitor?email=x'))).status).toBe(400)
  })

  it('should return unknown status for non-existent visitor', async () => {
    const db = getMockDb()
    db.user.findUnique.mockResolvedValue(null)
    db.visitor.findUnique.mockResolvedValue(null)
    const data = await (await visitorGet(makeRequest('/api/visitor?email=no@no.com'))).json()
    expect(data.status).toBe('unknown')
  })

  it('should auto-accept visitors with active user accounts', async () => {
    const db = getMockDb()
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'yes@test.com', name: 'Y', password: 'x', role: 'user',
      createdAt: new Date(), updatedAt: new Date(), lastSeen: null, preferences: '{}',
      avatarUrl: null, bio: null, location: null, website: null, github: null, linkedin: null })
    const data = await (await visitorGet(makeRequest('/api/visitor?email=yes@test.com'))).json()
    expect(data.status).toBe('accepted')
  })
})

// ═══════════════════════════════════════════════════════════════
//  HEALTH (no auth)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/health', () => {
  it('should return 200 with health report', async () => {
    const res = await healthGet(makeRequest('/api/health'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.version).toBe('2.5.0')
    expect(data.capabilities).toBeDefined()
    expect(data.endpoints).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  PROJECTS (auth + ownership)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/projects', () => {
  it('should return projects for authenticated user', async () => {
    const res = await projectsGet(authedRequest('/api/projects', 'tok'))
    expect(res.status).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
    expect(getMockDb().project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-001' } })
    )
  })
})

describe('POST /api/projects', () => {
  it('should create a project for authenticated user', async () => {
    const req = makeJsonRequest('/api/projects', { name: 'New', description: 'D' }, {
      headers: { 'Authorization': 'Bearer tok' },
    })
    const res = await projectsPost(req)
    expect(res.status).toBe(200)
    expect(getMockDb().project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'New', userId: 'user-001' }) })
    )
  })
})

describe('PUT /api/projects', () => {
  it('should update a project the user owns', async () => {
    const db = getMockDb()
    db.project.findUnique.mockResolvedValue({ id: 'p1', userId: 'user-001', name: 'Old', description: '',
      data: '{}', variables: '[]', outputs: '[]', shared: false, sharedWith: null,
      createdAt: new Date(), updatedAt: new Date() })
    const req = makeJsonRequest('/api/projects', { id: 'p1', name: 'Updated' }, {
      method: 'PUT', headers: { 'Authorization': 'Bearer tok' },
    })
    expect((await projectsPut(req)).status).toBe(200)
    expect(db.project.update).toHaveBeenCalled()
  })

  it('should return 404 when updating a project owned by another user', async () => {
    const db = getMockDb()
    db.project.findUnique.mockResolvedValue({ id: 'p1', userId: 'other-user', name: 'X', description: '',
      data: '{}', variables: '[]', outputs: '[]', shared: false, sharedWith: null,
      createdAt: new Date(), updatedAt: new Date() })
    const req = makeJsonRequest('/api/projects', { id: 'p1', name: 'Hack' }, {
      method: 'PUT', headers: { 'Authorization': 'Bearer tok' },
    })
    expect((await projectsPut(req)).status).toBe(404)
    expect(db.project.update).not.toHaveBeenCalled()
  })

  it('should return 400 when id is missing', async () => {
    const req = makeJsonRequest('/api/projects', { name: 'No ID' }, {
      method: 'PUT', headers: { 'Authorization': 'Bearer tok' },
    })
    expect((await projectsPut(req)).status).toBe(400)
  })
})

describe('DELETE /api/projects', () => {
  it('should delete a project the user owns', async () => {
    const db = getMockDb()
    db.project.findUnique.mockResolvedValue({ id: 'p1', userId: 'user-001', name: 'P', description: '',
      data: '{}', variables: '[]', outputs: '[]', shared: false, sharedWith: null,
      createdAt: new Date(), updatedAt: new Date() })
    const req = authedRequest('/api/projects?id=p1', 'tok', { method: 'DELETE' })
    const res = await projectsDelete(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('should return 404 when deleting a project owned by another user', async () => {
    const db = getMockDb()
    db.project.findUnique.mockResolvedValue({ id: 'p1', userId: 'other', name: 'P', description: '',
      data: '{}', variables: '[]', outputs: '[]', shared: false, sharedWith: null,
      createdAt: new Date(), updatedAt: new Date() })
    const req = authedRequest('/api/projects?id=p1', 'tok', { method: 'DELETE' })
    expect((await projectsDelete(req)).status).toBe(404)
    expect(db.project.delete).not.toHaveBeenCalled()
  })

  it('should return 400 when id query param is missing', async () => {
    expect((await projectsDelete(authedRequest('/api/projects', 'tok', { method: 'DELETE' }))).status).toBe(400)
  })
})