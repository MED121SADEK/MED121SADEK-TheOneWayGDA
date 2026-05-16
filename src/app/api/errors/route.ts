import { NextRequest, NextResponse } from 'next/server'

// ──────────────────────────────────────────────────────────
// GET: Health check for error tracking
// ──────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Error tracking active',
    timestamp: new Date().toISOString(),
  })
}

// ──────────────────────────────────────────────────────────
// POST: Receive error reports from the client
// ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { errors } = body as { errors?: unknown[] }

    if (!Array.isArray(errors)) {
      return NextResponse.json(
        { error: 'errors must be an array' },
        { status: 400 }
      )
    }

    // For now, log the errors server-side
    // Future: persist to database, integrate with monitoring service
    const count = errors.length
    if (count > 0) {
      console.error(
        `[ErrorTracker] Received ${count} error(s) from client`
      )
    }

    return NextResponse.json({
      status: 'ok',
      received: count,
      message: 'Error reports received',
    })
  } catch (error) {
    console.error('[Errors API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
