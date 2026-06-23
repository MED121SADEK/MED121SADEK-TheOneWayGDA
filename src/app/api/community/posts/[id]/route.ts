import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/community/posts/[id] — Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const post = await db.communityPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ post })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 })
  }
}

// DELETE /api/community/posts/[id] — Delete own post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const author = searchParams.get('author')

    const post = await db.communityPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    if (author && post.author !== author.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete related comments and interactions
    await Promise.all([
      db.postComment.deleteMany({ where: { postId: id } }),
      db.postInteraction.deleteMany({ where: { postId: id } }),
      db.communityPost.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
