import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/community/posts/[id]/comments/[commentId]/upvote — Toggle upvote on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params
    const body = await request.json()
    const { visitorId } = body

    if (!visitorId?.trim()) {
      return NextResponse.json({ error: 'Visitor ID is required.' }, { status: 400 })
    }

    const normalizedVisitor = visitorId.trim().toLowerCase()
    const interactionType = `comment_upvote_${commentId}`

    // Verify comment exists on this post
    const comment = await db.postComment.findUnique({ where: { id: commentId } })
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: 'Comment not found on this post.' }, { status: 404 })
    }

    // Check if already upvoted (dedup via PostInteraction)
    const existing = await db.postInteraction.findUnique({
      where: { postId_visitorId_type: { postId, visitorId: normalizedVisitor, type: interactionType } },
    })

    if (existing) {
      // Remove upvote
      await Promise.all([
        db.postInteraction.delete({ where: { id: existing.id } }),
        db.postComment.update({ where: { id: commentId }, data: { upvotes: { decrement: 1 } } }),
      ])
      return NextResponse.json({ upvoted: false, upvotes: Math.max(0, comment.upvotes - 1) })
    } else {
      // Add upvote
      await Promise.all([
        db.postInteraction.create({
          data: { postId, visitorId: normalizedVisitor, type: interactionType },
        }),
        db.postComment.update({ where: { id: commentId }, data: { upvotes: { increment: 1 } } }),
      ])
      return NextResponse.json({ upvoted: true, upvotes: comment.upvotes + 1 })
    }
  } catch (error) {
    console.error('Comment upvote error:', error)
    return NextResponse.json({ error: 'Failed to toggle upvote' }, { status: 500 })
  }
}
