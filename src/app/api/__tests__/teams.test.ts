/**
 * API Integration Tests — Teams Routes
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

  const sessionWithUser = (userId: string, role: string, token = 'tok') => ({
    id: 's1', userId, token, ipAddress: '', userAgent: '',
    expiresAt: future, createdAt: now,
    user: { ...baseUser({ id: userId, role }), email: role === 'admin' ? 'admin@test.com' : 'test@example.com' },
  })

  const _db = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    team: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    teamMember: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    teamInvite: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    teamShare: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    teamActivity: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    teamComment: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  }

  function setupMockDb() {
    for (const model of Object.values(_db)) {
      if (typeof model === 'object' && model !== null) {
        for (const fn of Object.values(model)) {
          if (typeof fn === 'function' && 'mockResolvedValue' in fn) {
            ;(fn as ReturnType<typeof vi.fn>).mockResolvedValue(null)
          }
        }
      }
    }
    // Set safe defaults that let auth pass when token matches
    _db.userSession.findUnique.mockResolvedValue(null)
    _db.user.findUnique.mockResolvedValue(null)
    _db.teamMember.findUnique.mockResolvedValue(null)
    _db.teamMember.findMany.mockResolvedValue([])
    _db.teamMember.count.mockResolvedValue(0)
    _db.team.findUnique.mockResolvedValue(null)
    _db.team.findMany.mockResolvedValue([])
    _db.team.create.mockResolvedValue({ id: 'team-001', name: 'New Team', slug: 'new-team' })
    _db.team.update.mockResolvedValue({ id: 'team-001', name: 'Updated Team' })
    _db.team.delete.mockResolvedValue({})
    _db.teamInvite.findMany.mockResolvedValue([])
    _db.teamInvite.findUnique.mockResolvedValue(null)
    _db.teamInvite.create.mockResolvedValue({ id: 'inv-001' })
    _db.teamInvite.update.mockResolvedValue({})
    _db.teamShare.findMany.mockResolvedValue([])
    _db.teamShare.findUnique.mockResolvedValue(null)
    _db.teamShare.create.mockResolvedValue({ id: 'share-001' })
    _db.teamActivity.findMany.mockResolvedValue([])
    _db.teamActivity.create.mockResolvedValue({})
    _db.teamActivity.count.mockResolvedValue(0)
    _db.teamComment.findMany.mockResolvedValue([])
    _db.teamComment.create.mockResolvedValue({ id: 'comment-001' })
    _db.teamMember.create.mockResolvedValue({ id: 'tm-001' })
    _db.teamMember.update.mockResolvedValue({})
    _db.teamMember.delete.mockResolvedValue({})
    _db.$transaction.mockResolvedValue([{}, {}, {}])
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, baseUser, sessionWithUser }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

// ── Route imports ──

import { GET as teamsGet, POST as teamsPost } from '../teams/route'
import { POST as teamsJoinPost } from '../teams/join/route'
import { GET as teamIdGet, PATCH as teamIdPatch, DELETE as teamIdDelete } from '../teams/[id]/route'
import { GET as membersGet, POST as membersPost, PATCH as membersPatch, DELETE as membersDelete } from '../teams/[id]/members/route'
import { GET as invitesGet, POST as invitesPost, PATCH as invitesPatch } from '../teams/[id]/invites/route'
import { GET as sharesGet, POST as sharesPost } from '../teams/[id]/shares/route'
import { GET as activityGet } from '../teams/[id]/activity/route'
import { GET as commentsGet, POST as commentsPost } from '../teams/[id]/comments/route'

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
function teamParams(id = 'team-001') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams — List teams
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams', () => {
  it('should return 401 when no auth token', async () => {
    const res = await teamsGet(makeRequest('/api/teams'))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Not authenticated')
  })

  it('should return empty array when user has no team memberships', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findMany.mockResolvedValue([])

    const res = await teamsGet(authedRequest('/api/teams', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  it('should return user teams with member counts', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findMany.mockResolvedValue([
      { teamId: 'team-001' },
      { teamId: 'team-002' },
    ])
    db.team.findMany.mockResolvedValue([
      {
        id: 'team-001', name: 'Team One', slug: 'team-one',
        owner: { id: 'user-001', name: 'Test User', email: 'test@example.com', image: null },
        members: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
      },
      {
        id: 'team-002', name: 'Team Two', slug: 'team-two',
        owner: { id: 'user-002', name: 'Other', email: 'other@test.com', image: null },
        members: [{ id: 'm4' }],
      },
    ])

    const res = await teamsGet(authedRequest('/api/teams', 'tok'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(2)
    expect(data.data[0].memberCount).toBe(3)
    expect(data.data[0].members).toBeUndefined()
    expect(data.data[1].memberCount).toBe(1)
  })

  it('should filter by search query param', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findMany.mockResolvedValue([{ teamId: 'team-001' }])
    db.team.findMany.mockResolvedValue([])

    await teamsGet(authedRequest('/api/teams?search=alpha', 'tok'))
    expect(db.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: 'alpha' } }),
      }),
    )
  })

  it('should return 500 on unexpected error', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findMany.mockRejectedValue(new Error('db crash'))

    const res = await teamsGet(authedRequest('/api/teams', 'tok'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch teams')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams — Create team
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams', () => {
  it('should return 401 when no auth token', async () => {
    const res = await teamsPost(makeJsonRequest('/api/teams', { name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('should return 400 when name is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const res = await teamsPost(makeJsonRequest('/api/teams', {}, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Team name is required')
  })

  it('should return 400 when name is too long (>100 chars)', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const longName = 'a'.repeat(101)
    const res = await teamsPost(makeJsonRequest('/api/teams', { name: longName }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('too long')
  })

  it('should create team and add creator as owner member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.team.findUnique.mockResolvedValue(null) // slug check
    db.team.create.mockResolvedValue({
      id: 'team-new', name: 'My Team', slug: 'my-team', inviteCode: 'aabbccdd',
      ownerId: 'user-001', isPublic: false, maxMembers: 10,
    })
    db.teamMember.create.mockResolvedValue({ id: 'tm-new' })
    db.teamActivity.create.mockResolvedValue({})

    const res = await teamsPost(makeJsonRequest('/api/teams', {
      name: 'My Team', description: 'A cool team',
    }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('My Team')

    // Verify creator was added as owner
    expect(db.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-new',
          userId: 'user-001',
          role: 'owner',
        }),
      }),
    )
    // Verify activity was logged
    expect(db.teamActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'team_updated' }),
      }),
    )
  })

  it('should generate unique slug when name already taken', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    // First slug 'my-team' exists, second 'my-team-1' does not
    db.team.findUnique
      .mockResolvedValueOnce({ id: 'existing', slug: 'my-team' })
      .mockResolvedValueOnce(null)
    db.team.create.mockResolvedValue({
      id: 'team-new', name: 'My Team', slug: 'my-team-1', inviteCode: 'aabbccdd',
      ownerId: 'user-001',
    })

    const res = await teamsPost(makeJsonRequest('/api/teams', { name: 'My Team' }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(201)
    expect(db.team.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'my-team-1' }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams/join — Join by invite code
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams/join', () => {
  it('should return 401 when no auth token', async () => {
    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', { inviteCode: 'abc' }))
    expect(res.status).toBe(401)
  })

  it('should return 400 when invite code is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', {}, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invite code is required')
  })

  it('should return 404 for invalid invite code', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.team.findUnique.mockResolvedValue(null)

    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', { inviteCode: 'bogus' }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Invalid invite code')
  })

  it('should return 409 when user is already a member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.team.findUnique.mockResolvedValue({ id: 'team-001', name: 'Team', slug: 'team', maxMembers: 10 })
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', teamId: 'team-001', userId: 'user-001' })

    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', { inviteCode: 'aabbccdd' }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('already a member')
  })

  it('should return 400 when team has reached max members', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.team.findUnique.mockResolvedValue({ id: 'team-001', name: 'Team', slug: 'team', maxMembers: 5, settings: null })
    db.teamMember.findUnique.mockResolvedValue(null)
    db.teamMember.count.mockResolvedValue(5)

    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', { inviteCode: 'aabbccdd' }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('maximum member limit')
  })

  it('should join team and return member + team data', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.team.findUnique.mockResolvedValue({ id: 'team-001', name: 'Alpha', slug: 'alpha', avatar: '/img.png', maxMembers: 10, settings: null })
    db.teamMember.findUnique.mockResolvedValue(null)
    db.teamMember.count.mockResolvedValue(2)
    db.teamMember.create.mockResolvedValue({ id: 'tm-new', teamId: 'team-001', userId: 'user-001', role: 'member' })

    const res = await teamsJoinPost(makeJsonRequest('/api/teams/join', { inviteCode: 'aabbccdd' }, {
      headers: { Authorization: 'Bearer tok' },
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.member).toBeDefined()
    expect(data.data.team.id).toBe('team-001')
    expect(data.data.team.name).toBe('Alpha')
    expect(db.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: 'team-001', userId: 'user-001', role: 'member' }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id] — Get team details
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]', () => {
  it('should return 401 when no auth token', async () => {
    const res = await teamIdGet(makeRequest('/api/teams/team-001'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const res = await teamIdGet(authedRequest('/api/teams/team-001', 'tok'), teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Not a team member')
  })

  it('should return team details with counts', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.team.findUnique.mockResolvedValue({
      id: 'team-001', name: 'Alpha', slug: 'alpha',
      owner: { id: 'user-001', name: 'Test', email: 'test@example.com', image: null },
      members: [
        { id: 'tm-001', user: { id: 'user-001', name: 'Test', email: 'test@example.com', image: null }, joinedAt: new Date() },
      ],
    })
    db.teamInvite.count.mockResolvedValue(3)
    db.teamShare.count.mockResolvedValue(7)
    db.teamActivity.count.mockResolvedValue(42)

    const res = await teamIdGet(authedRequest('/api/teams/team-001', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.inviteCount).toBe(3)
    expect(data.data.shareCount).toBe(7)
    expect(data.data.activityCount).toBe(42)
  })

  it('should return 404 when team not found', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.team.findUnique.mockResolvedValue(null)

    const res = await teamIdGet(authedRequest('/api/teams/team-001', 'tok'), teamParams())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Team not found')
  })
})

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/teams/[id] — Update team
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/teams/[id]', () => {
  it('should return 401 when no auth token', async () => {
    const req = makeJsonRequest('/api/teams/team-001', { name: 'Updated' }, { method: 'PATCH' })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when non-owner/non-admin updates team', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001', { name: 'Updated' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('owner or admin')
  })

  it('should return 400 when name is empty', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })

    const req = makeJsonRequest('/api/teams/team-001', { name: '   ' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('cannot be empty')
  })

  it('should return 400 for invalid maxMembers', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })

    const req = makeJsonRequest('/api/teams/team-001', { maxMembers: 9999 }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('between 1 and 1000')
  })

  it('should update team as owner', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })
    db.team.update.mockResolvedValue({ id: 'team-001', name: 'Renamed', description: 'New desc', isPublic: true })

    const req = makeJsonRequest('/api/teams/team-001', { name: 'Renamed', description: 'New desc', isPublic: true }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(200)
    expect(db.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-001' },
        data: expect.objectContaining({ name: 'Renamed', description: 'New desc', isPublic: true }),
      }),
    )
    expect(db.teamActivity.create).toHaveBeenCalled()
  })

  it('should allow admin to update team', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'admin' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })
    db.team.update.mockResolvedValue({ id: 'team-001', name: 'Admin Updated' })

    const req = makeJsonRequest('/api/teams/team-001', { name: 'Admin Updated' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdPatch(req, teamParams())
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/teams/[id] — Delete team
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/teams/[id]', () => {
  it('should return 401 when no auth token', async () => {
    const req = makeJsonRequest('/api/teams/team-001', {}, { method: 'DELETE' })
    const res = await teamIdDelete(req, teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when non-owner tries to delete', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'admin' })

    const req = makeJsonRequest('/api/teams/team-001', {}, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdDelete(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('owner can delete')
  })

  it('should return 404 when team not found', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001', {}, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdDelete(req, teamParams())
    expect(res.status).toBe(404)
  })

  it('should delete team as owner', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001', name: 'Doomed Team' })
    db.team.delete.mockResolvedValue({})

    const req = makeJsonRequest('/api/teams/team-001', {}, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await teamIdDelete(req, teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('deleted')
    expect(db.team.delete).toHaveBeenCalledWith({ where: { id: 'team-001' } })
  })

  it('should log activity before deletion', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001', name: 'Doomed Team' })
    db.team.delete.mockResolvedValue({})

    const req = makeJsonRequest('/api/teams/team-001', {}, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    await teamIdDelete(req, teamParams())
    expect(db.teamActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'team_updated',
          details: expect.stringContaining('deleted'),
        }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id]/members — List members
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]/members', () => {
  it('should return 401 when no auth token', async () => {
    const res = await membersGet(makeRequest('/api/teams/team-001/members'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const res = await membersGet(authedRequest('/api/teams/team-001/members', 'tok'), teamParams())
    expect(res.status).toBe(403)
  })

  it('should return list of team members', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamMember.findMany.mockResolvedValue([
      { id: 'tm-001', userId: 'user-001', role: 'owner', nickname: 'Test', user: { id: 'user-001', name: 'Test', email: 'test@example.com', image: null } },
      { id: 'tm-002', userId: 'user-002', role: 'member', nickname: 'Bob', user: { id: 'user-002', name: 'Bob', email: 'bob@test.com', image: null } },
    ])

    const res = await membersGet(authedRequest('/api/teams/team-001/members', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(db.teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-001' },
        orderBy: { joinedAt: 'asc' },
      }),
    )
  })

  it('should return 500 on db error', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamMember.findMany.mockRejectedValue(new Error('boom'))

    const res = await membersGet(authedRequest('/api/teams/team-001/members', 'tok'), teamParams())
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams/[id]/members — Add member
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams/[id]/members', () => {
  it('should return 401 when no auth token', async () => {
    const res = await membersPost(makeJsonRequest('/api/teams/team-001/members', { userId: 'u2' }), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when non-owner/admin tries to add member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'u2' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPost(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('owner or admin')
  })

  it('should return 400 when userId and inviteCode are both missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001', maxMembers: 10 })
    db.teamMember.count.mockResolvedValue(2)

    const req = makeJsonRequest('/api/teams/team-001/members', {}, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('userId or inviteCode')
  })

  it('should return 404 when target user does not exist', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001', maxMembers: 10 })
    db.teamMember.count.mockResolvedValue(2)
    db.user.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'nonexistent' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPost(req, teamParams())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('Target user not found')
  })

  it('should return 409 when user is already a member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-001', role: 'owner' }) // for auth check
      .mockResolvedValueOnce({ id: 'tm-002', role: 'member' }) // for existing check
    db.team.findUnique.mockResolvedValue({ id: 'team-001', maxMembers: 10 })
    db.teamMember.count.mockResolvedValue(2)
    db.user.findUnique.mockResolvedValue(baseUser({ id: 'user-002', name: 'Bob' }))

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPost(req, teamParams())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('already a team member')
  })

  it('should add member by userId', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-001', role: 'owner' })
      .mockResolvedValueOnce(null) // not already member
    db.team.findUnique.mockResolvedValue({ id: 'team-001', maxMembers: 10 })
    db.teamMember.count.mockResolvedValue(2)
    db.user.findUnique.mockResolvedValue(baseUser({ id: 'user-002', name: 'Bob' }))
    db.teamMember.create.mockResolvedValue({ id: 'tm-new', teamId: 'team-001', userId: 'user-002', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPost(req, teamParams())
    expect(res.status).toBe(201)
    expect(db.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: 'team-001', userId: 'user-002', role: 'member' }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/teams/[id]/members — Update member role
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/teams/[id]/members', () => {
  it('should return 401 when no auth token', async () => {
    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'u2', role: 'admin' }, { method: 'PATCH' })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when non-owner/admin updates role', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'u2', role: 'admin' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(403)
  })

  it('should return 400 for missing userId', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })

    const req = makeJsonRequest('/api/teams/team-001/members', { role: 'admin' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('userId is required')
  })

  it('should return 400 for invalid role', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'u2', role: 'superadmin' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Role must be one of')
  })

  it('should return 403 when trying to change owner role', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-001', role: 'admin' }) // current user
      .mockResolvedValueOnce({ id: 'tm-002', role: 'owner' }) // target is owner

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002', role: 'member' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('Cannot change the owner')
  })

  it('should update member role as owner', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-001', role: 'owner' }) // current user
      .mockResolvedValueOnce({ id: 'tm-002', role: 'member' }) // target
      .mockResolvedValueOnce({ id: 'tm-002', role: 'admin', user: { id: 'user-002', name: 'Bob', email: 'bob@test.com', image: null } }) // after update
    db.teamMember.update.mockResolvedValue({})

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002', role: 'admin' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersPatch(req, teamParams())
    expect(res.status).toBe(200)
    expect(db.teamMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId_userId: { teamId: 'team-001', userId: 'user-002' } },
        data: { role: 'admin' },
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/teams/[id]/members — Remove member
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/teams/[id]/members', () => {
  it('should return 401 when no auth token', async () => {
    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'u2' }, { method: 'DELETE' })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 400 when userId is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const req = makeJsonRequest('/api/teams/team-001/members', {}, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('userId is required')
  })

  it('should return 404 when target user is not a member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(404)
  })

  it('should return 403 when non-owner/admin removes another member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-002', role: 'member' }) // target member check
      .mockResolvedValueOnce({ id: 'tm-001', role: 'member' }) // current user role check

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-002' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('owner or admin can remove')
  })

  it('should allow member to remove themselves', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.user.findUnique.mockResolvedValue({ name: 'Test User' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-001' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(200)
    expect(db.teamMember.delete).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: 'team-001', userId: 'user-001' } },
    })
  })

  it('should return 400 when owner tries to remove themselves without transferring', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'user-001' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('transfer ownership')
  })

  it('should return 403 when trying to remove the owner', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-owner', role: 'owner' }) // target is owner
      .mockResolvedValueOnce({ id: 'tm-001', role: 'admin' }) // current user is admin

    const req = makeJsonRequest('/api/teams/team-001/members', { userId: 'owner-id' }, {
      method: 'DELETE', headers: { Authorization: 'Bearer tok' },
    })
    const res = await membersDelete(req, teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('Cannot remove the team owner')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id]/invites — List invites
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]/invites', () => {
  it('should return 401 when no auth token', async () => {
    const res = await invitesGet(makeRequest('/api/teams/team-001/invites'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-owner/non-admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const res = await invitesGet(authedRequest('/api/teams/team-001/invites', 'tok'), teamParams())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('owner or admin')
  })

  it('should return pending invites for owner', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.teamInvite.findMany.mockResolvedValue([
      { id: 'inv-001', email: 'a@test.com', status: 'pending', role: 'member' },
      { id: 'inv-002', email: 'b@test.com', status: 'pending', role: 'viewer' },
    ])

    const res = await invitesGet(authedRequest('/api/teams/team-001/invites', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(db.teamInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-001', status: 'pending' },
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams/[id]/invites — Create invite
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams/[id]/invites', () => {
  it('should return 401 when no auth token', async () => {
    const res = await invitesPost(makeJsonRequest('/api/teams/team-001/invites', { email: 'a@test.com' }), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-owner/non-admin', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/invites', { email: 'a@test.com' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPost(req, teamParams())
    expect(res.status).toBe(403)
  })

  it('should return 400 when email and userId are both missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })

    const req = makeJsonRequest('/api/teams/team-001/invites', { message: 'Join us' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('email or userId')
  })

  it('should return 400 for invalid role', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })

    const req = makeJsonRequest('/api/teams/team-001/invites', { email: 'a@test.com', role: 'superadmin' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Role must be one of')
  })

  it('should create invite with email', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'owner' })
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })
    db.teamInvite.create.mockResolvedValue({
      id: 'inv-001', teamId: 'team-001', email: 'a@test.com', role: 'member', status: 'pending',
    })

    const req = makeJsonRequest('/api/teams/team-001/invites', { email: 'a@test.com', message: 'Join!' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPost(req, teamParams())
    expect(res.status).toBe(201)
    expect(db.teamInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-001',
          email: 'a@test.com',
          role: 'member',
          message: 'Join!',
        }),
      }),
    )
  })

  it('should return 409 when user is already a member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique
      .mockResolvedValueOnce({ id: 'tm-001', role: 'owner' }) // auth check
      .mockResolvedValueOnce({ id: 'tm-002', role: 'member' }) // existing member
    db.team.findUnique.mockResolvedValue({ id: 'team-001' })
    db.user.findUnique.mockResolvedValue(baseUser({ id: 'user-002' }))

    const req = makeJsonRequest('/api/teams/team-001/invites', { userId: 'user-002' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPost(req, teamParams())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('already a team member')
  })
})

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/teams/[id]/invites — Accept/reject invite
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/teams/[id]/invites', () => {
  it('should return 401 when no auth token', async () => {
    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'accept' }, { method: 'PATCH' })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 400 when inviteId is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const req = makeJsonRequest('/api/teams/team-001/invites', { action: 'accept' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('inviteId is required')
  })

  it('should return 400 for invalid action', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'maybe' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('must be "accept" or "reject"')
  })

  it('should return 404 when invite not found', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamInvite.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'accept' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('Invite not found')
  })

  it('should accept invite and add user as member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamInvite.findUnique.mockResolvedValue({
      id: 'inv-001', teamId: 'team-001', userId: 'user-001', email: null,
      role: 'member', status: 'pending', invitedBy: 'owner-001',
      expiresAt: new Date(Date.now() + 86400000), respondedAt: null,
    })
    db.teamMember.findUnique.mockResolvedValue(null) // not already member
    db.team.findUnique.mockResolvedValue({ id: 'team-001', maxMembers: 10 })
    db.teamMember.count.mockResolvedValue(2)
    db.teamInvite.update.mockResolvedValue({})
    db.teamMember.create.mockResolvedValue({ id: 'tm-new' })

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'accept' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.status).toBe('accepted')
    expect(db.teamInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-001' },
        data: expect.objectContaining({ status: 'accepted' }),
      }),
    )
    expect(db.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: 'team-001', userId: 'user-001', role: 'member' }),
      }),
    )
  })

  it('should reject invite', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamInvite.findUnique.mockResolvedValue({
      id: 'inv-001', teamId: 'team-001', userId: 'user-001', email: null,
      role: 'member', status: 'pending', invitedBy: 'owner-001',
      expiresAt: new Date(Date.now() + 86400000), respondedAt: null,
    })
    db.teamInvite.update.mockResolvedValue({})

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'reject' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(200)
    expect((await res.json()).data.status).toBe('rejected')
  })

  it('should return 400 when invite has already been responded to', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamInvite.findUnique.mockResolvedValue({
      id: 'inv-001', teamId: 'team-001', userId: 'user-001', email: null,
      role: 'member', status: 'accepted', invitedBy: 'owner-001',
      expiresAt: new Date(Date.now() + 86400000), respondedAt: new Date(),
    })

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'accept' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('already been responded to')
  })

  it('should return 400 when invite has expired', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamInvite.findUnique.mockResolvedValue({
      id: 'inv-001', teamId: 'team-001', userId: 'user-001', email: null,
      role: 'member', status: 'pending', invitedBy: 'owner-001',
      expiresAt: new Date(Date.now() - 86400000), respondedAt: null,
    })
    db.teamInvite.update.mockResolvedValue({})

    const req = makeJsonRequest('/api/teams/team-001/invites', { inviteId: 'inv-001', action: 'accept' }, {
      method: 'PATCH', headers: { Authorization: 'Bearer tok' },
    })
    const res = await invitesPatch(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('expired')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id]/shares — List shares
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]/shares', () => {
  it('should return 401 when no auth token', async () => {
    const res = await sharesGet(makeRequest('/api/teams/team-001/shares'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const res = await sharesGet(authedRequest('/api/teams/team-001/shares', 'tok'), teamParams())
    expect(res.status).toBe(403)
  })

  it('should return shared resources for team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.findMany.mockResolvedValue([
      { id: 'share-001', resourceType: 'workflow', resourceId: 'wf-001', resourceName: 'My Flow' },
    ])

    const res = await sharesGet(authedRequest('/api/teams/team-001/shares', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('should filter by type query param', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.findMany.mockResolvedValue([])

    await sharesGet(authedRequest('/api/teams/team-001/shares?type=workflow', 'tok'), teamParams())
    expect(db.teamShare.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resourceType: 'workflow' }),
      }),
    )
  })

  it('should filter by pinned query param', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.findMany.mockResolvedValue([])

    await sharesGet(authedRequest('/api/teams/team-001/shares?pinned=true', 'tok'), teamParams())
    expect(db.teamShare.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPinned: true }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams/[id]/shares — Share a resource
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams/[id]/shares', () => {
  it('should return 401 when no auth token', async () => {
    const res = await sharesPost(makeJsonRequest('/api/teams/team-001/shares', { resourceType: 'workflow', resourceId: 'wf-001', resourceName: 'Flow' }), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001/shares', { resourceType: 'workflow', resourceId: 'wf-001', resourceName: 'Flow' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await sharesPost(req, teamParams())
    expect(res.status).toBe(403)
  })

  it('should return 400 for invalid resourceType', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/shares', { resourceType: 'invalid', resourceId: 'r1', resourceName: 'Res' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await sharesPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('resourceType must be one of')
  })

  it('should return 400 when resourceId is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/shares', { resourceType: 'workflow', resourceName: 'Flow' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await sharesPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('resourceId is required')
  })

  it('should return 400 when resourceName is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/shares', { resourceType: 'workflow', resourceId: 'wf-001' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await sharesPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('resourceName is required')
  })

  it('should create a share successfully', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.create.mockResolvedValue({
      id: 'share-001', teamId: 'team-001', resourceType: 'analysis', resourceId: 'an-001',
      resourceName: 'Revenue Analysis', permissions: '["view"]',
    })

    const req = makeJsonRequest('/api/teams/team-001/shares', {
      resourceType: 'analysis', resourceId: 'an-001', resourceName: 'Revenue Analysis', description: 'Q2 numbers',
    }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await sharesPost(req, teamParams())
    expect(res.status).toBe(201)
    expect(db.teamShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-001',
          resourceType: 'analysis',
          resourceId: 'an-001',
          resourceName: 'Revenue Analysis',
          description: 'Q2 numbers',
        }),
      }),
    )
    expect(db.teamActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'resource_shared' }) }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id]/activity — Activity feed
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]/activity', () => {
  it('should return 401 when no auth token', async () => {
    const res = await activityGet(makeRequest('/api/teams/team-001/activity'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const res = await activityGet(authedRequest('/api/teams/team-001/activity', 'tok'), teamParams())
    expect(res.status).toBe(403)
  })

  it('should return paginated activity feed', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamActivity.findMany.mockResolvedValue([
      { id: 'act-001', type: 'member_joined', details: '{}', createdAt: new Date() },
      { id: 'act-002', type: 'team_updated', details: '{}', createdAt: new Date() },
    ])
    db.teamActivity.count.mockResolvedValue(25)

    const res = await activityGet(authedRequest('/api/teams/team-001/activity?limit=2&offset=0', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.pagination).toEqual({
      limit: 2,
      offset: 0,
      total: 25,
      hasMore: true,
    })
  })

  it('should clamp limit to max 100', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamActivity.findMany.mockResolvedValue([])
    db.teamActivity.count.mockResolvedValue(0)

    await activityGet(authedRequest('/api/teams/team-001/activity?limit=500', 'tok'), teamParams())
    expect(db.teamActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    )
  })

  it('should default to limit 20 and offset 0', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamActivity.findMany.mockResolvedValue([])
    db.teamActivity.count.mockResolvedValue(0)

    await activityGet(authedRequest('/api/teams/team-001/activity', 'tok'), teamParams())
    expect(db.teamActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    )
  })

  it('should return hasMore false when all results fetched', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamActivity.findMany.mockResolvedValue([{ id: 'act-1' }])
    db.teamActivity.count.mockResolvedValue(1)

    const res = await activityGet(authedRequest('/api/teams/team-001/activity?limit=20', 'tok'), teamParams())
    const data = await res.json()
    expect(data.pagination.hasMore).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/teams/[id]/comments — List comments
// ═══════════════════════════════════════════════════════════════

describe('GET /api/teams/[id]/comments', () => {
  it('should return 401 when no auth token', async () => {
    const res = await commentsGet(makeRequest('/api/teams/team-001/comments'), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const res = await commentsGet(authedRequest('/api/teams/team-001/comments', 'tok'), teamParams())
    expect(res.status).toBe(403)
  })

  it('should return comments for team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamComment.findMany.mockResolvedValue([
      { id: 'cmt-001', teamId: 'team-001', userId: 'user-001', content: 'Great work!', createdAt: new Date() },
    ])

    const res = await commentsGet(authedRequest('/api/teams/team-001/comments', 'tok'), teamParams())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(db.teamComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-001' },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
    )
  })

  it('should filter by shareId query param', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamComment.findMany.mockResolvedValue([])

    await commentsGet(authedRequest('/api/teams/team-001/comments?shareId=share-001', 'tok'), teamParams())
    expect(db.teamComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ shareId: 'share-001' }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/teams/[id]/comments — Add comment
// ═══════════════════════════════════════════════════════════════

describe('POST /api/teams/[id]/comments', () => {
  it('should return 401 when no auth token', async () => {
    const res = await commentsPost(makeJsonRequest('/api/teams/team-001/comments', { content: 'Nice!' }), teamParams())
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a team member', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue(null)

    const req = makeJsonRequest('/api/teams/team-001/comments', { content: 'Nice!' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(403)
  })

  it('should return 400 when content is missing', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/comments', {}, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('content is required')
  })

  it('should return 400 when content is too long (>5000 chars)', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })

    const req = makeJsonRequest('/api/teams/team-001/comments', { content: 'x'.repeat(5001) }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('too long')
  })

  it('should return 404 when shareId does not belong to team', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.findUnique.mockResolvedValue({ id: 'share-999', teamId: 'other-team' })

    const req = makeJsonRequest('/api/teams/team-001/comments', { content: 'Nice!', shareId: 'share-999' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('Shared resource not found')
  })

  it('should create comment successfully', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamComment.create.mockResolvedValue({
      id: 'cmt-001', teamId: 'team-001', userId: 'user-001', content: 'Looks great!', shareId: null,
    })

    const req = makeJsonRequest('/api/teams/team-001/comments', { content: 'Looks great!' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(db.teamComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-001',
          userId: 'user-001',
          content: 'Looks great!',
          shareId: null,
        }),
      }),
    )
    expect(db.teamActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'comment_added' }) }),
    )
  })

  it('should create comment with shareId when share belongs to team', async () => {
    const db = getMockDb()
    db.userSession.findUnique.mockResolvedValue(sessionWithUser('user-001', 'user', 'tok'))
    db.teamMember.findUnique.mockResolvedValue({ id: 'tm-001', role: 'member' })
    db.teamShare.findUnique.mockResolvedValue({ id: 'share-001', teamId: 'team-001' })
    db.teamComment.create.mockResolvedValue({
      id: 'cmt-002', teamId: 'team-001', userId: 'user-001', content: 'On this share', shareId: 'share-001',
    })

    const req = makeJsonRequest('/api/teams/team-001/comments', { content: 'On this share', shareId: 'share-001' }, {
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await commentsPost(req, teamParams())
    expect(res.status).toBe(201)
    expect(db.teamComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shareId: 'share-001' }),
      }),
    )
  })
})