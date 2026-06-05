import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

// GET /api/admin/subscriptions/pending — List all pending subscription approvals
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

    const pendingSubscriptions = await db.subscription.findMany({
      where: { status: 'pending_approval' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        plan: true,
        stripeSubscriptionId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      pending: pendingSubscriptions,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pending subscriptions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
