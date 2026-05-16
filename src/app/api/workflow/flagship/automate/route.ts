import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/automate')

export async function POST(request: NextRequest) {
  const end = log.start('POST')
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { pipelineId, schedule, notificationConfig } = body as {
      pipelineId: string
      schedule: { frequency: string; time?: string; dayOfWeek?: string }
      notificationConfig?: { email?: string; webhook?: string }
    }

    if (!pipelineId || !schedule?.frequency) {
      end(400)
      return NextResponse.json({ error: 'pipelineId and schedule.frequency are required' }, { status: 400 })
    }

    const pipeline = await prisma.workflowPipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline) {
      end(404)
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    // Calculate next run time
    const now = new Date()
    let nextRun = new Date()
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1)
        if (schedule.time) {
          const [h, m] = schedule.time.split(':').map(Number)
          nextRun.setHours(h, m, 0, 0)
        }
        break
      case 'weekly':
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const targetDay = days.indexOf(schedule.dayOfWeek?.toLowerCase() || 'monday')
        nextRun.setDate(now.getDate() + ((targetDay - now.getDay() + 7) % 7 || 7))
        break
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1, 1)
        break
      default:
        nextRun.setDate(now.getDate() + 1)
    }

    const actions: Array<{ type: string; config: Record<string, unknown> }> = [
      { type: 'run_model', config: { pipelineId, autoExecute: true } },
    ]
    if (notificationConfig?.email) {
      actions.push({ type: 'send_notification', config: { email: notificationConfig.email, subject: `Workflow Complete: ${pipeline.name}` } })
    }
    if (notificationConfig?.webhook) {
      actions.push({ type: 'send_notification', config: { webhook: notificationConfig.webhook } })
    }

    // Create AutomationRule
    const automation = await prisma.automationRule.create({
      data: {
        visitorId,
        name: `Auto: ${pipeline.name}`,
        description: `Recurring automation for pipeline "${pipeline.name}" (${schedule.frequency})`,
        trigger: 'schedule',
        triggerConfig: JSON.stringify({ frequency: schedule.frequency, time: schedule.time, dayOfWeek: schedule.dayOfWeek }),
        actions: JSON.stringify(actions),
        isActive: true,
        nextRun,
        lastRun: null,
        runCount: 0,
      },
    })

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'automation_run',
        details: JSON.stringify({ action: 'flagship_automate_created', pipelineId, automationId: automation.id, schedule }),
        outputData: JSON.stringify({ nextRun: nextRun.toISOString() }),
      },
    }).catch(() => {})

    end(201)
    return NextResponse.json({
      automationId: automation.id,
      nextRun: nextRun.toISOString(),
      frequency: schedule.frequency,
      message: `Automation created. Pipeline will run ${schedule.frequency} starting ${nextRun.toLocaleDateString()}.`,
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 })
  }
}
