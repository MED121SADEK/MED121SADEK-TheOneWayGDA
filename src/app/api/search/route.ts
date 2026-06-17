import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cachedJson } from '@/lib/api-cache'

/**
 * GET /api/search — Unified multi-source search
 *
 * Aggregates results from community posts, news, leaderboard models,
 * and internal pages. Queries the database directly (no self-calling).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const source = searchParams.get('source') || 'all'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10) || 5, 1), 20)

    if (!q) {
      return cachedJson(
        { query: '', results: { community: [], news: [], leaderboard: [], pages: [] }, total: 0 },
        'none'
      )
    }

    // Fetch results from multiple sources in parallel
    const [communityResults, newsResults, leaderboardResults] = await Promise.allSettled([
      (source === 'all' || source === 'community')
        ? searchCommunityPosts(q, limit)
        : Promise.resolve([]),
      (source === 'all' || source === 'news')
        ? searchNews(q, limit)
        : Promise.resolve([]),
      (source === 'all' || source === 'leaderboard')
        ? searchLeaderboardModels(q, limit)
        : Promise.resolve([]),
    ])

    const community = communityResults.status === 'fulfilled' ? communityResults.value : []
    const news = newsResults.status === 'fulfilled' ? newsResults.value : []
    const leaderboard = leaderboardResults.status === 'fulfilled' ? leaderboardResults.value : []

    // Internal pages (static, keyword matching)
    const pages = (source === 'all' || source === 'pages')
      ? searchPages(q)
      : []

    const total = community.length + news.length + leaderboard.length + pages.length

    return cachedJson(
      { query: q, results: { community, news, leaderboard, pages }, total },
      'short' // 60s cache
    )
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { query: '', results: { community: [], news: [], leaderboard: [], pages: [] }, total: 0 },
      { status: 500 }
    )
  }
}

// ─── Direct DB queries (no self-calling) ───

async function searchCommunityPosts(q: string, limit: number) {
  const posts = await db.communityPost.findMany({
    where: {
      type: 'community',
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
      ],
    },
    select: {
      id: true, title: true, content: true, likes: true,
      sourceUrl: true, sourceName: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return posts.map(p => ({
    id: p.id,
    title: p.title,
    description: (p.content || '').slice(0, 120),
    type: 'community' as const,
    likes: p.likes,
    createdAt: p.createdAt,
    sourceUrl: p.sourceUrl,
    path: `/community/${p.id}`,
  }))
}

async function searchNews(q: string, limit: number) {
  const posts = await db.communityPost.findMany({
    where: {
      type: 'news',
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
        { sourceName: { contains: q } },
      ],
    },
    select: {
      id: true, title: true, content: true,
      sourceUrl: true, sourceName: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return posts.map(p => ({
    id: p.id,
    title: p.title,
    description: (p.content || '').slice(0, 120),
    type: 'news' as const,
    sourceName: p.sourceName,
    createdAt: p.createdAt,
    sourceUrl: p.sourceUrl,
  }))
}

async function searchLeaderboardModels(q: string, limit: number) {
  const models = await db.aiModel.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { provider: { contains: q } },
        { modelType: { contains: q } },
      ],
    },
    select: { id: true, name: true, provider: true, modelType: true },
    take: limit,
  })

  return models.map(m => ({
    id: m.id,
    title: m.name,
    description: `${m.provider}${m.modelType ? ` — ${m.modelType}` : ''}`,
    type: 'leaderboard' as const,
    path: '/leaderboard',
  }))
}

// ─── Internal pages search ───
const INTERNAL_PAGES = [
  { path: '/workspace', title: '360° Workspace', keywords: ['workspace', 'data', 'analysis', 'spreadsheet', 'editor', 'import', 'scan'] },
  { path: '/community', title: 'Community Feed', keywords: ['community', 'posts', 'discuss', 'questions', 'forum'] },
  { path: '/leaderboard', title: 'AI Model Leaderboard', keywords: ['leaderboard', 'models', 'ai', 'benchmark', 'compare', 'ranking'] },
  { path: '/dashboard', title: 'Dashboard', keywords: ['dashboard', 'analytics', 'settings', 'profile', 'account'] },
  { path: '/teams', title: 'Teams', keywords: ['teams', 'collaboration', 'group', 'members'] },
  { path: '/tutorials', title: 'Tutorials', keywords: ['tutorial', 'guide', 'learn', 'howto', 'help'] },
]

function searchPages(q: string) {
  const lower = q.toLowerCase()
  return INTERNAL_PAGES
    .filter(p => p.title.toLowerCase().includes(lower) || p.keywords.some(k => k.includes(lower)))
    .map(p => ({
      id: `page-${p.path}`,
      title: p.title,
      description: p.keywords.slice(0, 4).join(', '),
      type: 'page' as const,
      path: p.path,
    }))
}