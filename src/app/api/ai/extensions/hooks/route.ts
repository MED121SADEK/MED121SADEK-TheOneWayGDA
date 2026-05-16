import { NextRequest, NextResponse } from 'next/server'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */
export const VALID_HOOK_POINTS = [
  'workspace:init',
  'workspace:chart',
  'workspace:report',
  'ai:before_query',
  'ai:after_query',
  'automation:before_run',
  'automation:after_run',
  'data:import',
  'data:export',
] as const

export type HookPoint = (typeof VALID_HOOK_POINTS)[number]

interface HookRegistration {
  id: string
  hookPoint: HookPoint
  extensionId: string
  extensionName: string
  priority: number
  handlerUrl: string
  enabled: boolean
  registeredAt: string
}

interface HookExecutionResult {
  hookPoint: string
  results: Array<{
    extensionId: string
    extensionName: string
    status: 'success' | 'error' | 'skipped'
    data?: unknown
    error?: string
    durationMs: number
  }>
  totalDurationMs: number
  executedAt: string
}

/* ══════════════════════════════════════════════════════
   In-memory hook registry via globalThis
   ══════════════════════════════════════════════════════ */
declare global {
  var __hookRegistrations: HookRegistration[] | undefined
}

function getHookRegistrations(): HookRegistration[] {
  if (!globalThis.__hookRegistrations) {
    const now = new Date().toISOString()
    globalThis.__hookRegistrations = [
      {
        id: 'hook-reg-1',
        hookPoint: 'workspace:init',
        extensionId: 'ext-1',
        extensionName: 'Plotly Enhanced Charts',
        priority: 10,
        handlerUrl: '/api/ai/extensions/ext-1/hooks/workspace-init',
        enabled: true,
        registeredAt: now,
      },
      {
        id: 'hook-reg-2',
        hookPoint: 'workspace:chart',
        extensionId: 'ext-1',
        extensionName: 'Plotly Enhanced Charts',
        priority: 10,
        handlerUrl: '/api/ai/extensions/ext-1/hooks/workspace-chart',
        enabled: true,
        registeredAt: now,
      },
      {
        id: 'hook-reg-3',
        hookPoint: 'workspace:chart',
        extensionId: 'ext-8',
        extensionName: 'D3.js Custom Viz',
        priority: 20,
        handlerUrl: '/api/ai/extensions/ext-8/hooks/workspace-chart',
        enabled: false,
        registeredAt: now,
      },
      {
        id: 'hook-reg-4',
        hookPoint: 'ai:before_query',
        extensionId: 'ext-7',
        extensionName: 'Advanced Stats Pack',
        priority: 5,
        handlerUrl: '/api/ai/extensions/ext-7/hooks/ai-before-query',
        enabled: true,
        registeredAt: now,
      },
      {
        id: 'hook-reg-5',
        hookPoint: 'ai:after_query',
        extensionId: 'ext-10',
        extensionName: 'GPT-4 Turbo Model',
        priority: 15,
        handlerUrl: '/api/ai/extensions/ext-10/hooks/ai-after-query',
        enabled: true,
        registeredAt: now,
      },
      {
        id: 'hook-reg-6',
        hookPoint: 'data:import',
        extensionId: 'ext-2',
        extensionName: 'Google Sheets Connector',
        priority: 10,
        handlerUrl: '/api/ai/extensions/ext-2/hooks/data-import',
        enabled: true,
        registeredAt: now,
      },
    ]
  }
  return globalThis.__hookRegistrations
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/extensions/hooks
   List all hook points with their registered extensions
   Query params:
     - hookPoint: filter by specific hook point
     - extensionId: filter by extension
     - execute: if "true", execute the hook chain for the given hookPoint
   ══════════════════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hookPointFilter = searchParams.get('hookPoint')
  const extensionIdFilter = searchParams.get('extensionId')
  const shouldExecute = searchParams.get('execute') === 'true'

  const registrations = getHookRegistrations()

  // Build a map of hook point → registered extensions
  const hookMap: Record<string, HookRegistration[]> = {}
  for (const hook of VALID_HOOK_POINTS) {
    hookMap[hook] = []
  }
  for (const reg of registrations) {
    if (hookMap[reg.hookPoint]) {
      hookMap[reg.hookPoint].push(reg)
    }
  }

  // Sort each hook's registrations by priority (ascending = higher priority)
  for (const key of Object.keys(hookMap)) {
    hookMap[key].sort((a, b) => a.priority - b.priority)
  }

  // Apply filters
  let result = hookMap
  if (hookPointFilter) {
    const filteredMap: Record<string, HookRegistration[]> = {}
    filteredMap[hookPointFilter] = hookMap[hookPointFilter] || []
    result = filteredMap
  }
  if (extensionIdFilter) {
    const filteredMap: Record<string, HookRegistration[]> = {}
    for (const [hook, regs] of Object.entries(result)) {
      const filtered = regs.filter((r) => r.extensionId === extensionIdFilter)
      if (filtered.length > 0) {
        filteredMap[hook] = filtered
      }
    }
    result = filteredMap
  }

  // Execute hook chain if requested
  if (shouldExecute && hookPointFilter) {
    const execution = await executeHookChain(hookPointFilter as HookPoint, {})
    return NextResponse.json({
      hookPoints: VALID_HOOK_POINTS,
      hooks: result,
      execution,
    })
  }

  return NextResponse.json({
    hookPoints: VALID_HOOK_POINTS,
    hooks: result,
    summary: {
      totalRegistrations: registrations.length,
      enabledRegistrations: registrations.filter((r) => r.enabled).length,
      hookPointCount: VALID_HOOK_POINTS.length,
    },
  })
}

/* ══════════════════════════════════════════════════════
   POST /api/ai/extensions/hooks
   Register a new extension to a hook point
   Body: { hookPoint, extensionId, extensionName, priority?, handlerUrl, enabled? }
   ══════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hookPoint, extensionId, extensionName, priority, handlerUrl, enabled } = body

    if (!hookPoint || !extensionId || !extensionName || !handlerUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: hookPoint, extensionId, extensionName, handlerUrl' },
        { status: 400 }
      )
    }

    // Validate hook point
    const validHooks: readonly string[] = VALID_HOOK_POINTS
    if (!validHooks.includes(hookPoint)) {
      return NextResponse.json(
        { error: `Invalid hookPoint. Must be one of: ${validHooks.join(', ')}` },
        { status: 400 }
      )
    }

    const registrations = getHookRegistrations()

    // Check for duplicate registration
    const existing = registrations.find(
      (r) => r.hookPoint === hookPoint && r.extensionId === extensionId
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Extension is already registered to this hook point. Delete and re-register to update.' },
        { status: 409 }
      )
    }

    const newRegistration: HookRegistration = {
      id: `hook-reg-${Date.now()}`,
      hookPoint: hookPoint as HookPoint,
      extensionId,
      extensionName,
      priority: typeof priority === 'number' ? Math.max(0, Math.min(100, priority)) : 50,
      handlerUrl,
      enabled: enabled ?? true,
      registeredAt: new Date().toISOString(),
    }

    registrations.push(newRegistration)

    return NextResponse.json({ registration: newRegistration }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to register hook. Invalid request body.' },
      { status: 400 }
    )
  }
}

/* ══════════════════════════════════════════════════════
   DELETE /api/ai/extensions/hooks
   Unregister an extension from a hook point
   Query params: hookPoint, extensionId (both required)
   ══════════════════════════════════════════════════════ */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hookPoint = searchParams.get('hookPoint')
  const extensionId = searchParams.get('extensionId')

  if (!hookPoint || !extensionId) {
    return NextResponse.json(
      { error: 'Query parameters hookPoint and extensionId are required' },
      { status: 400 }
    )
  }

  const registrations = getHookRegistrations()
  const index = registrations.findIndex(
    (r) => r.hookPoint === hookPoint && r.extensionId === extensionId
  )

  if (index === -1) {
    return NextResponse.json(
      { error: 'Hook registration not found for the given hookPoint and extensionId' },
      { status: 404 }
    )
  }

  const removed = registrations.splice(index, 1)[0]

  return NextResponse.json({
    message: 'Hook registration removed',
    removed: {
      id: removed.id,
      hookPoint: removed.hookPoint,
      extensionId: removed.extensionId,
      extensionName: removed.extensionName,
    },
  })
}

/* ══════════════════════════════════════════════════════
   Execute Hook Chain (internal helper)
   Calls all registered extensions for a given hook in
   priority order (ascending), passing context through.
   ══════════════════════════════════════════════════════ */
export async function executeHookChain(
  hookPoint: HookPoint,
  context: Record<string, unknown>
): Promise<HookExecutionResult> {
  const startTime = Date.now()
  const registrations = getHookRegistrations()

  // Filter to this hook point, enabled only, sorted by priority
  const chain = registrations
    .filter((r) => r.hookPoint === hookPoint && r.enabled)
    .sort((a, b) => a.priority - b.priority)

  const results: HookExecutionResult['results'] = []

  for (const reg of chain) {
    const stepStart = Date.now()
    try {
      // Attempt to call the handler URL (internal dispatch simulation)
      // In production, this would make a real HTTP call to handlerUrl
      const stepDuration = Date.now() - stepStart
      results.push({
        extensionId: reg.extensionId,
        extensionName: reg.extensionName,
        status: 'success',
        data: { hookPoint, handlerUrl: reg.handlerUrl, contextKeys: Object.keys(context) },
        durationMs: stepDuration,
      })
    } catch (error: unknown) {
      const stepDuration = Date.now() - stepStart
      const message = error instanceof Error ? error.message : 'Unknown error'
      results.push({
        extensionId: reg.extensionId,
        extensionName: reg.extensionName,
        status: 'error',
        error: message,
        durationMs: stepDuration,
      })
    }
  }

  return {
    hookPoint,
    results,
    totalDurationMs: Date.now() - startTime,
    executedAt: new Date().toISOString(),
  }
}
