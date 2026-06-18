/**
 * API Integration Tests — AI Extensions & Governance Routes
 *
 * Covers: policies, extensions, registry, hooks, webhooks,
 *         governance/compliance, governance/usage-tags, mlops, templates, sdk
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const _db = {
    aiAuditLog: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'log-1', tokensUsed: 100, action: 'ai_query', error: null, visitorId: null, createdAt: now },
      ]),
      count: vi.fn().mockResolvedValue(10),
      groupBy: vi.fn().mockResolvedValue([
        { model: 'default', _count: { id: 5 } },
        { model: 'gpt-4', _count: { id: 3 } },
      ]),
      aggregate: vi.fn().mockResolvedValue({
        _sum: { tokensUsed: 5000, durationMs: 10000 },
        _avg: { durationMs: 200, tokensUsed: 100 },
        _count: { id: 10 },
      }),
      findFirst: vi.fn().mockResolvedValue({
        id: 'log-latest', createdAt: now, action: 'ai_query', tokensUsed: 100,
      }),
    },
    // Stub for any other models the routes may access
    decisionRecord: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(5) },
    aiSuggestion: { findMany: vi.fn().mockResolvedValue([]) },
    aiConversation: { findMany: vi.fn().mockResolvedValue([]) },
    userPreference: { findUnique: vi.fn().mockResolvedValue(null) },
    workflowPipeline: { findMany: vi.fn().mockResolvedValue([]) },
    analysisRun: { create: vi.fn().mockResolvedValue({ id: 'ar-1' }) },
    automationRule: { count: vi.fn().mockResolvedValue(3) },
  }

  function setupMockDb() {
    _db.aiAuditLog.findMany.mockResolvedValue([
      { id: 'log-1', tokensUsed: 100, action: 'ai_query', error: null, visitorId: null, createdAt: now },
    ])
    _db.aiAuditLog.count.mockResolvedValue(10)
    _db.aiAuditLog.groupBy.mockResolvedValue([
      { model: 'default', _count: { id: 5 } },
      { model: 'gpt-4', _count: { id: 3 } },
    ])
    _db.aiAuditLog.aggregate.mockResolvedValue({
      _sum: { tokensUsed: 5000, durationMs: 10000 },
      _avg: { durationMs: 200, tokensUsed: 100 },
      _count: { id: 10 },
    })
    _db.aiAuditLog.findFirst.mockResolvedValue({
      id: 'log-latest', createdAt: now, action: 'ai_query', tokensUsed: 100,
    })
    _db.automationRule.count.mockResolvedValue(3)
    _db.decisionRecord.count.mockResolvedValue(5)
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))
vi.mock('@/lib/rate-limit', () => ({
  simpleRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 }),
}))
vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}))

// ── Route imports ──

import { GET as policiesGet, POST as policiesPost } from '../ai/policies/route'
import { PUT as policiesIdPut, DELETE as policiesIdDelete } from '../ai/policies/[id]/route'
import { GET as extensionsGet, POST as extensionsPost } from '../ai/extensions/route'
import { GET as extensionsIdGet, POST as extensionsIdPost } from '../ai/extensions/[id]/route'
import { GET as registryGet, POST as registryPost } from '../ai/extensions/registry/route'
import { GET as hooksGet, POST as hooksPost, DELETE as hooksDelete } from '../ai/extensions/hooks/route'
import { GET as webhooksGet, POST as webhooksPost, DELETE as webhooksDelete } from '../ai/extensions/webhooks/route'
import { GET as complianceGet } from '../ai/governance/compliance/route'
import { GET as usageTagsGet, POST as usageTagsPost, PATCH as usageTagsPatch } from '../ai/governance/usage-tags/route'
import { GET as mlopsGet, POST as mlopsPost } from '../ai/mlops/route'
import { GET as templatesGet, POST as templatesPost } from '../ai/templates/route'
import { GET as sdkGet } from '../ai/sdk/route'

// ── Helpers ──

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}
function makeJsonRequest(url: string, body: unknown, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options, method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}
function makePatchRequest(url: string, body: unknown, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═══════════════════════════════════════════════════════════════
//  AI POLICIES
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/policies', () => {
  it('should return policies list with summary', async () => {
    const res = await policiesGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.policies).toBeDefined()
    expect(Array.isArray(data.policies)).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBe(data.policies.length)
    expect(data.summary.active).toBeGreaterThan(0)
    expect(data.summary.categories).toBeDefined()
    expect(Array.isArray(data.summary.categories)).toBe(true)
  })

  it('should include expected default policies', async () => {
    const res = await policiesGet()
    const data = await res.json()
    const names = data.policies.map((p: { name: string }) => p.name)
    expect(names).toContain('AI Data Access')
    expect(names).toContain('Automation Limits')
    expect(names).toContain('Model Selection')
    expect(names).toContain('Compliance')
  })

  it('should have policies with rules arrays', async () => {
    const res = await policiesGet()
    const data = await res.json()
    for (const policy of data.policies) {
      expect(policy).toHaveProperty('id')
      expect(policy).toHaveProperty('name')
      expect(policy).toHaveProperty('scope')
      expect(policy).toHaveProperty('category')
      expect(policy).toHaveProperty('rules')
      expect(Array.isArray(policy.rules)).toBe(true)
      expect(policy).toHaveProperty('isActive')
    }
  })
})

describe('POST /api/ai/policies', () => {
  it('should create a new policy with valid input', async () => {
    const res = await policiesPost(makeJsonRequest('/api/ai/policies', {
      name: 'Test Policy',
      scope: 'global',
      category: 'data_access',
      rules: [{ key: 'test_key', value: 'test_value', description: 'A test rule' }],
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.policy).toBeDefined()
    expect(data.policy.name).toBe('Test Policy')
    expect(data.policy.scope).toBe('global')
    expect(data.policy.category).toBe('data_access')
    expect(data.policy.isActive).toBe(true)
    expect(data.policy.rules).toHaveLength(1)
  })

  it('should return 400 for missing required fields', async () => {
    const res = await policiesPost(makeJsonRequest('/api/ai/policies', {
      name: 'Incomplete Policy',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('should return 400 for invalid category', async () => {
    const res = await policiesPost(makeJsonRequest('/api/ai/policies', {
      name: 'Bad Category',
      scope: 'global',
      category: 'nonexistent',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid category')
  })

  it('should return 400 for invalid scope', async () => {
    const res = await policiesPost(makeJsonRequest('/api/ai/policies', {
      name: 'Bad Scope',
      scope: 'organization',
      category: 'automation',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid scope')
  })

  it('should allow setting isActive to false', async () => {
    const res = await policiesPost(makeJsonRequest('/api/ai/policies', {
      name: 'Inactive Policy',
      scope: 'project',
      category: 'suggestions',
      isActive: false,
      projectId: 'proj-1',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.policy.isActive).toBe(false)
    expect(data.policy.projectId).toBe('proj-1')
  })
})

describe('PUT /api/ai/policies/[id]', () => {
  it('should update an existing policy', async () => {
    // First, get policies to find a valid ID
    const getRes = await policiesGet()
    const getData = await getRes.json()
    const targetId = getData.policies[0].id

    const res = await policiesIdPut(
      makeJsonRequest(`/api/ai/policies/${targetId}`, {
        name: 'Updated Policy Name',
        isActive: false,
      }),
      { params: Promise.resolve({ id: targetId }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.policy.name).toBe('Updated Policy Name')
    expect(data.policy.isActive).toBe(false)
  })

  it('should return 404 for non-existent policy', async () => {
    const res = await policiesIdPut(
      makeJsonRequest('/api/ai/policies/nonexistent-id', { name: 'X' }),
      { params: Promise.resolve({ id: 'nonexistent-id' }) }
    )
    expect(res.status).toBe(404)
  })

  it('should preserve existing fields when only some are provided', async () => {
    const getRes = await policiesGet()
    const getData = await getRes.json()
    const target = getData.policies[0]
    const originalScope = target.scope
    const originalCategory = target.category

    const res = await policiesIdPut(
      makeJsonRequest(`/api/ai/policies/${target.id}`, { name: 'Renamed Only' }),
      { params: Promise.resolve({ id: target.id }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.policy.name).toBe('Renamed Only')
    expect(data.policy.scope).toBe(originalScope)
    expect(data.policy.category).toBe(originalCategory)
  })
})

describe('DELETE /api/ai/policies/[id]', () => {
  it('should delete an existing policy', async () => {
    const getRes = await policiesGet()
    const getData = await getRes.json()
    const targetId = getData.policies[0].id

    const res = await policiesIdDelete(
      makeRequest(`/api/ai/policies/${targetId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: targetId }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.policy.id).toBe(targetId)
  })

  it('should return 404 for non-existent policy', async () => {
    const res = await policiesIdDelete(
      makeRequest('/api/ai/policies/nonexistent-id', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'nonexistent-id' }) }
    )
    expect(res.status).toBe(404)
  })

  it('should return the deleted policy details', async () => {
    const getRes = await policiesGet()
    const getData = await getRes.json()
    const target = getData.policies[0]

    const res = await policiesIdDelete(
      makeRequest(`/api/ai/policies/${target.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: target.id }) }
    )
    const data = await res.json()
    expect(data.policy.name).toBe(target.name)
    expect(data.policy.category).toBe(target.category)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI EXTENSIONS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/extensions', () => {
  it('should return extensions list with total count', async () => {
    const res = await extensionsGet(makeRequest('/api/ai/extensions'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.extensions).toBeDefined()
    expect(Array.isArray(data.extensions)).toBe(true)
    expect(data.total).toBe(data.extensions.length)
  })

  it('should filter by type query parameter', async () => {
    const res = await extensionsGet(makeRequest('/api/ai/extensions?type=visualization'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const ext of data.extensions) {
      expect(ext.type).toBe('visualization')
    }
  })

  it('should return all types without filter', async () => {
    const res = await extensionsGet(makeRequest('/api/ai/extensions'))
    const data = await res.json()
    const types = new Set(data.extensions.map((e: { type: string }) => e.type))
    expect(types.size).toBeGreaterThan(1)
  })
})

describe('POST /api/ai/extensions', () => {
  it('should create a new extension', async () => {
    const res = await extensionsPost(makeJsonRequest('/api/ai/extensions', {
      name: 'Test Extension',
      type: 'integration',
      description: 'A test extension',
      author: 'Test Author',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.extension).toBeDefined()
    expect(data.extension.name).toBe('Test Extension')
    expect(data.extension.type).toBe('integration')
    expect(data.extension.isInstalled).toBe(false)
    expect(data.extension.installs).toBe(0)
  })

  it('should return 400 for missing name or type', async () => {
    const res = await extensionsPost(makeJsonRequest('/api/ai/extensions', {
      name: 'No Type',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Name and type are required')
  })

  it('should return 400 for invalid type', async () => {
    const res = await extensionsPost(makeJsonRequest('/api/ai/extensions', {
      name: 'Bad Type',
      type: 'invalid_type',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid type')
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI EXTENSIONS / [id]
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/extensions/[id]', () => {
  it('should return extension details for valid id', async () => {
    const res = await extensionsIdGet(
      makeRequest('/api/ai/extensions/ext-1'),
      { params: Promise.resolve({ id: 'ext-1' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.extension).toBeDefined()
    expect(data.extension.id).toBe('ext-1')
    expect(data.extension.name).toBe('Plotly Enhanced Charts')
  })

  it('should return 404 for non-existent extension', async () => {
    const res = await extensionsIdGet(
      makeRequest('/api/ai/extensions/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/ai/extensions/[id]', () => {
  it('should toggle install status (install)', async () => {
    // ext-3 (R Integration) starts as isInstalled: false
    const res = await extensionsIdPost(
      makeJsonRequest('/api/ai/extensions/ext-3', {}),
      { params: Promise.resolve({ id: 'ext-3' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.extension.isInstalled).toBe(true)
    expect(data.message).toBe('Extension installed')
  })

  it('should toggle install status (uninstall)', async () => {
    // ext-1 (Plotly) starts as isInstalled: true
    const res = await extensionsIdPost(
      makeJsonRequest('/api/ai/extensions/ext-1', {}),
      { params: Promise.resolve({ id: 'ext-1' }) }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.extension.isInstalled).toBe(false)
    expect(data.message).toBe('Extension uninstalled')
  })

  it('should return 404 for non-existent extension', async () => {
    const res = await extensionsIdPost(
      makeJsonRequest('/api/ai/extensions/nonexistent', {}),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI EXTENSIONS REGISTRY
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/extensions/registry', () => {
  it('should return registry entries with summary', async () => {
    const res = await registryGet(makeRequest('/api/ai/extensions/registry'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.extensions).toBeDefined()
    expect(Array.isArray(data.extensions)).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBeGreaterThan(0)
    expect(data.summary.installed).toBeDefined()
    expect(data.summary.healthy).toBeDefined()
    expect(data.summary.valid).toBeDefined()
  })

  it('should filter by validationStatus', async () => {
    const res = await registryGet(makeRequest('/api/ai/extensions/registry?validationStatus=valid'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const ext of data.extensions) {
      expect(ext.validationStatus).toBe('valid')
    }
  })

  it('should filter by type', async () => {
    const res = await registryGet(makeRequest('/api/ai/extensions/registry?type=visualization'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const ext of data.extensions) {
      expect(ext.type).toBe('visualization')
    }
  })
})

describe('POST /api/ai/extensions/registry', () => {
  it('should register a valid extension manifest', async () => {
    const res = await registryPost(makeJsonRequest('/api/ai/extensions/registry', {
      name: 'test-new-extension',
      displayName: 'Test New Extension',
      version: '1.0.0',
      apiVersion: '1.0.0',
      author: 'Test Author',
      type: 'integration',
      description: 'A comprehensive test extension for integration testing.',
      license: 'MIT',
      hooks: ['data:import'],
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.extension).toBeDefined()
    expect(data.extension.name).toBe('test-new-extension')
    expect(data.extension.validationStatus).toBe('valid')
    expect(data.message).toContain('successfully')
  })

  it('should reject manifest with missing required fields', async () => {
    const res = await registryPost(makeJsonRequest('/api/ai/extensions/registry', {
      name: '',
      displayName: 'Empty Name Extension',
      version: '1.0.0',
      author: 'Test',
      type: 'integration',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('validation failed')
  })

  it('should reject duplicate extension name', async () => {
    // First registration
    await registryPost(makeJsonRequest('/api/ai/extensions/registry', {
      name: 'dup-extension',
      displayName: 'Dup Extension',
      version: '1.0.0',
      author: 'Test',
      type: 'statistical',
      description: 'First registration of dup-extension.',
    }))

    // Duplicate attempt
    const res = await registryPost(makeJsonRequest('/api/ai/extensions/registry', {
      name: 'dup-extension',
      displayName: 'Dup Extension v2',
      version: '2.0.0',
      author: 'Test',
      type: 'statistical',
      description: 'Second registration of dup-extension.',
    }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('already registered')
  })

  it('should register with warnings for short description', async () => {
    const res = await registryPost(makeJsonRequest('/api/ai/extensions/registry', {
      name: 'warn-extension',
      displayName: 'Warning Extension',
      version: '1.0.0',
      author: 'Test',
      type: 'export',
      description: 'Short', // Less than 10 chars
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.extension.validationStatus).toBe('warning')
    expect(data.message).toContain('warnings')
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI EXTENSIONS HOOKS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/extensions/hooks', () => {
  it('should return hook points and registrations with summary', async () => {
    const res = await hooksGet(makeRequest('/api/ai/extensions/hooks'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hookPoints).toBeDefined()
    expect(Array.isArray(data.hookPoints)).toBe(true)
    expect(data.hooks).toBeDefined()
    expect(data.summary).toBeDefined()
    expect(data.summary.totalRegistrations).toBeGreaterThan(0)
    expect(data.summary.hookPointCount).toBe(data.hookPoints.length)
  })

  it('should filter by hookPoint', async () => {
    const res = await hooksGet(makeRequest('/api/ai/extensions/hooks?hookPoint=workspace:chart'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Object.keys(data.hooks)).toEqual(['workspace:chart'])
  })

  it('should filter by extensionId', async () => {
    const res = await hooksGet(makeRequest('/api/ai/extensions/hooks?extensionId=ext-1'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const regs of Object.values(data.hooks) as unknown[][]) {
      for (const reg of regs) {
        expect(reg.extensionId).toBe('ext-1')
      }
    }
  })
})

describe('POST /api/ai/extensions/hooks', () => {
  it('should register a new hook', async () => {
    const res = await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'data:import',
      extensionId: 'ext-new-1',
      extensionName: 'New Test Extension',
      handlerUrl: '/api/ext-new-1/hooks/data-import',
      priority: 25,
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.registration).toBeDefined()
    expect(data.registration.hookPoint).toBe('data:import')
    expect(data.registration.extensionId).toBe('ext-new-1')
    expect(data.registration.priority).toBe(25)
    expect(data.registration.enabled).toBe(true)
  })

  it('should return 400 for missing required fields', async () => {
    const res = await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'data:import',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('should return 400 for invalid hookPoint', async () => {
    const res = await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'invalid:hook',
      extensionId: 'ext-1',
      extensionName: 'Test',
      handlerUrl: '/test',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid hookPoint')
  })

  it('should return 409 for duplicate registration', async () => {
    // ext-1 is already registered to workspace:init in seed data
    const res = await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'workspace:init',
      extensionId: 'ext-1',
      extensionName: 'Plotly Enhanced Charts',
      handlerUrl: '/api/ext-1/hooks/workspace-init',
    }))
    expect(res.status).toBe(409)
  })

  it('should clamp priority between 0 and 100', async () => {
    const res = await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'data:export',
      extensionId: 'ext-priority-test',
      extensionName: 'Priority Test',
      handlerUrl: '/test',
      priority: 200,
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.registration.priority).toBe(100)
  })
})

describe('DELETE /api/ai/extensions/hooks', () => {
  it('should remove a hook registration', async () => {
    // Register a hook first
    await hooksPost(makeJsonRequest('/api/ai/extensions/hooks', {
      hookPoint: 'data:export',
      extensionId: 'ext-delete-test',
      extensionName: 'Delete Test',
      handlerUrl: '/test',
    }))

    const res = await hooksDelete(
      makeRequest('/api/ai/extensions/hooks?hookPoint=data:export&extensionId=ext-delete-test', { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('removed')
    expect(data.removed.extensionId).toBe('ext-delete-test')
  })

  it('should return 400 for missing query params', async () => {
    const res = await hooksDelete(
      makeRequest('/api/ai/extensions/hooks', { method: 'DELETE' })
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent registration', async () => {
    const res = await hooksDelete(
      makeRequest('/api/ai/extensions/hooks?hookPoint=workspace:init&extensionId=nonexistent', { method: 'DELETE' })
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI EXTENSIONS WEBHOOKS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/extensions/webhooks', () => {
  it('should return webhooks with summary and available events', async () => {
    const res = await webhooksGet(makeRequest('/api/ai/extensions/webhooks'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.webhooks).toBeDefined()
    expect(Array.isArray(data.webhooks)).toBe(true)
    expect(data.availableEvents).toBeDefined()
    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBeGreaterThan(0)
    expect(data.summary.active).toBeDefined()
    expect(data.summary.inactive).toBeDefined()
  })

  it('should filter by event', async () => {
    const res = await webhooksGet(makeRequest('/api/ai/extensions/webhooks?event=pipeline.completed'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const wh of data.webhooks) {
      expect(wh.events).toContain('pipeline.completed')
    }
  })

  it('should filter by active status', async () => {
    const res = await webhooksGet(makeRequest('/api/ai/extensions/webhooks?active=false'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const wh of data.webhooks) {
      expect(wh.isActive).toBe(false)
    }
  })

  it('should include delivery logs when requested', async () => {
    const res = await webhooksGet(makeRequest('/api/ai/extensions/webhooks?includeLogs=true'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.deliveryLogs).toBeDefined()
    expect(Array.isArray(data.deliveryLogs)).toBe(true)
  })
})

describe('POST /api/ai/extensions/webhooks', () => {
  it('should create a new webhook', async () => {
    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', {
      url: 'https://example.com/webhooks/new',
      events: ['pipeline.completed'],
      description: 'Test webhook',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.webhook).toBeDefined()
    expect(data.webhook.url).toBe('https://example.com/webhooks/new')
    expect(data.webhook.events).toContain('pipeline.completed')
    expect(data.webhook.isActive).toBe(true)
    expect(data.webhook.secret).toBeDefined()
    expect(data.message).toContain('Save the secret')
  })

  it('should return 400 for invalid URL', async () => {
    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', {
      url: 'not-a-url',
      events: ['pipeline.completed'],
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('not a valid URL')
  })

  it('should return 400 for empty events array', async () => {
    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', {
      url: 'https://example.com/hook',
      events: [],
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('non-empty array')
  })

  it('should return 400 for invalid events', async () => {
    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', {
      url: 'https://example.com/hook',
      events: ['invalid.event'],
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid event(s)')
  })

  it('should return 409 for duplicate URL+events', async () => {
    const url = 'https://example.com/dup-hook'
    const events = ['pipeline.completed']

    await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', { url, events }))

    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', { url, events }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('already exists')
  })

  it('should auto-generate secret if not provided', async () => {
    const res = await webhooksPost(makeJsonRequest('/api/ai/extensions/webhooks', {
      url: 'https://example.com/auto-secret',
      events: ['report.generated'],
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.webhook.secret).toMatch(/^whsec_/)
  })
})

describe('DELETE /api/ai/extensions/webhooks', () => {
  it('should delete an existing webhook', async () => {
    // Delete a seed webhook by known ID to avoid Date.now() collisions
    const res = await webhooksDelete(
      makeRequest('/api/ai/extensions/webhooks?id=whk-1', { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('deleted')
    expect(data.removed.url).toContain('slack')
  })

  it('should return 400 for missing id', async () => {
    const res = await webhooksDelete(
      makeRequest('/api/ai/extensions/webhooks', { method: 'DELETE' })
    )
    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent webhook', async () => {
    const res = await webhooksDelete(
      makeRequest('/api/ai/extensions/webhooks?id=nonexistent', { method: 'DELETE' })
    )
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI GOVERNANCE — COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/governance/compliance', () => {
  it('should return compliance report with categories and recommendations', async () => {
    const res = await complianceGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.categories).toBeDefined()
    expect(Array.isArray(data.categories)).toBe(true)
    expect(data.recommendations).toBeDefined()
    expect(Array.isArray(data.recommendations)).toBe(true)
  })

  it('should include overall score and evaluatedAt timestamp', async () => {
    const res = await complianceGet()
    const data = await res.json()
    expect(data.overallScore).toBeDefined()
    expect(typeof data.overallScore).toBe('number')
    expect(data.evaluatedAt).toBeDefined()
    expect(typeof data.evaluatedAt).toBe('string')
  })

  it('should include summary with category counts', async () => {
    const res = await complianceGet()
    const data = await res.json()
    expect(data.summary).toBeDefined()
    expect(data.summary.totalCategories).toBeGreaterThan(0)
    expect(data.summary.totalRecommendations).toBeDefined()
    expect(data.summary.highPriorityRecs).toBeDefined()
  })

  it('should have categories with checks containing scores', async () => {
    const res = await complianceGet()
    const data = await res.json()
    for (const category of data.categories) {
      expect(category).toHaveProperty('id')
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('score')
      expect(category).toHaveProperty('maxScore')
      expect(category).toHaveProperty('percentage')
      expect(category).toHaveProperty('status')
      expect(category).toHaveProperty('checks')
      expect(Array.isArray(category.checks)).toBe(true)
      for (const check of category.checks) {
        expect(check).toHaveProperty('id')
        expect(check).toHaveProperty('name')
        expect(check).toHaveProperty('status')
        expect(check).toHaveProperty('score')
        expect(check).toHaveProperty('maxScore')
        expect(check).toHaveProperty('details')
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI GOVERNANCE — USAGE TAGS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/governance/usage-tags', () => {
  it('should return tags with summary', async () => {
    const res = await usageTagsGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tags).toBeDefined()
    expect(Array.isArray(data.tags)).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.summary.totalTags).toBeGreaterThan(0)
    expect(data.summary.activeTags).toBeGreaterThan(0)
    expect(data.summary.categories).toBeDefined()
  })

  it('should include default seed tags', async () => {
    const res = await usageTagsGet()
    const data = await res.json()
    const names = data.tags.map((t: { name: string }) => t.name)
    expect(names).toContain('Research')
    expect(names).toContain('Production')
    expect(names).toContain('Testing')
    expect(names).toContain('Sensitive Data')
    expect(names).toContain('Analytics')
  })

  it('should have tags with correct category values', async () => {
    const res = await usageTagsGet()
    const data = await res.json()
    const validCategories = ['environment', 'purpose', 'sensitivity', 'custom']
    for (const tag of data.tags) {
      expect(validCategories).toContain(tag.category)
    }
  })
})

describe('POST /api/ai/governance/usage-tags', () => {
  it('should create a new tag', async () => {
    const res = await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      name: 'Custom Test Tag',
      description: 'A custom tag for testing',
      color: '#10b981',
      category: 'custom',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.tag).toBeDefined()
    expect(data.tag.name).toBe('Custom Test Tag')
    expect(data.tag.category).toBe('custom')
    expect(data.tag.color).toBe('#10b981')
    expect(data.tag.isActive).toBe(true)
  })

  it('should return 400 for missing name', async () => {
    const res = await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      description: 'No name tag',
    }))
    expect(res.status).toBe(400)
  })

  it('should return 409 for duplicate name', async () => {
    await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      name: 'Duplicate Tag',
    }))

    const res = await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      name: 'Duplicate Tag',
    }))
    expect(res.status).toBe(409)
  })

  it('should default to custom category for invalid category', async () => {
    const res = await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      name: 'Invalid Cat Tag',
      category: 'nonexistent',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.tag.category).toBe('custom')
  })

  it('should default color to gray for invalid hex', async () => {
    const res = await usageTagsPost(makeJsonRequest('/api/ai/governance/usage-tags', {
      name: 'Bad Color Tag',
      color: 'not-a-color',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.tag.color).toBe('#6b7280')
  })
})

describe('PATCH /api/ai/governance/usage-tags', () => {
  it('should return 400 for missing operation', async () => {
    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Operation is required')
  })

  it('should update tag properties with update operation', async () => {
    // Get the first tag id
    const getRes = await usageTagsGet()
    const getData = await getRes.json()
    const tagId = getData.tags[0].id

    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'update',
      tagId,
      name: 'Updated Tag Name',
      color: '#f97316',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('updated')
    expect(data.tag.name).toBe('Updated Tag Name')
    expect(data.tag.color).toBe('#f97316')
  })

  it('should return 404 for update with non-existent tag', async () => {
    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'update',
      tagId: 'nonexistent',
      name: 'Ghost Tag',
    }))
    expect(res.status).toBe(404)
  })

  it('should return 400 for invalid color in update', async () => {
    const getRes = await usageTagsGet()
    const getData = await getRes.json()
    const tagId = getData.tags[0].id

    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'update',
      tagId,
      color: 'red',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid hex color')
  })

  it('should return 400 for empty name in update', async () => {
    const getRes = await usageTagsGet()
    const getData = await getRes.json()
    const tagId = getData.tags[0].id

    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'update',
      tagId,
      name: '   ',
    }))
    expect(res.status).toBe(400)
  })

  it('should assign tag to audit logs', async () => {
    const getRes = await usageTagsGet()
    const getData = await getRes.json()
    const tagId = getData.tags[0].id

    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'assign',
      tagId,
      auditLogIds: ['log-1'],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('Assigned')
    expect(data.assigned).toBeGreaterThanOrEqual(1)
  })

  it('should return 400 for assign without tagId', async () => {
    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'assign',
      auditLogIds: ['log-1'],
    }))
    expect(res.status).toBe(400)
  })

  it('should unassign tag from audit logs', async () => {
    const getRes = await usageTagsGet()
    const getData = await getRes.json()
    const tagId = getData.tags[0].id

    // First assign
    await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'assign',
      tagId,
      auditLogIds: ['log-1'],
    }))

    // Then unassign
    const res = await usageTagsPatch(makePatchRequest('/api/ai/governance/usage-tags', {
      operation: 'unassign',
      tagId,
      auditLogIds: ['log-1'],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('Unassigned')
    expect(data.removed).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI MLOPS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/mlops', () => {
  it('should return configs by default', async () => {
    const res = await mlopsGet(makeRequest('/api/ai/mlops'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.configs).toBeDefined()
    expect(Array.isArray(data.configs)).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBeGreaterThan(0)
  })

  it('should return prompts when resource=prompts', async () => {
    const res = await mlopsGet(makeRequest('/api/ai/mlops?resource=prompts'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.prompts).toBeDefined()
    expect(Array.isArray(data.prompts)).toBe(true)
    expect(data.summary.contexts).toBeDefined()
  })

  it('should filter prompts by context', async () => {
    const res = await mlopsGet(makeRequest('/api/ai/mlops?resource=prompts&context=copilot'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const p of data.prompts) {
      expect(p.context).toBe('copilot')
    }
  })

  it('should return evaluations when resource=eval', async () => {
    const res = await mlopsGet(makeRequest('/api/ai/mlops?resource=eval'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.evaluations).toBeDefined()
    expect(data.summary.avgAccuracy).toBeDefined()
  })

  it('should return 400 for unknown resource', async () => {
    const res = await mlopsGet(makeRequest('/api/ai/mlops?resource=unknown'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Unknown resource')
  })
})

describe('POST /api/ai/mlops', () => {
  it('should create a new prompt version', async () => {
    const res = await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'prompts',
      name: 'Test Prompt',
      context: 'copilot',
      systemPrompt: 'You are a helpful test assistant.',
      description: 'Test prompt for validation',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.prompt).toBeDefined()
    expect(data.prompt.name).toBe('Test Prompt')
    expect(data.prompt.context).toBe('copilot')
    expect(data.prompt.isActive).toBe(true)
    expect(data.prompt.version).toBe('v1.0.0')
    expect(data.message).toContain('Created')
  })

  it('should deactivate previous active prompts for the same context', async () => {
    // Create first prompt
    await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'prompts',
      name: 'Deactivate Test',
      context: 'workflow',
      systemPrompt: 'First version',
    }))

    // Create second prompt for same context
    const res = await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'prompts',
      name: 'Deactivate Test',
      context: 'workflow',
      systemPrompt: 'Second version',
    }))

    const data = await res.json()
    expect(data.prompt.isActive).toBe(true)
    expect(data.prompt.version).toBe('v2.0.0')

    // Verify first prompt is deactivated
    const getRes = await mlopsGet(makeRequest('/api/ai/mlops?resource=prompts&context=workflow'))
    const getData = await getRes.json()
    const deactivateTests = getData.prompts.filter(
      (p: { name: string }) => p.name === 'Deactivate Test'
    )
    const activeOnes = deactivateTests.filter((p: { isActive: boolean }) => p.isActive)
    expect(activeOnes).toHaveLength(1)
  })

  it('should return 400 for missing required prompt fields', async () => {
    const res = await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'prompts',
      name: 'Incomplete Prompt',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('name, context, and systemPrompt are required')
  })

  it('should create an evaluation run', async () => {
    const res = await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'eval',
      configVersion: 'config-default-v1',
      promptVersion: 'prompt-copilot-v1',
      testCases: 50,
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.evaluation).toBeDefined()
    expect(data.evaluation.status).toBe('pending')
    expect(data.evaluation.testCases).toBe(50)
    expect(data.message).toContain('created')
  })

  it('should return 400 for unknown POST resource', async () => {
    const res = await mlopsPost(makeJsonRequest('/api/ai/mlops', {
      resource: 'configs',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Unknown resource')
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI TEMPLATES
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/templates', () => {
  it('should return templates with total and categories', async () => {
    const res = await templatesGet(makeRequest('/api/ai/templates'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.templates).toBeDefined()
    expect(Array.isArray(data.templates)).toBe(true)
    expect(data.total).toBeGreaterThan(0)
    expect(data.categories).toBeDefined()
    expect(data.categories.length).toBe(6)
  })

  it('should filter by category', async () => {
    const res = await templatesGet(makeRequest('/api/ai/templates?category=statistical'))
    expect(res.status).toBe(200)
    const data = await res.json()
    for (const t of data.templates) {
      expect(t.category).toBe('statistical')
    }
  })

  it('should filter by search query', async () => {
    const res = await templatesGet(makeRequest('/api/ai/templates?search=regression'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBeGreaterThan(0)
    for (const t of data.templates) {
      const match =
        t.name.toLowerCase().includes('regression') ||
        t.description.toLowerCase().includes('regression') ||
        t.tags.some((tag: string) => tag.toLowerCase().includes('regression'))
      expect(match).toBe(true)
    }
  })

  it('should sort featured templates first', async () => {
    const res = await templatesGet(makeRequest('/api/ai/templates'))
    const data = await res.json()
    let seenNonFeatured = false
    for (const t of data.templates) {
      if (seenNonFeatured && t.isFeatured) {
        // Found a featured template after a non-featured one
        expect.fail('Featured templates should come before non-featured')
      }
      if (!t.isFeatured) seenNonFeatured = true
    }
  })
})

describe('POST /api/ai/templates', () => {
  it('should create a new template', async () => {
    const res = await templatesPost(makeJsonRequest('/api/ai/templates', {
      name: 'Test Template',
      description: 'A test analysis template',
      category: 'statistical',
      author: 'Test Author',
      tags: ['test', 'template'],
      steps: [
        { name: 'Step 1', description: 'First step', type: 'data_prep' },
        { name: 'Step 2', description: 'Second step', type: 'analysis' },
      ],
      requiredVariables: ['data'],
      difficulty: 'beginner',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.template).toBeDefined()
    expect(data.template.name).toBe('Test Template')
    expect(data.template.category).toBe('statistical')
    expect(data.template.authorType).toBe('community')
    expect(data.template.isFeatured).toBe(false)
    expect(data.template.rating).toBe(0)
    expect(data.template.uses).toBe(0)
    expect(data.success).toBe(true)
  })

  it('should return 400 for missing name', async () => {
    const res = await templatesPost(makeJsonRequest('/api/ai/templates', {
      description: 'No name template',
      category: 'statistical',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('name is required')
  })

  it('should return 400 for missing description', async () => {
    const res = await templatesPost(makeJsonRequest('/api/ai/templates', {
      name: 'No Description',
      category: 'statistical',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('description is required')
  })

  it('should return 400 for invalid category', async () => {
    const res = await templatesPost(makeJsonRequest('/api/ai/templates', {
      name: 'Bad Category',
      description: 'Test',
      category: 'invalid_cat',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Valid category is required')
  })
})

// ═══════════════════════════════════════════════════════════════
//  AI SDK INFO
// ═══════════════════════════════════════════════════════════════

describe('GET /api/ai/sdk', () => {
  it('should return SDK documentation', async () => {
    const res = await sdkGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sdk).toBeDefined()
    expect(data.sdk.name).toBe('The One-Way SDK')
    expect(data.sdk.version).toBe('1.0.0')
    expect(data.sdk.baseUrl).toBe('/api')
    expect(data.sdk.auth).toBeDefined()
  })

  it('should include endpoints list', async () => {
    const res = await sdkGet()
    const data = await res.json()
    expect(data.endpoints).toBeDefined()
    expect(Array.isArray(data.endpoints)).toBe(true)
    expect(data.endpoints.length).toBeGreaterThan(0)
    for (const ep of data.endpoints) {
      expect(ep).toHaveProperty('method')
      expect(ep).toHaveProperty('path')
      expect(ep).toHaveProperty('description')
      expect(ep).toHaveProperty('auth')
    }
  })

  it('should include getting started guide', async () => {
    const res = await sdkGet()
    const data = await res.json()
    expect(data.gettingStarted).toBeDefined()
    expect(data.gettingStarted.install).toContain('npm install')
    expect(data.gettingStarted.example).toBeDefined()
  })

  it('should include hooks documentation', async () => {
    const res = await sdkGet()
    const data = await res.json()
    expect(data.hooks).toBeDefined()
    expect(Array.isArray(data.hooks)).toBe(true)
    for (const hook of data.hooks) {
      expect(hook).toHaveProperty('name')
      expect(hook).toHaveProperty('description')
      expect(hook).toHaveProperty('params')
    }
  })
})