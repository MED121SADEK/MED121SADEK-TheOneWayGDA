import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/feed/personalized?visitorId=xxx&page=1&limit=15
 *
 * Personalized feed ordering algorithm:
 * 1. Fetch visitor's followed researchers (from UserFollow)
 * 2. Fetch visitor's followed topics (from TopicFollow)
 * 3. Fetch verified researcher emails
 * 4. Fetch posts (latest 100, excluding hidden)
 * 5. Score each post with recency + follows + verification + engagement
 * 6. Sort by score desc, paginate, return
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)

    // 1. Fetch visitor's followed researchers
    const followedResearchers = visitorId
      ? await db.userFollow.findMany({
          where: { followerId: visitorId },
          select: { followingId: true },
        })
      : []

    const followedSet = new Set(followedResearchers.map((f) => f.followingId.toLowerCase()))

    // 2. Fetch visitor's followed topics
    const followedTopics = visitorId
      ? await db.topicFollow.findMany({
          where: { visitorId },
          select: { topic: true },
        })
      : []

    const topicSet = new Set(followedTopics.map((t) => t.topic.toLowerCase()))

    // 3. Fetch verified researcher emails
    const verifiedResearchers = await db.verifiedResearcher.findMany({
      where: { isActive: true },
      select: { email: true },
    })

    const verifiedSet = new Set(verifiedResearchers.map((r) => r.email.toLowerCase()))

    // 4. Fetch posts (latest 100)
    const posts = await db.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // 5. Score each post
    const now = Date.now()
    const ONE_HOUR = 3600 * 1000
    const maxAgeMs = 7 * 24 * ONE_HOUR // 7 days for log decay

    const scored = posts.map((post) => {
      // Recency score: log decay, newer = higher
      const ageMs = Math.max(0, now - post.createdAt.getTime())
      const ageHours = ageMs / ONE_HOUR
      const recency = Math.max(0, Math.log2(maxAgeMs / Math.max(ageMs, ONE_HOUR)))

      let score = recency

      // +3 if post author is in followed researchers
      if (followedSet.has(post.author.toLowerCase())) {
        score += 3
      }

      // +2 if any post tag matches followed topics
      let postTags: string[] = []
      try {
        postTags = JSON.parse(post.tags || '[]')
      } catch {
        postTags = []
      }

      if (topicSet.size > 0) {
        const tagMatch = postTags.some((tag) =>
          topicSet.has(tag.toLowerCase())
        )
        if (tagMatch) {
          score += 2
        }
      }

      // +1 if post author is a verified researcher
      if (verifiedSet.has(post.author.toLowerCase())) {
        score += 1
      }

      // +0.5 * (likes + saves) / 10 for engagement
      score += 0.5 * ((post.likes + post.saves) / 10)

      return { post, score }
    })

    // 6. Sort by score desc, paginate
    scored.sort((a, b) => b.score - a.score)

    const offset = (page - 1) * limit
    const paginated = scored.slice(offset, offset + limit)
    const total = scored.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      posts: paginated.map((s) => ({
        ...s.post,
        feedScore: Math.round(s.score * 100) / 100,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Personalized feed error:', error)
    return NextResponse.json({ error: 'Failed to fetch personalized feed' }, { status: 500 })
  }
}
