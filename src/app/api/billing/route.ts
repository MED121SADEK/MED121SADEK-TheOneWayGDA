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

// PATCH /api/billing — Update subscription plan
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

    // Allow free → pro → enterprise transitions (no downgrades for now)
    if (newPlanIndex < currentPlanIndex) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Cannot downgrade from "${subscription.plan}" to "${plan}". Contact support to change plans.` },
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

    // Update subscription (placeholder — in production would integrate with Stripe)
    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: null, // No billing cycle end for placeholder
      },
    })

    // Log activity
    await db.userActivity.create({
      data: {
        userId: session.userId,
        type: 'plan_changed',
        details: JSON.stringify({
          from: subscription.plan,
          to: plan,
          previousPeriodStart: subscription.currentPeriodStart,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    // Log API activity
    log.info(`Plan upgraded`, {
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
          : `Plan upgraded to "${plan}". Note: Payment integration is not yet active — this is a placeholder upgrade.`,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to update plan' }, { status: 500 })
  }
}
