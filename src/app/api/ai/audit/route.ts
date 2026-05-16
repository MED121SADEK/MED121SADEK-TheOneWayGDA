import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.aiAuditLog.count({ where }),
    ])

    // Aggregate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [todayCount, weekCount, totalCount] = await Promise.all([
      prisma.aiAuditLog.count({ where: { createdAt: { gte: today } } }),
      prisma.aiAuditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.aiAuditLog.count(),
    ])

    const avgDuration = await prisma.aiAuditLog.aggregate({
      _avg: { durationMs: true },
      where: { durationMs: { gt: 0 } },
    })

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        error: log.error,
        durationMs: log.durationMs,
        tokensUsed: log.tokensUsed,
        createdAt: log.createdAt,
      })),
      pagination: { total, limit, offset },
      stats: {
        todayQueries: todayCount,
        weekQueries: weekCount,
        totalQueries: totalCount,
        avgDurationMs: Math.round(avgDuration._avg.durationMs || 0),
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
