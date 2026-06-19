import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Admin password auth (same system as /admin/visitors)
function verifyAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false

  // Check cookie first
  const cookieToken = request.cookies.get('oneway-admin-token')?.value
  if (cookieToken && cookieToken === adminSecret) return true

  // Check Authorization header (fallback)
  const authHeader = request.headers.get('x-admin-token')
  if (authHeader && authHeader === adminSecret) return true

  return false
}

// GET /api/admin/approvals — List pending/rejected users (admin password auth)
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
    }

    const pendingUsers = await db.user.findMany({
      where: { role: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    const rejectedUsers = await db.user.findMany({
      where: { role: 'rejected' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
      take: 20,
    })

    return NextResponse.json({ pending: pendingUsers, rejected: rejectedUsers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}