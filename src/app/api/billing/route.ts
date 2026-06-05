import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/billing')

// Helper: authenticate and return user session
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

// Plan limits configuration
const PLAN_LIMITS: Record<string, { apiCallsPerDay: number; workflowsPerMonth: number; teamMembers: number; storageMb: number }> = {
  free: { apiCallsPerDay: 100, workflowsPerMonth: 5, teamMembers: 3, storageMb: 100 },
  pro: { apiCallsPerDay: 1000, workflowsPerMonth: -1, teamMembers: 25, storageMb: 10240 },
  enterprise: { apiCallsPerDay: -1, workflowsPerMonth: -1, teamMembers: -1, storageMb: 102400 },
}

// Upgrade options
const UPGRADE_OPTIONS = [
  {
    plan: 'pro',
    price: 29,
    currency: 'USD',
    period: 'month',
    features: ['1,000 API calls/day', 'Unlimited workflows', '25 team members', '10 GB storage'],
  },
  {
    plan: 'enterprise',
    price: 99,
    currency: 'USD',
    period: 'month',
    features: [
      'Unlimited API calls',
      'Unlimited everything',
      'Unlimited team members',
      '100 GB storage',
      'Priority support',
      'Custom integrations',
    ],
  },
]

// Plan ordering for valid transitions
const PLAN_ORDER = ['free', 'pro', 'enterprise']

// GET /api/billing — Get current user's subscription info
export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Auto-create free subscription if missing
    let subscription = await db.subscription.findUnique({
      where: { userId: session.userId },
    })

    if (!subscription) {
      subscription = await db.subscription.create({
        data: {
          userId: session.userId,
          plan: 'free',
          status: 'active',
        },
      })
    }

    const limits = PLAN_LIMITS[subscription.plan] || PLAN_LIMITS.free

    // ── Calculate current usage ──

    // API calls today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const apiCallsToday = await db.usageRecord.count({
      where: {
        userId: session.userId,
        category: 'api_call',
        createdAt: { gte: todayStart },
      },
    })

    // Workflows this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const workflowsThisMonth = await db.usageRecord.count({
      where: {
        userId: session.userId,
        category: 'workflow',
        createdAt: { gte: monthStart },
      },
    })

    // Team members
    const teamMembers = await db.teamMember.count({
      where: { userId: session.userId },
    })

    // Storage used (approximation: count of projects + shared workflows)
    const projectCount = await db.project.count({
      where: { /* owned by user — no direct userId field, estimate */ },
    })
    // Since Project model doesn't have userId, estimate storage from user's related records
    const sharedWorkflows = await db.sharedWorkflow.count({
      where: { author: session.user.email },
    })
    const storageUsedMb = Math.round(((projectCount * 2) + (sharedWorkflows * 0.5)) * 10) / 10

    // Build upgrade options based on current plan
    const currentPlanIndex = PLAN_ORDER.indexOf(subscription.plan)
    const upgradeOptions = UPGRADE_OPTIONS.filter(
      opt => PLAN_ORDER.indexOf(opt.plan) > currentPlanIndex
    )

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        plan: subscription.plan,
        status: subscription.status,
        limits: {
          apiCallsPerDay: limits.apiCallsPerDay === -1 ? 'Unlimited' : limits.apiCallsPerDay,
          workflowsPerMonth: limits.workflowsPerMonth === -1 ? 'Unlimited' : limits.workflowsPerMonth,
          teamMembers: limits.teamMembers === -1 ? 'Unlimited' : limits.teamMembers,
          storageMb: limits.storageMb === -1 ? 'Unlimited' : limits.storageMb,
        },
        usage: {
          apiCallsToday,
          workflowsThisMonth,
          teamMembers,
          storageUsedMb,
        },
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        upgradeOptions,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch billing info' }, { status: 500 })
  }
}

// POST /api/billing — Create Stripe checkout for plan upgrade
// Preferred flow: client calls POST /api/checkout to get a Stripe Checkout URL.
// This endpoint is kept as a convenience shortcut that internally delegates to /api/checkout.
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

    // Validate plan
    if (!plan || !PLAN_ORDER.includes(plan)) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Invalid plan. Must be one of: ${PLAN_ORDER.join(', ')}` },
        { status: 400 }
      )
    }

    // Free plan — no Stripe checkout needed, do a direct downgrade
    if (plan === 'free') {
      let subscription = await db.subscription.findUnique({ where: { userId: session.userId } })
      if (!subscription) {
        subscription = await db.subscription.create({ data: { userId: session.userId, plan: 'free', status: 'active' } })
      }

      const updated = await db.subscription.update({
        where: { id: subscription.id },
        data: { plan: 'free', status: 'active', cancelAt: new Date() },
      })

      await db.user.update({ where: { id: session.userId }, data: { role: 'user' } })
      await db.userActivity.create({
        data: {
          userId: session.userId,
          type: 'plan_changed',
          details: JSON.stringify({ from: subscription.plan, to: 'free', source: 'billing_api' }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        },
      })

      end(200)
      return NextResponse.json({
        success: true,
        data: { plan: updated.plan, status: updated.status, message: 'Plan changed to Free.' },
      })
    }

    // Paid plan → delegate to Stripe checkout
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const checkoutRes = await fetch(`${origin}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await import('@/lib/auth')).getTokenFromRequest(request) || ''}` },
      body: JSON.stringify({ plan }),
    })

    const checkoutData = await checkoutRes.json()
    if (!checkoutRes.ok || !checkoutData.success) {
      end(checkoutRes.status)
      return NextResponse.json(
        { success: false, error: checkoutData.error || 'Failed to create checkout session' },
        { status: checkoutRes.status },
      )
    }

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        redirectUrl: checkoutData.data.url,
        sessionId: checkoutData.data.sessionId,
        message: `Redirect to Stripe to complete your ${plan} subscription.`,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to initiate plan change' }, { status: 500 })
  }
}

// PATCH /api/billing — Update subscription plan (fallback without Stripe)
// NOTE: For production payment flows, use POST /api/checkout instead.
// This PATCH endpoint is retained for testing / admin overrides without Stripe.
export async function PATCH(request: NextRequest) {
  const end = log.start('PATCH')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body

    // Validate plan
    if (!plan || !PLAN_ORDER.includes(plan)) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Invalid plan. Must be one of: ${PLAN_ORDER.join(', ')}` },
        { status: 400 }
      )
    }

    // Get or create subscription
    let subscription = await db.subscription.findUnique({
      where: { userId: session.userId },
    })

    if (!subscription) {
      subscription = await db.subscription.create({
        data: {
          userId: session.userId,
          plan: 'free',
          status: 'active',
        },
      })
    }

    const currentPlanIndex = PLAN_ORDER.indexOf(subscription.plan)
    const newPlanIndex = PLAN_ORDER.indexOf(plan)

    // Only allow free plan fallback (no paid upgrades without Stripe payment)
    if (plan !== 'free') {
      end(400)
      return NextResponse.json(
        { success: false, error: 'Paid plan upgrades require payment. Please use the checkout flow instead.' },
        { status: 400 }
      )
    }

    if (subscription.plan === plan) {
      end(400)
      return NextResponse.json(
        { success: false, error: `You are already on the "${plan}" plan` },
        { status: 400 }
      )
    }

    // Update subscription (fallback — in production use POST /api/checkout for Stripe payment)
    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: null, // No billing cycle end for fallback
      },
    })

    // Update user role for pro/enterprise
    if (plan === 'pro') {
      await db.user.update({ where: { id: session.userId }, data: { role: 'pro' } })
    }

    // Log activity
    await db.userActivity.create({
      data: {
        userId: session.userId,
        type: 'plan_changed',
        details: JSON.stringify({
          from: subscription.plan,
          to: plan,
          previousPeriodStart: subscription.currentPeriodStart,
          source: 'fallback_patch',
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    // Log API activity
    log.info(`Plan upgraded (fallback)`, {
      userId: session.userId,
      from: subscription.plan,
      to: plan,
    })

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        plan: updated.plan,
        status: updated.status,
        currentPeriodStart: updated.currentPeriodStart,
        currentPeriodEnd: updated.currentPeriodEnd,
        message: plan === 'free'
          ? 'Plan reset to free.'
          : `Plan upgraded to "${plan}". Note: Payment integration is not yet active — this is a fallback upgrade.`,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to update plan' }, { status: 500 })
  }
}
