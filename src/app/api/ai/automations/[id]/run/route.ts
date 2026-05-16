import { NextRequest, NextResponse } from 'next/server'

/* ─── POST: Trigger automation run (placeholder) ─── */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Simulate a successful run trigger
    return NextResponse.json({
      success: true,
      automationId: id,
      message: 'Automation run triggered successfully',
      runId: `run-${Date.now()}`,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to trigger automation' }, { status: 500 })
  }
}
