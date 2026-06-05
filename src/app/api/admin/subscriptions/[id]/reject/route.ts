import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { sendUserSubscriptionRejectedEmail } from '@/lib/email'
import { stripe } from '@/lib/stripe'

// POST /api/admin/subscriptions/[id]/reject — Reject a pending subscription
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

    // Cancel the Stripe subscription if one exists
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      } catch (stripeError: unknown) {
        const stripeMessage = stripeError instanceof Error ? stripeError.message : 'Stripe cancellation failed'
        console.error(`[Stripe] Failed to cancel subscription ${subscription.stripeSubscriptionId}: ${stripeMessage}`)
      }
    }

    // Update subscription status to canceled
    await db.subscription.update({
      where: { id },
      data: { status: 'canceled' },
    })

    // Create activity log
    await db.userActivity.create({
      data: {
        userId: subscription.userId,
        type: 'subscription_rejected',
        details: JSON.stringify({
          subscriptionId: id,
          plan: subscription.plan,
          rejectedBy: session.userId,
          rejectedByName: session.user.name,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    // Send rejection email to user
    sendUserSubscriptionRejectedEmail(
      subscription.user.email,
      subscription.user.name,
      subscription.plan
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Subscription rejected and canceled',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
