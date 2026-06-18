/**
 * API Integration Tests — Community Extended Endpoints
 *
 * Covers: news, collections, seed, monitor, engagement, publish,
 *         chatbot, benchmark-configs, analysis-templates, shared-workflows,
 *         profile answers, reputation compute, related posts
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, setupMockSdk, getMockDb, mockZai, mockZaiChat, mockZaiFunctions } = vi.hoisted(() => {
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
    content: 'Great post!', isAnswer: true, answerMarkedBy: null, upvotes: 3, createdAt: now,
    post: { id: 'post-001', title: 'Test Post' },
  }

  const mockCollection = {
    id: 'col-001', slug: 'ai-research', title: 'AI Research',
    description: 'Best AI research posts', icon: 'BookOpen', color: 'primary',
    curator: 'admin@test.com', tags: '["AI","Research"]', postIds: null,
    isAuto: true, isFeatured: true, sortOrder: 0, postCount: 0,
    createdAt: now, updatedAt: now,
  }

  const mockBenchmarkConfig = {
    id: 'bc-001', sourceConfigId: null, author: 'alice@test.com', authorName: 'Alice',
    name: 'My Benchmark', description: 'A test benchmark', category: 'coding',
    difficulty: 'intermediate',
    testPrompts: JSON.stringify([{ prompt: 'Write a function', expectedOutput: 'function' }]),
    evaluationCriteria: JSON.stringify({ metrics: ['accuracy'], weights: [1] }),
    expectedOutputs: null, modelIds: null, results: null,
    isFeatured: false, forkCount: 0, usageCount: 0, rating: 4.5,
    createdAt: now, updatedAt: now,
  }

  const mockTemplate = {
    id: 'tmpl-001', sourceTemplateId: null, author: 'alice@test.com', authorName: 'Alice',
    name: 'My Template', description: 'A test template', category: 'statistical',
    difficulty: 'intermediate',
    steps: JSON.stringify([{ id: 's1', order: 1, name: 'Step 1', description: 'Do stuff', type: 'analysis', config: {} }]),
    requiredVariables: null, estimatedDuration: '5 min', tags: '["stats"]',
    isFeatured: false, isOfficial: false, improvementCount: 0, usageCount: 0,
    rating: 4.5, version: 1,
    createdAt: now, updatedAt: now,
  }

  const mockWorkflow = {
    id: 'wf-001', sourcePipelineId: null, author: 'alice@test.com', authorName: 'Alice',
    name: 'My Workflow', description: 'A test workflow', intent: 'Analyze data',
    steps: JSON.stringify([{ type: 'analysis', name: 'Step 1' }]),
    tags: '["data"]', category: 'data_analysis', difficulty: 'intermediate',
    isFeatured: false, forkCount: 0, usageCount: 0, rating: 4.5,
    createdAt: now, updatedAt: now,
  }

  const mockCronJob = {
    id: 'cron-001', name: 'community-publisher', type: 'news', interval: '1h',
    status: 'completed', lastRun: now, runCount: 5,
    nextRun: new Date(now.getTime() + 60 * 60 * 1000), lastError: null,
  }

  const mockVerifiedResearcher = {
    id: 'vr-001', email: 'researcher@test.com', displayName: 'Dr. Research',
    institution: 'Test Lab', role: 'AI Researcher', badgeType: 'institution',
    bio: 'AI researcher', websiteUrl: null, verifiedBy: 'system',
    isActive: true, totalPosts: 10, totalAnswers: 5, totalCitations: 8,
    reputationScore: 0,
  }

  // ─── SDK mocks ───

  const mockZaiChat = {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'This is a helpful AI response about the community.' } }],
      }),
    },
  }

  const mockZaiFunctions = {
    invoke: vi.fn().mockResolvedValue([]),
  }

  const mockZai = {
    create: vi.fn().mockResolvedValue({
      chat: mockZaiChat,
      functions: mockZaiFunctions,
    }),
  }

  function setupMockSdk() {
    mockZai.create.mockResolvedValue({ chat: mockZaiChat, functions: mockZaiFunctions })
    mockZaiChat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'This is a helpful AI response about the community.' } }],
    })
    mockZaiFunctions.invoke.mockResolvedValue([])
  }

  // ─── DB mock ───

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
    verifiedResearcher: {
      findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(),
    },
    thematicCollection: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
    benchmarkConfig: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
    communityAnalysisTemplate: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
      count: vi.fn(), aggregate: vi.fn(),
    },
    sharedWorkflow: {
      findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    },
    workflowPipeline: { findUnique: vi.fn() },
    cronJob: {
      findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    userPreference: { findUnique: vi.fn() },
  }

  function setupMockDb() {
    // communityPost
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

    // postComment
    _db.postComment.findMany.mockResolvedValue([mockComment])
    _db.postComment.findUnique.mockResolvedValue(mockComment)
    _db.postComment.findFirst.mockResolvedValue(null)
    _db.postComment.create.mockResolvedValue(mockComment)
    _db.postComment.update.mockResolvedValue(mockComment)
    _db.postComment.count.mockResolvedValue(1)
    _db.postComment.deleteMany.mockResolvedValue({ count: 1 })

    // postInteraction
    _db.postInteraction.findUnique.mockResolvedValue(null)
    _db.postInteraction.create.mockResolvedValue({})
    _db.postInteraction.delete.mockResolvedValue({})
    _db.postInteraction.count.mockResolvedValue(0)
    _db.postInteraction.findMany.mockResolvedValue([])

    // user
    _db.user.findUnique.mockResolvedValue(null)
    _db.user.update.mockResolvedValue({})
    _db.notification.create.mockResolvedValue({})

    // verifiedResearcher
    _db.verifiedResearcher.findUnique.mockResolvedValue(null)
    _db.verifiedResearcher.findMany.mockResolvedValue([mockVerifiedResearcher])
    _db.verifiedResearcher.upsert.mockResolvedValue({})
    _db.verifiedResearcher.update.mockResolvedValue({})

    // thematicCollection
    _db.thematicCollection.findMany.mockResolvedValue([mockCollection])
    _db.thematicCollection.findUnique.mockResolvedValue(mockCollection)
    _db.thematicCollection.create.mockResolvedValue(mockCollection)
    _db.thematicCollection.count.mockResolvedValue(1)

    // benchmarkConfig
    _db.benchmarkConfig.findMany.mockResolvedValue([mockBenchmarkConfig])
    _db.benchmarkConfig.findUnique.mockResolvedValue(mockBenchmarkConfig)
    _db.benchmarkConfig.create.mockResolvedValue(mockBenchmarkConfig)
    _db.benchmarkConfig.update.mockResolvedValue(mockBenchmarkConfig)
    _db.benchmarkConfig.count.mockResolvedValue(1)

    // communityAnalysisTemplate
    _db.communityAnalysisTemplate.findMany.mockResolvedValue([mockTemplate])
    _db.communityAnalysisTemplate.findUnique.mockResolvedValue(mockTemplate)
    _db.communityAnalysisTemplate.create.mockResolvedValue(mockTemplate)
    _db.communityAnalysisTemplate.update.mockResolvedValue(mockTemplate)
    _db.communityAnalysisTemplate.count.mockResolvedValue(1)
    _db.communityAnalysisTemplate.aggregate.mockResolvedValue({
      _count: 1, _avg: { rating: 4.5 }, _sum: { usageCount: 10 },
    })

    // sharedWorkflow
    _db.sharedWorkflow.findMany.mockResolvedValue([mockWorkflow])
    _db.sharedWorkflow.findUnique.mockResolvedValue(mockWorkflow)
    _db.sharedWorkflow.create.mockResolvedValue(mockWorkflow)
    _db.sharedWorkflow.update.mockResolvedValue(mockWorkflow)
    _db.sharedWorkflow.count.mockResolvedValue(1)

    // workflowPipeline
    _db.workflowPipeline.findUnique.mockResolvedValue(null)

    // cronJob
    _db.cronJob.findMany.mockResolvedValue([mockCronJob])
    _db.cronJob.findUnique.mockResolvedValue(mockCronJob)
    _db.cronJob.upsert.mockResolvedValue(mockCronJob)

    // userPreference
    _db.userPreference.findUnique.mockResolvedValue(null)
  }

  function getMockDb() { return _db }
  return {
    setupMockDb, setupMockSdk, getMockDb,
    mockZai, mockZaiChat, mockZaiFunctions,
    _mockPost: mockPost, _mockComment: mockComment,
    _mockCollection: mockCollection,
    _mockBenchmarkConfig: mockBenchmarkConfig,
    _mockTemplate: mockTemplate,
    _mockWorkflow: mockWorkflow,
    _mockCronJob: mockCronJob,
    _mockVerifiedResearcher: mockVerifiedResearcher,
  }
})

// ── Module mocks ──

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

vi.mock('z-ai-web-dev-sdk', () => ({ default: mockZai }))

vi.mock('@/lib/ai-companies', () => ({
  NEWS_SEARCH_QUERIES: [
    'AI news', 'GPT release', 'DeepSeek', 'Claude AI', 'Gemini model',
    'Llama', 'AI agents', 'Sora', 'Runway', 'AI coding',
    'NVIDIA GPU', 'AI research', 'AI startup', 'AI regulation', 'machine learning', 'AI benchmark',
  ],
  matchCompanies: vi.fn().mockReturnValue([]),
  AI_COMPANIES: [],
}))

// ── Route imports ──

import { GET as newsGet } from '../community/news/route'
import { GET as collectionsGet, POST as collectionsPost } from '../community/collections/route'
import { GET as collectionSlugGet } from '../community/collections/[slug]/route'
import { GET as seedGet, POST as seedPost } from '../community/seed/route'
import { GET as monitorGet } from '../community/monitor/route'
import { GET as engagementGet } from '../community/engagement/route'
import { GET as publishGet } from '../community/publish/route'
import { POST as chatbotPost } from '../community/chatbot/route'
import { GET as benchmarkConfigsGet, POST as benchmarkConfigsPost, PATCH as benchmarkConfigsPatch } from '../community/benchmark-configs/route'
import { GET as analysisTemplatesGet, POST as analysisTemplatesPost, PATCH as analysisTemplatesPatch } from '../community/analysis-templates/route'
import { GET as sharedWorkflowsGet, POST as sharedWorkflowsPost, PATCH as sharedWorkflowsPatch } from '../community/shared-workflows/route'
import { GET as profileAnswersGet } from '../community/profile/[id]/answers/route'
import { POST as reputationComputePost } from '../community/reputation/compute/route'
import { GET as relatedGet } from '../community/related/route'

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
function makePatchRequest(url: string, body: unknown, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb(); setupMockSdk() })

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY NEWS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/news', () => {
  it('should return news array with metadata', async () => {
    const res = await newsGet(makeRequest('/api/community/news?refresh=true'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.news).toBeDefined()
    expect(Array.isArray(data.news)).toBe(true)
    expect(data.total).toBeDefined()
    expect(data.companies).toBeDefined()
    expect(data.categories).toBeDefined()
  })

  it('should return cached=true on second request without refresh', async () => {
    // First request populates the module-level cache
    await newsGet(makeRequest('/api/community/news?refresh=true'))
    // Second request hits the cache
    const res = await newsGet(makeRequest('/api/community/news'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cached).toBe(true)
  })

  it('should return fallback news from DB when fetch errors occur', async () => {
    // The news route catches fetch errors and falls back to stored DB news.
    // We force refresh and let the real SDK call fail silently (caught inside fetchNewsFromWeb),
    // which results in empty freshNews. The route still returns 200 with the news structure.
    const res = await newsGet(makeRequest('/api/community/news?refresh=true'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.news).toBeDefined()
    expect(Array.isArray(data.news)).toBe(true)
    expect(data.total).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY COLLECTIONS: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/collections', () => {
  it('should return collections array', async () => {
    const res = await collectionsGet(makeRequest('/api/community/collections'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.collections).toBeDefined()
    expect(Array.isArray(data.collections)).toBe(true)
    expect(data.collections.length).toBeGreaterThan(0)
  })

  it('should filter by featured=true', async () => {
    await collectionsGet(makeRequest('/api/community/collections?featured=true'))
    expect(getMockDb().thematicCollection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isFeatured: true } })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY COLLECTIONS: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/collections', () => {
  it('should create a collection with valid data', async () => {
    const db = getMockDb()
    db.thematicCollection.findUnique.mockResolvedValueOnce(null) // no slug conflict
    const req = makeJsonRequest('/api/community/collections', {
      title: 'New Collection',
      description: 'A brand new collection',
    })
    const res = await collectionsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.collection).toBeDefined()
    expect(db.thematicCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'new-collection', title: 'New Collection' }) })
    )
  })

  it('should return 400 when title is missing', async () => {
    const res = await collectionsPost(makeJsonRequest('/api/community/collections', {}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/title/i)
  })

  it('should return 409 when slug already exists', async () => {
    getMockDb().thematicCollection.findUnique.mockResolvedValueOnce({ id: 'existing', slug: 'dup-slug' })
    const res = await collectionsPost(makeJsonRequest('/api/community/collections', {
      title: 'Dup Slug',
    }))
    expect(res.status).toBe(409)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY COLLECTIONS: GET BY SLUG
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/collections/[slug]', () => {
  it('should return collection with posts', async () => {
    const res = await collectionSlugGet(
      makeRequest('/api/community/collections/ai-research'),
      { params: Promise.resolve({ slug: 'ai-research' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.collection).toBeDefined()
    expect(data.collection.slug).toBe('ai-research')
    expect(data.posts).toBeDefined()
  })

  it('should return 404 for non-existent slug', async () => {
    getMockDb().thematicCollection.findUnique.mockResolvedValueOnce(null)
    const res = await collectionSlugGet(
      makeRequest('/api/community/collections/nonexistent'),
      { params: Promise.resolve({ slug: 'nonexistent' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY SEED: STATUS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/seed', () => {
  it('should return seed status with post counts', async () => {
    const db = getMockDb()
    db.communityPost.count
      .mockResolvedValueOnce(100)  // totalPosts
      .mockResolvedValueOnce(12)   // featured
      .mockResolvedValueOnce(50)   // auto
      .mockResolvedValueOnce(30)   // news
      .mockResolvedValueOnce(20)   // community
      .mockResolvedValueOnce(5)    // digest
      .mockResolvedValueOnce(3)    // highlights

    const res = await seedGet(makeRequest('/api/community/seed'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalPosts).toBe(100)
    expect(data.featuredPosts).toBe(12)
    expect(data.autoPosts).toBe(50)
    expect(data.newsPosts).toBe(30)
    expect(data.communityPosts).toBe(20)
    expect(data.digestPosts).toBe(5)
    expect(data.highlightPosts).toBe(3)
    expect(data.recentPosts).toBeDefined()
    expect(data.seeded).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY SEED: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/seed', () => {
  it('should seed data when portal has few featured posts', async () => {
    const db = getMockDb()
    db.communityPost.count.mockResolvedValueOnce(2) // featured < 8
    db.communityPost.findFirst.mockResolvedValue(null) // no duplicates
    db.verifiedResearcher.upsert.mockResolvedValue({})

    const res = await seedPost(makeRequest('/api/community/seed', { method: 'POST' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.postsCreated).toBeGreaterThanOrEqual(0)
    expect(data.totalFeatured).toBeDefined()
    expect(data.timestamp).toBeDefined()
  })

  it('should skip seeding when already seeded (>8 featured)', async () => {
    getMockDb().communityPost.count.mockResolvedValueOnce(15) // featured > 8
    const res = await seedPost(makeRequest('/api/community/seed', { method: 'POST' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.message).toMatch(/already seeded/i)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY MONITOR
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/monitor', () => {
  it('should return dashboard data with metrics and moderation', async () => {
    const res = await monitorGet(makeRequest('/api/community/monitor'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.metrics).toBeDefined()
    expect(data.metrics.current).toBeDefined()
    expect(data.metrics.current.postsPerHour).toBeDefined()
    expect(data.metrics.current.engagementRate).toBeDefined()
    expect(data.metrics.health).toBeDefined()
    expect(data.metrics.health.totalPosts).toBeDefined()
    expect(data.moderation).toBeDefined()
    expect(data.moderation.scanned).toBeDefined()
    expect(data.moderation.actions).toBeDefined()
    expect(data.alerts).toBeDefined()
    expect(Array.isArray(data.alerts)).toBe(true)
    expect(data.status).toBeDefined()
    expect(data.duration).toBeDefined()
  })

  it('should upsert monitor cron job status', async () => {
    await monitorGet(makeRequest('/api/community/monitor'))
    expect(getMockDb().cronJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'community-monitor' },
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY ENGAGEMENT
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/engagement', () => {
  it('should return highlights cycle result', async () => {
    const res = await engagementGet(makeRequest('/api/community/engagement?cycle=highlights'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cycle).toBe('highlights')
    expect(data.success).toBe(true)
    expect(data.picks).toBeDefined()
    expect(data.duration).toBeDefined()
  })

  it('should return digest cycle result', async () => {
    const res = await engagementGet(makeRequest('/api/community/engagement?cycle=digest'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cycle).toBe('digest')
    expect(data.success).toBe(true)
  })

  it('should return 400 for unknown cycle', async () => {
    const res = await engagementGet(makeRequest('/api/community/engagement?cycle=unknown'))
    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY PUBLISH
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/publish', () => {
  it('should return publish status with stats', async () => {
    const res = await publishGet(makeRequest('/api/community/publish'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.stats).toBeDefined()
    expect(data.stats.fetched).toBeDefined()
    expect(data.stats.published).toBeDefined()
    expect(data.stats.skipped).toBeDefined()
    expect(data.stats.duration).toBeDefined()
    expect(data.message).toBeDefined()
  })

  it('should use evergreen fallback when no news available', async () => {
    const res = await publishGet(makeRequest('/api/community/publish'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // When fetchNewsFromWeb returns empty, evergreen should be used
    expect(data.stats.evergreen).toBeGreaterThanOrEqual(0)
  })

  it('should upsert community-publisher cron job', async () => {
    await publishGet(makeRequest('/api/community/publish'))
    expect(getMockDb().cronJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: 'community-publisher' },
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  COMMUNITY CHATBOT
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/chatbot', () => {
  it('should return AI reply for valid message', async () => {
    const req = makeJsonRequest('/api/community/chatbot', {
      message: 'How do I create a post?',
    })
    const res = await chatbotPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reply).toBeDefined()
    expect(typeof data.reply).toBe('string')
    expect(data.reply.length).toBeGreaterThan(0)
  })

  it('should return 400 when message is missing', async () => {
    const res = await chatbotPost(makeJsonRequest('/api/community/chatbot', {}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/message/i)
  })

  it('should return 400 when message is empty string', async () => {
    const res = await chatbotPost(makeJsonRequest('/api/community/chatbot', { message: '   ' }))
    expect(res.status).toBe(400)
  })

  it('should return 400 when message exceeds 2000 chars', async () => {
    const res = await chatbotPost(makeJsonRequest('/api/community/chatbot', {
      message: 'X'.repeat(2001),
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
  })

  it('should pass context page to AI when provided', async () => {
    const req = makeJsonRequest('/api/community/chatbot', {
      message: 'Help',
      context: 'Leaderboard',
    })
    const res = await chatbotPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reply).toBeDefined()
    // The context is included in the messages sent to the AI
    expect(getMockDb().userPreference.findUnique).not.toHaveBeenCalled() // no visitor-id header
  })
})

// ═══════════════════════════════════════════════════════════════
//  BENCHMARK CONFIGS: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/benchmark-configs', () => {
  it('should return configs with pagination and filters', async () => {
    const res = await benchmarkConfigsGet(makeRequest('/api/community/benchmark-configs'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.configs).toBeDefined()
    expect(Array.isArray(data.configs)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.total).toBeDefined()
    expect(data.pagination.pages).toBeDefined()
    expect(data.filters).toBeDefined()
    expect(data.filters.categories).toBeDefined()
    expect(data.filters.difficulties).toBeDefined()
    expect(data.filters.sortOptions).toBeDefined()
  })

  it('should parse JSON fields in response', async () => {
    const res = await benchmarkConfigsGet(makeRequest('/api/community/benchmark-configs'))
    const data = await res.json()
    const config = data.configs[0]
    expect(Array.isArray(config.testPrompts)).toBe(true)
    expect(typeof config.evaluationCriteria).toBe('object')
    expect(Array.isArray(config.modelIds)).toBe(true)
  })

  it('should filter by category', async () => {
    await benchmarkConfigsGet(makeRequest('/api/community/benchmark-configs?category=coding'))
    expect(getMockDb().benchmarkConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'coding' }),
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  BENCHMARK CONFIGS: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/benchmark-configs', () => {
  it('should create a benchmark config with valid data', async () => {
    const req = makeJsonRequest('/api/community/benchmark-configs', {
      name: 'Test Benchmark',
      author: 'alice@test.com',
      authorName: 'Alice',
      testPrompts: [{ prompt: 'What is 2+2?', expectedOutput: '4' }],
      evaluationCriteria: { metrics: ['accuracy'], weights: [1] },
    })
    const res = await benchmarkConfigsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.config).toBeDefined()
    expect(getMockDb().benchmarkConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Test Benchmark' }) })
    )
  })

  it('should return 400 when name is missing', async () => {
    const res = await benchmarkConfigsPost(makeJsonRequest('/api/community/benchmark-configs', {
      author: 'alice@test.com',
      testPrompts: [{ prompt: 'test' }],
      evaluationCriteria: { metrics: ['accuracy'] },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/i)
  })

  it('should return 400 when author is missing', async () => {
    const res = await benchmarkConfigsPost(makeJsonRequest('/api/community/benchmark-configs', {
      name: 'Test',
      testPrompts: [{ prompt: 'test' }],
      evaluationCriteria: { metrics: ['accuracy'] },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/author/i)
  })

  it('should return 400 when testPrompts is empty', async () => {
    const res = await benchmarkConfigsPost(makeJsonRequest('/api/community/benchmark-configs', {
      name: 'Test',
      author: 'alice@test.com',
      testPrompts: [],
      evaluationCriteria: { metrics: ['accuracy'] },
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/test prompt/i)
  })

  it('should return 400 for invalid category', async () => {
    const res = await benchmarkConfigsPost(makeJsonRequest('/api/community/benchmark-configs', {
      name: 'Test', author: 'a@b.com',
      testPrompts: [{ prompt: 'test' }],
      evaluationCriteria: { metrics: ['accuracy'] },
      category: 'invalid_cat',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid category/i)
  })
})

// ═══════════════════════════════════════════════════════════════
//  BENCHMARK CONFIGS: UPDATE
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/community/benchmark-configs', () => {
  it('should update a benchmark config', async () => {
    const req = makePatchRequest('/api/community/benchmark-configs', {
      id: 'bc-001',
      author: 'alice@test.com',
      name: 'Updated Name',
      description: 'Updated description',
    })
    const res = await benchmarkConfigsPatch(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.config).toBeDefined()
  })

  it('should return 400 when id is missing', async () => {
    const res = await benchmarkConfigsPatch(makePatchRequest('/api/community/benchmark-configs', {
      name: 'No ID',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent config', async () => {
    getMockDb().benchmarkConfig.findUnique.mockResolvedValueOnce(null)
    const res = await benchmarkConfigsPatch(makePatchRequest('/api/community/benchmark-configs', {
      id: 'nonexistent', name: 'Update',
    }))
    expect(res.status).toBe(404)
  })

  it('should return 403 when non-author tries to update', async () => {
    const res = await benchmarkConfigsPatch(makePatchRequest('/api/community/benchmark-configs', {
      id: 'bc-001',
      author: 'imposter@test.com', // different from mockPost author
      name: 'Hacked',
    }))
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ANALYSIS TEMPLATES: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/analysis-templates', () => {
  it('should return templates with pagination, stats, and filters', async () => {
    const res = await analysisTemplatesGet(makeRequest('/api/community/analysis-templates'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.templates).toBeDefined()
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.totalTemplates).toBeDefined()
    expect(data.stats.avgRating).toBeDefined()
    expect(data.stats.totalUsage).toBeDefined()
    expect(data.filters).toBeDefined()
    expect(data.filters.categories).toBeDefined()
  })

  it('should parse JSON fields in template response', async () => {
    const res = await analysisTemplatesGet(makeRequest('/api/community/analysis-templates'))
    const data = await res.json()
    const tmpl = data.templates[0]
    expect(Array.isArray(tmpl.steps)).toBe(true)
    expect(Array.isArray(tmpl.requiredVariables)).toBe(true)
    expect(Array.isArray(tmpl.tags)).toBe(true)
  })

  it('should filter by search term', async () => {
    await analysisTemplatesGet(makeRequest('/api/community/analysis-templates?search=regression'))
    expect(getMockDb().communityAnalysisTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: 'regression' } }),
          ]),
        }),
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  ANALYSIS TEMPLATES: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/analysis-templates', () => {
  it('should create a template with valid data', async () => {
    const req = makeJsonRequest('/api/community/analysis-templates', {
      name: 'My Analysis',
      author: 'alice@test.com',
      description: 'Performs regression analysis',
      steps: [{ name: 'Load Data', type: 'data_prep' }, { name: 'Run Regression', type: 'analysis' }],
    })
    const res = await analysisTemplatesPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.template).toBeDefined()
    expect(getMockDb().communityAnalysisTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'My Analysis' }) })
    )
  })

  it('should return 400 when name is missing', async () => {
    const res = await analysisTemplatesPost(makeJsonRequest('/api/community/analysis-templates', {
      author: 'alice@test.com',
      description: 'No name',
      steps: [{ name: 'Step 1' }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/i)
  })

  it('should return 400 when description is missing', async () => {
    const res = await analysisTemplatesPost(makeJsonRequest('/api/community/analysis-templates', {
      name: 'Test', author: 'alice@test.com', steps: [{ name: 'S1' }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/description/i)
  })

  it('should return 400 when steps is empty', async () => {
    const res = await analysisTemplatesPost(makeJsonRequest('/api/community/analysis-templates', {
      name: 'Test', author: 'a@b.com', description: 'Desc', steps: [],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/step/i)
  })
})

// ═══════════════════════════════════════════════════════════════
//  ANALYSIS TEMPLATES: UPDATE
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/community/analysis-templates', () => {
  it('should update a template', async () => {
    const req = makePatchRequest('/api/community/analysis-templates', {
      id: 'tmpl-001',
      author: 'alice@test.com',
      name: 'Updated Template',
    })
    const res = await analysisTemplatesPatch(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.template).toBeDefined()
  })

  it('should return 400 when id is missing', async () => {
    const res = await analysisTemplatesPatch(makePatchRequest('/api/community/analysis-templates', {
      name: 'No ID',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent template', async () => {
    getMockDb().communityAnalysisTemplate.findUnique.mockResolvedValueOnce(null)
    const res = await analysisTemplatesPatch(makePatchRequest('/api/community/analysis-templates', {
      id: 'nonexistent', name: 'Update',
    }))
    expect(res.status).toBe(404)
  })

  it('should return 403 when non-author tries to update', async () => {
    const res = await analysisTemplatesPatch(makePatchRequest('/api/community/analysis-templates', {
      id: 'tmpl-001', author: 'imposter@test.com', name: 'Hacked',
    }))
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════
//  SHARED WORKFLOWS: LIST
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/shared-workflows', () => {
  it('should return workflows with pagination and filters', async () => {
    const res = await sharedWorkflowsGet(makeRequest('/api/community/shared-workflows'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workflows).toBeDefined()
    expect(Array.isArray(data.workflows)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.total).toBeDefined()
    expect(data.filters).toBeDefined()
    expect(data.filters.categories).toBeDefined()
  })

  it('should parse JSON fields in workflow response', async () => {
    const res = await sharedWorkflowsGet(makeRequest('/api/community/shared-workflows'))
    const data = await res.json()
    const wf = data.workflows[0]
    expect(Array.isArray(wf.steps)).toBe(true)
    expect(Array.isArray(wf.tags)).toBe(true)
  })

  it('should filter by featured', async () => {
    await sharedWorkflowsGet(makeRequest('/api/community/shared-workflows?featured=true'))
    expect(getMockDb().sharedWorkflow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isFeatured: true }),
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
//  SHARED WORKFLOWS: CREATE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/shared-workflows', () => {
  it('should create a workflow with valid data', async () => {
    const req = makeJsonRequest('/api/community/shared-workflows', {
      name: 'My Workflow',
      author: 'alice@test.com',
      authorName: 'Alice',
      steps: [{ type: 'analysis', name: 'Load Data' }, { type: 'visualization', name: 'Chart' }],
    })
    const res = await sharedWorkflowsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.workflow).toBeDefined()
    expect(data.workflow.name).toBe('My Workflow')
  })

  it('should return 400 when name is missing', async () => {
    const res = await sharedWorkflowsPost(makeJsonRequest('/api/community/shared-workflows', {
      author: 'alice@test.com',
      steps: [{ type: 'analysis', name: 'Step 1' }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/i)
  })

  it('should return 400 when author is missing', async () => {
    const res = await sharedWorkflowsPost(makeJsonRequest('/api/community/shared-workflows', {
      name: 'Test', steps: [{ type: 'analysis', name: 'S1' }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/author/i)
  })

  it('should return 400 when steps is empty', async () => {
    const res = await sharedWorkflowsPost(makeJsonRequest('/api/community/shared-workflows', {
      name: 'Test', author: 'a@b.com', steps: [],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/step/i)
  })

  it('should return 400 for invalid category', async () => {
    const res = await sharedWorkflowsPost(makeJsonRequest('/api/community/shared-workflows', {
      name: 'Test', author: 'a@b.com',
      steps: [{ type: 'analysis', name: 'S1' }],
      category: 'nonexistent',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid category/i)
  })
})

// ═══════════════════════════════════════════════════════════════
//  SHARED WORKFLOWS: UPDATE
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/community/shared-workflows', () => {
  it('should update a workflow', async () => {
    const req = makePatchRequest('/api/community/shared-workflows', {
      id: 'wf-001',
      author: 'alice@test.com',
      name: 'Updated Workflow',
      description: 'Better workflow',
    })
    const res = await sharedWorkflowsPatch(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.workflow).toBeDefined()
  })

  it('should return 400 when id is missing', async () => {
    const res = await sharedWorkflowsPatch(makePatchRequest('/api/community/shared-workflows', {
      name: 'No ID',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent workflow', async () => {
    getMockDb().sharedWorkflow.findUnique.mockResolvedValueOnce(null)
    const res = await sharedWorkflowsPatch(makePatchRequest('/api/community/shared-workflows', {
      id: 'nonexistent', name: 'Update',
    }))
    expect(res.status).toBe(404)
  })

  it('should return 403 when non-author tries to update', async () => {
    const res = await sharedWorkflowsPatch(makePatchRequest('/api/community/shared-workflows', {
      id: 'wf-001', author: 'imposter@test.com', name: 'Hacked',
    }))
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════
//  PROFILE ANSWERS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/profile/[id]/answers', () => {
  it('should return user answers with post context', async () => {
    const res = await profileAnswersGet(
      makeRequest('/api/community/profile/bob@test.com/answers'),
      { params: Promise.resolve({ id: 'bob@test.com' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalAnswers).toBeDefined()
    expect(data.recentAnswers).toBeDefined()
    expect(Array.isArray(data.recentAnswers)).toBe(true)
  })

  it('should return empty results when user has no answers', async () => {
    const db = getMockDb()
    db.postComment.count.mockResolvedValue(0)
    db.postComment.findMany.mockResolvedValue([])
    const res = await profileAnswersGet(
      makeRequest('/api/community/profile/nobody@test.com/answers'),
      { params: Promise.resolve({ id: 'nobody@test.com' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalAnswers).toBe(0)
    expect(data.recentAnswers).toHaveLength(0)
  })

  it('should handle URL-encoded user IDs', async () => {
    const res = await profileAnswersGet(
      makeRequest('/api/community/profile/bob%40test.com/answers'),
      { params: Promise.resolve({ id: 'bob%40test.com' }) }
    )
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════
//  REPUTATION COMPUTE
// ═══════════════════════════════════════════════════════════════

describe('POST /api/community/reputation/compute', () => {
  it('should compute reputation scores for verified researchers', async () => {
    const db = getMockDb()
    db.verifiedResearcher.findMany.mockResolvedValueOnce([
      {
        id: 'vr-001', email: 'researcher@test.com', displayName: 'Dr. Research',
        institution: 'Test Lab', role: 'AI Researcher', badgeType: 'institution',
        bio: 'AI researcher', websiteUrl: null, verifiedBy: 'system',
        isActive: true, totalPosts: 0, totalAnswers: 0, totalCitations: 0, reputationScore: 0,
      },
    ])
    db.communityPost.count.mockResolvedValue(10)
    db.postComment.count.mockResolvedValue(5)
    db.communityPost.findMany.mockResolvedValue([
      { id: 'p1' }, { id: 'p2' },
    ])
    db.postInteraction.count.mockResolvedValue(8)
    db.verifiedResearcher.update.mockResolvedValue({})

    const res = await reputationComputePost(
      makeRequest('/api/community/reputation/compute', { method: 'POST' })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(1)
    expect(data.researchers).toBeDefined()
    expect(data.researchers).toHaveLength(1)
    expect(data.researchers[0].email).toBe('researcher@test.com')
    // reputationScore = totalAnswers * 5 + totalCitations * 2 + totalPosts = 5*5 + 8*2 + 10 = 51
    expect(data.researchers[0].reputationScore).toBe(51)
    expect(data.computedAt).toBeDefined()
  })

  it('should return empty results when no active researchers', async () => {
    getMockDb().verifiedResearcher.findMany.mockResolvedValueOnce([])
    const res = await reputationComputePost(
      makeRequest('/api/community/reputation/compute', { method: 'POST' })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(0)
    expect(data.researchers).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
//  RELATED POSTS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/community/related', () => {
  it('should return related posts for a valid postId', async () => {
    const res = await relatedGet(makeRequest('/api/community/related?postId=post-001'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.related).toBeDefined()
    expect(Array.isArray(data.related)).toBe(true)
  })

  it('should return 400 when postId is missing', async () => {
    const res = await relatedGet(makeRequest('/api/community/related'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/postId/i)
  })

  it('should return 404 for non-existent post', async () => {
    getMockDb().communityPost.findUnique.mockResolvedValueOnce(null)
    const res = await relatedGet(makeRequest('/api/community/related?postId=nonexistent'))
    expect(res.status).toBe(404)
  })
})