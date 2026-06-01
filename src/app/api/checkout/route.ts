import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'
import { stripe, PLAN_PRICE_IDS, PLAN_LABELS } from '@/lib/stripe'

const log = apiRouteLogger('/api/checkout')

// ── Helper: authenticate via token ──
async function authenticate(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return null

  const session = await db.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.userSession.delete({ where: { id: session.id } })
    return null
  }

  return session
}

// ── Helper: find or create a Stripe customer for a user ──
async function getOrCreateStripeCustomer(userId: string, email: string, name: string | null) {
  // Check if user already has a Stripe customer ID
  const subscription = await db.subscription.findUnique({
    where: { userId },
  })

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  })

  // Persist the customer ID
  if (subscription) {
    await db.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    })
  } else {
    await db.subscription.create({
      data: {
        userId,
        plan: 'free',
        status: 'active',
        stripeCustomerId: customer.id,
      },
    })
  }

  return customer.id
}

// ── POST /api/checkout ──
// Creates a Stripe Checkout Session for the requested plan and redirects the client.
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan?: string }

    if (!plan || !PLAN_PRICE_IDS[plan]) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Invalid or unsupported plan. Supported: ${Object.keys(PLAN_PRICE_IDS).join(', ')}` },
        { status: 400 },
      )
    }

    const priceId = PLAN_PRICE_IDS[plan]
    if (!priceId) {
      end(500)
      return NextResponse.json(
        { success: false, error: `Stripe price ID not configured for plan "${plan}".` },
        { status: 500 },
      )
    }

    // Get origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://theonewaygda.com'

    // Find or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      session.userId,
      session.user.email,
      session.user.name,
    )

    // Create the Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.userId,
        plan,
        planLabel: PLAN_LABELS[plan] || plan,
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?plan=${plan}`,
      subscription_data: {
        metadata: {
          userId: session.userId,
          plan,
        },
        trial_period_days: plan === 'pro' ? undefined : undefined, // no trial by default
      },
      allow_promotion_codes: true,
    })

    log.info('Checkout session created', {
      userId: session.userId,
      plan,
      sessionId: checkoutSession.id,
    })

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
