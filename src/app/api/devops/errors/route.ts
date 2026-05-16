/**
 * DevOps Error Log API
 *
 * GET /api/devops/errors — List recent errors (paginated)
 * GET /api/devops/errors?stats=true — Error statistics
 * POST /api/devops/errors — Log a new error
 */

import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// ── List Errors or Stats ──
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('stats') === 'true') {
      return getErrorStats()
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const level = searchParams.get('level')
    const domain = searchParams.get('domain')
    const resolved = searchParams.get('resolved')

    const where: Record<string, unknown> = {}
    if (level) where.level = level
    if (domain) where.domain = domain
    if (resolved !== null) where.resolved = resolved === 'true'

    const [errors, total] = await Promise.all([
      prisma.appErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appErrorLog.count({ where }),
    ])

    return NextResponse.json({
      errors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error: unknown) {
    console.error('[DevOps:Errors]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Log New Error ──
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const error = await prisma.appErrorLog.create({
      data: {
        level: body.level || 'error',
        domain: body.domain || 'application',
        route: body.route,
        message: body.message,
        stack: body.stack?.slice(0, 2000),
        requestId: body.requestId,
        statusCode: body.statusCode,
        method: body.method,
        ipAddress: body.ipAddress,
        userAgent: body.userAgent,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
    })
    return NextResponse.json({ success: true, id: error.id }, { status: 201 })
  } catch (error: unknown) {
    console.error('[DevOps:Errors:Create]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getErrorStats() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalErrors, unresolvedErrors, lastHour, lastDay, lastWeek, byLevel, byDomain, topRoutes] = await Promise.all([
    prisma.appErrorLog.count(),
    prisma.appErrorLog.count({ where: { resolved: false } }),
    prisma.appErrorLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.appErrorLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.appErrorLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.appErrorLog.groupBy({ by: ['level'], _count: true }),
    prisma.appErrorLog.groupBy({ by: ['domain'], _count: true }),
    prisma.appErrorLog.groupBy({ by: ['route'], where: { route: { not: null } }, _count: true, orderBy: { _count: { id: 'desc' } }, take: 10 }),
  ])

  return NextResponse.json({
    summary: { total: totalErrors, unresolved: unresolvedErrors, lastHour, lastDay, lastWeek },
    byLevel: byLevel.map(g => ({ level: g.level, count: g._count })),
    byDomain: byDomain.map(g => ({ domain: g.domain, count: g._count })),
    topRoutes: topRoutes.map(g => ({ route: g.route, count: g._count })),
  })
}
