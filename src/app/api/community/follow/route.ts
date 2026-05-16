import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Follow / Unfollow API
 * POST /api/community/follow
 * Body: { followerId, followingId, action: "follow" | "unfollow" }
 * GET /api/community/follow?visitorId=xxx — list following + followers
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 })
    }

    const [following, followers] = await Promise.all([
      db.userFollow.findMany({ where: { followerId: visitorId }, select: { followingId: true, createdAt: true } }),
      db.userFollow.findMany({ where: { followingId: visitorId }, select: { followerId: true, createdAt: true } }),
    ])

    return NextResponse.json({
      following: following.map(f => f.followingId),
      followers: followers.map(f => f.followerId),
      followingCount: following.length,
      followersCount: followers.length,
    })
  } catch (error) {
    console.error('Follow GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { followerId, followingId, action } = await request.json()

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'followerId and followingId required' }, { status: 400 })
    }
    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 })
    }

    if (action === 'follow') {
      await db.userFollow.create({
        data: { followerId, followingId },
      }).catch(() => { /* already exists */ })
    } else {
      await db.userFollow.deleteMany({
        where: { followerId, followingId },
      })
    }

    const counts = await db.userFollow.groupBy({
      by: ['followingId'],
      where: { followingId },
      _count: { followerId: true },
    })

    return NextResponse.json({
      success: true,
      followersCount: counts[0]?._count.followerId || 0,
    })
  } catch (error) {
    console.error('Follow POST error:', error)
    return NextResponse.json({ error: 'Failed to process follow' }, { status: 500 })
  }
}
