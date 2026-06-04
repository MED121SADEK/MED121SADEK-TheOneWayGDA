import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyActionToken } from '@/lib/email'
import { sendUserApprovalEmail } from '@/lib/email'
import { sendUserRejectionEmail } from '@/lib/email'

// GET /api/admin/visitor-action?token=xxx — Process one-click approve/reject for VISITORS from email
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

    // For visitors, the userId field is actually the visitor email (used as pseudo-ID)
    const visitorEmail = verified.userId

    const visitor = await db.visitor.findUnique({ where: { email: visitorEmail } })

    if (!visitor) {
      return NextResponse.json({
        success: false,
        error: 'not_found',
        message: 'Visitor not found. They may have already been processed.',
      }, { status: 404 })
    }

    if (verified.action === 'approve') {
      // Check if already accepted
      if (visitor.status === 'accepted') {
        return NextResponse.json({
          success: true,
          action: 'already_accepted',
          message: `${visitor.name || visitor.email} has already been accepted.`,
          visitorName: visitor.name,
          visitorEmail: visitor.email,
        })
      }

      await db.visitor.update({
        where: { email: visitorEmail },
        data: { status: 'accepted' },
      })

      // If visitor also has a User account with pending role, approve that too
      try {
        const user = await db.user.findUnique({ where: { email: visitorEmail } })
        if (user && (user.role === 'pending' || user.role === 'rejected')) {
          await db.user.update({
            where: { id: user.id },
            data: { role: 'user' },
          })
          await db.userActivity.create({
            data: {
              userId: user.id,
              type: 'account_approved',
              details: JSON.stringify({ method: 'email_link_visitor' }),
            },
          })
        }
      } catch { /* user may not exist, that's fine */ }

      // Send welcome email
      sendUserApprovalEmail(visitor.email, visitor.name).catch(() => {})

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: `${visitor.name || visitor.email} has been approved! A welcome email has been sent.`,
        visitorName: visitor.name,
        visitorEmail: visitor.email,
      })
    }

    if (verified.action === 'reject') {
      if (visitor.status === 'rejected') {
        return NextResponse.json({
          success: true,
          action: 'already_rejected',
          message: `${visitor.name || visitor.email} has already been rejected.`,
          visitorName: visitor.name,
          visitorEmail: visitor.email,
        })
      }

      await db.visitor.update({
        where: { email: visitorEmail },
        data: { status: 'rejected' },
      })

      // Send rejection email
      sendUserRejectionEmail(visitor.email, visitor.name).catch(() => {})

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: `${visitor.name || visitor.email} has been rejected. A notification has been sent.`,
        visitorName: visitor.name,
        visitorEmail: visitor.email,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Action failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
