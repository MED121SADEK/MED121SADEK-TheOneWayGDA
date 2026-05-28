import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: Single portfolio by ID ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const portfolio = await db.modelPortfolio.findUnique({
      where: { id },
      include: {
        portfolioHoldings: { orderBy: { score: 'desc' } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: portfolio })
  } catch (error) {
    console.error('[GET /api/portfolio/[id]]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio.' },
      { status: 500 }
    )
  }
}

// ── PATCH: Update portfolio ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, isPublic, totalValue, holdingsCount } = body

    const portfolio = await db.modelPortfolio.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(totalValue !== undefined && { totalValue }),
        ...(holdingsCount !== undefined && { holdingsCount }),
      },
    })

    return NextResponse.json({ success: true, data: portfolio })
  } catch (error) {
    console.error('[PATCH /api/portfolio/[id]]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update portfolio.' },
      { status: 500 }
    )
  }
}

// ── DELETE: Delete portfolio ──
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.modelPortfolio.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Portfolio deleted.' })
  } catch (error) {
    console.error('[DELETE /api/portfolio/[id]]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete portfolio.' },
      { status: 500 }
    )
  }
}
