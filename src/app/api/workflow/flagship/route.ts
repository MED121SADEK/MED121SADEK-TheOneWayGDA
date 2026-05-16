import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship')

export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const pipelines = await prisma.workflowPipeline.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const serialized = pipelines.map(p => {
      const steps = JSON.parse(p.steps)
      const completed = steps.filter((s: { status: string }) => s.status === 'completed').length
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        intent: p.intent,
        status: p.status,
        totalSteps: steps.length,
        completedSteps: completed,
        executiveSummary: p.executiveSummary,
        tokensUsed: p.tokensUsed,
        durationMs: p.durationMs,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }
    })

    end(200)
    return NextResponse.json({ pipelines: serialized })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to fetch flagship workflows' }, { status: 500 })
  }
}
