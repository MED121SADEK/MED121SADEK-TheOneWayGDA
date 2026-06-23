import { NextRequest, NextResponse } from 'next/server'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */
export const WEBHOOK_EVENTS = [
  'pipeline.completed',
  'pipeline.error',
  'automation.run',
  'model.evaluated',
  'report.generated',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string
  description: string
  isActive: boolean
  createdAt: string
  lastTriggeredAt: string | null
  successCount: number
  failureCount: number
}

interface WebhookDeliveryLog {
  id: string
  webhookId: string
  event: WebhookEvent
  payload: unknown
  statusCode: number | null
  durationMs: number
  success: boolean
  error: string | null
  timestamp: string
}

/* ══════════════════════════════════════════════════════
   In-memory webhook storage via globalThis
   ══════════════════════════════════════════════════════ */
declare global {
  var __webhooks: Webhook[] | undefined
  var __webhookDeliveryLogs: WebhookDeliveryLog[] | undefined
}

function getWebhooks(): Webhook[] {
  if (!globalThis.__webhooks) {
    const now = new Date().toISOString()
    globalThis.__webhooks = [
      {
        id: 'whk-1',
        url: 'https://hooks.slack.com/services/example/webhook',
        events: ['pipeline.completed', 'report.generated'],
        secret: 'whsec_demo_slack_pipeline',
        description: 'Slack notifications for pipeline completions and report generation',
        isActive: true,
        createdAt: now,
        lastTriggeredAt: null,
        successCount: 0,
        failureCount: 0,
      },
      {
        id: 'whk-2',
        url: 'https://example.com/api/webhooks/automation',
        events: ['automation.run', 'pipeline.error'],
        secret: 'whsec_demo_automation_monitor',
        description: 'External automation monitor for tracking runs and errors',
        isActive: true,
        createdAt: now,
        lastTriggeredAt: null,
        successCount: 0,
        failureCount: 0,
      },
      {
        id: 'whk-3',
        url: 'https://example.com/api/webhooks/evaluations',
        events: ['model.evaluated'],
        secret: 'whsec_demo_model_evals',
        description: 'Model evaluation event tracker for analytics dashboard',
        isActive: false,
        createdAt: now,
        lastTriggeredAt: null,
        successCount: 0,
        failureCount: 0,
      },
    ]
  }
  return globalThis.__webhooks
}

function getDeliveryLogs(): WebhookDeliveryLog[] {
  if (!globalThis.__webhookDeliveryLogs) {
    globalThis.__webhookDeliveryLogs = []
  }
  return globalThis.__webhookDeliveryLogs
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/extensions/webhooks
   List configured webhooks
   Query params:
     - event: filter by event type
     - active: "true"|"false" to filter by status
     - includeLogs: "true" to include recent delivery logs
   ══════════════════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventFilter = searchParams.get('event')
  const activeFilter = searchParams.get('active')
  const includeLogs = searchParams.get('includeLogs') === 'true'

  const webhooks = getWebhooks()

  // Apply filters
  let filtered = webhooks
  if (eventFilter) {
    filtered = filtered.filter((w) => w.events.includes(eventFilter as WebhookEvent))
  }
  if (activeFilter !== null) {
    const isActive = activeFilter === 'true'
    filtered = filtered.filter((w) => w.isActive === isActive)
  }

  const response: Record<string, unknown> = {
    webhooks: filtered,
    availableEvents: WEBHOOK_EVENTS,
    summary: {
      total: webhooks.length,
      active: webhooks.filter((w) => w.isActive).length,
      inactive: webhooks.filter((w) => !w.isActive).length,
      totalDeliveries: webhooks.reduce((sum, w) => sum + w.successCount + w.failureCount, 0),
    },
  }

  if (includeLogs) {
    const logs = getDeliveryLogs()
    // Return most recent 50 logs
    response.deliveryLogs = logs.slice(-50).reverse()
  }

  return NextResponse.json(response)
}

/* ══════════════════════════════════════════════════════
   POST /api/ai/extensions/webhooks
   Create a new webhook
   Body: { url, events, secret?, description?, isActive? }
   ══════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, events, secret, description, isActive } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid "url" string is required' },
        { status: 400 }
      )
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: `"${url}" is not a valid URL` },
        { status: 400 }
      )
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: '"events" must be a non-empty array of event names' },
        { status: 400 }
      )
    }

    // Validate each event
    const validEvents: readonly string[] = WEBHOOK_EVENTS
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid event(s): ${invalidEvents.join(', ')}`,
          validEvents: WEBHOOK_EVENTS,
        },
        { status: 400 }
      )
    }

    // Check for duplicate URL with same events
    const webhooks = getWebhooks()
    const duplicate = webhooks.find(
      (w) => w.url === url && JSON.stringify([...w.events].sort()) === JSON.stringify([...events].sort())
    )
    if (duplicate) {
      return NextResponse.json(
        { error: 'A webhook with the same URL and events already exists', existingId: duplicate.id },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const webhookSecret = secret || `whsec_auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const newWebhook: Webhook = {
      id: `whk-${Date.now()}`,
      url,
      events: events as WebhookEvent[],
      secret: webhookSecret,
      description: description || '',
      isActive: isActive ?? true,
      createdAt: now,
      lastTriggeredAt: null,
      successCount: 0,
      failureCount: 0,
    }

    webhooks.push(newWebhook)

    // Return secret only on creation
    return NextResponse.json(
      {
        webhook: newWebhook,
        message: 'Webhook created. Save the secret — it will not be shown again.',
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to create webhook. Invalid request body.' },
      { status: 400 }
    )
  }
}

/* ══════════════════════════════════════════════════════
   DELETE /api/ai/extensions/webhooks
   Remove a webhook
   Query params: id (required)
   ══════════════════════════════════════════════════════ */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required' },
      { status: 400 }
    )
  }

  const webhooks = getWebhooks()
  const index = webhooks.findIndex((w) => w.id === id)

  if (index === -1) {
    return NextResponse.json(
      { error: `Webhook with id "${id}" not found` },
      { status: 404 }
    )
  }

  const removed = webhooks.splice(index, 1)[0]

  return NextResponse.json({
    message: 'Webhook deleted',
    removed: {
      id: removed.id,
      url: removed.url,
      events: removed.events,
      description: removed.description,
    },
  })
}
