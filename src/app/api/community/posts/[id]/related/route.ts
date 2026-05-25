import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/posts/[id]/related
 *
 * Smart related posts using:
 * - Tags overlap (posts sharing similar tags get higher score)
 * - Same author (boost posts from same researcher)
 * - Engagement weighting (multiply by likes+saves score)
 * - Exclude the current post
 * - Return top 6 related posts sorted by relevance score
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Fetch current post to get its tags
    const currentPost = await db.communityPost.findUnique({ where: { id } })
    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    let currentTags: string[] = []
    try {
      currentTags = JSON.parse(currentPost.tags || '[]')
    } catch {
      currentTags = []
    }

    // 2. Fetch up to 50 recent posts (excluding current)
    const candidates = await db.communityPost.findMany({
      where: { id: { not: id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // 3. Score each candidate
    const scored = candidates.map((candidate) => {
      let candidateTags: string[] = []
      try {
        candidateTags = JSON.parse(candidate.tags || '[]')
      } catch {
        candidateTags = []
      }

      // Tag overlap score
      const tagOverlap = currentTags.filter((tag) =>
        candidateTags.some((ct) => ct.toLowerCase() === tag.toLowerCase())
      ).length

      // Same author score
      const sameAuthor = currentPost.author === candidate.author ? 1 : 0

      // Engagement weighting
      const engagement = (candidate.likes + candidate.saves) / 10

      // Relevance: tagOverlap * 3 + sameAuthor * 2 + engagement
      const relevance = tagOverlap * 3 + sameAuthor * 2 + engagement

      return { post: candidate, relevance }
    })

    // 4. Sort by relevance desc, return top 6
    scored.sort((a, b) => b.relevance - a.relevance)
    const relatedPosts = scored.slice(0, 6).map((s) => ({
      ...s.post,
      relevanceScore: Math.round(s.relevance * 100) / 100,
    }))

    return NextResponse.json({ relatedPosts })
  } catch (error) {
    console.error('Related posts error:', error)
    return NextResponse.json({ error: 'Failed to fetch related posts' }, { status: 500 })
  }
}
