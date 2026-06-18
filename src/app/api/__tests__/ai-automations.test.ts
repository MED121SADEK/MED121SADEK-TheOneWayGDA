/**
 * API Integration Tests — AI Automations
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    automationRule: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    automationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    aiAuditLog: {
      create: vi.fn(),
    },
  }

  function setupMockDb() {
    // automationRule defaults
    _db.automationRule.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'rule-1',
      visitorId: args.data.visitorId ?? null,
      name: (args.data.name as string) ?? 'Test Rule',
      description: (args.data.description as string) ?? '',
      trigger: (args.data.trigger as string) ?? 'manual',
      triggerConfig: typeof args.data.triggerConfig === 'string' ? args.data.triggerConfig : JSON.stringify(args.data.triggerConfig ?? {}),
      actions: typeof args.data.actions === 'string' ? args.data.actions : JSON.stringify(args.data.actions ?? []),
      isActive: (args.data.isActive as boolean) ?? true,
      lastStatus: (args.data.lastStatus as string) ?? 'pending',
      lastRun: null,
      lastError: null,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    }))

    _db.automationRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        name: 'Daily Data Cleanup',
        trigger: 'schedule',
        triggerConfig: JSON.stringify({ frequency: 'daily', time: '00:00' }),
        actions: JSON.stringify([
          { type: 'clean_data', config: { strategy: 'auto' } },
        ]),
        isActive: true,
        lastRun: now,
        lastStatus: 'success',
        lastError: null,
        runCount: 42,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rule-2',
        name: 'Anomaly Detection',
        trigger: 'event',
        triggerConfig: '{}',
        actions: JSON.stringify([
          { type: 'run_model', config: { model: 'anomaly-detection' } },
          { type: 'send_notification', config: { channel: 'push' } },
        ]),
        isActive: true,
        lastRun: now,
        lastStatus: 'success',
        lastError: null,
        runCount: 10,
        createdAt: now,
        updatedAt: now,
      },
    ])

    _db.automationRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      visitorId: null,
      name: 'Daily Data Cleanup',
      description: 'Cleans data daily',
      trigger: 'schedule',
      triggerConfig: JSON.stringify({ frequency: 'daily', time: '00:00' }),
      actions: JSON.stringify([
        { type: 'clean_data', config: { strategy: 'auto' } },
        { type: 'generate_report', config: { format: 'pdf' } },
      ]),
      isActive: true,
      lastRun: now,
      lastStatus: 'success',
      lastError: null,
      runCount: 142,
      createdAt: now,
      updatedAt: now,
    })

    _db.automationRule.update.mockResolvedValue({})
    _db.automationRule.updateMany.mockResolvedValue({ count: 2 })
    _db.automationRule.deleteMany.mockResolvedValue({ count: 2 })

    // automationLog defaults
    _db.automationLog.create.mockResolvedValue({
      id: 'alog-1',
      ruleId: 'rule-1',
      status: 'running',
      input: '{}',
      output: null,
      error: null,
      startedAt: now,
      completedAt: null,
      durationMs: null,
    })

    _db.automationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        ruleId: 'rule-1',
        status: 'success',
        input: '{}',
        output: '{"actionsExecuted": 2}',
        error: null,
        startedAt: now,
        completedAt: now,
        durationMs: 1200,
      },
      {
        id: 'log-2',
        ruleId: 'rule-1',
        status: 'error',
        input: '{}',
        output: null,
        error: 'Action failed: invalid model config',
        startedAt: new Date('2024-06-14'),
        completedAt: new Date('2024-06-14'),
        durationMs: 800,
      },
    ])

    _db.automationLog.update.mockResolvedValue({})
    _db.automationLog.deleteMany.mockResolvedValue({ count: 5 })

    // aiAuditLog
    _db.aiAuditLog.create.mockResolvedValue({})
  }

  function getMockDb() {
    return _db
  }

  return { setupMockDb, getMockDb }
})

// Mock ZAI SDK — used by generate, validate, chain, and optimize routes
vi.mock('z-ai-web-dev-sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  'Consider adding error handling to your action pipeline',
                  'Review the schedule timing to avoid peak hours',
                ]),
              },
            },
          ],
          usage: { total_tokens: 200 },
        }),
      },
    },
  })
  return {
    default: { create: mockCreate },
    __esModule: true,
  }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))

// ── Route imports ──

import { GET as automationsGet, POST as automationsPost } from '../ai/automations/route'
import { PUT as automationsIdPut, DELETE as automationsIdDelete } from '../ai/automations/[id]/route'
import { POST as automationsIdRunPost } from '../ai/automations/[id]/run/route'
import { GET as generateGet, POST as generatePost } from '../ai/automations/generate/route'
import { POST as validatePost } from '../ai/automations/validate/route'
import { POST as batchPost, PATCH as batchPatch, DELETE as batchDelete } from '../ai/automations/batch/route'
import { GET as chainGet, POST as chainPost } from '../ai/automations/chain/route'
import { POST as optimizePost } from '../ai/automations/optimize/route'

// ── Helpers ──

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

function makeJsonRequest(url: string, body: unknown, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupMockDb()
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/automations — List all automations
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/automations', () => {
  it('should return a list of automations and activity logs', async () => {
    const res = await automationsGet(makeRequest('/api/ai/automations'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automations).toBeDefined()
    expect(Array.isArray(data.automations)).toBe(true)
    expect(data.automations.length).toBeGreaterThan(0)
    expect(data.logs).toBeDefined()
    expect(Array.isArray(data.logs)).toBe(true)
  })

  it('should return automations with expected shape fields', async () => {
    const res = await automationsGet(makeRequest('/api/ai/automations'))
    const data = await res.json()
    const auto = data.automations[0]
    expect(auto).toHaveProperty('id')
    expect(auto).toHaveProperty('name')
    expect(auto).toHaveProperty('description')
    expect(auto).toHaveProperty('trigger')
    expect(auto).toHaveProperty('actions')
    expect(auto).toHaveProperty('isActive')
    expect(auto).toHaveProperty('createdAt')
    expect(auto).toHaveProperty('updatedAt')
  })

  it('should include both active and inactive automations', async () => {
    const res = await automationsGet(makeRequest('/api/ai/automations'))
    const data = await res.json()
    const active = data.automations.filter((a: { isActive: boolean }) => a.isActive === true)
    const inactive = data.automations.filter((a: { isActive: boolean }) => a.isActive === false)
    expect(active.length).toBeGreaterThan(0)
    expect(inactive.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations — Create automation
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations', () => {
  it('should create a new automation with valid input', async () => {
    const req = makeJsonRequest('/api/ai/automations', {
      name: 'My New Automation',
      description: 'A test automation',
      trigger: 'manual',
      actions: [
        { id: 'act-new-1', type: 'clean_data', config: { strategy: 'auto' } },
      ],
    })
    const res = await automationsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.automation).toBeDefined()
    expect(data.automation.name).toBe('My New Automation')
    expect(data.automation.trigger).toBe('manual')
    expect(data.automation.isActive).toBe(true)
    expect(data.automation.runCount).toBe(0)
    expect(data.automation.lastRunAt).toBeNull()
  })

  it('should create automation with default values when fields are omitted', async () => {
    const req = makeJsonRequest('/api/ai/automations', {
      name: 'Minimal Automation',
    })
    const res = await automationsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.automation.name).toBe('Minimal Automation')
    expect(data.automation.trigger).toBe('manual')
    expect(data.automation.actions).toEqual([])
  })

  it('should create automation with schedule config', async () => {
    const req = makeJsonRequest('/api/ai/automations', {
      name: 'Scheduled Automation',
      trigger: 'schedule',
      scheduleConfig: { frequency: 'daily', time: '06:00' },
      actions: [
        { id: 'act-sched-1', type: 'generate_report', config: { format: 'pdf' } },
      ],
    })
    const res = await automationsPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.automation.scheduleConfig).toEqual({ frequency: 'daily', time: '06:00' })
  })
})

// ═══════════════════════════════════════════════════════════════
//  PUT /api/ai/automations/[id] — Update automation
// ═══════════════════════════════════════════════════════════════

describe('PUT /api/ai/automations/[id]', () => {
  it('should update an automation and return updated data', async () => {
    const req = makeJsonRequest('/api/ai/automations/auto-1', {
      name: 'Updated Automation Name',
      description: 'Updated description',
      trigger: 'schedule',
      scheduleConfig: { frequency: 'weekly', time: '09:00', dayOfWeek: 'monday' },
      actions: [
        { id: 'act-1', type: 'clean_data', config: { strategy: 'aggressive' } },
      ],
      isActive: false,
    })
    // Simulate Next.js dynamic route params
    const res = await automationsIdPut(req, {
      params: Promise.resolve({ id: 'auto-1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automation).toBeDefined()
    expect(data.automation.id).toBe('auto-1')
    expect(data.automation.name).toBe('Updated Automation Name')
    expect(data.automation.isActive).toBe(false)
    expect(data.automation.updatedAt).toBeDefined()
  })

  it('should return updated automation with new trigger', async () => {
    const req = makeJsonRequest('/api/ai/automations/auto-2', {
      name: 'Changed Trigger',
      trigger: 'event',
      actions: [],
      isActive: true,
    })
    const res = await automationsIdPut(req, {
      params: Promise.resolve({ id: 'auto-2' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automation.trigger).toBe('event')
    expect(data.automation.scheduleConfig).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/ai/automations/[id] — Delete automation
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/ai/automations/[id]', () => {
  it('should delete an automation and return success', async () => {
    const res = await automationsIdDelete(makeRequest('/api/ai/automations/auto-1', {
      method: 'DELETE',
    }), {
      params: Promise.resolve({ id: 'auto-1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.deletedId).toBe('auto-1')
  })

  it('should return the deleted ID in the response', async () => {
    const res = await automationsIdDelete(makeRequest('/api/ai/automations/auto-99', {
      method: 'DELETE',
    }), {
      params: Promise.resolve({ id: 'auto-99' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deletedId).toBe('auto-99')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/[id]/run — Trigger automation run
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/[id]/run', () => {
  it('should trigger an automation run and return success', async () => {
    const res = await automationsIdRunPost(makeRequest('/api/ai/automations/auto-1/run', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'auto-1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.automationId).toBe('auto-1')
    expect(data.message).toBe('Automation run triggered successfully')
    expect(data.runId).toBeDefined()
    expect(data.runId).toMatch(/^run-/)
  })

  it('should return a run ID matching expected format', async () => {
    const res = await automationsIdRunPost(makeRequest('/api/ai/automations/auto-1/run', {
      method: 'POST',
    }), { params: Promise.resolve({ id: 'auto-1' }) })
    const data = await res.json()
    expect(data.runId).toMatch(/^run-\d+$/)
  })

  it('should return the correct automation ID in the response', async () => {
    const res = await automationsIdRunPost(makeRequest('/api/ai/automations/auto-5/run', {
      method: 'POST',
    }), { params: Promise.resolve({ id: 'auto-5' }) })
    const data = await res.json()
    expect(data.automationId).toBe('auto-5')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/automations/generate — Templates
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/automations/generate', () => {
  it('should return automation templates', async () => {
    const res = await generateGet(makeRequest('/api/ai/automations/generate'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.templates).toBeDefined()
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.templates.length).toBeGreaterThan(0)
  })

  it('should include expected template fields', async () => {
    const res = await generateGet(makeRequest('/api/ai/automations/generate'))
    const data = await res.json()
    const tpl = data.templates[0]
    expect(tpl).toHaveProperty('id')
    expect(tpl).toHaveProperty('name')
    expect(tpl).toHaveProperty('description')
    expect(tpl).toHaveProperty('trigger')
    expect(tpl).toHaveProperty('actions')
    expect(tpl).toHaveProperty('category')
  })

  it('should include templates across different categories', async () => {
    const res = await generateGet(makeRequest('/api/ai/automations/generate'))
    const data = await res.json()
    const categories = data.templates.map((t: { category: string }) => t.category)
    expect(categories).toContain('Data Quality')
    expect(categories).toContain('Monitoring')
    expect(categories).toContain('Reporting')
    expect(categories).toContain('ML Pipeline')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/generate — Generate from description
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/generate', () => {
  it('should generate an automation from a description', async () => {
    const req = makeJsonRequest('/api/ai/automations/generate', {
      description: 'Clean data every morning and send a PDF report to the team',
    })
    const res = await generatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automation).toBeDefined()
    expect(data.automation.name).toBeDefined()
    expect(data.automation.trigger).toBeDefined()
    expect(data.automation.actions).toBeDefined()
    expect(Array.isArray(data.automation.actions)).toBe(true)
    expect(data.validation).toBeDefined()
    expect(data.validation).toHaveProperty('valid')
    expect(data.validation).toHaveProperty('warnings')
    expect(data.validation).toHaveProperty('errors')
    expect(data.explanation).toBeDefined()
  })

  it('should return 400 when description is missing', async () => {
    const req = makeJsonRequest('/api/ai/automations/generate', {
      context: 'some context',
    })
    const res = await generatePost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Description is required')
  })

  it('should return 400 when description is empty string', async () => {
    const req = makeJsonRequest('/api/ai/automations/generate', {
      description: '   ',
    })
    const res = await generatePost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Description is required')
  })

  it('should pass context to the AI when provided', async () => {
    const req = makeJsonRequest('/api/ai/automations/generate', {
      description: 'Monitor for anomalies',
      context: 'We are working with sensor data',
    })
    const res = await generatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.automation).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/validate — Validate automation config
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/validate', () => {
  it('should validate a valid automation config', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'Valid Automation',
      trigger: 'manual',
      actions: [
        { type: 'clean_data', config: { strategy: 'auto' } },
        { type: 'generate_report', config: { format: 'pdf' } },
      ],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(true)
    expect(data.errors).toEqual([])
  })

  it('should invalidate a config with missing name', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      trigger: 'manual',
      actions: [{ type: 'clean_data', config: {} }],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('name')])
    )
  })

  it('should invalidate a config with invalid trigger', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'Bad Trigger',
      trigger: 'invalid_trigger',
      actions: [{ type: 'clean_data', config: {} }],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Invalid trigger type')])
    )
  })

  it('should invalidate a config with no actions', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'No Actions',
      trigger: 'manual',
      actions: [],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('At least one action')])
    )
  })

  it('should invalidate a schedule trigger missing schedule config', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'Schedule No Config',
      trigger: 'schedule',
      actions: [{ type: 'clean_data', config: { strategy: 'auto' } }],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('schedule configuration')])
    )
  })

  it('should return AI suggestions in the response', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'My Rule',
      trigger: 'manual',
      actions: [{ type: 'clean_data', config: { strategy: 'auto' } }],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toBeDefined()
    expect(Array.isArray(data.suggestions)).toBe(true)
  })

  it('should return 400 when body is not an object', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', 'not an object')
    const res = await validatePost(req)
    expect(res.status).toBe(400)
  })

  it('should include warnings for valid but improvable configs', async () => {
    const req = makeJsonRequest('/api/ai/automations/validate', {
      name: 'Report Only',
      trigger: 'manual',
      actions: [
        { type: 'generate_report', config: { format: 'pdf' } },
      ],
    })
    const res = await validatePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    // Should be valid but have warnings
    expect(data.warnings.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/batch — Batch execute
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/batch', () => {
  it('should execute multiple automation rules in batch', async () => {
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: ['rule-1', 'rule-2'],
      sequential: false,
    })
    const res = await batchPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batchId).toBeDefined()
    expect(data.batchId).toMatch(/^batch-/)
    expect(data.executionMode).toBe('parallel')
    expect(data.totalRules).toBe(2)
    expect(data.results).toBeDefined()
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.summary).toHaveProperty('successCount')
    expect(data.summary).toHaveProperty('totalDurationMs')
  })

  it('should return 400 when ruleIds is empty', async () => {
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: [],
    })
    const res = await batchPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleIds')
  })

  it('should return 400 when ruleIds is not an array', async () => {
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: 'not-an-array',
    })
    const res = await batchPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleIds')
  })

  it('should return 400 when more than 50 ruleIds', async () => {
    const manyIds = Array.from({ length: 51 }, (_, i) => `rule-${i}`)
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: manyIds,
    })
    const res = await batchPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('50')
  })

  it('should return 404 when no active rules found', async () => {
    getMockDb().automationRule.findMany.mockResolvedValueOnce([])
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: ['nonexistent-1', 'nonexistent-2'],
    })
    const res = await batchPost(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('No active automation rules')
  })

  it('should execute in sequential mode when requested', async () => {
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: ['rule-1'],
      sequential: true,
    })
    const res = await batchPost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.executionMode).toBe('sequential')
  })
})

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/ai/automations/batch — Batch update
// ═══════════════════════════════════════════════════════════════

describe('PATCH /api/ai/automations/batch', () => {
  it('should batch update automations', async () => {
    const req = makeJsonRequest('/api/ai/automations/batch', {
      ruleIds: ['rule-1', 'rule-2'],
      updates: { isActive: false },
    }, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    // Override method since makeJsonRequest always uses POST
    const patchReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: ['rule-1', 'rule-2'], updates: { isActive: false } }),
    })
    const res = await batchPatch(patchReq)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batchId).toMatch(/^batch-patch-/)
    expect(data.matchedCount).toBeDefined()
    expect(data.requestedCount).toBe(2)
    expect(data.updatedRules).toBeDefined()
    expect(Array.isArray(data.updatedRules)).toBe(true)
  })

  it('should return 400 when ruleIds is empty', async () => {
    const patchReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: [], updates: { isActive: true } }),
    })
    const res = await batchPatch(patchReq)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleIds')
  })

  it('should return 400 when updates object is missing', async () => {
    const patchReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: ['rule-1'] }),
    })
    const res = await batchPatch(patchReq)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('updates')
  })

  it('should return 400 when more than 100 ruleIds', async () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => `rule-${i}`)
    const patchReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: manyIds, updates: { isActive: true } }),
    })
    const res = await batchPatch(patchReq)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('100')
  })
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/ai/automations/batch — Batch delete
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/ai/automations/batch', () => {
  it('should batch delete automations', async () => {
    const deleteReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: ['rule-1', 'rule-2'] }),
    })
    const res = await batchDelete(deleteReq)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.batchId).toMatch(/^batch-delete-/)
    expect(data.deletedRules).toBeDefined()
    expect(data.deletedLogs).toBeDefined()
    expect(data.deletedNames).toBeDefined()
    expect(Array.isArray(data.deletedNames)).toBe(true)
  })

  it('should return 400 when ruleIds is empty', async () => {
    const deleteReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: [] }),
    })
    const res = await batchDelete(deleteReq)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleIds')
  })

  it('should return 400 when more than 100 ruleIds', async () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => `rule-${i}`)
    const deleteReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: manyIds }),
    })
    const res = await batchDelete(deleteReq)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('100')
  })

  it('should return 404 when no rules found for given IDs', async () => {
    getMockDb().automationRule.findMany.mockResolvedValueOnce([])
    const deleteReq = new NextRequest(new URL('/api/ai/automations/batch', 'http://localhost:3000'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds: ['nonexistent-1'] }),
    })
    const res = await batchDelete(deleteReq)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('No automation rules found')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/ai/automations/chain — Catalog
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/automations/chain', () => {
  it('should return action and trigger catalogs', async () => {
    const res = await chainGet(makeRequest('/api/ai/automations/chain'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.actions).toBeDefined()
    expect(Array.isArray(data.actions)).toBe(true)
    expect(data.triggers).toBeDefined()
    expect(Array.isArray(data.triggers)).toBe(true)
  })

  it('should include core action types in the catalog', async () => {
    const res = await chainGet(makeRequest('/api/ai/automations/chain'))
    const data = await res.json()
    const actionTypes = data.actions.map((a: { type: string }) => a.type)
    expect(actionTypes).toContain('clean_data')
    expect(actionTypes).toContain('run_model')
    expect(actionTypes).toContain('generate_report')
    expect(actionTypes).toContain('send_notification')
  })

  it('should include extended action types', async () => {
    const res = await chainGet(makeRequest('/api/ai/automations/chain'))
    const data = await res.json()
    const actionTypes = data.actions.map((a: { type: string }) => a.type)
    expect(actionTypes).toContain('feature_engineering')
    expect(actionTypes).toContain('data_validation')
    expect(actionTypes).toContain('ai_analysis')
  })

  it('should include metadata about the chain system', async () => {
    const res = await chainGet(makeRequest('/api/ai/automations/chain'))
    const data = await res.json()
    expect(data.meta).toBeDefined()
    expect(data.meta.totalActionTypes).toBeGreaterThan(0)
    expect(data.meta.totalTriggerTypes).toBeGreaterThan(0)
    expect(data.meta.maxStepsPerChain).toBe(100)
    expect(data.meta.supportedConditions).toContain('always')
    expect(data.meta.supportedConditions).toContain('on_success')
    expect(data.meta.supportedConditions).toContain('on_failure')
  })

  it('should include config schemas with required/optional fields for each action', async () => {
    const res = await chainGet(makeRequest('/api/ai/automations/chain'))
    const data = await res.json()
    const cleanData = data.actions.find((a: { type: string }) => a.type === 'clean_data')
    expect(cleanData).toBeDefined()
    expect(cleanData.configSchema).toBeDefined()
    expect(cleanData.configSchema.required).toBeDefined()
    expect(cleanData.configSchema.optional).toBeDefined()
    expect(cleanData.label).toBeDefined()
    expect(cleanData.description).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/chain — Create & execute chain
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/chain', () => {
  it('should create a chain without executing it', async () => {
    const req = makeJsonRequest('/api/ai/automations/chain', {
      name: 'My Chain',
      description: 'A test chain',
      trigger: 'manual',
      steps: [
        { id: 'step-1', action: 'clean_data', config: { strategy: 'auto' } },
        { id: 'step-2', action: 'generate_report', config: { format: 'pdf', includeCharts: true } },
      ],
      executeImmediately: false,
    })
    const res = await chainPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.ruleId).toBeDefined()
    expect(data.name).toBe('My Chain')
    expect(data.status).toBe('saved')
    expect(data.steps).toBeDefined()
    expect(data.steps.length).toBe(2)
    expect(data.message).toContain('Set executeImmediately to true')
  })

  it('should return 400 when name is missing', async () => {
    const req = makeJsonRequest('/api/ai/automations/chain', {
      steps: [{ id: 's1', action: 'clean_data', config: { strategy: 'auto' } }],
      trigger: 'manual',
    })
    const res = await chainPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 when steps is empty', async () => {
    const req = makeJsonRequest('/api/ai/automations/chain', {
      name: 'Empty Chain',
      trigger: 'manual',
      steps: [],
    })
    const res = await chainPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'steps' })])
    )
  })

  it('should return 400 when trigger is invalid', async () => {
    const req = makeJsonRequest('/api/ai/automations/chain', {
      name: 'Bad Trigger Chain',
      trigger: 'invalid_trigger_type',
      steps: [{ id: 's1', action: 'clean_data', config: { strategy: 'auto' } }],
    })
    const res = await chainPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'trigger' })])
    )
  })

  it('should return 400 for invalid JSON body', async () => {
    const req = new NextRequest(new URL('/api/ai/automations/chain', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    })
    const res = await chainPost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid JSON')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/ai/automations/optimize — Optimize automation
// ═══════════════════════════════════════════════════════════════

describe('POST /api/ai/automations/optimize', () => {
  it('should optimize an existing automation rule', async () => {
    const req = makeJsonRequest('/api/ai/automations/optimize', {
      ruleId: 'rule-1',
    })
    const res = await optimizePost(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ruleId).toBe('rule-1')
    expect(data.originalRule).toBeDefined()
    expect(data.originalRule.id).toBe('rule-1')
    expect(data.originalRule.name).toBe('Daily Data Cleanup')
    expect(data.optimizedRule).toBeDefined()
    expect(data.explanation).toBeDefined()
    expect(data.performanceInsights).toBeDefined()
    expect(Array.isArray(data.performanceInsights)).toBe(true)
    expect(data.performanceSummary).toBeDefined()
    expect(data.performanceSummary).toHaveProperty('totalRuns')
    expect(data.performanceSummary).toHaveProperty('successCount')
    expect(data.performanceSummary).toHaveProperty('errorRate')
    expect(data.performanceSummary).toHaveProperty('avgDurationMs')
  })

  it('should return 400 when ruleId is missing', async () => {
    const req = makeJsonRequest('/api/ai/automations/optimize', {})
    const res = await optimizePost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleId is required')
  })

  it('should return 400 when ruleId is not a string', async () => {
    const req = makeJsonRequest('/api/ai/automations/optimize', {
      ruleId: 12345,
    })
    const res = await optimizePost(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('ruleId is required')
  })

  it('should return 404 when rule does not exist', async () => {
    getMockDb().automationRule.findUnique.mockResolvedValueOnce(null)
    const req = makeJsonRequest('/api/ai/automations/optimize', {
      ruleId: 'nonexistent-rule',
    })
    const res = await optimizePost(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })
})