import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Admin Community Management API
 *
 * GET  /api/admin/community           — Dashboard stats (posts, flagged, hidden, cron health, engagement)
 * GET  /api/admin/community?section=posts&type=all&status=all&page=1&search=...
 *                                      — List posts with moderation filters
 * PATCH /api/admin/community          — Moderate posts (hide, unhide, feature, delete)
 * POST  /api/admin/community?trigger=publish  — Trigger manual auto-publish
 * POST  /api/admin/community?trigger=digest   — Trigger manual digest
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'dashboard'

    if (section === 'dashboard') {
      return getDashboardStats()
    }

    if (section === 'posts') {
      return getPosts(searchParams)
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Community] GET error:', error)
    return NextResponse.json({ error: 'Failed to load admin data' }, { status: 500 })
  }
}

/* ─── Dashboard Stats ─── */

async function getDashboardStats() {
  const now = new Date()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalPosts,
    postsLastHour,
    postsLast24h,
    autoPostsLast24h,
    userPostsLast24h,
    flaggedPosts,
    hiddenPosts,
    featuredPosts,
    cronJobs,
    recentPosts,
    topAuthors,
    uniqueAuthors7d,
  ] = await Promise.all([
    db.communityPost.count(),
    db.communityPost.count({ where: { createdAt: { gte: oneHourAgo } } }),
    db.communityPost.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    db.communityPost.count({ where: { author: 'THEONEWAYGDA_AI', createdAt: { gte: twentyFourHoursAgo } } }),
    db.communityPost.count({ where: { author: { not: 'THEONEWAYGDA_AI' }, createdAt: { gte: twentyFourHoursAgo } } }),
    db.communityPost.count({ where: { tags: { contains: 'Flagged' } } }),
    db.communityPost.count({ where: { tags: { contains: 'Hidden' } } }),
    db.communityPost.count({ where: { featured: true } } }),
    db.cronJob.findMany({ orderBy: { lastRun: 'desc' }, take: 20 }),
    db.communityPost.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    // Top 5 authors by post count in last 7 days
    db.$queryRaw<Array<{ author: string; count: bigint }>>`
      SELECT author, COUNT(*) as count
      FROM "CommunityPost"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY author
      ORDER BY count DESC
      LIMIT 5
    `,
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT author) as count
      FROM "CommunityPost"
      WHERE "createdAt" >= ${sevenDaysAgo}
    `,
  ])

  // Engagement stats
  const engagementData = await db.communityPost.findMany({
    where: { createdAt: { gte: twentyFourHoursAgo } },
    select: { likes: true, comments: true, reposts: true, saves: true },
  })
  const totalEngagement24h = engagementData.reduce(
    (sum, p) => sum + p.likes + p.comments + p.reposts + p.saves, 0
  )

  // Category breakdown
  const categoryBreakdown = await db.$queryRaw<Array<{ category: string; count: bigint }>>`
    SELECT
      CASE
        WHEN "tags" LIKE '%Research%' THEN 'Research'
        WHEN "tags" LIKE '%Innovation%' THEN 'Innovation'
        ELSE 'AI'
      END as category,
      COUNT(*) as count
    FROM "CommunityPost"
    WHERE "createdAt" >= ${sevenDaysAgo}
    GROUP BY category
    ORDER BY count DESC
  `

  // Type breakdown
  const typeBreakdown = await db.$queryRaw<Array<{ type: string; count: bigint }>>`
    SELECT type, COUNT(*) as count
    FROM "CommunityPost"
    GROUP BY type
    ORDER BY count DESC
  `

  // Cron health summary
  const cronHealth = cronJobs.map(c => ({
    name: c.name,
    type: c.type,
    status: c.status,
    interval: c.interval,
    lastRun: c.lastRun,
    nextRun: c.nextRun,
    lastError: c.lastError,
    runCount: c.runCount,
    isStale: c.nextRun && new Date(c.nextRun) < now ? true : false,
    timeSinceLastRun: c.lastRun ? Math.floor((Date.now() - c.lastRun.getTime()) / 60000) : null,
  }))

  const healthyCrons = cronHealth.filter(c => c.status === 'completed' || c.status === 'idle').length
  const warningCrons = cronHealth.filter(c => c.status === 'warning').length
  const failedCrons = cronHealth.filter(c => c.status === 'failed').length
  const staleCrons = cronHealth.filter(c => c.isStale).length

  return NextResponse.json({
    stats: {
      totalPosts,
      postsPerHour: postsLastHour,
      postsLast24h,
      autoPostsLast24h,
      userPostsLast24h,
      totalEngagement24h,
      flaggedPosts,
      hiddenPosts,
      featuredPosts,
      uniqueAuthors7d: Number(uniqueAuthors7d[0]?.count || 0),
    },
    cronHealth: {
      summary: { total: cronHealth.length, healthy: healthyCrons, warning: warningCrons, failed: failedCrons, stale: staleCrons },
      jobs: cronHealth,
    },
    categoryBreakdown: categoryBreakdown.map(c => ({ category: c.category, count: Number(c.count) })),
    typeBreakdown: typeBreakdown.map(t => ({ type: t.type, count: Number(t.count) })),
    topAuthors: topAuthors.map(a => ({ author: a.author, count: Number(a.count) })),
    recentPosts,
  })
}

/* ─── Posts List with Filters ─── */

async function getPosts(searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'all' // "all" | "auto" | "community" | "news" | "digest" | "user_highlight"
  const status = searchParams.get('status') || 'all' // "all" | "flagged" | "hidden" | "featured"
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search')
  const author = searchParams.get('author')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (type !== 'all') {
    if (type === 'auto') {
      where.author = 'THEONEWAYGDA_AI'
      where.type = 'auto'
    } else {
      where.type = type
    }
  }

  if (status === 'flagged') {
    where.tags = { contains: 'Flagged' }
  } else if (status === 'hidden') {
    where.tags = { contains: 'Hidden' }
  } else if (status === 'featured') {
    where.featured = true
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ]
  }

  if (author) {
    where.author = { contains: author }
  }

  // Avoid Prisma error with dynamic orderBy
  const orderDir = sortOrder === 'asc' ? 'asc' : 'desc'
  const allowedSortFields = ['createdAt', 'updatedAt', 'likes', 'comments', 'reposts', 'saves']
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

  const [posts, total] = await Promise.all([
    db.communityPost.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip,
      take: limit,
    }),
    db.communityPost.count({ where }),
  ])

  return NextResponse.json({
    posts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

/* ─── Moderate Posts (PATCH) ─── */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, postIds, data } = body

    if (!action || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'action and postIds are required' }, { status: 400 })
    }

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const postId of postIds) {
      try {
        switch (action) {
          case 'hide': {
            const post = await db.communityPost.findUnique({ where: { id: postId } })
            if (!post) throw new Error('Post not found')
            const tags = parseTags(post.tags)
            if (!tags.includes('Hidden')) tags.unshift('Hidden')
            await db.communityPost.update({
              where: { id: postId },
              data: { tags: JSON.stringify(tags), featured: false },
            })
            break
          }
          case 'unhide': {
            const post = await db.communityPost.findUnique({ where: { id: postId } })
            if (!post) throw new Error('Post not found')
            const tags = parseTags(post.tags).filter(t => !['Hidden', 'Flagged'].includes(t))
            await db.communityPost.update({
              where: { id: postId },
              data: { tags: JSON.stringify(tags) },
            })
            break
          }
          case 'flag': {
            const post = await db.communityPost.findUnique({ where: { id: postId } })
            if (!post) throw new Error('Post not found')
            const tags = parseTags(post.tags)
            if (!tags.includes('Flagged')) tags.unshift('Flagged')
            const reason = data?.reason || 'Manually flagged by admin'
            if (!tags.includes(reason)) tags.push(reason)
            await db.communityPost.update({
              where: { id: postId },
              data: { tags: JSON.stringify(tags) },
            })
            break
          }
          case 'unflag': {
            const post = await db.communityPost.findUnique({ where: { id: postId } })
            if (!post) throw new Error('Post not found')
            const tags = parseTags(post.tags).filter(t => t !== 'Flagged')
            await db.communityPost.update({
              where: { id: postId },
              data: { tags: JSON.stringify(tags) },
            })
            break
          }
          case 'feature': {
            await db.communityPost.update({
              where: { id: postId },
              data: { featured: true },
            })
            break
          }
          case 'unfeature': {
            await db.communityPost.update({
              where: { id: postId },
              data: { featured: false },
            })
            break
          }
          case 'delete': {
            await db.postComment.deleteMany({ where: { postId } })
            await db.postInteraction.deleteMany({ where: { postId } })
            await db.communityPost.delete({ where: { id: postId } })
            break
          }
          case 'update_tags': {
            if (!data?.tags || !Array.isArray(data.tags)) throw new Error('tags array required')
            await db.communityPost.update({
              where: { id: postId },
              data: { tags: JSON.stringify(data.tags) },
            })
            break
          }
          default:
            throw new Error(`Unknown action: ${action}`)
        }
        results.push({ id: postId, success: true })
      } catch (err) {
        results.push({ id: postId, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `${succeeded} post(s) ${action}ed, ${failed} failed`,
      results,
    })
  } catch (error) {
    console.error('[Admin Community] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to moderate posts' }, { status: 500 })
  }
}

/* ─── Trigger Actions (POST) ─── */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trigger = searchParams.get('trigger')

    if (!trigger) {
      return NextResponse.json({ error: 'trigger parameter required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('host') || 'localhost:3000'
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https'

    let targetUrl = ''
    let label = ''

    switch (trigger) {
      case 'publish':
        targetUrl = `${protocol}://${baseUrl}/api/community/publish?manual=true`
        label = 'Auto-publish'
        break
      case 'highlights':
        targetUrl = `${protocol}://${baseUrl}/api/community/engagement?cycle=highlights`
        label = 'Community Highlights'
        break
      case 'digest':
        targetUrl = `${protocol}://${baseUrl}/api/community/engagement?cycle=digest`
        label = 'Daily Digest'
        break
      case 'monitor':
        targetUrl = `${protocol}://${baseUrl}/api/community/monitor?full=true`
        label = 'Monitor Scan'
        break
      case 'seed':
        targetUrl = `${protocol}://${baseUrl}/api/community/seed`
        label = 'Seed Data'
        break
      case 'catchup':
        targetUrl = `${protocol}://${baseUrl}/api/community/engagement?catchup=true`
        label = 'Catch-up Recovery'
        break
      default:
        return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 })
    }

    const res = await fetch(targetUrl, { method: 'GET' })
    const data = await res.json()

    return NextResponse.json({
      success: res.ok,
      trigger: label,
      status: res.status,
      data,
    })
  } catch (error) {
    console.error('[Admin Community] POST error:', error)
    return NextResponse.json({ error: 'Failed to trigger action' }, { status: 500 })
  }
}

/* ─── Helpers ─── */

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}
