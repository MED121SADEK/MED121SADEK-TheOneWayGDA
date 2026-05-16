import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

// GET /api/admin/users/pending — List all pending user requests
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const pendingUsers = await db.user.findMany({
      where: { role: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    const rejectedUsers = await db.user.findMany({
      where: { role: 'rejected' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 20,
    })

    return NextResponse.json({
      pending: pendingUsers,
      rejected: rejectedUsers,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pending users'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
