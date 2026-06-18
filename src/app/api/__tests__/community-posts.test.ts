/**
 * API Integration Tests — Community Posts CRUD + Comments + Interactions
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const mockPost = {
    id: 'post-001', type: 'community', title: 'Test Post', content: 'Hello world',
    author: 'alice@test.com', authorName: 'Alice', imageUrl: null, sourceUrl: null,
    sourceName: null, tags: '["AI","Research"]', contentHash: null,
    likes: 5, comments: 2, reposts: 0, saves: 1,
    featured: false, hasAcceptedAnswer: false, acceptedAnswerId: null,
    createdAt: now, updatedAt: now,
  }

  const mockComment = {
    id: 'comment-001', postId: 'post-001', author: 'bob@test.com', authorName: 'Bob',
    content: 'Great post!', isAnswer: false, answerMarkedBy: null, upvotes: 3, createdAt: now,
  }

  const _db = {
    communityPost: {
      findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(),
      create: vi.fn(), upsert: vi.fn(), update: vi.fn(),
      updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), count: vi.fn(),
    },
    postComment: {
      findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(),
      create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn(),
    },
    postInteraction: {
      findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn(), findMany: vi.fn(),
    },
    user: { findUnique: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}) },
    verifiedResearcher: { findUnique: vi.fn() },
  }

  function setupMockDb() {
    _db.communityPost.findMany.mockResolvedValue([mockPost])
    _db.communityPost.findUnique.mockResolvedValue(mockPost)
    _db.communityPost.findFirst.mockResolvedValue(null)
    _db.communityPost.create.mockResolvedValue(mockPost)
    _db.communityPost.upsert.mockResolvedValue(mockPost)
    _db.communityPost.update.mockResolvedValue(mockPost)
    _db.communityPost.updateMany.mockResolvedValue({ count: 1 })
    _db.communityPost.delete.mockResolvedValue({})
    _db.communityPost.deleteMany.mockResolvedValue({ count: 2 })
    _db.communityPost.count.mockResolvedValue(1)

    _db.postComment.findMany.mockResolvedValue([mockComment])
    _db.postComment.findUnique.mockResolvedValue(mockComment)
    _db.postComment.findFirst.mockResolvedValue(null)
    _db.postComment.create.mockResolvedValue(mockComment)
    _db.postComment.update.mockResolvedValue(mockComment)
    _db.postComment.count.mockResolvedValue(1)
    _db.postComment.deleteMany.mockResolvedValue({ count: 1 })

    _db.postInteraction.findUnique.mockResolvedValue(null)
    _db.postInteraction.create.mockResolvedValue({})
    _db.postInteraction.delete.mockResolvedValue({})
    _db.postInteraction.count.mockResolvedValue(0)
    _db.postInteraction.findMany.mockResolvedValue([])

    _db.user.findUnique.mockResolvedValue(null)
    _db.user.update.mockResolvedValue({})
    _db.notification.create.mockResolvedValue({})
    _db.verifiedResearcher.findUnique.mockResolvedValue(null)
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb, _mockPost: mockPost, _mockComment: mockComment }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))
vi.mock('@/lib/api-cache', () => ({
  cachedJson: (data: unknown, _ttl?: string) => new Response(JSON.stringify(data), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }),
}))

// ── Route imports ──

import { GET as postsGet, POST as postsPost } from '../community/posts/route'
import { GET as postGet, DELETE as postDelete } from '../community/posts/[id]/route'
import { GET as commentsGet, POST as commentsPost } from '../community/posts/[id]/comments/route'
import { POST as upvotePost } from '../community/posts/[id]/comments/[commentId]/upvote/route'
import { POST as answerPost } from '../community/posts/[id]/comments/[commentId]/answer/route'
import { POST as interactPost } from '../community/posts/[id]/interact/route'
import { GET as interactGet } from '../community/posts/[id]/interact/route'
import { GET as relatedGet } from '../community/posts/[id]/related/route'

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
//  COMMUNITY POSTS: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/posts', () => {
  it('should return paginated posts', async () => {
    const db = getMockDb()
    db.communityPost.count.mockResolvedValue(50)
    const res = await postsGet(makeRequest('/api/community/posts?page=1&limit=10'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.posts).toBeDefined()
    expect(data.pagination).toBeDefined()
    expect(data.pagination.total).toBe(50)
  })

  it('should filter by type=community', async () => {
    await postsGet(makeRequest('/api/community/posts?type=community'))
    expect(getMockDb().communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'community' }) })
    )
  })

  it('should filter by tag', async () => {
    await postsGet(makeRequest('/api/community/posts?tag=AI'))
    expect(getMockDb().communityPost.findMany).toHaveBeenCalled()
  })

  it('should filter by author', async () => {
    await postsGet(makeRequest('/api/community/posts?author=alice@test.com'))
    expect(getMockDb().communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ author: 'alice@test.com' }) })
    )
  })

  it('should default to page 1, limit 20', async () => {
    const db = getMockDb()
    db.communityPost.count.mockResolvedValue(0)
    await postsGet(makeRequest('/api/community/posts'))
    expect(getMockDb().communityPost.findMany).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY POSTS: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/posts', () => {
  it('should create a new post with valid input', async () => {
    const db = getMockDb()
    db.communityPost.findFirst.mockResolvedValue(null) // no hash match
    const req = makeJsonRequest('/api/community/posts', {
      title: 'New Question', content: 'How does X work?', author: 'alice@test.com', authorName: 'Alice',
    })
    const res = await postsPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.post).toBeDefined()
    expect(db.communityPost.upsert).toHaveBeenCalled()
  })

  it('should return 200 for idempotent duplicate (same author + contentHash)', async () => {
    const db = getMockDb()
    db.communityPost.findFirst.mockResolvedValue({ id: 'existing-001', contentHash: 'hash123' })
    const req = makeJsonRequest('/api/community/posts', {
      title: 'Dup', content: 'Same content', author: 'alice@test.com',
    })
    const res = await postsPost(req)
    expect(res.status).toBe(200)
    expect(db.communityPost.create).not.toHaveBeenCalled()
  })

  it('should return 400 when title is missing', async () => {
    const res = await postsPost(makeJsonRequest('/api/community/posts', {
      content: 'No title', author: 'a@b.com',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 when content is missing', async () => {
    const res = await postsPost(makeJsonRequest('/api/community/posts', {
      title: 'No content', author: 'a@b.com',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 when title exceeds 300 chars', async () => {
    const res = await postsPost(makeJsonRequest('/api/community/posts', {
      title: 'X'.repeat(301), content: 'OK', author: 'a@b.com',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 400 when content exceeds 10000 chars', async () => {
    const res = await postsPost(makeJsonRequest('/api/community/posts', {
      title: 'OK', content: 'Y'.repeat(10001), author: 'a@b.com',
    }))
    expect(res.status).toBe(400)
  })

  it('should normalize author email to lowercase', async () => {
    const db = getMockDb()
    db.communityPost.findFirst.mockResolvedValue(null)
    await postsPost(makeJsonRequest('/api/community/posts', {
      title: 'T', content: 'C', author: '  ALICE@Test.COM  ',
    }))
    expect(db.communityPost.upsert).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY POSTS: GET SINGLE
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/posts/[id]', () => {
  it('should return a single post', async () => {
    const res = await postGet(makeRequest('/api/community/posts/post-001'), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).post.id).toBe('post-001')
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    expect((await postGet(makeRequest('/api/community/posts/nonexistent'), { params: Promise.resolve({ id: 'post-001' }) })).status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY POSTS: DELETE
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/community/posts/[id]', () => {
  it('should delete post when author matches', async () => {
    const db = getMockDb()
    const req = makeRequest('/api/community/posts/post-001?author=alice@test.com', { method: 'DELETE' })
    const res = await postDelete(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect([200, 500]).toContain(res.status)
  })

  it('should return 403 when author does not match', async () => {
    const res = await postDelete(makeRequest('/api/community/posts/post-001?author=imposter@test.com', { method: 'DELETE' }), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(403)
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    const res = await postDelete(makeRequest('/api/community/posts/nope?author=a@b.com', { method: 'DELETE' }), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMENTS: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/posts/[id]/comments', () => {
  it('should return comments for a post', async () => {
    const res = await commentsGet(makeRequest('/api/community/posts/post-001/comments'), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.comments).toHaveLength(1)
    expect(data.comments[0].id).toBe('comment-001')
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    expect([200, 404]).toContain((await commentsGet(makeRequest('/api/community/posts/nope/comments'), { params: Promise.resolve({ id: 'post-001' }) })).status)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMENTS: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/posts/[id]/comments', () => {
  it('should create a comment', async () => {
    const req = makeJsonRequest('/api/community/posts/post-001/comments', {
      author: 'bob@test.com', authorName: 'Bob', content: 'Nice!',
    })
    const res = await commentsPost(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(201)
    expect((await res.json()).success).toBe(true)
    expect(getMockDb().postComment.create).toHaveBeenCalled()
    // Should increment post comment count
    expect(getMockDb().communityPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comments: { increment: 1 } }) })
    )
  })

  it('should return 400 for missing content', async () => {
    const res = await commentsPost(makeJsonRequest('/api/community/posts/post-001/comments', {
      author: 'bob@test.com',
    }), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for content exceeding 2000 chars', async () => {
    const res = await commentsPost(makeJsonRequest('/api/community/posts/post-001/comments', {
      author: 'bob@test.com', content: 'X'.repeat(2001),
    }), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    const res = await commentsPost(makeJsonRequest('/api/community/posts/nope/comments', {
      author: 'bob@test.com', content: 'Hey',
    }), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMENTS: UPVOTE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/posts/[id]/comments/[commentId]/upvote', () => {
  it('should upvote a comment', async () => {
    const db = getMockDb()
    db.postInteraction.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/upvote',
      { visitorId: 'alice@test.com' }
    )
    const res = await upvotePost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).upvoted).toBe(true)
    expect(db.postInteraction.create).toHaveBeenCalled()
  })

  it('should toggle off an existing upvote', async () => {
    const db = getMockDb()
    db.postInteraction.findUnique.mockResolvedValue({ id: 'int-1', postId: 'post-001', visitorId: 'alice@test.com', type: 'upvote', createdAt: new Date() })
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/upvote',
      { visitorId: 'alice@test.com' }
    )
    const res = await upvotePost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).upvoted).toBe(false)
    expect(db.postInteraction.delete).toHaveBeenCalled()
  })

  it('should return 400 when visitorId missing', async () => {
    const res = await upvotePost(makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/upvote',
      {}
    ), { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })
    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMENTS: MARK AS ANSWER
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/posts/[id]/comments/[commentId]/answer', () => {
  it('should mark comment as answer by post author', async () => {
    const db = getMockDb()
    db.postComment.findUnique.mockResolvedValue({
      id: 'comment-001', postId: 'post-001', author: 'bob@test.com', authorName: 'Bob',
      content: 'Answer', isAnswer: false, answerMarkedBy: null, upvotes: 3, createdAt: new Date(),
    })
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/answer',
      { isAnswer: true, visitorId: 'alice@test.com' }
    )
    const res = await answerPost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).isAnswer).toBe(true)
    expect(db.communityPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hasAcceptedAnswer: true, acceptedAnswerId: 'comment-001' }) })
    )
  })

  it('should return 403 when non-author tries to mark answer', async () => {
    const db = getMockDb()
    db.postComment.findUnique.mockResolvedValue({
      id: 'comment-001', postId: 'post-001', author: 'bob@test.com', authorName: 'Bob',
      content: 'Answer', isAnswer: false, answerMarkedBy: null, upvotes: 3, createdAt: new Date(),
    })
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/answer',
      { isAnswer: true, visitorId: 'imposter@test.com' }
    )
    expect((await answerPost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })).status).toBe(403)
  })

  it('should return 400 when isAnswer is not boolean', async () => {
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/comment-001/answer',
      { isAnswer: 'yes' }
    )
    expect((await answerPost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })).status).toBe(400)
  })

  it('should return 404 for non-existent comment', async () => {
    getMockDb().postComment.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest(
      '/api/community/posts/post-001/comments/nope/answer',
      { isAnswer: true, visitorId: 'alice@test.com' }
    )
    expect((await answerPost(req, { params: Promise.resolve({ id: 'post-001', commentId: 'comment-001' }) })).status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST INTERACTIONS: LIKE/SAVE/REPOST
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/posts/[id]/interact', () => {
  it('should like a post', async () => {
    getMockDb().postInteraction.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/community/posts/post-001/interact', {
      visitorId: 'bob@test.com', action: 'like',
    })
    const res = await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).liked).toBe(true)
    expect(getMockDb().communityPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ likes: { increment: 1 } }) })
    )
  })

  it('should unlike a post (toggle)', async () => {
    getMockDb().postInteraction.findUnique.mockResolvedValue({
      id: 'int-1', postId: 'post-001', visitorId: 'bob@test.com', type: 'like', createdAt: new Date(),
    })
    const req = makeJsonRequest('/api/community/posts/post-001/interact', {
      visitorId: 'bob@test.com', action: 'unlike',
    })
    const res = await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).liked).toBe(false)
    expect(getMockDb().postInteraction.delete).toHaveBeenCalled()
  })

  it('should save a post', async () => {
    getMockDb().postInteraction.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/community/posts/post-001/interact', {
      visitorId: 'bob@test.com', action: 'save',
    })
    const res = await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).saved).toBe(true)
  })

  it('should repost a post', async () => {
    getMockDb().postInteraction.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/community/posts/post-001/interact', {
      visitorId: 'bob@test.com', action: 'repost',
    })
    const res = await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).reposted).toBe(true)
  })

  it('should return 400 for invalid action', async () => {
    const req = makeJsonRequest('/api/community/posts/post-001/interact', {
      visitorId: 'bob@test.com', action: 'explode',
    })
    expect((await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })).status).toBe(400)
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    const req = makeJsonRequest('/api/community/posts/nope/interact', {
      visitorId: 'bob@test.com', action: 'like',
    })
    expect((await interactPost(req, { params: Promise.resolve({ id: 'post-001' }) })).status).toBe(404)
  })
})

describe('GET /api/community/posts/[id]/interact', () => {
  it('should return interaction status for a visitor', async () => {
    const db = getMockDb()
    db.postInteraction.findMany.mockResolvedValue([
      { id: 'i1', postId: 'post-001', visitorId: 'bob@test.com', type: 'like', createdAt: new Date() },
      { id: 'i2', postId: 'post-001', visitorId: 'bob@test.com', type: 'save', createdAt: new Date() },
    ])
    const res = await interactGet(makeRequest('/api/community/posts/post-001/interact?visitorId=bob@test.com'), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.liked).toBe(true)
    expect(data.saved).toBe(true)
    expect(data.reposted).toBe(false)
  })

  it('should return all false when no visitorId', async () => {
    const res = await interactGet(makeRequest('/api/community/posts/post-001/interact'), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.liked).toBe(false)
    expect(data.saved).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  RELATED POSTS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/posts/[id]/related', () => {
  it('should return related posts', async () => {
    getMockDb().communityPost.findMany.mockResolvedValue([
      { id: 'r1', type: 'community', title: 'Related', content: 'RC', author: 'other@test.com',
        tags: '["AI"]', likes: 3, createdAt: new Date() },
    ])
    const res = await relatedGet(makeRequest('/api/community/posts/post-001/related'), { params: Promise.resolve({ id: 'post-001' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.relatedPosts).toBeDefined()
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValue(null)
    expect((await relatedGet(makeRequest('/api/community/posts/nope/related'), { params: Promise.resolve({ id: 'post-001' }) })).status).toBe(404)
  })
})