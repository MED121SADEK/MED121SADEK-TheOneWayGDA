/**
 * DevOps Deploy Log API
 *
 * GET /api/devops/deploys — List deployment history
 * POST /api/devops/deploys — Record a new deployment
 */

import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

export async function GET() {
  try {
    const [deploys, summary] = await Promise.all([
      prisma.deployLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.deployLog.groupBy({ by: ['status'], _count: true }),
    ])
    return NextResponse.json({
      deploys,
      summary: summary.map(s => ({ status: s.status, count: s._count })),
    })
  } catch (error: unknown) {
    console.error('[DevOps:Deploys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deploy = await prisma.deployLog.create({
      data: {
        environment: body.environment || 'production',
        version: body.version,
        deployer: body.deployer,
        strategy: body.strategy || 'rolling',
        status: body.status || 'pending',
        durationMs: body.durationMs,
        backupPath: body.backupPath,
        notes: body.notes,
      },
    })
    return NextResponse.json({ success: true, id: deploy.id }, { status: 201 })
  } catch (error: unknown) {
    console.error('[DevOps:Deploys:Create]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
