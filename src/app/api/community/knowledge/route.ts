import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/knowledge
 *
 * List knowledge items.
 * Query params: ?type=faq|guide|tip|method|summary, ?postId=xxx, ?author=xxx, ?featured=true
 * Return items ordered by upvotes desc, then createdAt desc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const postId = searchParams.get('postId')
    const author = searchParams.get('author')
    const featured = searchParams.get('featured')

    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }
    if (postId) {
      where.postId = postId
    }
    if (author) {
      where.author = author
    }
    if (featured === 'true') {
      where.isFeatured = true
    }

    const items = await db.knowledgeItem.findMany({
      where,
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Knowledge list error:', error)
    return NextResponse.json({ error: 'Failed to fetch knowledge items' }, { status: 500 })
  }
}

/**
 * POST /api/community/knowledge
 *
 * Create knowledge item.
 * Body: { title, content, type?, postId?, author, authorName?, tags?, sourceCommentIds? }
 * Validate required fields.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, type, postId, author, authorName, tags, sourceCommentIds } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 })
    }
    if (!author?.trim()) {
      return NextResponse.json({ error: 'Author is required.' }, { status: 400 })
    }

    const validTypes = ['faq', 'guide', 'tip', 'method', 'summary']
    const itemType = type || 'faq'
    if (!validTypes.includes(itemType)) {
      return NextResponse.json({ error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const item = await db.knowledgeItem.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type: itemType,
        postId: postId || null,
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        sourceCommentIds: sourceCommentIds ? JSON.stringify(sourceCommentIds) : null,
        isFeatured: body.isFeatured ?? false,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Knowledge create error:', error)
    return NextResponse.json({ error: 'Failed to create knowledge item' }, { status: 500 })
  }
}
