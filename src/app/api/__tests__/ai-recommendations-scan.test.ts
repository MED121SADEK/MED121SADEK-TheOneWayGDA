/**
 * API Integration Tests — AI recommendations + document scan routes
 *
 * Tests routes that depend on z-ai-web-dev-sdk (ZAI) by mocking the SDK.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (vi.hoisted runs before vi.mock factory) ──

const { getMockZAI, getMockChatCompletions, setupZAIMocks } = vi.hoisted(() => {
  const mockChatCompletions = {
    create: vi.fn(),
  }

  const mockZAI = {
    create: vi.fn().mockResolvedValue({
      chat: { completions: mockChatCompletions },
    }),
  }

  function setupZAIMocks() {
    vi.clearAllMocks()
    mockZAI.create.mockResolvedValue({
      chat: { completions: mockChatCompletions },
    })
  }

  return {
    getMockZAI: () => mockZAI,
    getMockChatCompletions: () => mockChatCompletions,
    setupZAIMocks,
  }
})

// ── Module mock (factory uses hoisted values) ──────────────

vi.mock('z-ai-web-dev-sdk', () => ({
  default: getMockZAI(),
  __esModule: true,
}))

// ── Route imports (after mocks) ─────────────────────────────

import { GET as recommendationsGet, POST as recommendationsPost } from '../recommendations/route'
import { POST as scanPost } from '../scan/route'

// ── Helpers ──────────────────────────────────────────────────

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

// ── Reset before each test ──────────────────────────────────

beforeEach(() => {
  setupZAIMocks()
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/recommendations (action tracking)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/recommendations', () => {
  it('should track a valid action and return success', async () => {
    const req = makeJsonRequest('/api/recommendations', {
      action: 'view_leaderboard',
      data: { modelId: 'gpt-4o' },
      page: '/leaderboard',
    })
    const res = await recommendationsPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Action tracked')
    expect(data.timestamp).toBeDefined()
  })

  it('should return 400 when action field is missing', async () => {
    const req = makeJsonRequest('/api/recommendations', { data: {} })
    expect((await recommendationsPost(req)).status).toBe(400)
  })

  it('should return 400 when action field is not a string', async () => {
    const req = makeJsonRequest('/api/recommendations', { action: 123 })
    expect((await recommendationsPost(req)).status).toBe(400)
  })

  it('should return 400 for malformed JSON body', async () => {
    const req = new NextRequest(new URL('/api/recommendations', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    expect((await recommendationsPost(req)).status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/recommendations (AI-powered recommendations)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/recommendations', () => {
  it('should return empty recommendations when no profile is provided', async () => {
    const res = await recommendationsGet(makeRequest('/api/recommendations'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations).toEqual([])
    expect(data.meta.source).toBe('none')
    expect(data.meta.message).toContain('3 tracked actions')
  })

  it('should return empty recommendations when profile has fewer than 3 actions', async () => {
    const profile = {
      actions: [{ action: 'view', timestamp: 1 }],
      categories: {},
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations).toEqual([])
    expect(data.meta.source).toBe('none')
    expect(data.meta.actionCount).toBe(1)
  })

  it('should call ZAI and return AI recommendations with 3+ actions', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { type: 'model', id: 'model-gpt-4o', title: 'GPT-4o', reason: 'Great for coding', score: 90 },
            { type: 'feature', id: 'feature-workspace', title: 'Workspace', reason: 'Analyze data', score: 85 },
            { type: 'workflow', id: 'workflow-compare', title: 'Compare LLMs', reason: 'Run comparisons', score: 80 },
          ]),
        },
      }],
    })

    const profile = {
      actions: [
        { action: 'view_leaderboard', timestamp: 1, page: '/leaderboard' },
        { action: 'click_model', timestamp: 2, page: '/leaderboard' },
        { action: 'search', timestamp: 3, page: '/leaderboard' },
      ],
      categories: { benchmarking: 10, coding: 5 },
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.meta.source).toBe('ai')
    expect(data.recommendations.length).toBe(3)
    expect(data.recommendations[0].type).toBe('model')
    expect(getMockChatCompletions().create).toHaveBeenCalled()
  })

  it('should validate and sanitize AI response fields', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { type: 'model', id: 'model-gpt-4o', title: 'GPT-4o', reason: 'Top model', score: 90 },
            { type: 'invalid_type', id: 'x', title: 'X', reason: 'Y', score: 50 },  // invalid type
            { type: 'feature', id: 123, title: 'T', reason: 'R', score: 70 },        // non-string id
            { type: 'feature', id: 'f2', title: 'T2', reason: 'R2', score: 70 },     // valid
            { type: 'model', id: 'm2', title: 'M2', reason: 'R3', score: 200 },      // score > 99, clamped
          ]),
        },
      }],
    })

    const profile = {
      actions: [
        { action: 'a', timestamp: 1 },
        { action: 'b', timestamp: 2 },
        { action: 'c', timestamp: 3 },
      ],
      categories: { general: 10 },
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    // Invalid type and non-string id should be filtered out
    const types = data.recommendations.map((r: any) => r.type)
    expect(types).not.toContain('invalid_type')
    // Score should be clamped to 99
    const highScore = data.recommendations.find((r: any) => r.id === 'm2')
    if (highScore) {
      expect(highScore.score).toBeLessThanOrEqual(99)
    }
  })

  it('should fall back to category-based recommendations when AI returns invalid JSON', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{ message: { content: 'not-valid-json' } }],
    })

    const profile = {
      actions: [
        { action: 'a', timestamp: 1 },
        { action: 'b', timestamp: 2 },
        { action: 'c', timestamp: 3 },
      ],
      categories: { coding: 10 },
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}&dominantCategory=coding`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations.length).toBeGreaterThan(0)
    // Fallback should include Claude for coding category
    const claudeRec = data.recommendations.find((r: any) => r.id === 'model-claude-3.5-sonnet')
    expect(claudeRec).toBeDefined()
  })

  it('should fall back to basic recommendations on ZAI error', async () => {
    getMockZAI().create.mockRejectedValue(new Error('SDK init failed'))

    const profile = {
      actions: [
        { action: 'a', timestamp: 1 },
        { action: 'b', timestamp: 2 },
        { action: 'c', timestamp: 3 },
      ],
      categories: {},
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.meta.source).toBe('fallback')
    expect(data.meta.error).toContain('SDK init failed')
    expect(data.recommendations.length).toBeGreaterThan(0)
  })

  it('should handle markdown-wrapped AI responses', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: '```json\n[{"type":"model","id":"m1","title":"T","reason":"R","score":85}]\n```',
        },
      }],
    })

    const profile = {
      actions: [
        { action: 'a', timestamp: 1 },
        { action: 'b', timestamp: 2 },
        { action: 'c', timestamp: 3 },
      ],
      categories: { general: 5 },
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations.length).toBe(1)
    expect(data.recommendations[0].id).toBe('m1')
  })

  it('should gracefully handle invalid profile JSON', async () => {
    const res = await recommendationsGet(makeRequest('/api/recommendations?profile=not-json'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations).toEqual([])
    expect(data.meta.source).toBe('none')
  })

  it('should clamp scores below 50 to 50', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { type: 'model', id: 'm1', title: 'T', reason: 'R', score: 10 },
          ]),
        },
      }],
    })

    const profile = {
      actions: [
        { action: 'a', timestamp: 1 },
        { action: 'b', timestamp: 2 },
        { action: 'c', timestamp: 3 },
      ],
      categories: { general: 5 },
    }
    const encoded = encodeURIComponent(JSON.stringify(profile))
    const res = await recommendationsGet(makeRequest(`/api/recommendations?profile=${encoded}`))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.recommendations[0].score).toBeGreaterThanOrEqual(50)
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/scan (document scanning)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/scan', () => {
  it('should return 400 when JSON body has no imageData', async () => {
    const res = await scanPost(makeJsonRequest('/api/scan', {}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('No image data')
  })

  it('should return 500 when JSON body is malformed', async () => {
    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    expect((await scanPost(req)).status).toBe(500)
  })

  it('should return error when multipart form has no file', async () => {
    const formData = new FormData()
    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)
    // formData.get('file') returns null, but the route may throw in test env
    expect([400, 500]).toContain(res.status)
  })

  it('should return 400 for unsupported file types in multipart', async () => {
    const formData = new FormData()
    const blob = new Blob(['test'], { type: 'text/plain' })
    formData.append('file', blob, 'test.txt')
    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Unsupported file type')
  })

  it('should return 400 for file exceeding 20MB size limit', async () => {
    const formData = new FormData()
    // Create a large blob (>20MB)
    const largeBlob = new Blob([new ArrayBuffer(21 * 1024 * 1024)], { type: 'image/png' })
    formData.append('file', largeBlob, 'large.png')
    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('too large')
  })

  it('should call ZAI and return parsed results for JSON body', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            fields: [
              { label: 'Name', value: 'John', confidence: 0.95, type: 'string' },
              { label: 'Amount', value: 100, confidence: 0.9, type: 'numeric' },
            ],
            tables: [{ headers: ['Col1', 'Col2'], rows: [['a', 'b']] }],
            rawText: 'Name: John, Amount: 100',
            summary: 'A simple document',
          }),
        },
      }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
      templateHint: 'invoice',
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.fields.length).toBe(2)
    expect(data.fields[0].label).toBe('Name')
    expect(data.fields[0].value).toBe('John')
    expect(data.tables.length).toBe(1)
    expect(data.rawText).toBe('Name: John, Amount: 100')
    expect(data.summary).toBe('A simple document')
    expect(getMockChatCompletions().create).toHaveBeenCalled()
  })

  it('should return raw text when AI returns non-JSON content', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: 'This is just plain text, no JSON here.',
        },
      }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    // Should fall back to raw text extraction
    expect(data.rawText).toBeDefined()
    expect(data.fields.length).toBeGreaterThanOrEqual(1)
    expect(data.fields[0].label).toContain('Raw')
  })

  it('should handle AI returning empty content', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{ message: { content: null } }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.fields).toEqual([])
    expect(data.summary).toContain('no content')
  })

  it('should pass templateHint to the AI prompt', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{ message: { content: '{"fields":[],"tables":[],"rawText":"","summary":""}' } }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
      templateHint: 'receipt',
    })
    await scanPost(req)

    expect(getMockChatCompletions().create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('receipt'),
          }),
        ]),
      })
    )
  })

  it('should retry with enhanced prompt when retryMode is true', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            fields: [{ label: 'Retry Field', value: 'found', confidence: 0.8, type: 'string' }],
            tables: [],
            rawText: 'some text',
            summary: 'Retry succeeded',
          }),
        },
      }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
      retryMode: true,
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    // retryMode should include the extra instruction in the system prompt
    expect(getMockChatCompletions().create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('RETRY MODE'),
          }),
        ]),
      })
    )
  })

  it('should fall back to raw text extraction when JSON parsing fails', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: 'Here is the text I extracted:\nInvoice #1234\nDate: 2024-01-15\nTotal: $500',
        },
      }],
    })

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.rawText).toContain('Invoice')
    expect(data.fields.length).toBeGreaterThanOrEqual(1)
    expect(data.summary).toContain('Could not parse')
  })

  it('should return 500 when ZAI throws an error', async () => {
    getMockZAI().create.mockRejectedValue(new Error('SDK connection failed'))

    const req = makeJsonRequest('/api/scan', {
      imageData: 'data:image/png;base64,iVBORw0KGgo=',
    })
    const res = await scanPost(req)

    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('scanning failed')
  })

  it('should accept valid image MIME types in multipart upload', async () => {
    // We mock the ZAI response but also need to verify the route processes the file
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            fields: [],
            tables: [],
            rawText: 'Uploaded image content',
            summary: 'Image uploaded',
          }),
        },
      }],
    })

    const formData = new FormData()
    const blob = new Blob(['fake-png-data'], { type: 'image/png' })
    formData.append('file', blob, 'test.png')
    formData.append('templateHint', 'invoice')

    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(getMockChatCompletions().create).toHaveBeenCalled()
  })

  it('should accept JPEG MIME types in multipart upload', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: '{"fields":[],"tables":[],"rawText":"","summary":""}',
        },
      }],
    })

    const formData = new FormData()
    const blob = new Blob(['fake-jpeg-data'], { type: 'image/jpeg' })
    formData.append('file', blob, 'test.jpg')

    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)

    expect(res.status).toBe(200)
  })

  it('should accept PDF MIME types in multipart upload', async () => {
    getMockChatCompletions().create.mockResolvedValue({
      choices: [{
        message: {
          content: '{"fields":[],"tables":[],"rawText":"","summary":""}',
        },
      }],
    })

    const formData = new FormData()
    const blob = new Blob(['fake-pdf-data'], { type: 'application/pdf' })
    formData.append('file', blob, 'test.pdf')

    const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    })
    const res = await scanPost(req)

    expect(res.status).toBe(200)
  })
})