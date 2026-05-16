import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/community/posts/[id]/interact — Like, unlike, save, unsave, repost
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { visitorId, action } = body // action: "like" | "unlike" | "save" | "unsave" | "repost" | "unrepost"

    if (!visitorId?.trim() || !action) {
      return NextResponse.json({ error: 'Visitor ID and action are required.' }, { status: 400 })
    }

    const post = await db.communityPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const normalizedVisitor = visitorId.trim().toLowerCase()

    if (action === 'like') {
      // Check if already liked
      const existing = await db.postInteraction.findUnique({
        where: { postId_visitorId_type: { postId: id, visitorId: normalizedVisitor, type: 'like' } },
      })
      if (!existing) {
        await Promise.all([
          db.postInteraction.create({
            data: { postId: id, visitorId: normalizedVisitor, type: 'like' },
          }),
          db.communityPost.update({ where: { id }, data: { likes: { increment: 1 } } }),
        ])
      }
      return NextResponse.json({ liked: true })

    } else if (action === 'unlike') {
      const existing = await db.postInteraction.findUnique({
        where: { postId_visitorId_type: { postId: id, visitorId: normalizedVisitor, type: 'like' } },
      })
      if (existing) {
        await Promise.all([
          db.postInteraction.delete({ where: { id: existing.id } }),
          db.communityPost.update({ where: { id }, data: { likes: { decrement: 1 } } }),
        ])
      }
      return NextResponse.json({ liked: false })

    } else if (action === 'save') {
      const existing = await db.postInteraction.findUnique({
        where: { postId_visitorId_type: { postId: id, visitorId: normalizedVisitor, type: 'save' } },
      })
      if (!existing) {
        await Promise.all([
          db.postInteraction.create({
            data: { postId: id, visitorId: normalizedVisitor, type: 'save' },
          }),
          db.communityPost.update({ where: { id }, data: { saves: { increment: 1 } } }),
        ])
      }
      return NextResponse.json({ saved: true })

    } else if (action === 'unsave') {
      const existing = await db.postInteraction.findUnique({
        where: { postId_visitorId_type: { postId: id, visitorId: normalizedVisitor, type: 'save' } },
      })
      if (existing) {
        await Promise.all([
          db.postInteraction.delete({ where: { id: existing.id } }),
          db.communityPost.update({ where: { id }, data: { saves: { decrement: 1 } } }),
        ])
      }
      return NextResponse.json({ saved: false })

    } else if (action === 'repost') {
      await db.communityPost.update({ where: { id }, data: { reposts: { increment: 1 } } })
      return NextResponse.json({ reposted: true })

    } else if (action === 'unrepost') {
      await db.communityPost.update({ where: { id }, data: { reposts: { decrement: 1 } } })
      return NextResponse.json({ reposted: false })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Interaction error:', error)
    return NextResponse.json({ error: 'Failed to process interaction' }, { status: 500 })
  }
}

// GET /api/community/posts/[id]/interact — Get user's interaction state for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')

    if (!visitorId) {
      return NextResponse.json({ liked: false, saved: false })
    }

    const interactions = await db.postInteraction.findMany({
      where: {
        postId: id,
        visitorId: visitorId.toLowerCase(),
        type: { in: ['like', 'save'] },
      },
    })

    return NextResponse.json({
      liked: interactions.some(i => i.type === 'like'),
      saved: interactions.some(i => i.type === 'save'),
    })
  } catch {
    return NextResponse.json({ liked: false, saved: false })
  }
}
