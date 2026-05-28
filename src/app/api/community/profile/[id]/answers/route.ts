import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/community/profile/[id]/answers — Get accepted answer stats for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const normalizedEmail = decodeURIComponent(userId).toLowerCase()

    // Count total accepted answers
    const totalAnswers = await db.postComment.count({
      where: { author: normalizedEmail, isAnswer: true },
    })

    // Get recent accepted answers with post context
    const recentAnswers = await db.postComment.findMany({
      where: { author: normalizedEmail, isAnswer: true },
      include: {
        post: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      totalAnswers,
      recentAnswers: recentAnswers.map(a => ({
        id: a.id,
        content: a.content.slice(0, 200),
        upvotes: a.upvotes,
        createdAt: a.createdAt,
        post: a.post,
      })),
    })
  } catch (error) {
    console.error('Profile answers error:', error)
    return NextResponse.json({ totalAnswers: 0, recentAnswers: [] })
  }
}
