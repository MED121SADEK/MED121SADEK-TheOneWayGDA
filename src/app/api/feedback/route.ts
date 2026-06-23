import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ──────────────────────────────────────────────────────────
// POST: Submit feedback
// ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { rating, category, message, email, page, userAgent } = body as {
      rating: number
      category: string
      message: string
      email?: string
      page?: string
      userAgent?: string
    }

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!category || !['bug', 'feature', 'general', 'uiux'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: bug, feature, general, uiux' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long (max 10,000 characters)' },
        { status: 400 }
      )
    }

    const entry = await db.feedback.create({
      data: {
        rating,
        category,
        message: message.trim(),
        email: email?.trim() || null,
        page: page || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    })

    return NextResponse.json({
      status: 'ok',
      id: entry.id,
      message: 'Feedback received. Thank you!',
    })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// GET: List feedback (for admin/future dashboard)
// ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const entries = await db.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({
      status: 'ok',
      count: entries.length,
      data: entries,
    })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}