import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/search/saved?visitorId=xxx — List saved searches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')

    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId is required' }, { status: 400 })
    }

    const saved = await db.savedSearch.findMany({
      where: { visitorId: visitorId.toLowerCase() },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    })

    return NextResponse.json({ saved })
  } catch (error) {
    console.error('Saved search list error:', error)
    return NextResponse.json({ error: 'Failed to load saved searches' }, { status: 500 })
  }
}

// POST /api/search/saved — Save a new search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitorId, userId, name, filters } = body

    if (!visitorId?.trim()) {
      return NextResponse.json({ error: 'visitorId is required' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ error: 'Filters object is required' }, { status: 400 })
    }

    // Limit: max 20 saved searches per visitor
    const existingCount = await db.savedSearch.count({
      where: { visitorId: visitorId.trim().toLowerCase() },
    })
    if (existingCount >= 20) {
      return NextResponse.json({ error: 'Maximum 20 saved searches reached' }, { status: 400 })
    }

    const saved = await db.savedSearch.create({
      data: {
        visitorId: visitorId.trim().toLowerCase(),
        userId: userId || null,
        name: name.trim().slice(0, 100),
        filters: JSON.stringify(filters),
      },
    })

    return NextResponse.json({ saved }, { status: 201 })
  } catch (error) {
    console.error('Saved search create error:', error)
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
  }
}

// DELETE /api/search/saved?id=xxx&visitorId=xxx — Delete a saved search
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const visitorId = searchParams.get('visitorId')

    if (!id || !visitorId) {
      return NextResponse.json({ error: 'id and visitorId are required' }, { status: 400 })
    }

    await db.savedSearch.deleteMany({
      where: {
        id,
        visitorId: visitorId.toLowerCase(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Saved search delete error:', error)
    return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 })
  }
}
