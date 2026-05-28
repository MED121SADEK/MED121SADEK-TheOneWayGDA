import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/community/collections/[slug]
 *
 * Get collection with its posts.
 * If isAuto: fetch posts matching the collection's tags
 * If manual: fetch posts whose IDs are in postIds JSON
 * Return { collection, posts }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Fetch the collection by slug
    const collection = await db.thematicCollection.findUnique({
      where: { slug },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    let posts

    if (collection.isAuto && collection.tags) {
      // Auto collection: fetch posts matching the collection's tags
      let tags: string[] = []
      try {
        tags = JSON.parse(collection.tags)
      } catch {
        tags = []
      }

      if (tags.length > 0) {
        // Fetch all posts and filter by tag overlap in application layer
        // since Prisma doesn't support JSON array contains with case-insensitive matching
        const allPosts = await db.communityPost.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        posts = allPosts.filter((post) => {
          let postTags: string[] = []
          try {
            postTags = JSON.parse(post.tags || '[]')
          } catch {
            postTags = []
          }
          return tags.some((tag) =>
            postTags.some((pt) => pt.toLowerCase() === tag.toLowerCase())
          )
        })
      } else {
        posts = []
      }
    } else if (collection.postIds) {
      // Manual collection: fetch posts whose IDs are in postIds JSON
      let postIds: string[] = []
      try {
        postIds = JSON.parse(collection.postIds)
      } catch {
        postIds = []
      }

      if (postIds.length > 0) {
        posts = await db.communityPost.findMany({
          where: { id: { in: postIds } },
          orderBy: { createdAt: 'desc' },
        })
      } else {
        posts = []
      }
    } else {
      posts = []
    }

    return NextResponse.json({ collection, posts })
  } catch (error) {
    console.error('Collection detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}
