/**
 * API Integration Tests — Arena & Portfolio Routes
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──

const { setupMockDb, getMockDb } = vi.hoisted(() => {
  const now = new Date('2024-06-15')

  const mockBattle = {
    id: 'battle-1', modelAId: 'm1', modelAName: 'GPT-4o', modelBId: 'm2', modelBName: 'Claude 3.5',
    category: 'reasoning', prompt: 'Explain X', responseA: 'A', responseB: 'B',
    votesA: 10, votesB: 5, votesTie: 3, totalVotes: 18,
    isRevealed: false, isActive: true, createdAt: now, updatedAt: now,
  }

  const _db = {
    arenaBattle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    arenaVote: { count: vi.fn(), findMany: vi.fn() },
    modelPortfolio: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    portfolioHolding: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    portfolioAlert: { findMany: vi.fn(), updateMany: vi.fn() },
  }

  function setupMockDb() {
    _db.arenaBattle.findMany.mockResolvedValue([mockBattle])
    _db.arenaBattle.count.mockResolvedValue(1)
    _db.arenaBattle.create.mockResolvedValue(mockBattle)
    _db.arenaBattle.findUnique.mockResolvedValue({ ...mockBattle, arenaVotes: [] })
    _db.arenaVote.count.mockResolvedValue(18)
    _db.arenaVote.findMany.mockResolvedValue([])

    _db.modelPortfolio.findMany.mockResolvedValue([])
    _db.modelPortfolio.findUnique.mockResolvedValue(null)
    _db.modelPortfolio.create.mockResolvedValue({ id: 'pf-1', name: 'Test', ownerId: 'a@b.com' })
    _db.modelPortfolio.update.mockResolvedValue({})
    _db.modelPortfolio.delete.mockResolvedValue({})

    _db.portfolioHolding.findMany.mockResolvedValue([])
    _db.portfolioHolding.findUnique.mockResolvedValue(null)
    _db.portfolioHolding.create.mockResolvedValue({ id: 'h-1' })
    _db.portfolioHolding.delete.mockResolvedValue({})

    _db.portfolioAlert.findMany.mockResolvedValue([])
    _db.portfolioAlert.updateMany.mockResolvedValue({ count: 0 })
  }

  function getMockDb() { return _db }
  return { setupMockDb, getMockDb }
})

vi.mock('@/lib/db', () => ({ get db() { return getMockDb() } }))

// ── Route imports ──

import { GET as arenaGet, POST as arenaPost } from '../arena/route'
import { GET as arenaIdGet } from '../arena/[id]/route'
import { GET as portfolioGet, POST as portfolioPost } from '../portfolio/route'
import { GET as portfolioIdGet, PATCH as portfolioIdPatch, DELETE as portfolioIdDelete } from '../portfolio/[id]/route'
import { GET as holdingsGet, POST as holdingsPost } from '../portfolio/[id]/holdings/route'
import { GET as alertsGet, PATCH as alertsPatch } from '../portfolio/[id]/alerts/route'

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

beforeEach(() => { vi.clearAllMocks(); setupMockDb() })

// ═══════════════════════════════════════════════════════════════
//  ARENA
// ═══════════════════════════════════════════════════════════════

describe('GET /api/arena', () => {
  it('should return battles, stats, and leaderboard', async () => {
    const res = await arenaGet(makeRequest('/api/arena'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.battles).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.leaderboard).toBeDefined()
    expect(data.stats.totalBattles).toBeDefined()
    expect(data.stats.totalVotes).toBeDefined()
  })

  it('should filter by category', async () => {
    await arenaGet(makeRequest('/api/arena?category=reasoning'))
    expect(getMockDb().arenaBattle.findMany).toHaveBeenCalled()
  })

  it('should return demo data when DB is empty', async () => {
    getMockDb().arenaBattle.findMany.mockRejectedValueOnce(new Error('DB fail'))
    const res = await arenaGet(makeRequest('/api/arena'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.battles.length).toBeGreaterThan(0)
  })
})

describe('POST /api/arena', () => {
  it('should create a new battle with valid input', async () => {
    const req = makeJsonRequest('/api/arena', {
      modelAId: 'm1', modelAName: 'GPT-4o',
      modelBId: 'm2', modelBName: 'Claude 3.5',
      category: 'coding', prompt: 'Write a sort function',
    })
    const res = await arenaPost(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.battle).toBeDefined()
    expect(getMockDb().arenaBattle.create).toHaveBeenCalled()
  })

  it('should return 400 for missing required fields', async () => {
    const res = await arenaPost(makeJsonRequest('/api/arena', {
      modelAId: 'm1',
    }))
    expect(res.status).toBe(400)
  })

  it('should default category to general', async () => {
    const req = makeJsonRequest('/api/arena', {
      modelAId: 'm1', modelAName: 'A', modelBId: 'm2', modelBName: 'B', prompt: 'P',
    })
    await arenaPost(req)
    expect(getMockDb().arenaBattle.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: 'general' }) })
    )
  })
})

describe('GET /api/arena/[id]', () => {
  it('should return a single battle with vote counts', async () => {
    const res = await arenaIdGet(makeRequest('/api/arena/battle-1'), { params: Promise.resolve({ id: 'battle-1' }) })
    expect(res.status).toBe(200)
  })

  it('should return 404 for non-existent battle in DB', async () => {
    getMockDb().arenaBattle.findUnique.mockResolvedValue(null)
    const res = await arenaIdGet(makeRequest('/api/arena/nope'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════
//  PORTFOLIO
// ═══════════════════════════════════════════════════════════════

describe('GET /api/portfolio', () => {
  it('should return portfolio list', async () => {
    const res = await portfolioGet(makeRequest('/api/portfolio'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('should return sample data when DB is empty', async () => {
    getMockDb().modelPortfolio.findMany.mockRejectedValueOnce(new Error('DB fail'))
    const res = await portfolioGet(makeRequest('/api/portfolio'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBeGreaterThan(0)
  })
})

describe('POST /api/portfolio', () => {
  it('should create a portfolio with valid input', async () => {
    const res = await portfolioPost(makeJsonRequest('/api/portfolio', {
      ownerId: 'a@b.com', name: 'My Portfolio',
    }))
    expect(res.status).toBe(201)
    expect(getMockDb().modelPortfolio.create).toHaveBeenCalled()
  })

  it('should return 400 for missing name or ownerId', async () => {
    expect((await portfolioPost(makeJsonRequest('/api/portfolio', { ownerId: 'a@b.com' }))).status).toBe(400)
    expect((await portfolioPost(makeJsonRequest('/api/portfolio', { name: 'N' }))).status).toBe(400)
  })
})

describe('GET /api/portfolio/[id]', () => {
  it('should return a single portfolio', async () => {
    getMockDb().modelPortfolio.findUnique.mockResolvedValueOnce({
      id: 'pf-1', name: 'P', ownerId: 'a@b.com', portfolioHoldings: [], alerts: [],
    })
    const res = await portfolioIdGet(makeRequest('/api/portfolio/pf-1'), { params: Promise.resolve({ id: 'pf-1' }) })
    expect(res.status).toBe(200)
  })

  it('should return 404 for non-existent portfolio', async () => {
    getMockDb().modelPortfolio.findUnique.mockResolvedValueOnce(null)
    expect((await portfolioIdGet(makeRequest('/api/portfolio/nope'), { params: Promise.resolve({ id: 'nope' }) })).status).toBe(404)
  })
})

describe('PATCH /api/portfolio/[id]', () => {
  it('should update portfolio fields', async () => {
    const res = await portfolioIdPatch(
      makeJsonRequest('/api/portfolio/pf-1', { name: 'Updated', isPublic: true }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(200)
    expect(getMockDb().modelPortfolio.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pf-1' } })
    )
  })
})

describe('DELETE /api/portfolio/[id]', () => {
  it('should delete a portfolio', async () => {
    const res = await portfolioIdDelete(
      makeRequest('/api/portfolio/pf-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(200)
    expect(getMockDb().modelPortfolio.delete).toHaveBeenCalledWith({ where: { id: 'pf-1' } })
  })
})

// ═══════════════════════════════════════════════════════════════
//  PORTFOLIO HOLDINGS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/portfolio/[id]/holdings', () => {
  it('should return holdings with available models', async () => {
    const res = await holdingsGet(makeRequest('/api/portfolio/pf-1/holdings'), { params: Promise.resolve({ id: 'pf-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.availableModels).toBeDefined()
    expect(data.availableModels.length).toBeGreaterThan(0)
  })

  it('should return sample data when DB is empty', async () => {
    getMockDb().portfolioHolding.findMany.mockRejectedValueOnce(new Error('DB fail'))
    const res = await holdingsGet(makeRequest('/api/portfolio/pf-1/holdings'), { params: Promise.resolve({ id: 'pf-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.length).toBeGreaterThan(0)
  })
})

describe('POST /api/portfolio/[id]/holdings', () => {
  it('should add a holding with valid input', async () => {
    const res = await holdingsPost(
      makeJsonRequest('/api/portfolio/pf-1/holdings', {
        modelId: 'gpt-4o', modelName: 'GPT-4o', provider: 'OpenAI', score: 88.7,
      }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(201)
    expect(getMockDb().portfolioHolding.create).toHaveBeenCalled()
  })

  it('should return 400 for missing modelId or modelName', async () => {
    const res = await holdingsPost(
      makeJsonRequest('/api/portfolio/pf-1/holdings', { modelId: 'gpt-4o' }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('should return 409 for duplicate holding', async () => {
    getMockDb().portfolioHolding.findUnique.mockResolvedValueOnce({ id: 'existing' })
    const res = await holdingsPost(
      makeJsonRequest('/api/portfolio/pf-1/holdings', {
        modelId: 'gpt-4o', modelName: 'GPT-4o', provider: 'OpenAI',
      }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(409)
  })
})

// ═══════════════════════════════════════════════════════════════
//  PORTFOLIO ALERTS
// ═══════════════════════════════════════════════════════════════

describe('GET /api/portfolio/[id]/alerts', () => {
  it('should return alerts', async () => {
    const res = await alertsGet(makeRequest('/api/portfolio/pf-1/alerts'), { params: Promise.resolve({ id: 'pf-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
  })

  it('should return sample data when DB is empty', async () => {
    getMockDb().portfolioAlert.findMany.mockRejectedValueOnce(new Error('DB fail'))
    const res = await alertsGet(makeRequest('/api/portfolio/pf-1/alerts'), { params: Promise.resolve({ id: 'pf-1' }) })
    expect(res.status).toBe(200)
    expect((await res.json()).data.length).toBeGreaterThan(0)
  })
})

describe('PATCH /api/portfolio/[id]/alerts', () => {
  it('should mark all alerts as read', async () => {
    const res = await alertsPatch(
      makeJsonRequest('/api/portfolio/pf-1/alerts', { markAll: true }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(200)
    expect(getMockDb().portfolioAlert.updateMany).toHaveBeenCalled()
  })

  it('should mark specific alerts as read', async () => {
    const res = await alertsPatch(
      makeJsonRequest('/api/portfolio/pf-1/alerts', { alertIds: ['a1', 'a2'] }),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(200)
    expect(getMockDb().portfolioAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['a1', 'a2'] } } })
    )
  })

  it('should return 400 when neither alertIds nor markAll provided', async () => {
    const res = await alertsPatch(
      makeJsonRequest('/api/portfolio/pf-1/alerts', {}),
      { params: Promise.resolve({ id: 'pf-1' }) },
    )
    expect(res.status).toBe(400)
  })
})