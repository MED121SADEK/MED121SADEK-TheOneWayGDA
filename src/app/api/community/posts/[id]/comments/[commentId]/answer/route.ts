import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/community/posts/[id]/comments/[commentId]/answer — Mark/unmark as accepted answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params
    const body = await request.json()
    const { isAnswer, visitorId } = body // isAnswer: true = mark, false = unmark

    if (typeof isAnswer !== 'boolean') {
      return NextResponse.json({ error: 'isAnswer (boolean) is required.' }, { status: 400 })
    }

    // Verify post and comment exist
    const [post, comment] = await Promise.all([
      db.communityPost.findUnique({ where: { id: postId } }),
      db.postComment.findUnique({ where: { id: commentId } }),
    ])

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: 'Comment not found on this post.' }, { status: 404 })
    }

    // Authorization: only the post author can mark/unmark answers
    const normalizedVisitor = (visitorId || '').trim().toLowerCase()
    if (normalizedVisitor !== post.author.toLowerCase()) {
      return NextResponse.json({ error: 'Only the post author can mark answers.' }, { status: 403 })
    }

    if (isAnswer) {
      // ── MARK AS ANSWER ──
      // Single-answer enforcement: unmark any existing answer on this post
      const previousAnswer = await db.postComment.findFirst({
        where: { postId, isAnswer: true, id: { not: commentId } },
      })

      if (previousAnswer) {
        await db.postComment.update({
          where: { id: previousAnswer.id },
          data: { isAnswer: false, answerMarkedBy: null },
        })
      }

      // Mark the new answer
      await db.postComment.update({
        where: { id: commentId },
        data: { isAnswer: true, answerMarkedBy: normalizedVisitor },
      })

      // Update the post
      await db.communityPost.update({
        where: { id: postId },
        data: { hasAcceptedAnswer: true, acceptedAnswerId: commentId },
      })

      // Update VerifiedResearcher totalAnswers for the comment author
      const researcher = await db.verifiedResearcher.findUnique({
        where: { email: comment.author },
      })
      if (researcher) {
        await db.verifiedResearcher.update({
          where: { email: comment.author },
          data: { updatedAt: new Date() },
        })
      }

      // Create notification for the comment author (if not self-marking)
      if (comment.author.toLowerCase() !== normalizedVisitor) {
        try {
          const user = await db.user.findUnique({ where: { email: comment.author.toLowerCase() } })
          if (user) {
            await db.notification.create({
              data: {
                userId: user.id,
                type: 'answer_accepted',
                title: 'Your answer was accepted!',
                message: `Your comment on "${post.title.slice(0, 60)}" was marked as the accepted answer.`,
                actionUrl: `/community/${postId}`,
                actionLabel: 'View Post',
                metadata: JSON.stringify({ postId, commentId, markedBy: normalizedVisitor }),
              },
            })
          }
        } catch {
          // Notification is best-effort — don't fail the answer marking
        }
      }

      return NextResponse.json({ isAnswer: true, success: true })

    } else {
      // ── UNMARK AS ANSWER ──
      if (!comment.isAnswer) {
        return NextResponse.json({ isAnswer: false, success: true }) // already not an answer
      }

      await db.postComment.update({
        where: { id: commentId },
        data: { isAnswer: false, answerMarkedBy: null },
      })

      // Reset post's accepted answer
      await db.communityPost.update({
        where: { id: postId },
        data: { hasAcceptedAnswer: false, acceptedAnswerId: null },
      })

      return NextResponse.json({ isAnswer: false, success: true })
    }
  } catch (error) {
    console.error('Answer toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle answer status' }, { status: 500 })
  }
}
