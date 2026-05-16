import { NextRequest, NextResponse } from 'next/server'

/* ─── In-memory store (shared via module-level import pattern) ─── */
// For simplicity, we import from parent route's store by re-implementing here
// In production, this would use a shared database

interface AutomationAction {
  id: string
  type: 'clean_data' | 'run_model' | 'generate_report' | 'send_notification'
  config: Record<string, string>
}

interface Automation {
  id: string
  name: string
  description: string
  trigger: 'schedule' | 'new_data' | 'event' | 'manual'
  scheduleConfig: { frequency: string; time: string; dayOfWeek?: string; dayOfMonth?: string } | null
  actions: AutomationAction[]
  isActive: boolean
  lastRunAt: string | null
  runCount: number
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

// In a production app, these would be in a shared store / database.
// For this demo, we read from the same module-level state.
// Since Next.js handles each route in isolation, we use a simple approach:
// The parent GET returns all data; PUT/DELETE here simulate operations.

/* ─── PUT: Update automation ─── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Return success with the updated data (simulated)
    return NextResponse.json({
      automation: {
        id,
        name: body.name,
        description: body.description,
        trigger: body.trigger,
        scheduleConfig: body.scheduleConfig,
        actions: body.actions,
        isActive: body.isActive,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 })
  }
}

/* ─── DELETE: Remove automation ─── */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return NextResponse.json({ success: true, deletedId: id })
  } catch {
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 })
  }
}
