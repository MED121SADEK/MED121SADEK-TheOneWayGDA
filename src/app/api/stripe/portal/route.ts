import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'
import { stripe } from '@/lib/stripe'

const log = apiRouteLogger('/api/stripe/portal')

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

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Requires the user to have an active Stripe customer ID (set after first checkout).
 *
 * Returns: { success: true, data: { url: string } }
 */
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Look up the subscription to get the Stripe customer ID
    const subscription = await db.subscription.findUnique({
      where: { userId: session.userId },
    })

    if (!subscription?.stripeCustomerId) {
      end(400)
      return NextResponse.json(
        {
          success: false,
          error: 'No Stripe customer found. Please subscribe to a paid plan first.',
        },
        { status: 400 },
      )
    }

    // Ensure the Stripe portal configuration exists
    // You must create a portal configuration in the Stripe Dashboard:
    // https://dashboard.stripe.com/settings/billing/portal
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://theonewaygda.com'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/billing`,
    })

    log.info('Portal session created', {
      userId: session.userId,
      customerId: subscription.stripeCustomerId,
    })

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        url: portalSession.url,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    const message = error instanceof Error ? error.message : 'Failed to create portal session'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
