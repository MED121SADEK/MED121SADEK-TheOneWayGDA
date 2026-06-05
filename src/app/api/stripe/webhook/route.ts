import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'
import { sendAdminSubscriptionNotificationEmail } from '@/lib/email'

const log = apiRouteLogger('/api/stripe/webhook')

/**
 * Stripe Webhook Handler
 *
 * Handles the following events:
 * - checkout.session.completed    → Activate subscription
 * - customer.subscription.updated → Sync plan/period changes
 * - customer.subscription.deleted → Cancel subscription (revert to free)
 * - invoice.payment_failed        → Mark subscription as past_due
 *
 * IMPORTANT: This route intentionally does NOT use edge runtime —
 * it requires Node.js crypto for signature verification.
 */

// Map Stripe price IDs to internal plan names
function getPlanFromPriceId(priceId: string): string {
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
  const enterprisePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE

  if (priceId === proPriceId) return 'pro'
  if (priceId === enterprisePriceId) return 'enterprise'
  return 'pro' // default fallback
}

// ── checkout.session.completed ──
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan || 'pro'
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!userId) {
    log.warn('checkout.session.completed missing userId in metadata', { sessionId: session.id })
    return
  }

  // Fetch full subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] })
  const sub = stripeSubscription as unknown as { current_period_start: number; current_period_end: number; cancel_at: number | null; trial_end: number | null }
  const periodStart = new Date(sub.current_period_start * 1000)
  const periodEnd = new Date(sub.current_period_end * 1000)

  // Upsert the subscription record with PENDING_APPROVAL status
  // Admin must manually approve from /admin/subscriptions dashboard
  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: 'pending_approval',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    },
    update: {
      plan,
      status: 'pending_approval',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    },
  })

  // Do NOT auto-upgrade user role — admin must approve first

  // Log the activity
  await db.userActivity.create({
    data: {
      userId,
      type: 'plan_changed',
      details: JSON.stringify({ action: 'stripe_checkout_completed', plan, subscriptionId, status: 'pending_approval' }),
    },
  })

  // Fetch user info for the admin notification email
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })

  // Send admin email notification (fire-and-forget)
  sendAdminSubscriptionNotificationEmail(
    user?.name || null,
    user?.email || '',
    plan,
    subscriptionId,
    userId
  ).catch(() => {})

  log.info('Subscription pending approval — admin notified', { userId, plan, subscriptionId })
}

// ── customer.subscription.updated ──
async function handleSubscriptionUpdated(rawSub: Stripe.Subscription) {
  const s = rawSub as unknown as { current_period_start: number; current_period_end: number; cancel_at: number | null; trial_end: number | null; pause_collection?: { paused: boolean } }
  const subscription = rawSub
  const userId = subscription.metadata?.userId
  const customerId = subscription.customer as string

  if (!userId) {
    // Try to find user by Stripe customer ID
    const subRecord = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    })
    if (!subRecord) {
      log.warn('subscription.updated: no user found', { customerId })
      return
    }
  }

  const targetUserId = userId || (
    await db.subscription.findFirst({ where: { stripeCustomerId: customerId } })
  )?.userId

  if (!targetUserId) return

  const periodStart = new Date(s.current_period_start * 1000)
  const periodEnd = new Date(s.current_period_end * 1000)

  // Determine plan from the subscription items
  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? getPlanFromPriceId(priceId) : 'pro'

  // Determine status
  let status: string = 'active'
  if (subscription.status === 'trialing') status = 'trialing'
  else if (subscription.status === 'past_due') status = 'past_due'
  else if (subscription.status === 'canceled') status = 'canceled'
  else if (s.pause_collection?.paused) status = 'paused'

  await db.subscription.update({
    where: { userId: targetUserId },
    data: {
      plan,
      status,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAt: s.cancel_at ? new Date(s.cancel_at * 1000) : null,
      trialEnd: s.trial_end ? new Date(s.trial_end * 1000) : null,
    },
  })

  log.info('Subscription updated', { userId: targetUserId, plan, status })
}

// ── customer.subscription.deleted ──
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID
  const subRecord = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!subRecord) {
    log.warn('subscription.deleted: no subscription found', { customerId })
    return
  }

  await db.subscription.update({
    where: { id: subRecord.id },
    data: {
      plan: 'free',
      status: 'canceled',
      currentPeriodEnd: new Date(),
    },
  })

  // Revert user role
  await db.user.update({
    where: { id: subRecord.userId },
    data: { role: 'user' },
  })

  await db.userActivity.create({
    data: {
      userId: subRecord.userId,
      type: 'plan_changed',
      details: JSON.stringify({ action: 'stripe_subscription_deleted', previousPlan: subRecord.plan }),
    },
  })

  log.info('Subscription canceled, reverted to free', { userId: subRecord.userId })
}

// ── invoice.payment_failed ──
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const subRecord = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!subRecord) {
    log.warn('invoice.payment_failed: no subscription found', { customerId })
    return
  }

  await db.subscription.update({
    where: { id: subRecord.id },
    data: { status: 'past_due' },
  })

  log.info('Payment failed, marked as past_due', { userId: subRecord.userId })
}

// ── Main POST handler ──
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      log.error('STRIPE_WEBHOOK_SECRET is not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 },
      )
    }

    // Read raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      end(400)
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify and construct the event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown verification error'
      log.error('Webhook signature verification failed', { message: msg })
      end(401)
      return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 401 })
    }

    // Route the event to the appropriate handler
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default: {
        log.info(`Unhandled event type: ${event.type}`)
      }
    }

    end(200)
    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}
