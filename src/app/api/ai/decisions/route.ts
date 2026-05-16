import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      context,
      question,
      aiAnalysis,
      options,
      selectedOption,
      outcome,
      confidence,
      pipelineId,
      projectId,
    } = body as {
      context: string
      question: string
      aiAnalysis: string | Record<string, unknown>
      options?: unknown
      selectedOption?: string
      outcome?: unknown
      confidence?: number
      pipelineId?: string
      projectId?: string
    }

    const visitorId = request.headers.get('x-visitor-id') || null

    if (!context || typeof context !== 'string') {
      return NextResponse.json(
        { error: 'Context is required (workspace, leaderboard, automation)' },
        { status: 400 }
      )
    }

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question/intent is required' },
        { status: 400 }
      )
    }

    const validContexts = ['workspace', 'leaderboard', 'automation']
    if (!validContexts.includes(context)) {
      return NextResponse.json(
        { error: `Context must be one of: ${validContexts.join(', ')}` },
        { status: 400 }
      )
    }

    // Create decision record
    const record = await prisma.decisionRecord.create({
      data: {
        visitorId,
        projectId: projectId || null,
        pipelineId: pipelineId || null,
        context,
        question: question.trim(),
        aiAnalysis: typeof aiAnalysis === 'string' ? aiAnalysis : JSON.stringify(aiAnalysis),
        options: options ? JSON.stringify(options) : null,
        selectedOption: selectedOption || null,
        outcome: outcome ? JSON.stringify(outcome) : null,
        confidence: confidence ?? null,
      },
    })

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId,
          action: 'ai_query',
          details: JSON.stringify({
            action: 'decision_recorded',
            decisionId: record.id,
            context,
          }),
          inputData: JSON.stringify({ question: question.trim().slice(0, 500) }),
          outputData: JSON.stringify({ decisionId: record.id }),
        },
      })
    } catch {
      // Audit log failure should not block response
    }

    return NextResponse.json({
      decision: {
        id: record.id,
        visitorId: record.visitorId,
        projectId: record.projectId,
        pipelineId: record.pipelineId,
        context: record.context,
        question: record.question,
        aiAnalysis: JSON.parse(record.aiAnalysis),
        options: record.options ? JSON.parse(record.options) : null,
        selectedOption: record.selectedOption,
        outcome: record.outcome ? JSON.parse(record.outcome) : null,
        confidence: record.confidence,
        createdAt: record.createdAt,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to record decision' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    const context = searchParams.get('context')
    const pipelineId = searchParams.get('pipelineId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {}
    if (visitorId) where.visitorId = visitorId
    if (context) where.context = context
    if (pipelineId) where.pipelineId = pipelineId

    const records = await prisma.decisionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })

    const serialized = records.map((r) => ({
      id: r.id,
      visitorId: r.visitorId,
      projectId: r.projectId,
      pipelineId: r.pipelineId,
      context: r.context,
      question: r.question,
      aiAnalysis: JSON.parse(r.aiAnalysis),
      options: r.options ? JSON.parse(r.options) : null,
      selectedOption: r.selectedOption,
      outcome: r.outcome ? JSON.parse(r.outcome) : null,
      confidence: r.confidence,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ decisions: serialized })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch decisions' },
      { status: 500 }
    )
  }
}
