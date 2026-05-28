import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/collections
 *
 * List all collections.
 * Query params: ?featured=true to filter featured only
 * Return collections ordered by sortOrder, then createdAt desc
 * For auto collections, compute postCount from matching tags
 * For manual collections, use the cached postCount
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featuredOnly = searchParams.get('featured') === 'true'

    const where = featuredOnly ? { isFeatured: true } : {}

    const collections = await db.thematicCollection.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    // For auto collections, compute postCount from matching tags
    const enriched = await Promise.all(
      collections.map(async (col) => {
        if (col.isAuto && col.tags) {
          let tags: string[] = []
          try {
            tags = JSON.parse(col.tags)
          } catch {
            tags = []
          }

          // Count posts that have at least one matching tag
          if (tags.length > 0) {
            const allPosts = await db.communityPost.findMany({
              select: { tags: true, id: true },
            })
            const matchingCount = allPosts.filter((post) => {
              let postTags: string[] = []
              try {
                postTags = JSON.parse(post.tags || '[]')
              } catch {
                postTags = []
              }
              return tags.some((tag) =>
                postTags.some((pt) => pt.toLowerCase() === tag.toLowerCase())
              )
            }).length

            return {
              ...col,
              postCount: matchingCount,
            }
          }
        }
        return col
      })
    )

    return NextResponse.json({ collections: enriched })
  } catch (error) {
    console.error('Collections list error:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

/**
 * POST /api/community/collections
 *
 * Create collection (admin only, check for admin session)
 * Body: { title, description?, icon?, color?, tags?, isAuto?, postIds? }
 * Auto-generate slug from title (lowercase, spaces to hyphens)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, icon, color, tags, isAuto, postIds } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    // Check for admin session (look for admin email in header or body)
    const adminEmail = request.headers.get('x-admin-email')
      || body.adminEmail
      || body.curator

    if (adminEmail) {
      const user = await db.user.findUnique({ where: { email: adminEmail } })
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
      }
    }

    // Auto-generate slug from title
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) {
      return NextResponse.json({ error: 'Could not generate a valid slug from title.' }, { status: 400 })
    }

    // Check if slug already exists
    const existing = await db.thematicCollection.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'A collection with this slug already exists.' }, { status: 409 })
    }

    const collection = await db.thematicCollection.create({
      data: {
        slug,
        title: title.trim(),
        description: description?.trim() || null,
        icon: icon || 'BookOpen',
        color: color || 'primary',
        curator: adminEmail || null,
        tags: tags ? JSON.stringify(tags) : null,
        postIds: postIds ? JSON.stringify(postIds) : null,
        isAuto: isAuto ?? true,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    })

    return NextResponse.json({ collection }, { status: 201 })
  } catch (error) {
    console.error('Collection create error:', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
