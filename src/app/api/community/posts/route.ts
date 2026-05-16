import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/community/posts — List posts (feed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // "all" | "community" | "news"
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'latest' // "latest" | "popular" | "featured"
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type !== 'all') where.type = type
    // Exclude hidden posts from public feed (combine with tag filter if present)
    if (tag) {
      where.tags = { contains: tag, not: { contains: 'Hidden' } }
    } else {
      where.tags = { not: { contains: 'Hidden' } }
    }
    if (sort === 'featured') where.featured = true
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const orderBy: Record<string, string> = sort === 'popular'
      ? { likes: 'desc' }
      : sort === 'featured'
      ? { createdAt: 'desc' }
      : { createdAt: 'desc' }

    const [posts, total] = await Promise.all([
      db.communityPost.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.communityPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Posts list error:', error)
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}

// POST /api/community/posts — Create a new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, author, authorName, imageUrl, sourceUrl, sourceName, tags } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 })
    }
    if (!author?.trim()) {
      return NextResponse.json({ error: 'Author (email) is required.' }, { status: 400 })
    }
    if (title.trim().length > 300) {
      return NextResponse.json({ error: 'Title is too long (max 300 chars).' }, { status: 400 })
    }
    if (content.trim().length > 10000) {
      return NextResponse.json({ error: 'Content is too long (max 10,000 chars).' }, { status: 400 })
    }

    const post = await db.communityPost.create({
      data: {
        type: 'community',
        title: title.trim(),
        content: content.trim(),
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        sourceUrl: sourceUrl?.trim() || null,
        sourceName: sourceName?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    return NextResponse.json({ post, success: true }, { status: 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
