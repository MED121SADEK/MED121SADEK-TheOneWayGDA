import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { sendUserApprovalEmail } from '@/lib/email'

// POST /api/admin/users/[id]/approve — Approve a pending user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    if (user.role !== 'pending' && user.role !== 'rejected') {
      return NextResponse.json({ error: 'User is not in a pending or rejected state' }, { status: 400 })
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { role: 'user' },
    })

    await db.userActivity.create({
      data: {
        userId: id,
        type: 'account_approved',
        details: JSON.stringify({ approvedBy: session.userId, approvedByName: session.user.name }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    await db.visitor.upsert({
      where: { email: user.email },
      update: { name: user.name, status: 'active' },
      create: { email: user.email, name: user.name, status: 'active' },
    })

    const { password: _pw, ...safeUser } = updatedUser

    // Send approval email to the user
    sendUserApprovalEmail(user.email, user.name).catch(() => {})

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: `${user.name || user.email} has been approved. A welcome email has been sent to them.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
