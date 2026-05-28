import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Known AI models for the add-holding dialog ──
const KNOWN_MODELS = [
  { modelId: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', score: 88.7 },
  { modelId: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic', score: 90.2 },
  { modelId: 'claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic', score: 92.1 },
  { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', score: 87.9 },
  { modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', score: 82.4 },
  { modelId: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', score: 85.6 },
  { modelId: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', score: 89.3 },
  { modelId: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', score: 79.8 },
  { modelId: 'llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', score: 76.5 },
  { modelId: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', score: 84.1 },
  { modelId: 'mistral-small', name: 'Mistral Small', provider: 'Mistral', score: 78.9 },
  { modelId: 'qwen3-235b', name: 'Qwen3 235B', provider: 'Alibaba', score: 86.7 },
  { modelId: 'command-r-plus', name: 'Command R+', provider: 'Cohere', score: 80.3 },
  { modelId: 'grok-3', name: 'Grok 3', provider: 'xAI', score: 87.5 },
  { modelId: 'yi-lightning', name: 'Yi Lightning', provider: '01.AI', score: 83.2 },
]

// ── Sample holdings for demo ──
const sampleHoldings = [
  {
    id: 'h-1',
    portfolioId: 'demo-pf-1',
    modelId: 'claude-4-opus',
    modelName: 'Claude 4 Opus',
    provider: 'Anthropic',
    score: 92.1,
    prevScore: 90.8,
    addedAt: '2025-01-15T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
  {
    id: 'h-2',
    portfolioId: 'demo-pf-1',
    modelId: 'claude-4-sonnet',
    modelName: 'Claude 4 Sonnet',
    provider: 'Anthropic',
    score: 90.2,
    prevScore: 89.5,
    addedAt: '2025-01-20T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
  {
    id: 'h-3',
    portfolioId: 'demo-pf-1',
    modelId: 'deepseek-r1',
    modelName: 'DeepSeek R1',
    provider: 'DeepSeek',
    score: 89.3,
    prevScore: 91.1,
    addedAt: '2025-02-01T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
  {
    id: 'h-4',
    portfolioId: 'demo-pf-1',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    provider: 'OpenAI',
    score: 88.7,
    prevScore: 88.2,
    addedAt: '2025-01-15T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
  {
    id: 'h-5',
    portfolioId: 'demo-pf-1',
    modelId: 'grok-3',
    modelName: 'Grok 3',
    provider: 'xAI',
    score: 87.5,
    prevScore: 85.0,
    addedAt: '2025-03-10T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
  {
    id: 'h-6',
    portfolioId: 'demo-pf-1',
    modelId: 'gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    provider: 'Google',
    score: 87.9,
    prevScore: 88.5,
    addedAt: '2025-02-15T00:00:00Z',
    lastUpdated: '2025-05-28T00:00:00Z',
  },
]

// ── GET: List holdings for a portfolio ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const holdings = await db.portfolioHolding.findMany({
      where: { portfolioId: id },
      orderBy: { score: 'desc' },
    })

    if (holdings.length === 0) {
      return NextResponse.json({
        success: true,
        data: sampleHoldings,
        availableModels: KNOWN_MODELS,
      })
    }

    return NextResponse.json({
      success: true,
      data: holdings,
      availableModels: KNOWN_MODELS,
    })
  } catch (error) {
    console.error('[GET /api/portfolio/[id]/holdings]', error)
    return NextResponse.json({
      success: true,
      data: sampleHoldings,
      availableModels: KNOWN_MODELS,
    })
  }
}

// ── POST: Add a holding to a portfolio ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { modelId, modelName, provider, score } = body

    if (!modelId || !modelName) {
      return NextResponse.json(
        { success: false, error: 'modelId and modelName are required.' },
        { status: 400 }
      )
    }

    // Check if already held
    const existing = await db.portfolioHolding.findUnique({
      where: { portfolioId_modelId: { portfolioId: id, modelId } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Model already in portfolio.' },
        { status: 409 }
      )
    }

    const holding = await db.portfolioHolding.create({
      data: {
        portfolioId: id,
        modelId,
        modelName,
        provider,
        score: score || 0,
        prevScore: score || 0,
      },
    })

    // Recalculate portfolio totals
    const allHoldings = await db.portfolioHolding.findMany({
      where: { portfolioId: id },
    })
    const totalValue =
      allHoldings.reduce((sum, h) => sum + h.score, 0) / (allHoldings.length || 1)

    await db.modelPortfolio.update({
      where: { id },
      data: {
        totalValue: Math.round(totalValue * 100) / 100,
        holdingsCount: allHoldings.length,
      },
    })

    return NextResponse.json({ success: true, data: holding }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/portfolio/[id]/holdings]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add holding.' },
      { status: 500 }
    )
  }
}
