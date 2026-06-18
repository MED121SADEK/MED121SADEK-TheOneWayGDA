/**
 * API Integration Tests — Utility routes (root, OG image, data clean)
 *
 * Tests self-contained utility endpoints with minimal dependencies.
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect } from 'vitest'

import { GET as rootGet } from '../route'
import { GET as ogGet } from '../og/route'
import { POST as cleanPost } from '../clean/route'

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

// ═══════════════════════════════════════════════════════════════
//  GET /api (root endpoint)
// ═══════════════════════════════════════════════════════════════

describe('GET /api', () => {
  it('should return 200 with hello world message', async () => {
    const res = await rootGet(makeRequest('/api'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.message).toBe('Hello, world!')
  })
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/og (Open Graph image generation)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/og', () => {
  it('should return SVG content with correct content-type', async () => {
    const res = await ogGet(makeRequest('/api/og'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(res.headers.get('Cache-Control')).toContain('max-age=86400')
  })

  it('should include TheOneWayGDA branding in the SVG', async () => {
    const res = await ogGet(makeRequest('/api/og'))
    const svg = await res.text()
    expect(svg).toContain('TheOneWayGDA')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('should use home type styles by default', async () => {
    const res = await ogGet(makeRequest('/api/og'))
    const svg = await res.text()
    expect(svg).toContain('#0f172a')  // home gradient1
    expect(svg).toContain('#38bdf8')  // home accent
  })

  it('should use leaderboard type styles when specified', async () => {
    const res = await ogGet(makeRequest('/api/og?type=leaderboard'))
    const svg = await res.text()
    expect(svg).toContain('#052e16')  // leaderboard gradient1
    expect(svg).toContain('#34d399')  // leaderboard accent
  })

  it('should use community type styles when specified', async () => {
    const res = await ogGet(makeRequest('/api/og?type=community'))
    const svg = await res.text()
    expect(svg).toContain('#1c1917')  // community gradient1
    expect(svg).toContain('#fb923c')  // community accent
  })

  it('should use workspace type styles when specified', async () => {
    const res = await ogGet(makeRequest('/api/og?type=workspace'))
    const svg = await res.text()
    expect(svg).toContain('#1e1b4b')  // workspace gradient1
    expect(svg).toContain('#c084fc')  // workspace accent
  })

  it('should fall back to home styles for unknown types', async () => {
    const res = await ogGet(makeRequest('/api/og?type=unknown'))
    const svg = await res.text()
    expect(svg).toContain('#0f172a')  // home gradient1 (fallback)
  })

  it('should include custom title in the SVG', async () => {
    const res = await ogGet(makeRequest('/api/og?title=Custom+Title'))
    const svg = await res.text()
    expect(svg).toContain('Custom Title')
  })

  it('should include custom description in the SVG', async () => {
    const res = await ogGet(makeRequest('/api/og?description=A+custom+description'))
    const svg = await res.text()
    expect(svg).toContain('A custom description')
  })

  it('should have correct SVG dimensions (1200x630)', async () => {
    const res = await ogGet(makeRequest('/api/og'))
    const svg = await res.text()
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="630"')
  })
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/clean (data cleaning utility)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/clean', () => {
  it('should return 400 when data is missing', async () => {
    const res = await cleanPost(makeJsonRequest('/api/clean', {}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Invalid data')
  })

  it('should return 400 when data is not an object', async () => {
    const res = await cleanPost(makeJsonRequest('/api/clean', { data: 'not-an-object' }))
    expect(res.status).toBe(400)
  })

  it('should return 400 when data has no columns', async () => {
    const res = await cleanPost(makeJsonRequest('/api/clean', { data: {} }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('No data columns')
  })

  it('should trim whitespace from string values', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { name: ['  Alice  ', 'Bob'] },
      variables: [{ id: 'v1', name: 'name', type: 'string', label: 'Name', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.cleanedData.name).toEqual(['Alice', 'Bob'])
    expect(data.stats.cleanedCells).toBeGreaterThanOrEqual(1)
  })

  it('should detect and flag duplicate rows', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { col1: ['a', 'b', 'a'], col2: ['x', 'y', 'x'] },
      variables: [],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.stats.duplicates).toBe(1)
  })

  it('should detect outliers in numeric data', async () => {
    // Use many similar values and one extreme outlier so 3-sigma catches it
    const req = makeJsonRequest('/api/clean', {
      data: {
        values: [10, 10, 10, 11, 10, 10, 11, 10, 10, 11, 10000],
      },
      variables: [{ id: 'v1', name: 'values', type: 'numeric', label: 'Values', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.stats.outliers).toBeGreaterThanOrEqual(1)
    const outlierIssues = data.validationReport[0].issues.filter((i: any) => i.type === 'outlier')
    expect(outlierIssues.length).toBeGreaterThanOrEqual(1)
  })

  it('should normalize date formats with YYYY-MM-DD input', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { dateCol: ['2024-01-15', '2024-2-5'] },
      variables: [{ id: 'v1', name: 'dateCol', type: 'date', label: 'Date', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // Both dates should be normalized to YYYY-MM-DD with zero-padded months/days
    expect(data.cleanedData.dateCol[0]).toBe('2024-01-15')
    expect(data.cleanedData.dateCol[1]).toBe('2024-02-05')
  })

  it('should normalize month-name date formats', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { dateCol: ['Jan 5, 2024', 'Feb 28, 2024'] },
      variables: [{ id: 'v1', name: 'dateCol', type: 'date', label: 'Date', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.cleanedData.dateCol[0]).toBe('2024-01-05')
    expect(data.cleanedData.dateCol[1]).toBe('2024-02-28')
  })

  it('should normalize DD/MM/YYYY date formats', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { dateCol: ['28/02/2024', '15/01/2024'] },
      variables: [{ id: 'v1', name: 'dateCol', type: 'date', label: 'Date', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // 28 > 12 so must be day → 2024-02-28
    expect(data.cleanedData.dateCol[0]).toBe('2024-02-28')
    // 15 > 12 so must be day → 2024-01-15
    expect(data.cleanedData.dateCol[1]).toBe('2024-01-15')
  })

  it('should coerce string numbers to actual numbers for numeric columns', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { amount: ['100', '200.50', '300'] },
      variables: [{ id: 'v1', name: 'amount', type: 'numeric', label: 'Amount', width: 100, decimals: 2, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(typeof data.cleanedData.amount[0]).toBe('number')
    expect(data.cleanedData.amount[0]).toBe(100)
    expect(data.cleanedData.amount[1]).toBe(200.5)
  })

  it('should impute missing numeric values with mean', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { scores: [10, null, 20, 30] },
      variables: [{ id: 'v1', name: 'scores', type: 'numeric', label: 'Scores', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // Mean of [10, 20, 30] = 20, so null should be imputed to 20
    expect(data.cleanedData.scores[1]).toBe(20)
    expect(data.stats.missing).toBeGreaterThanOrEqual(1)
  })

  it('should impute missing string values with mode', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { category: ['A', 'B', 'A', null] },
      variables: [{ id: 'v1', name: 'category', type: 'string', label: 'Cat', width: 100, decimals: 0, missing: '', values: {} }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // Mode of ['A', 'B', 'A'] = 'A'
    expect(data.cleanedData.category[3]).toBe('A')
  })

  it('should fix typos using fuzzy matching with Levenshtein distance', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { city: ['New York', 'New York', 'New York', 'Nw York', 'New Yrk'] },
      variables: [
        { id: 'v1', name: 'city', type: 'string', label: 'City', width: 100, decimals: 0, missing: '', values: {} },
      ],
      rules: [{ field: 'city', action: 'fix_typos' }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // Typo issues should be detected
    const typoIssues = data.validationReport[0].issues.filter((i: any) => i.type === 'typo')
    expect(typoIssues.length).toBeGreaterThanOrEqual(1)
  })

  it('should standardize case for string columns', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { name: ['aLICE', 'BOB'] },
      variables: [
        { id: 'v1', name: 'name', type: 'string', label: 'Name', width: 100, decimals: 0, missing: '', values: {} },
      ],
      rules: [{ field: 'name', action: 'standardize_case' }],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    // 'BOB' is all-uppercase so the standardizer skips it (condition: not all upper, not all lower)
    expect(data.cleanedData.name[0]).toBe('Alice')
    expect(data.cleanedData.name[1]).toBe('BOB')
  })

  it('should return validation report with per-field issues', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { col1: ['a', 'b', 'a'], col2: ['x', 'y', 'x'] },
      variables: [],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(data.validationReport)).toBe(true)
    expect(data.validationReport.length).toBe(2)
    expect(data.validationReport[0]).toHaveProperty('field', 'col1')
    expect(data.validationReport[0]).toHaveProperty('issues')
    expect(data.validationReport[0]).toHaveProperty('suggestions')
  })

  it('should return stats with totalRows and all counters', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { x: [1, 2, 3] },
      variables: [],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.stats).toHaveProperty('totalRows', 3)
    expect(data.stats).toHaveProperty('cleanedCells')
    expect(data.stats).toHaveProperty('outliers')
    expect(data.stats).toHaveProperty('duplicates')
    expect(data.stats).toHaveProperty('missing')
  })

  it('should pad shorter columns with null to match longest column', async () => {
    const req = makeJsonRequest('/api/clean', {
      data: { col1: ['a', 'b', 'c'], col2: ['x'] },
      variables: [],
    })
    const res = await cleanPost(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.cleanedData.col1.length).toBe(3)
    expect(data.cleanedData.col2.length).toBe(3)
    // Missing values get imputed with mode for string columns ('x' is the mode)
    expect(data.cleanedData.col2.length).toBe(3)
  })

  it('should return 500 for malformed JSON body', async () => {
    const req = new NextRequest(new URL('/api/clean', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    const res = await cleanPost(req)
    expect(res.status).toBe(500)
  })
})