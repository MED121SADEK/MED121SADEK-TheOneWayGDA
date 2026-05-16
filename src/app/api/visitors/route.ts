import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'oneway-admin-2026'

function isAuthenticated(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (!auth) return false
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return token === ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const visitorType = searchParams.get('visitorType')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
    if (status) where.status = status
    if (visitorType) where.visitorType = visitorType
    if (search) { where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { country: { contains: search } }] }

    const orderBy: any = {}; orderBy[sortBy] = sortOrder

    const [visitors, total, stats] = await Promise.all([
      db.visitor.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      db.visitor.count({ where }),
      db.$queryRaw<Array<{ status: string; visitorType: string; count: number }>>`SELECT status, visitorType, COUNT(*) as count FROM Visitor GROUP BY status, visitorType`,
    ])

    const byType: Record<string, { total: number; pending: number; accepted: number; rejected: number }> = {}
    for (const s of stats) {
      if (!byType[s.visitorType]) byType[s.visitorType] = { total: 0, pending: 0, accepted: 0, rejected: 0 }
      byType[s.visitorType].total = s.count
      byType[s.visitorType][s.status as 'pending' | 'accepted' | 'rejected'] = s.count
    }

    return NextResponse.json({ visitors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, filters: { status, visitorType, search }, stats: byType })
  } catch (error: any) {
    console.error('[Visitors API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { id, status, notes, visitorType, bulkIds, bulkStatus } = body

    if (bulkIds && bulkStatus) {
      if (!['accepted', 'rejected', 'pending'].includes(bulkStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      const result = await db.visitor.updateMany({ where: { id: { in: bulkIds } }, data: { status: bulkStatus } })
      return NextResponse.json({ success: true, updated: result.count })
    }

    if (!id) return NextResponse.json({ error: 'Visitor ID is required' }, { status: 400 })
    const updateData: any = {}
    if (status && ['accepted', 'rejected', 'pending'].includes(status)) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (visitorType && ['researcher', 'student', 'professional', 'enterprise', 'developer', 'educator', 'general'].includes(visitorType)) updateData.visitorType = visitorType
    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

    const visitor = await db.visitor.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, visitor })
  } catch (error: any) {
    console.error('[Visitors API PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Visitor ID is required' }, { status: 400 })
    await db.visitor.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Visitors API DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
