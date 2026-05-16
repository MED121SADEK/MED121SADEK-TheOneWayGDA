import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/usage')

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

// Cost rates per category
const COST_RATES: Record<string, { perTokens?: number; perRun?: number; perCall?: number; perExport?: number }> = {
  ai_query: { perTokens: 0.01 },   // $0.01 per 1K tokens
  workflow: { perRun: 0.05 },       // $0.05 per run
  analysis: { perRun: 0.03 },       // $0.03 per run
  api_call: { perCall: 0.001 },     // $0.001 per call
  export: { perExport: 0.02 },      // $0.02 per export
}

const VALID_CATEGORIES = Object.keys(COST_RATES)

function calculateCost(category: string, tokensUsed: number): number {
  const rate = COST_RATES[category]
  if (!rate) return 0

  if (rate.perTokens && tokensUsed > 0) {
    return (tokensUsed / 1000) * rate.perTokens
  }
  if (rate.perRun) return rate.perRun
  if (rate.perCall) return rate.perCall
  if (rate.perExport) return rate.perExport
  return 0
}

// GET /api/usage — Get usage stats for current user
export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // "week" or "month"

    // Determine date range
    const now = new Date()
    const startDate = new Date()
    if (period === 'month') {
      startDate.setDate(now.getDate() - 30)
    } else {
      startDate.setDate(now.getDate() - 7)
    }

    // Fetch all usage records within the period
    const records = await db.usageRecord.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate totals
    let totalRequests = 0
    let totalTokens = 0
    let totalCost = 0
    const byCategory: Record<string, number> = {}
    const dailyUsageMap: Record<string, { date: string; requests: number; tokens: number }> = {}
    const operationMap: Record<string, { operation: string; count: number; tokens: number }> = {}

    for (const record of records) {
      totalRequests++
      totalTokens += record.tokensUsed || 0
      totalCost += record.costUsd || 0

      // By category
      byCategory[record.category] = (byCategory[record.category] || 0) + 1

      // Daily usage
      const dateStr = record.createdAt.toISOString().split('T')[0]
      if (!dailyUsageMap[dateStr]) {
        dailyUsageMap[dateStr] = { date: dateStr, requests: 0, tokens: 0 }
      }
      dailyUsageMap[dateStr].requests++
      dailyUsageMap[dateStr].tokens += record.tokensUsed || 0

      // Top operations
      if (record.operation) {
        if (!operationMap[record.operation]) {
          operationMap[record.operation] = { operation: record.operation, count: 0, tokens: 0 }
        }
        operationMap[record.operation].count++
        operationMap[record.operation].tokens += record.tokensUsed || 0
      }
    }

    // Sort daily usage by date
    const dailyUsage = Object.values(dailyUsageMap).sort((a, b) => a.date.localeCompare(b.date))

    // Sort top operations by count desc, take top 10
    const topOperations = Object.values(operationMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Round cost to 2 decimal places
    totalCost = Math.round(totalCost * 100) / 100

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        totalTokens,
        totalCost,
        byCategory,
        dailyUsage,
        topOperations,
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch usage stats' }, { status: 500 })
  }
}

// POST /api/usage — Record a usage event
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, operation, tokensUsed, durationMs, apiKeyId } = body

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate tokensUsed
    const parsedTokens = typeof tokensUsed === 'number' ? Math.max(0, Math.round(tokensUsed)) : 0

    // Validate durationMs
    const parsedDuration = typeof durationMs === 'number' ? Math.max(0, Math.round(durationMs)) : null

    // Validate apiKeyId if provided
    if (apiKeyId) {
      const keyExists = await db.apiKey.findFirst({
        where: { id: apiKeyId, userId: session.userId },
      })
      if (!keyExists) {
        end(400)
        return NextResponse.json({ success: false, error: 'Invalid apiKeyId' }, { status: 400 })
      }
    }

    // Auto-calculate cost based on category
    const costUsd = calculateCost(category, parsedTokens)

    // Create usage record
    const record = await db.usageRecord.create({
      data: {
        userId: session.userId,
        apiKeyId: apiKeyId || null,
        category,
        operation: operation?.trim() || null,
        tokensUsed: parsedTokens,
        durationMs: parsedDuration,
        costUsd: Math.round(costUsd * 1000) / 1000, // 3 decimal places for precision
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    })

    // Update API key request count if applicable
    if (apiKeyId) {
      await db.apiKey.update({
        where: { id: apiKeyId },
        data: {
          requestCount: { increment: 1 },
          lastUsed: new Date(),
        },
      })
    }

    end(201)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: record.id,
          category: record.category,
          operation: record.operation,
          tokensUsed: record.tokensUsed,
          costUsd: record.costUsd,
          createdAt: record.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to record usage' }, { status: 500 })
  }
}
