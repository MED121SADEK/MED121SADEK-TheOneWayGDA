import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/community/posts/[id]/comments — List comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comments = await db.postComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ comments })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

// POST /api/community/posts/[id]/comments — Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { author, authorName, content } = body

    if (!author?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Author and comment content are required.' }, { status: 400 })
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2,000 chars).' }, { status: 400 })
    }

    // Verify post exists
    const post = await db.communityPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comment = await db.postComment.create({
      data: {
        postId: id,
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        content: content.trim(),
      },
    })

    // Increment comment count
    await db.communityPost.update({
      where: { id },
      data: { comments: { increment: 1 } },
    })

    return NextResponse.json({ comment, success: true }, { status: 201 })
  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
