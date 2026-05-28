import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Sample alerts for demo ──
const sampleAlerts = [
  {
    id: 'alert-1',
    portfolioId: 'demo-pf-1',
    modelId: 'claude-4-opus',
    modelName: 'Claude 4 Opus',
    alertType: 'score_increase',
    message: 'Claude 4 Opus score increased by +1.3 points to 92.1',
    isRead: false,
    createdAt: '2025-05-28T14:30:00Z',
  },
  {
    id: 'alert-2',
    portfolioId: 'demo-pf-1',
    modelId: 'deepseek-r1',
    modelName: 'DeepSeek R1',
    alertType: 'score_decrease',
    message: 'DeepSeek R1 score decreased by -1.8 points to 89.3',
    isRead: false,
    createdAt: '2025-05-28T12:15:00Z',
  },
  {
    id: 'alert-3',
    portfolioId: 'demo-pf-1',
    modelId: 'grok-3',
    modelName: 'Grok 3',
    alertType: 'score_increase',
    message: 'Grok 3 jumped +2.5 points to 87.5 — approaching GPT-4o',
    isRead: false,
    createdAt: '2025-05-27T18:00:00Z',
  },
  {
    id: 'alert-4',
    portfolioId: 'demo-pf-1',
    modelId: 'gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    alertType: 'score_decrease',
    message: 'Gemini 2.5 Pro dropped -0.6 points to 87.9',
    isRead: true,
    createdAt: '2025-05-27T09:30:00Z',
  },
  {
    id: 'alert-5',
    portfolioId: 'demo-pf-1',
    modelId: 'claude-4-opus',
    modelName: 'Claude 4 Opus',
    alertType: 'overtake',
    message: 'Claude 4 Opus overtook DeepSeek R1 as the top held model',
    isRead: true,
    createdAt: '2025-05-26T20:00:00Z',
  },
  {
    id: 'alert-6',
    portfolioId: 'demo-pf-1',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    alertType: 'pricing_change',
    message: 'GPT-4o input price reduced by 50% to $2.50/1M tokens',
    isRead: true,
    createdAt: '2025-05-25T16:45:00Z',
  },
  {
    id: 'alert-7',
    portfolioId: 'demo-pf-1',
    modelId: 'claude-4-sonnet',
    modelName: 'Claude 4 Sonnet',
    alertType: 'new_benchmark',
    message: 'New HumanEval+ benchmark score added: 93.2/100',
    isRead: true,
    createdAt: '2025-05-24T11:00:00Z',
  },
  {
    id: 'alert-8',
    portfolioId: 'demo-pf-1',
    modelId: 'qwen3-235b',
    modelName: 'Qwen3 235B',
    alertType: 'score_increase',
    message: 'Qwen3 235B gained +2.1 points across benchmarks',
    isRead: true,
    createdAt: '2025-05-23T08:30:00Z',
  },
]

// ── GET: List alerts for a portfolio ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const alerts = await db.portfolioAlert.findMany({
      where: { portfolioId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (alerts.length === 0) {
      return NextResponse.json({ success: true, data: sampleAlerts })
    }

    return NextResponse.json({ success: true, data: alerts })
  } catch (error) {
    console.error('[GET /api/portfolio/[id]/alerts]', error)
    return NextResponse.json({ success: true, data: sampleAlerts })
  }
}

// ── PATCH: Mark alerts as read ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { alertIds, markAll } = body

    if (markAll) {
      await db.portfolioAlert.updateMany({
        where: { portfolioId: id, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, message: 'All alerts marked as read.' })
    }

    if (alertIds && Array.isArray(alertIds)) {
      await db.portfolioAlert.updateMany({
        where: { id: { in: alertIds } },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, message: `${alertIds.length} alerts marked as read.` })
    }

    return NextResponse.json(
      { success: false, error: 'Provide alertIds or markAll.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[PATCH /api/portfolio/[id]/alerts]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update alerts.' },
      { status: 500 }
    )
  }
}
