import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/knowledge/[id]
 *
 * Get single knowledge item.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await db.knowledgeItem.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Knowledge detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch knowledge item' }, { status: 500 })
  }
}

/**
 * PATCH /api/community/knowledge/[id]
 *
 * Update knowledge item.
 * Support ?action=upvote to increment upvotes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const existing = await db.knowledgeItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 })
    }

    if (action === 'upvote') {
      const updated = await db.knowledgeItem.update({
        where: { id },
        data: { upvotes: { increment: 1 } },
      })
      return NextResponse.json({ item: updated })
    }

    // General update from body
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.content !== undefined) updateData.content = body.content.trim()
    if (body.type !== undefined) updateData.type = body.type
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags)

    const updated = await db.knowledgeItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('Knowledge update error:', error)
    return NextResponse.json({ error: 'Failed to update knowledge item' }, { status: 500 })
  }
}

/**
 * DELETE /api/community/knowledge/[id]
 *
 * Delete knowledge item (only by author).
 * Query param: ?author=xxx
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const author = searchParams.get('author')

    const existing = await db.knowledgeItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Knowledge item not found' }, { status: 404 })
    }

    // Only the author can delete
    if (author && existing.author !== author.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized. Only the author can delete this item.' }, { status: 403 })
    }

    await db.knowledgeItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Knowledge delete error:', error)
    return NextResponse.json({ error: 'Failed to delete knowledge item' }, { status: 500 })
  }
}
