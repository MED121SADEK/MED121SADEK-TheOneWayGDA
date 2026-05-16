import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
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

    const userId = session.userId

    // Aggregate stats
    const [
      totalActivities,
      loginCount,
      analysisCount,
      projectCount,
      workflowCount,
      automationCount,
      reportCount,
      weeklyActivity,
    ] = await Promise.all([
      db.userActivity.count({ where: { userId } }),
      db.userActivity.count({ where: { userId, type: 'login' } }),
      db.userActivity.count({ where: { userId, type: 'analysis_run' } }),
      db.project.count({ where: { id: { gt: '' } } }), // simplified
      db.workflowPipeline.count({ where: { visitorId: session.user.email } }),
      db.automationRule.count({ where: { visitorId: session.user.email } }),
      db.userActivity.count({ where: { userId, type: 'report_generated' } }),
      // Last 7 days activity
      db.userActivity.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
      }),
    ])

    return NextResponse.json({
      stats: {
        totalActivities,
        loginCount,
        analysisCount,
        projectCount,
        workflowCount,
        automationCount,
        reportCount,
        weeklyActivity: weeklyActivity.map((w) => ({
          date: (w.createdAt instanceof Array ? w.createdAt[0] : w.createdAt instanceof Date ? w.createdAt : new Date()).toISOString().split('T')[0],
          count: typeof w._count === 'number' ? w._count : 0,
        })),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
