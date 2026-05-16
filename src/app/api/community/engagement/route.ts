import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Community Engagement Engine
 *
 * 4-hour cycle: Identify top 5 liked/shared user posts → create "Community Picks" highlight post
 * 24-hour cycle: Generate "Daily Digest" summarizing top AI news, research, and community posts
 *
 * Called by Vercel Cron:
 *   GET /api/community/engagement?cycle=highlights  (every 4 hours)
 *   GET /api/community/engagement?cycle=digest      (every 24 hours)
 */

// ─── Community Highlights (4-hour cycle) ───

async function generateCommunityHighlights(): Promise<{ success: boolean; postsCreated: number; picks: any[] }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Find top 5 user posts (non-auto) by engagement in last 24h
  const topPosts = await db.communityPost.findMany({
    where: {
      author: { not: 'THEONEWAYGDA_AI' },
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: [
      { likes: 'desc' },
      { reposts: 'desc' },
      { comments: 'desc' },
    ],
    take: 5,
  })

  if (topPosts.length === 0) {
    return { success: true, postsCreated: 0, picks: [] }
  }

  // Check if we already posted highlights in the last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const existingHighlights = await db.communityPost.findFirst({
    where: {
      type: 'user_highlight',
      createdAt: { gte: fourHoursAgo },
    },
  })

  if (existingHighlights) {
    return { success: true, postsCreated: 0, picks: topPosts }
  }

  // Build the highlights post
  const topThree = topPosts.slice(0, 3)
  const highlightLines = topThree.map((p, i) => {
    const engagement = `${p.likes}❤️ ${p.comments}💬 ${p.reposts}🔄`
    const title = p.title.length > 80 ? p.title.slice(0, 77) + '...' : p.title
    return `${i + 1}. ${title} (${engagement})`
  })

  const totalEngagement = topPosts.reduce((sum, p) => sum + p.likes + p.comments + p.reposts, 0)
  const content = [
    `Community Picks — Top posts from the last 24h`,
    ``,
    ...highlightLines,
    ``,
    `Total: ${topPosts.length} trending posts with ${totalEngagement} interactions`,
    `#Community #Highlights #TopPosts`,
  ].join('\n')

  const post = await db.communityPost.create({
    data: {
      type: 'user_highlight',
      title: `Community Picks — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })}`,
      content,
      author: 'THEONEWAYGDA_AI',
      authorName: 'Community Bot',
      tags: JSON.stringify(['Community', 'Highlights', 'Auto-Published', 'Trending']),
      featured: true,
    },
  })

  return {
    success: true,
    postsCreated: 1,
    picks: topPosts.map(p => ({ id: p.id, title: p.title, likes: p.likes, comments: p.comments, reposts: p.reposts })),
  }
}

// ─── Daily Digest (24-hour cycle) ───

async function generateDailyDigest(): Promise<{ success: boolean; postsCreated: number; digest: any }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Check if digest already posted today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const existingDigest = await db.communityPost.findFirst({
    where: {
      type: 'digest',
      createdAt: { gte: startOfDay },
    },
  })

  if (existingDigest) {
    return { success: true, postsCreated: 0, digest: { id: existingDigest.id, message: 'Already posted today' } }
  }

  // ─── Gather data ───

  // Top AI news posts
  const topNews = await db.communityPost.findMany({
    where: {
      type: { in: ['auto', 'news'] },
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { likes: 'desc' },
    take: 3,
  })

  // Top community posts
  const topCommunity = await db.communityPost.findMany({
    where: {
      author: { not: 'THEONEWAYGDA_AI' },
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { likes: 'desc' },
    take: 3,
  })

  // Category counts
  const postsLast24h = await db.communityPost.findMany({
    where: { createdAt: { gte: twentyFourHoursAgo } },
    select: { tags: true, type: true, likes: true, comments: true, reposts: true },
  })

  let aiCount = 0
  let researchCount = 0
  let innovationCount = 0
  let totalEngagement = 0

  for (const p of postsLast24h) {
    totalEngagement += p.likes + p.comments + p.reposts
    const tags: string[] = []
    try { tags.push(...JSON.parse(p.tags || '[]')) } catch { /* ignore */ }
    if (tags.includes('AI')) aiCount++
    if (tags.includes('Research')) researchCount++
    if (tags.includes('Innovation')) innovationCount++
  }

  // ─── Build digest content ───

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const sections: string[] = [
    `Daily Digest — ${dateStr}`,
    ``,
    `${postsLast24h.length} posts published | ${totalEngagement} total interactions`,
    `AI: ${aiCount} | Research: ${researchCount} | Innovation: ${innovationCount}`,
    ``,
  ]

  // Top AI News
  sections.push('Top AI News:')
  if (topNews.length > 0) {
    for (const n of topNews) {
      const title = n.title.length > 90 ? n.title.slice(0, 87) + '...' : n.title
      sections.push(`  - ${title} (${n.likes}❤️)`)
    }
  } else {
    sections.push('  No major news posts in the last 24h.')
  }

  // Top Community Posts
  sections.push('')
  sections.push('Top Community Posts:')
  if (topCommunity.length > 0) {
    for (const c of topCommunity) {
      const title = c.title.length > 90 ? c.title.slice(0, 87) + '...' : c.title
      sections.push(`  - ${title} (${c.likes}❤️ ${c.comments}💬)`)
    }
  } else {
    sections.push('  No community posts in the last 24h. Be the first to share!')
  }

  sections.push('')
  sections.push('#DailyDigest #AI #Research #Innovation')

  const content = sections.join('\n')

  // Create digest post and pin it
  // Unpin any previous digest
  try {
    const previousDigests = await db.communityPost.findMany({
      where: { type: 'digest', featured: true },
      select: { id: true },
    })
    if (previousDigests.length > 0) {
      await db.communityPost.updateMany({
        where: { type: 'digest', featured: true },
        data: { featured: false },
      })
    }
  } catch { /* ignore */ }

  const post = await db.communityPost.create({
    data: {
      type: 'digest',
      title: `Daily Digest — ${dateStr}`,
      content,
      author: 'THEONEWAYGDA_AI',
      authorName: 'Community Bot',
      tags: JSON.stringify(['Digest', 'Daily', 'Auto-Published', 'AI', 'Research', 'Innovation']),
      featured: true, // Pinned at top
    },
  })

  return {
    success: true,
    postsCreated: 1,
    digest: {
      id: post.id,
      date: dateStr,
      totalPosts: postsLast24h.length,
      totalEngagement,
      aiCount,
      researchCount,
      innovationCount,
      topNewsCount: topNews.length,
      topCommunityCount: topCommunity.length,
    },
  }
}

// ─── Catch-up Digest (on restart/recovery) ───

async function generateCatchUpDigest(): Promise<{ success: boolean; postsCreated: number }> {
  const cronJob = await db.cronJob.findUnique({
    where: { name: 'community-publisher' },
  })

  if (!cronJob?.lastRun) {
    return { success: true, postsCreated: 0 }
  }

  const hoursSince = Math.floor((Date.now() - cronJob.lastRun.getTime()) / (60 * 60 * 1000))

  // If less than 3 hours since last run, no catch-up needed
  if (hoursSince < 3) {
    return { success: true, postsCreated: 0 }
  }

  // Count posts since last run
  const postsSince = await db.communityPost.count({
    where: { createdAt: { gte: cronJob.lastRun } },
  })

  if (postsSince > 0) {
    return { success: true, postsCreated: 0 }
  }

  // No posts since last run — create catch-up digest
  const downTime = `${hoursSince} hours`
  const lastRunStr = cronJob.lastRun.toISOString()

  const content = [
    `Catch-Up Digest`,
    ``,
    `We detected a ${downTime} gap in publishing (last run: ${lastRunStr}).`,
    `The auto-publishing engine has been restored and is running normally.`,
    ``,
    `Status: All systems operational`,
    `Next scheduled publish: Within the hour`,
    ``,
    `#CatchUp #SystemStatus #AI`,
  ].join('\n')

  await db.communityPost.create({
    data: {
      type: 'digest',
      title: `Catch-Up Digest — System Restored`,
      content,
      author: 'THEONEWAYGDA_AI',
      authorName: 'System Bot',
      tags: JSON.stringify(['Digest', 'CatchUp', 'System', 'Auto-Published']),
      featured: true,
    },
  })

  return { success: true, postsCreated: 1 }
}

// ─── Main handler ───

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const cycle = searchParams.get('cycle') || 'highlights'
    const catchUp = searchParams.get('catchup') === 'true'

    console.log(`[Engagement] Starting ${cycle} cycle at ${new Date().toISOString()}`)

    // ─── Recovery check ───
    if (catchUp) {
      const result = await generateCatchUpDigest()
      return NextResponse.json({
        cycle: 'catchup',
        ...result,
        duration: `${Date.now() - startTime}ms`,
      })
    }

    let result: any

    if (cycle === 'highlights') {
      result = await generateCommunityHighlights()
    } else if (cycle === 'digest') {
      result = await generateDailyDigest()
    } else {
      return NextResponse.json({ error: `Unknown cycle: ${cycle}. Use "highlights" or "digest".` }, { status: 400 })
    }

    // Update cron status
    const cronName = cycle === 'highlights' ? 'engagement-highlights' : 'engagement-digest'
    try {
      await db.cronJob.upsert({
        where: { name: cronName },
        create: {
          name: cronName,
          type: 'engagement',
          interval: cycle === 'highlights' ? '4h' : '24h',
          status: 'completed',
          lastRun: new Date(),
          runCount: 1,
          nextRun: new Date(Date.now() + (cycle === 'highlights' ? 4 : 24) * 60 * 60 * 1000),
        },
        update: {
          status: 'completed',
          lastRun: new Date(),
          runCount: { increment: 1 },
          nextRun: new Date(Date.now() + (cycle === 'highlights' ? 4 : 24) * 60 * 60 * 1000),
          lastError: null,
        },
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      cycle,
      ...result,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const cycleParam = new URL(request.url).searchParams.get('cycle') || 'unknown'
    console.error(`[Engagement] Fatal error:`, message)
    return NextResponse.json({
      success: false,
      cycle: cycleParam,
      error: message,
      duration: `${Date.now() - startTime}ms`,
    }, { status: 500 })
  }
}
