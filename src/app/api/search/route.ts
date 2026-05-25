import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search — Unified multi-source search
 *
 * Aggregates results from community posts, news, leaderboard models,
 * and internal pages. Returns results grouped by source.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const source = searchParams.get('source') || 'all'
    const sort = searchParams.get('sort') || 'latest'
    const dateRange = searchParams.get('dateRange') || 'all'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10) || 5, 1), 20)

    if (!q) {
      return NextResponse.json({ query: '', results: { community: [], news: [], leaderboard: [], pages: [] }, total: 0 })
    }

    // Build date filter
    const now = new Date()
    let from: Date | undefined
    switch (dateRange) {
      case 'week': from = new Date(now.getTime() - 7 * 86400000); break
      case 'month': from = new Date(now.getTime() - 30 * 86400000); break
      case 'year': from = new Date(now.getTime() - 365 * 86400000); break
    }

    const fromParam = from ? from.toISOString().split('T')[0] : undefined

    // Fetch results from multiple sources in parallel
    const [communityResults, newsResults, leaderboardResults] = await Promise.allSettled([
      // Only fetch community/news if source is 'all', 'community', or 'news'
      (source === 'all' || source === 'community')
        ? fetchCommunityPosts(q, sort, limit, fromParam)
        : Promise.resolve([]),
      (source === 'all' || source === 'news')
        ? fetchNews(q, sort, limit, fromParam)
        : Promise.resolve([]),
      (source === 'all' || source === 'leaderboard')
        ? fetchLeaderboardModels(q, limit)
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

    return NextResponse.json({
      query: q,
      results: { community, news, leaderboard, pages },
      total,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ query: '', results: { community: [], news: [], leaderboard: [], pages: [] }, total: 0 }, { status: 500 })
  }
}

/* ─── Source fetchers (internal fetch to avoid import issues) ─── */

async function fetchCommunityPosts(q: string, sort: string, limit: number, from?: string) {
  try {
    const params = new URLSearchParams({ search: q, limit: String(limit), sort, type: 'community' })
    if (from) params.set('from', from)
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/community/posts?${params}`, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.posts || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      description: typeof p.content === 'string' ? p.content.slice(0, 120) : '',
      type: 'community',
      likes: p.likes,
      createdAt: p.createdAt,
      sourceUrl: p.sourceUrl,
      path: `/community/${p.id}`,
    }))
  } catch {
    return []
  }
}

async function fetchNews(q: string, sort: string, limit: number, from?: string) {
  try {
    const params = new URLSearchParams({ search: q, limit: String(limit), sort, type: 'news' })
    if (from) params.set('from', from)
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/community/posts?${params}`, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.posts || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      description: typeof p.content === 'string' ? p.content.slice(0, 120) : '',
      type: 'news',
      sourceName: p.sourceName,
      createdAt: p.createdAt,
      sourceUrl: p.sourceUrl,
    }))
  } catch {
    return []
  }
}

async function fetchLeaderboardModels(q: string, limit: number) {
  try {
    const params = new URLSearchParams({ search: q, limit: String(limit) })
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/leaderboard?${params}`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()
    const models = data.models || data.data?.models || []
    return models.slice(0, limit).map((m: Record<string, unknown>) => ({
      id: m.id,
      title: m.name || m.modelName,
      description: m.provider || m.modelType || '',
      type: 'leaderboard',
      path: '/leaderboard',
    }))
  } catch {
    return []
  }
}

/* ─── Internal pages search ─── */
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
      type: 'page',
      path: p.path,
    }))
}
