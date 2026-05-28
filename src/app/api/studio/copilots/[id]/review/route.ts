import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ═══════════════════════════════════════════
   POST /api/studio/copilots/[id]/review — Add review
   ═══════════════════════════════════════════ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reviewerId, reviewerName, rating, comment } = body

    if (!reviewerId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewerId, rating (1-5)' },
        { status: 400 }
      )
    }

    const copilot = await db.customCopilot.findUnique({ where: { id } })
    if (!copilot) {
      return NextResponse.json({ error: 'Copilot not found' }, { status: 404 })
    }

    /* ── Upsert review (one per user per copilot) ── */
    const review = await db.copilotReview.upsert({
      where: {
        copilotId_reviewerId: { copilotId: id, reviewerId },
      },
      update: {
        rating,
        comment: comment || null,
      },
      create: {
        copilotId: id,
        reviewerId,
        reviewerName: reviewerName || null,
        rating,
        comment: comment || null,
      },
    })

    /* ── Recalculate aggregate rating ── */
    const agg = await db.copilotReview.aggregate({
      where: { copilotId: id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await db.customCopilot.update({
      where: { id },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count.rating,
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/studio/copilots/[id]/review]', error)
    return NextResponse.json({ error: 'Failed to add review' }, { status: 500 })
  }
}
