import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { sendUserSubscriptionApprovedEmail } from '@/lib/email'

// POST /api/admin/subscriptions/[id]/approve — Approve a pending subscription
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

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (subscription.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Subscription is not in a pending approval state' },
        { status: 400 }
      )
    }

    // Update subscription status to active
    await db.subscription.update({
      where: { id },
      data: { status: 'active' },
    })

    // Update user role to 'pro' if the plan is 'pro'
    if (subscription.plan === 'pro') {
      await db.user.update({
        where: { id: subscription.userId },
        data: { role: 'pro' },
      })
    }

    // Create activity log
    await db.userActivity.create({
      data: {
        userId: subscription.userId,
        type: 'subscription_approved',
        details: JSON.stringify({
          subscriptionId: id,
          plan: subscription.plan,
          approvedBy: session.userId,
          approvedByName: session.user.name,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    // Send approval email to user
    sendUserSubscriptionApprovedEmail(
      subscription.user.email,
      subscription.user.name,
      subscription.plan
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Subscription approved',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
