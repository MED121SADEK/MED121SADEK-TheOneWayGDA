import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuthOrRespond } from '@/lib/require-auth'

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

// DELETE /api/community/posts/[id] — Delete own post (auth required, author verified from session)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Require authentication ──
  const { user, response: authResponse } = await requireAuthOrRespond(request)
  if (authResponse || !user) return authResponse!

  try {
    const { id } = await params

    const post = await db.communityPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify ownership from session — admins can delete any post
    const userEmail = user.email?.toLowerCase()
    const isOwner = userEmail && post.author?.toLowerCase() === userEmail
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 })
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
