import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

/* ════════════════════════════════════════════════════════════════
   Batch Operations for Automations

   POST:   Execute multiple automations at once (with dependency ordering)
   PATCH:  Update multiple automations (enable/disable, change schedule)
   DELETE: Remove multiple automations

   All operations logged to AutomationLog and AiAuditLog.
   ════════════════════════════════════════════════════════════════ */

type BatchResultStatus = 'success' | 'error' | 'skipped'

interface BatchOperationResult {
  ruleId: string
  ruleName: string
  status: BatchResultStatus
  error?: string
  durationMs?: number
  logId?: string
}

/* ─── Helper: Log to AiAuditLog ─── */
async function auditLog(params: {
  visitorId: string | null
  action: string
  details: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  durationMs?: number
  error?: string
}): Promise<void> {
  try {
    await prisma.aiAuditLog.create({
      data: {
        visitorId: params.visitorId,
        action: params.action,
        details: JSON.stringify(params.details),
        durationMs: params.durationMs,
        error: params.error,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch { /* silent */ }
}

/* ─── Helper: Parse actions JSON from rule ─── */
function parseActions(actionsJson: string): Array<{ type: string; config: Record<string, unknown> }> {
  try {
    return JSON.parse(actionsJson)
  } catch {
    return []
  }
}

/* ─── Helper: Execute a single automation rule ─── */
async function executeRule(
  rule: { id: string; name: string; actions: string; trigger: string },
  visitorId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<BatchOperationResult> {
  const startTime = Date.now()
  let logId = ''

  try {
    // Create a pending AutomationLog entry
    const log = await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        status: 'running' as const,
        input: JSON.stringify({ trigger: 'batch_run', timestamp: new Date().toISOString() }),
        startedAt: new Date(),
      },
    })
    logId = log.id

    const actions = parseActions(rule.actions)

    // Simulate action execution (in production, each action would call real services)
    // For now, we validate the action types and mark as successful
    const validActionTypes = ['clean_data', 'run_model', 'generate_report', 'send_notification'] as const
    const invalidActions = actions.filter(a => !validActionTypes.includes(a.type as typeof validActionTypes[number]))

    if (invalidActions.length > 0) {
      const errorMsg = `Invalid action types: ${invalidActions.map(a => a.type).join(', ')}`
      await prisma.automationLog.update({
        where: { id: logId },
        data: {
          status: 'error' as const,
          error: errorMsg,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      })

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'error' as const,
        error: errorMsg,
        durationMs: Date.now() - startTime,
        logId,
      }
    }

    // Simulate execution based on action count
    const simulatedDuration = actions.length * 500 + Math.floor(Math.random() * 1000)

    // Update the rule's last run info
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        lastRun: new Date(),
        lastStatus: 'success' as const,
        lastError: null,
        runCount: { increment: 1 },
      },
    })

    // Mark log as successful
    await prisma.automationLog.update({
      where: { id: logId },
      data: {
        status: 'success' as const,
        output: JSON.stringify({
          actionsExecuted: actions.length,
          actionTypes: actions.map(a => a.type),
        }),
        completedAt: new Date(),
        durationMs: simulatedDuration,
      },
    })

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'success' as const,
      durationMs: simulatedDuration,
      logId,
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    // Try to update log entry if it exists
    if (logId) {
      try {
        await prisma.automationLog.update({
          where: { id: logId },
          data: {
            status: 'error' as const,
            error: errorMsg,
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
          },
        })
      } catch { /* silent */ }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'error' as const,
      error: errorMsg,
      durationMs: Date.now() - startTime,
      logId,
    }
  }
}

/* ─── Helper: Topologically sort rules by dependencies ─── */
function sortByDependencies(
  rules: Array<{ id: string; name: string; actions: string; trigger: string }>
): Array<{ id: string; name: string; actions: string; trigger: string }> {
  // Simple dependency detection: rules that send_notification after run_model
  // should run after rules that only clean_data
  // This is a heuristic sort — production would use explicit dependency declarations

  const priorityMap: Record<string, number> = {
    clean_data: 0,
    run_model: 1,
    generate_report: 2,
    send_notification: 3,
  }

  return [...rules].sort((a, b) => {
    const actionsA = parseActions(a.actions)
    const actionsB = parseActions(b.actions)
    const maxPriorityA = Math.max(...actionsA.map(act => priorityMap[act.type] ?? 0), 0)
    const maxPriorityB = Math.max(...actionsB.map(act => priorityMap[act.type] ?? 0), 0)
    return maxPriorityA - maxPriorityB
  })
}

/* ════════════════════════════════════════════════════════════════
   POST: Execute multiple automations at once
   ════════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { ruleIds, sequential = false } = body as {
      ruleIds: string[]
      sequential?: boolean
    }

    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json(
        { error: 'ruleIds must be a non-empty array of automation rule IDs' },
        { status: 400 }
      )
    }

    if (ruleIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 rules per batch execution' },
        { status: 400 }
      )
    }

    // Fetch all requested rules
    const rules = await prisma.automationRule.findMany({
      where: {
        id: { in: ruleIds },
        isActive: true,
      },
    })

    if (rules.length === 0) {
      return NextResponse.json(
        { error: 'No active automation rules found for the given IDs' },
        { status: 404 }
      )
    }

    // Warn about inactive rules
    const requestedSet = new Set(ruleIds)
    const foundIds = new Set(rules.map(r => r.id))
    const notFound = ruleIds.filter(id => !foundIds.has(id))

    // Sort rules by dependency order
    const sortedRules = sortByDependencies(rules)

    // Execute rules
    const results: BatchOperationResult[] = []

    if (sequential) {
      // Run one at a time
      for (const rule of sortedRules) {
        const result = await executeRule(rule, visitorId, ipAddress, userAgent)
        results.push(result)
        // Stop on error if sequential and error occurs
        if (result.status === 'error' as const) {
          break
        }
      }
    } else {
      // Run all in parallel
      const parallelResults = await Promise.all(
        sortedRules.map(rule => executeRule(rule, visitorId, ipAddress, userAgent))
      )
      results.push(...parallelResults)
    }

    const totalDuration = Date.now() - startTime
    const successCount = results.filter(r => r.status === 'success' as const).length
    const errorCount = results.filter(r => r.status === 'error' as const).length

    // Audit log
    await auditLog({
      visitorId,
      action: 'automation_run',
      details: {
        batch: true,
        ruleIds,
        sequential,
        successCount,
        errorCount,
      },
      ipAddress,
      userAgent,
      durationMs: totalDuration,
    })

    return NextResponse.json({
      batchId: `batch-${Date.now()}`,
      executionMode: sequential ? 'sequential' : 'parallel',
      totalRules: ruleIds.length,
      executedRules: sortedRules.length,
      results,
      notFoundIds: notFound,
      summary: {
        successCount,
        errorCount,
        totalDurationMs: totalDuration,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    await auditLog({
      visitorId,
      action: 'automation_run',
      details: { batch: true, error: true },
      ipAddress,
      userAgent,
      durationMs,
      error: errorMsg,
    })

    return NextResponse.json(
      { error: 'Failed to execute batch automations' },
      { status: 500 }
    )
  }
}

/* ════════════════════════════════════════════════════════════════
   PATCH: Update multiple automations (enable/disable, schedule)
   ════════════════════════════════════════════════════════════════ */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { ruleIds, updates } = body as {
      ruleIds: string[]
      updates: {
        isActive?: boolean
        trigger?: string
        triggerConfig?: Record<string, unknown>
        name?: string
        description?: string
      }
    }

    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json(
        { error: 'ruleIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates object with at least one field is required' },
        { status: 400 }
      )
    }

    if (ruleIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 rules per batch update' },
        { status: 400 }
      )
    }
  }

  try {
    const body = await request.json()
    const { ruleIds, updates } = body as {
      ruleIds: string[]
      updates: {
        isActive?: boolean
        trigger?: string
        triggerConfig?: Record<string, unknown>
        name?: string
        description?: string
      }
    }

    // Build Prisma update data
    const updateData: Record<string, unknown> = {}
    if (typeof updates.isActive === 'boolean') {
      updateData.isActive = updates.isActive
    }
    if (typeof updates.name === 'string') {
      updateData.name = updates.name
    }
    if (typeof updates.description === 'string') {
      updateData.description = updates.description
    }
    if (typeof updates.trigger === 'string') {
      updateData.trigger = updates.trigger
    }
    if (updates.triggerConfig && typeof updates.triggerConfig === 'object') {
      updateData.triggerConfig = JSON.stringify(updates.triggerConfig)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    // Execute batch update
    const result = await prisma.automationRule.updateMany({
      where: { id: { in: ruleIds } },
      data: updateData,
    })

    const totalDuration = Date.now() - startTime

    // Audit log
    await auditLog({
      visitorId,
      action: 'automation_run',
      details: {
        batch: true,
        operation: 'update',
        ruleIds,
        updates: Object.keys(updateData),
        matchedCount: result.count,
      },
      ipAddress,
      userAgent,
      durationMs: totalDuration,
    })

    // Fetch updated rules to return
    const updatedRules = await prisma.automationRule.findMany({
      where: { id: { in: ruleIds } },
    })

    return NextResponse.json({
      batchId: `batch-patch-${Date.now()}`,
      matchedCount: result.count,
      requestedCount: ruleIds.length,
      updatedRules: updatedRules.map(r => ({
        id: r.id,
        name: r.name,
        trigger: r.trigger,
        isActive: r.isActive,
        updatedAt: r.updatedAt,
      })),
      summary: {
        totalDurationMs: totalDuration,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    await auditLog({
      visitorId,
      action: 'automation_run',
      details: { batch: true, operation: 'update', error: true },
      ipAddress,
      userAgent,
      durationMs,
      error: errorMsg,
    })

    return NextResponse.json(
      { error: 'Failed to batch update automations' },
      { status: 500 }
    )
  }
}

/* ════════════════════════════════════════════════════════════════
   DELETE: Remove multiple automations
   ════════════════════════════════════════════════════════════════ */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  const visitorId = request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { ruleIds } = body as { ruleIds: string[] }

    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json(
        { error: 'ruleIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (ruleIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 rules per batch deletion' },
        { status: 400 }
      )
    }

    // Verify rules exist before deletion
    const existingRules = await prisma.automationRule.findMany({
      where: { id: { in: ruleIds } },
      select: { id: true, name: true },
    })

    const existingIds = new Set(existingRules.map(r => r.id))
    const notFoundIds = ruleIds.filter(id => !existingIds.has(id))

    if (existingRules.length === 0) {
      return NextResponse.json(
        { error: 'No automation rules found for the given IDs' },
        { status: 404 }
      )
    }

    // Delete automation logs first (cascade manually for SQLite compat)
    const deleteLogsResult = await prisma.automationLog.deleteMany({
      where: { ruleId: { in: existingRules.map(r => r.id) } },
    })

    // Delete the rules
    const deleteResult = await prisma.automationRule.deleteMany({
      where: { id: { in: existingRules.map(r => r.id) } },
    })

    const totalDuration = Date.now() - startTime

    // Audit log
    await auditLog({
      visitorId,
      action: 'automation_run',
      details: {
        batch: true,
        operation: 'delete',
        ruleIds: existingRules.map(r => r.id),
        ruleNames: existingRules.map(r => r.name),
        logsDeleted: deleteLogsResult.count,
        rulesDeleted: deleteResult.count,
      },
      ipAddress,
      userAgent,
      durationMs: totalDuration,
    })

    return NextResponse.json({
      batchId: `batch-delete-${Date.now()}`,
      deletedRules: deleteResult.count,
      deletedLogs: deleteLogsResult.count,
      notFoundIds,
      deletedNames: existingRules.map(r => r.name),
      summary: {
        totalDurationMs: totalDuration,
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    await auditLog({
      visitorId,
      action: 'automation_run',
      details: { batch: true, operation: 'delete', error: true },
      ipAddress,
      userAgent,
      durationMs,
      error: errorMsg,
    })

    return NextResponse.json(
      { error: 'Failed to batch delete automations' },
      { status: 500 }
    )
  }
}
