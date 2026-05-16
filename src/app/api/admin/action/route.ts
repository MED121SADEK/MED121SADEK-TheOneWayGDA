import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyActionToken } from '@/lib/email'
import { sendUserApprovalEmail } from '@/lib/email'
import { sendUserRejectionEmail } from '@/lib/email'

// GET /api/admin/action?token=xxx — Process one-click approve/reject from email
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const verified = verifyActionToken(token)

    if (!verified.valid) {
      return NextResponse.json({
        success: false,
        error: 'expired',
        message: 'This link has expired. Links are valid for 24 hours. Please use the admin dashboard to manage requests.',
      }, { status: 410 })
    }

    const user = await db.user.findUnique({ where: { id: verified.userId } })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'not_found',
        message: 'User not found. They may have already been processed.',
      }, { status: 404 })
    }

    if (verified.action === 'approve') {
      // Approve the user
      if (user.role !== 'pending' && user.role !== 'rejected') {
        return NextResponse.json({
          success: true,
          action: 'already_approved',
          message: `${user.name || user.email} has already been approved.`,
          userName: user.name,
          userEmail: user.email,
        })
      }

      await db.user.update({
        where: { id: user.id },
        data: { role: 'user' },
      })

      await db.userActivity.create({
        data: {
          userId: user.id,
          type: 'account_approved',
          details: JSON.stringify({ method: 'email_link' }),
        },
      })

      await db.visitor.upsert({
        where: { email: user.email },
        update: { name: user.name, status: 'active' },
        create: { email: user.email, name: user.name, status: 'active' },
      })

      // Send welcome email to the user
      sendUserApprovalEmail(user.email, user.name).catch(() => {})

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: `${user.name || user.email} has been approved! A welcome email has been sent to them.`,
        userName: user.name,
        userEmail: user.email,
      })
    }

    if (verified.action === 'reject') {
      if (user.role !== 'pending') {
        return NextResponse.json({
          success: true,
          action: 'already_processed',
          message: `${user.name || user.email} has already been processed.`,
          userName: user.name,
          userEmail: user.email,
        })
      }

      await db.user.update({
        where: { id: user.id },
        data: { role: 'rejected' },
      })

      await db.userActivity.create({
        data: {
          userId: user.id,
          type: 'account_rejected',
          details: JSON.stringify({ method: 'email_link' }),
        },
      })

      // Send rejection email to the user
      sendUserRejectionEmail(user.email, user.name).catch(() => {})

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: `${user.name || user.email} has been rejected. A notification has been sent to them.`,
        userName: user.name,
        userEmail: user.email,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Action failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
