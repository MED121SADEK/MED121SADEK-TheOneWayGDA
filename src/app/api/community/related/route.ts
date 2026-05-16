import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/community/related?postId=xxx — Find related posts by tag overlap
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    // Find the post
    const post = await db.communityPost.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Parse tags
    let postTags: string[] = []
    if (post.tags) {
      try { postTags = JSON.parse(post.tags) } catch { postTags = [] }
    }

    // Find posts that share at least one tag
    if (postTags.length === 0) {
      // If no tags, return latest popular posts
      const fallback = await db.communityPost.findMany({
        where: { id: { not: postId } },
        orderBy: { likes: 'desc' },
        take: 5,
      })
      return NextResponse.json({ related: fallback })
    }

    const related = await db.communityPost.findMany({
      where: {
        id: { not: postId },
        tags: { not: post.tags }, // Different raw tags (to get variety)
      },
      orderBy: { likes: 'desc' },
      take: 10,
    })

    // Score by tag overlap
    const scored: any[] = related.map(p => {
      let pTags: string[] = []
      try { pTags = JSON.parse(p.tags || '[]') } catch { pTags = [] }
      const overlap = postTags.filter(t => pTags.includes(t)).length
      return { ...p, _score: overlap }
    }).filter(p => p._score > 0)

    scored.sort((a, b) => b._score - a._score || b.likes - a.likes)

    // If not enough with overlap, fill with popular posts
    let result = scored.slice(0, 5)
    if (result.length < 3) {
      const existing = new Set(result.map(p => p.id))
      const more = await db.communityPost.findMany({
        where: { id: { not: postId, notIn: [...existing] } },
        orderBy: { likes: 'desc' },
        take: 5 - result.length,
      })
      result = [...result, ...more]
    }

    return NextResponse.json({ related: result })
  } catch (error) {
    console.error('Related posts error:', error)
    return NextResponse.json({ error: 'Failed to load related posts' }, { status: 500 })
  }
}
