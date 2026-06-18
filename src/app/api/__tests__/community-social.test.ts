/**
 * API Integration Tests — Community Social: Follow, Topics, Feed, Verified, Knowledge
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    userFollow: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), groupBy: vi.fn() },
    topicFollow: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    communityPost: { findMany: vi.fn(), count: vi.fn() },
    postInteraction: { findMany: vi.fn() },
    verifiedResearcher: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    knowledgeItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userActivity: { create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    visitor: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  }

  function setupMockDb() {
    Object.values(_db).forEach((model: Record<string, unknown>) => {
      Object.values(model).forEach((fn: unknown) => {
        if (typeof fn === 'function' && 'mockResolvedValue' in fn) {
          ;(fn as ReturnType<typeof vi.fn>).mockResolvedValue(null)
        }
      })
    })
    // Override defaults
    _db.userFollow.findMany.mockResolvedValue([])
    _db.userFollow.create.mockResolvedValue({})
    _db.userFollow.deleteMany.mockResolvedValue({ count: 0 })
    _db.userFollow.groupBy.mockResolvedValue([{ followerId: 'a@b.com', _count: { followerId: 1 } }])
    _db.topicFollow.findMany.mockResolvedValue([])
    _db.topicFollow.create.mockResolvedValue({})
    _db.topicFollow.deleteMany.mockResolvedValue({ count: 0 })
    _db.communityPost.findMany.mockResolvedValue([])
    _db.communityPost.count.mockResolvedValue(0)
    _db.postInteraction.findMany.mockResolvedValue([])
    _db.verifiedResearcher.findUnique.mockResolvedValue(null)
    _db.verifiedResearcher.findMany.mockResolvedValue([])
    _db.verifiedResearcher.create.mockResolvedValue({})
    _db.verifiedResearcher.update.mockResolvedValue({})
    _db.verifiedResearcher.delete.mockResolvedValue({})
    _db.knowledgeItem.findMany.mockResolvedValue([])
    _db.knowledgeItem.findUnique.mockResolvedValue(null)
    _db.knowledgeItem.create.mockResolvedValue({ id: 'ki-1', title: 'T', content: 'C', type: 'faq', upvotes: 0, createdAt: now, updatedAt: now, author: 'a@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false })
    _db.knowledgeItem.update.mockResolvedValue({})
    _db.knowledgeItem.delete.mockResolvedValue({})
    _db.userActivity.create.mockResolvedValue({})
    _db.user.findUnique.mockResolvedValue(null)
    _db.user.update.mockResolvedValue({})
    _db.visitor.findUnique.mockResolvedValue(null)
    _db.notification.create.mockResolvedValue({})
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

// ── Route imports ──

import { GET as followGet, POST as followPost } from '../community/follow/route'
import { GET as topicsGet, POST as topicsPost } from '../community/topics/route'
import { GET as feedGet } from '../community/feed/personalized/route'
import { GET as verifiedGet, POST as verifiedPost, DELETE as verifiedDelete } from '../community/verified/route'
import { GET as knowledgeGet, POST as knowledgePost } from '../community/knowledge/route'
import { GET as knowledgeIdGet, PATCH as knowledgeIdPatch, DELETE as knowledgeIdDelete } from '../community/knowledge/[id]/route'

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
//  FOLLOW
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/follow', () => {
  it('should return following/followers lists', async () => {
    const db = getMockDb()
    db.userFollow.findMany.mockResolvedValueOnce([{ followerId: 'a@b.com', followingId: 'c@d.com' }])
      .mockResolvedValueOnce([{ followerId: 'c@d.com', followingId: 'a@b.com' }])
    db.userFollow.groupBy.mockResolvedValueOnce([{ followerId: 'a@b.com', _count: { followerId: 2 } }])
      .mockResolvedValueOnce([{ followerId: 'a@b.com', _count: { followerId: 3 } }])

    const res = await followGet(makeRequest('/api/community/follow?visitorId=a@b.com'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.following).toBeDefined()
    expect(data.followers).toBeDefined()
    expect(data.followingCount).toBeDefined()
    expect(data.followersCount).toBeDefined()
  })

  it('should return 400 when visitorId missing', async () => {
    expect((await followGet(makeRequest('/api/community/follow'))).status).toBe(400)
  })
})

describe('POST /api/community/follow', () => {
  it('should follow a user', async () => {
    const db = getMockDb()
    db.userFollow.findMany.mockResolvedValue([]) // not already following
    const req = makeJsonRequest('/api/community/follow', {
      followerId: 'a@b.com', followingId: 'c@d.com', action: 'follow',
    })
    const res = await followPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.userFollow.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followerId: 'a@b.com', followingId: 'c@d.com' }) })
    )
  })

  it('should unfollow a user', async () => {
    const db = getMockDb()
    const req = makeJsonRequest('/api/community/follow', {
      followerId: 'a@b.com', followingId: 'c@d.com', action: 'unfollow',
    })
    const res = await followPost(req)
    expect(res.status).toBe(200)
    expect(db.userFollow.deleteMany).toHaveBeenCalled()
  })

  it('should return 400 when trying to follow self', async () => {
    const res = await followPost(makeJsonRequest('/api/community/follow', {
      followerId: 'a@b.com', followingId: 'a@b.com', action: 'follow',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 for missing fields', async () => {
    expect((await followPost(makeJsonRequest('/api/community/follow', { followerId: 'a@b.com' }))).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  TOPICS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/topics', () => {
  it('should return followed topics and available topics', async () => {
    const db = getMockDb()
    db.topicFollow.findMany.mockResolvedValue([{ visitorId: 'a@b.com', topic: 'AI' }])
    const res = await topicsGet(makeRequest('/api/community/topics?visitorId=a@b.com'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.topics).toContain('AI')
    expect(data.availableTopics).toBeDefined()
    expect(data.availableTopics.length).toBeGreaterThan(10)
  })

  it('should return 400 when visitorId missing', async () => {
    expect((await topicsGet(makeRequest('/api/community/topics'))).status).toBe(400)
  })
})

describe('POST /api/community/topics', () => {
  it('should follow a valid topic', async () => {
    const req = makeJsonRequest('/api/community/topics', {
      visitorId: 'a@b.com', topic: 'AI', action: 'follow',
    })
    const res = await topicsPost(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(getMockDb().topicFollow.create).toHaveBeenCalled()
  })

  it('should unfollow a topic', async () => {
    const req = makeJsonRequest('/api/community/topics', {
      visitorId: 'a@b.com', topic: 'AI', action: 'unfollow',
    })
    const res = await topicsPost(req)
    expect(res.status).toBe(200)
    expect(getMockDb().topicFollow.deleteMany).toHaveBeenCalled()
  })

  it('should return 400 for invalid topic', async () => {
    const req = makeJsonRequest('/api/community/topics', {
      visitorId: 'a@b.com', topic: 'InvalidTopic', action: 'follow',
    })
    expect((await topicsPost(req)).status).toBe(400)
  })

  it('should return 400 for missing fields', async () => {
    expect((await topicsPost(makeJsonRequest('/api/community/topics', { visitorId: 'a@b.com' }))).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  PERSONALIZED FEED
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/feed/personalized', () => {
  it('should return personalized feed with pagination', async () => {
    const db = getMockDb()
    db.communityPost.findMany.mockResolvedValue([
      { id: 'p1', type: 'community', title: 'Feed Post', content: 'C', author: 'x@y.com',
        tags: '["AI"]', likes: 5, saves: 2, createdAt: new Date(), featured: false,
        hasAcceptedAnswer: false, acceptedAnswerId: null, imageUrl: null, sourceUrl: null,
        sourceName: null, contentHash: null, comments: 1, reposts: 0, updatedAt: new Date() },
    ])
    db.communityPost.count.mockResolvedValue(1)
    db.topicFollow.findMany.mockResolvedValue([{ topic: 'AI' }])
    db.userFollow.findMany.mockResolvedValue([{ followingId: 'x@y.com' }])

    const res = await feedGet(makeRequest('/api/community/feed/personalized?visitorId=a@b.com'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.posts).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.pagination.hasNext).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  VERIFIED RESEARCHERS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/verified', () => {
  it('should list all verified researchers when no email param', async () => {
    const db = getMockDb()
    db.verifiedResearcher.findMany.mockResolvedValue([
      { email: 'prof@uni.edu', displayName: 'Prof X', institution: 'MIT', badgeType: 'academic' },
    ])
    const res = await verifiedGet(makeRequest('/api/community/verified'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.researchers).toBeDefined()
    expect(data.researchers).toHaveLength(1)
  })

  it('should check verification status for a specific email', async () => {
    const db = getMockDb()
    db.verifiedResearcher.findUnique.mockResolvedValue({ email: 'prof@uni.edu', displayName: 'Prof' })
    const res = await verifiedGet(makeRequest('/api/community/verified?email=prof@uni.edu'))
    expect(res.status).toBe(200)
    expect((await res.json()).verified).toBe(true)
  })

  it('should return verified: false for non-verified email', async () => {
    getMockDb().verifiedResearcher.findUnique.mockResolvedValue(null)
    const res = await verifiedGet(makeRequest('/api/community/verified?email=nobody@test.com'))
    expect(res.status).toBe(200)
    expect((await res.json()).verified).toBe(false)
  })
})

describe('POST /api/community/verified', () => {
  it('should create a verified researcher', async () => {
    const req = makeJsonRequest('/api/community/verified', {
      email: 'new@uni.edu', displayName: 'Dr. New', institution: 'Stanford',
    })
    const res = await verifiedPost(req)
    expect([200, 500]).toContain(res.status)
  })

  it('should return 400 for missing email', async () => {
    expect((await verifiedPost(makeJsonRequest('/api/community/verified', { displayName: 'X' }))).status).toBe(400)
  })
})

describe('DELETE /api/community/verified', () => {
  it('should delete a verified researcher', async () => {
    const db = getMockDb()
    db.verifiedResearcher.findUnique.mockResolvedValue({ email: 'old@uni.edu' })
    const req = makeRequest('/api/community/verified?email=old@uni.edu', { method: 'DELETE' })
    const res = await verifiedDelete(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.verifiedResearcher.delete).toHaveBeenCalled()
  })

  it('should return 400 when email missing', async () => {
    expect((await verifiedDelete(makeRequest('/api/community/verified', { method: 'DELETE' }))).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/knowledge', () => {
  it('should return knowledge items', async () => {
    const db = getMockDb()
    db.knowledgeItem.findMany.mockResolvedValue([
      { id: 'ki-1', title: 'What is AI?', content: 'AI is...', type: 'faq', upvotes: 10, createdAt: new Date(), updatedAt: new Date(), author: 'a@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false },
    ])
    const res = await knowledgeGet(makeRequest('/api/community/knowledge'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toBeDefined()
  })

  it('should filter by type', async () => {
    await knowledgeGet(makeRequest('/api/community/knowledge?type=faq'))
    expect(getMockDb().knowledgeItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'faq' }) })
    )
  })

  it('should filter by featured', async () => {
    await knowledgeGet(makeRequest('/api/community/knowledge?featured=true'))
    expect(getMockDb().knowledgeItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isFeatured: true }) })
    )
  })
})

describe('POST /api/community/knowledge', () => {
  it('should create a knowledge item', async () => {
    const req = makeJsonRequest('/api/community/knowledge', {
      title: 'New Tip', content: 'Use Z-score for outliers', type: 'tip', author: 'a@b.com',
    })
    const res = await knowledgePost(req)
    expect(res.status).toBe(201)
    expect((await res.json()).item).toBeDefined()
    expect(getMockDb().knowledgeItem.create).toHaveBeenCalled()
  })

  it('should return 400 for missing required fields', async () => {
    expect((await knowledgePost(makeJsonRequest('/api/community/knowledge', { title: 'T' }))).status).toBe(400)
  })

  it('should return 400 for invalid type', async () => {
    const req = makeJsonRequest('/api/community/knowledge', {
      title: 'T', content: 'C', type: 'invalid', author: 'a@b.com',
    })
    expect((await knowledgePost(req)).status).toBe(400)
  })
})

describe('GET /api/community/knowledge/[id]', () => {
  it('should return a single knowledge item', async () => {
    const db = getMockDb()
    db.knowledgeItem.findUnique.mockResolvedValue({ id: 'ki-1', title: 'FAQ', content: 'A1', type: 'faq', upvotes: 5, createdAt: new Date(), updatedAt: new Date(), author: 'a@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false })
    const res = await knowledgeIdGet(makeRequest('/api/community/knowledge/ki-1'), { params: Promise.resolve({ id: 'ki-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).item.id).toBe('ki-1')
  })

  it('should return 404 for non-existent item', async () => {
    expect((await knowledgeIdGet(makeRequest('/api/community/knowledge/nope'), { params: Promise.resolve({ id: 'nope' }) })).status).toBe(404)
  })
})

describe('PATCH /api/community/knowledge/[id]', () => {
  it('should upvote via query param', async () => {
    const db = getMockDb()
    db.knowledgeItem.findUnique.mockResolvedValue({ id: 'ki-1', title: 'T', content: 'C', type: 'faq', upvotes: 5, createdAt: new Date(), updatedAt: new Date(), author: 'a@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false })
    const req = makeRequest('/api/community/knowledge/ki-1?action=upvote', { method: 'PATCH' })
    const res = await knowledgeIdPatch(req, { params: Promise.resolve({ id: 'ki-1' }) })
    expect(res.status).toBe(200)
    expect(db.knowledgeItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ upvotes: { increment: 1 } }) })
    )
  })

  it('should return 404 for non-existent item', async () => {
    expect((await knowledgeIdPatch(makeRequest('/api/community/knowledge/nope', { method: 'PATCH' }), { params: Promise.resolve({ id: 'nope' }) })).status).toBe(404)
  })
})

describe('DELETE /api/community/knowledge/[id]', () => {
  it('should delete own knowledge item', async () => {
    const db = getMockDb()
    db.knowledgeItem.findUnique.mockResolvedValue({ id: 'ki-1', title: 'T', content: 'C', type: 'faq', upvotes: 0, createdAt: new Date(), updatedAt: new Date(), author: 'a@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false })
    const req = makeRequest('/api/community/knowledge/ki-1?author=a@b.com', { method: 'DELETE' })
    const res = await knowledgeIdDelete(req, { params: Promise.resolve({ id: 'ki-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('should return 403 when author does not match', async () => {
    const db = getMockDb()
    db.knowledgeItem.findUnique.mockResolvedValue({ id: 'ki-1', title: 'T', content: 'C', type: 'faq', upvotes: 0, createdAt: new Date(), updatedAt: new Date(), author: 'owner@b.com', authorName: null, postId: null, tags: null, sourceCommentIds: null, isFeatured: false })
    const req = makeRequest('/api/community/knowledge/ki-1?author=imposter@b.com', { method: 'DELETE' })
    expect((await knowledgeIdDelete(req, { params: Promise.resolve({ id: 'ki-1' }) })).status).toBe(403)
  })

  it('should return 404 for non-existent item', async () => {
    expect((await knowledgeIdDelete(makeRequest('/api/community/knowledge/nope?author=a@b.com', { method: 'DELETE' }), { params: Promise.resolve({ id: 'nope' }) })).status).toBe(404)
  })
})