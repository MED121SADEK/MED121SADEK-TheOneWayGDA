import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { sendUserRejectionEmail } from '@/lib/email'

// POST /api/admin/users/[id]/reject — Reject a pending user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const reason = body.reason || 'Application did not meet our requirements.'

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

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'pending') {
      return NextResponse.json({ error: 'User is not in a pending state' }, { status: 400 })
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { role: 'rejected' },
    })

    await db.userActivity.create({
      data: {
        userId: id,
        type: 'account_rejected',
        details: JSON.stringify({ rejectedBy: session.userId, reason }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    // Send rejection email to the user
    sendUserRejectionEmail(user.email, user.name).catch(() => {})

    return NextResponse.json({
      success: true,
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
      message: `${user.name || user.email} has been rejected. A notification has been sent to them.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
