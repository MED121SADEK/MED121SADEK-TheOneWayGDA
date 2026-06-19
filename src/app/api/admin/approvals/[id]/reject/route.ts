import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendUserRejectionEmail } from '@/lib/email'

function verifyAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const cookieToken = request.cookies.get('oneway-admin-token')?.value
  if (cookieToken && cookieToken === adminSecret) return true
  const authHeader = request.headers.get('x-admin-token')
  if (authHeader && authHeader === adminSecret) return true
  return false
}

// POST /api/admin/approvals/[id]/reject — Reject a pending user (admin password auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'Application did not meet our requirements.'

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'pending') {
      return NextResponse.json({ error: 'User is not in a pending state' }, { status: 400 })
    }

    await db.user.update({ where: { id }, data: { role: 'rejected' } })

    await db.userActivity.create({
      data: {
        userId: id,
        type: 'account_rejected',
        details: JSON.stringify({ method: 'admin_panel', reason }),
      },
    })

    sendUserRejectionEmail(user.email, user.name).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${user.name || user.email} has been rejected.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}