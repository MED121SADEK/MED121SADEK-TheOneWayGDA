import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Sample data for demo ──
const samplePortfolios = [
  {
    id: 'demo-pf-1',
    ownerId: 'demo@theonewaygda.com',
    ownerName: 'Demo User',
    name: 'Top-Tier AI Models',
    description: 'Tracking the best performing AI models across all benchmarks.',
    isPublic: true,
    totalValue: 87.4,
    holdings: 6,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date(),
  },
  {
    id: 'demo-pf-2',
    ownerId: 'demo@theonewaygda.com',
    ownerName: 'Demo User',
    name: 'Budget-Friendly Picks',
    description: 'High-value models at competitive pricing.',
    isPublic: false,
    totalValue: 72.8,
    holdings: 4,
    createdAt: new Date('2025-02-20'),
    updatedAt: new Date(),
  },
  {
    id: 'demo-pf-3',
    ownerId: 'analyst@theonewaygda.com',
    ownerName: 'AI Analyst',
    name: 'Reasoning Champions',
    description: 'Models excelling in reasoning and math benchmarks.',
    isPublic: true,
    totalValue: 91.2,
    holdings: 5,
    createdAt: new Date('2025-03-01'),
    updatedAt: new Date(),
  },
]

// ── GET: List all portfolios (or return demo data) ──
export async function GET() {
  try {
    const portfolios = await db.modelPortfolio.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { portfolioHoldings: true, alerts: true } },
      },
    })

    if (portfolios.length === 0) {
      return NextResponse.json({ success: true, data: samplePortfolios })
    }

    return NextResponse.json({ success: true, data: portfolios })
  } catch (error) {
    console.error('[GET /api/portfolio]', error)
    return NextResponse.json({ success: true, data: samplePortfolios })
  }
}

// ── POST: Create a new portfolio ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ownerId, ownerName, name, description, isPublic } = body

    if (!name || !ownerId) {
      return NextResponse.json(
        { success: false, error: 'Name and ownerId are required.' },
        { status: 400 }
      )
    }

    const portfolio = await db.modelPortfolio.create({
      data: {
        ownerId,
        ownerName: ownerName || null,
        name,
        description: description || null,
        isPublic: isPublic ?? false,
      },
    })

    return NextResponse.json({ success: true, data: portfolio }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/portfolio]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio.' },
      { status: 500 }
    )
  }
}
