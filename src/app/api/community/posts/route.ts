import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { queryCache } from '@/lib/neon-cache'

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
    const author = searchParams.get('author')

    // Skip cache for authenticated/admin or search queries
    const useCache = !search && !author

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
    if (author) where.author = author.toLowerCase()
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

    // Use Neon query cache for public feed reads
    const cacheKey = `feed:${type}:${sort}:${tag || 'all'}:${page}:${limit}`
    const result = await queryCache.get(
      cacheKey,
      async () => {
        const [posts, total] = await Promise.all([
          db.communityPost.findMany({ where, orderBy, skip, take: limit }),
          db.communityPost.count({ where }),
        ])
        return { posts, total, pages: Math.ceil(total / limit) }
      },
      { ttl: sort === 'featured' ? 120 : 30 }
    )

    return NextResponse.json({
      posts: result.posts,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages,
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

    const normalizedTitle = title.trim()
    const normalizedContent = content.trim()
    const normalizedAuthor = author.trim().toLowerCase()

    const hash = createHash('sha256').update(normalizedTitle + '\n' + normalizedContent).digest('hex')

    const post = await db.communityPost.upsert({
      where: { author_contentHash: { author: normalizedAuthor, contentHash: hash } },
      update: {},
      create: {
        type: 'community',
        title: normalizedTitle,
        content: normalizedContent,
        author: normalizedAuthor,
        authorName: authorName?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        sourceUrl: sourceUrl?.trim() || null,
        sourceName: sourceName?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        contentHash: hash,
      },
    })

    // Return 200 if the post already existed (idempotent), 201 if newly created
    const isExisting = post.createdAt.getTime() < Date.now() - 5000
    return NextResponse.json({ post, success: true }, { status: isExisting ? 200 : 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
