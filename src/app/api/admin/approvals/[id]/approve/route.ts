import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendUserApprovalEmail } from '@/lib/email'

function verifyAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const cookieToken = request.cookies.get('oneway-admin-token')?.value
  if (cookieToken && cookieToken === adminSecret) return true
  const authHeader = request.headers.get('x-admin-token')
  if (authHeader && authHeader === adminSecret) return true
  return false
}

// POST /api/admin/approvals/[id]/approve — Approve a pending user (admin password auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
    }

    const { id } = await params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'pending' && user.role !== 'rejected') {
      return NextResponse.json({ error: 'User is not in a pending or rejected state' }, { status: 400 })
    }

    await db.user.update({ where: { id }, data: { role: 'user' } })

    await db.userActivity.create({
      data: {
        userId: id,
        type: 'account_approved',
        details: JSON.stringify({ method: 'admin_panel' }),
      },
    })

    await db.visitor.upsert({
      where: { email: user.email },
      update: { name: user.name, status: 'accepted' },
      create: { email: user.email, name: user.name, status: 'accepted' },
    })

    sendUserApprovalEmail(user.email, user.name).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${user.name || user.email} has been approved. A welcome email has been sent.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}