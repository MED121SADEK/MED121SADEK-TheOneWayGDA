import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ─── In-memory store for demo automations ─── */
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

interface ActivityLog {
  id: string
  automationId: string
  automationName: string
  status: 'success' | 'error' | 'running'
  startedAt: string
  completedAt: string | null
  duration: string | null
}

// Seed data
const defaultAutomations: Automation[] = [
  {
    id: 'auto-1',
    name: 'Daily Data Cleanup',
    description: 'Automatically clean and normalize incoming datasets every day at midnight.',
    trigger: 'schedule',
    scheduleConfig: { frequency: 'daily', time: '00:00' },
    actions: [
      { id: 'act-1', type: 'clean_data', config: { strategy: 'auto' } },
      { id: 'act-2', type: 'generate_report', config: { format: 'pdf' } },
    ],
    isActive: true,
    lastRunAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    runCount: 142,
    nextRunAt: new Date(Date.now() + 3600000 * 22).toISOString(),
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'auto-2',
    name: 'Model Retraining Pipeline',
    description: 'Retrain predictive models when new labeled data exceeds 500 rows.',
    trigger: 'new_data',
    scheduleConfig: null,
    actions: [
      { id: 'act-3', type: 'clean_data', config: { strategy: 'aggressive' } },
      { id: 'act-4', type: 'run_model', config: { model: 'random-forest' } },
      { id: 'act-5', type: 'send_notification', config: { channel: 'email' } },
    ],
    isActive: true,
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    runCount: 23,
    nextRunAt: null,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'auto-3',
    name: 'Weekly Analytics Report',
    description: 'Generate comprehensive weekly analytics report every Monday at 8 AM.',
    trigger: 'schedule',
    scheduleConfig: { frequency: 'weekly', time: '08:00', dayOfWeek: 'monday' },
    actions: [
      { id: 'act-6', type: 'run_model', config: { model: 'descriptive-stats' } },
      { id: 'act-7', type: 'generate_report', config: { format: 'pdf', includeCharts: 'true' } },
      { id: 'act-8', type: 'send_notification', config: { channel: 'email', recipients: 'team' } },
    ],
    isActive: true,
    lastRunAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    runCount: 18,
    nextRunAt: new Date(Date.now() + 86400000 * 4).toISOString(),
    createdAt: '2026-01-10T12:00:00Z',
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'auto-4',
    name: 'Event-Driven Alert System',
    description: 'Send real-time alerts when statistical anomalies are detected in data streams.',
    trigger: 'event',
    scheduleConfig: null,
    actions: [
      { id: 'act-9', type: 'run_model', config: { model: 'anomaly-detection' } },
      { id: 'act-10', type: 'send_notification', config: { channel: 'push' } },
    ],
    isActive: false,
    lastRunAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    runCount: 5,
    nextRunAt: null,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'auto-5',
    name: 'Manual Data Validation',
    description: 'On-demand data quality check with comprehensive validation rules.',
    trigger: 'manual',
    scheduleConfig: null,
    actions: [
      { id: 'act-11', type: 'clean_data', config: { strategy: 'standard' } },
    ],
    isActive: true,
    lastRunAt: new Date(Date.now() - 7200000).toISOString(),
    runCount: 31,
    nextRunAt: null,
    createdAt: '2026-01-20T14:00:00Z',
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
]

const defaultLogs: ActivityLog[] = [
  { id: 'log-1', automationId: 'auto-1', automationName: 'Daily Data Cleanup', status: 'success', startedAt: new Date(Date.now() - 3600000 * 2).toISOString(), completedAt: new Date(Date.now() - 3600000 * 2 + 45000).toISOString(), duration: '45s' },
  { id: 'log-2', automationId: 'auto-5', automationName: 'Manual Data Validation', status: 'success', startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7200000 + 12000).toISOString(), duration: '12s' },
  { id: 'log-3', automationId: 'auto-2', automationName: 'Model Retraining Pipeline', status: 'success', startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86400000 + 320000).toISOString(), duration: '5m 20s' },
  { id: 'log-4', automationId: 'auto-3', automationName: 'Weekly Analytics Report', status: 'error', startedAt: new Date(Date.now() - 86400000 * 3).toISOString(), completedAt: new Date(Date.now() - 86400000 * 3 + 90000).toISOString(), duration: '1m 30s' },
  { id: 'log-5', automationId: 'auto-4', automationName: 'Event-Driven Alert System', status: 'error', startedAt: new Date(Date.now() - 86400000 * 7).toISOString(), completedAt: new Date(Date.now() - 86400000 * 7 + 5000).toISOString(), duration: '5s' },
  { id: 'log-6', automationId: 'auto-1', automationName: 'Daily Data Cleanup', status: 'success', startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86400000 + 42000).toISOString(), duration: '42s' },
  { id: 'log-7', automationId: 'auto-2', automationName: 'Model Retraining Pipeline', status: 'success', startedAt: new Date(Date.now() - 86400000 * 4).toISOString(), completedAt: new Date(Date.now() - 86400000 * 4 + 280000).toISOString(), duration: '4m 40s' },
  { id: 'log-8', automationId: 'auto-3', automationName: 'Weekly Analytics Report', status: 'success', startedAt: new Date(Date.now() - 86400000 * 10).toISOString(), completedAt: new Date(Date.now() - 86400000 * 10 + 180000).toISOString(), duration: '3m 0s' },
]

// Simple in-memory store
let automations: Automation[] = [...defaultAutomations]
let logs: ActivityLog[] = [...defaultLogs]

/* ─── GET: List all automations and logs ─── */
export async function GET() {
  return NextResponse.json({ automations, logs })
}

/* ─── POST: Create automation ─── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newAutomation: Automation = {
      id: `auto-${Date.now()}`,
      name: body.name || 'Untitled Automation',
      description: body.description || '',
      trigger: body.trigger || 'manual',
      scheduleConfig: body.scheduleConfig || null,
      actions: body.actions || [],
      isActive: body.isActive ?? true,
      lastRunAt: null,
      runCount: 0,
      nextRunAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    automations = [newAutomation, ...automations]
    return NextResponse.json({ automation: newAutomation }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 })
  }
}
