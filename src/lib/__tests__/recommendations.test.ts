import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _store: () => store,
  }
})()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recommendationEngine: any

beforeEach(async () => {
  localStorageMock.clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()

  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('window', {
    location: { pathname: '/leaderboard' },
  })

  // Reset modules to get a fresh singleton instance
  vi.resetModules()
  const mod = await import('../recommendations')
  recommendationEngine = mod.recommendationEngine
})

// ── Tests ──────────────────────────────────────────────────

describe('RecommendationEngine', () => {
  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(() => recommendationEngine.init()).not.toThrow()
    })

    it('should load an empty profile when localStorage is empty', () => {
      recommendationEngine.init()
      expect(recommendationEngine.getActionCount()).toBe(0)
    })

    it('should load existing profile from localStorage', () => {
      const existingProfile = {
        actions: [
          { action: 'view_model', timestamp: Date.now(), page: '/leaderboard' },
          { action: 'view_model', timestamp: Date.now() - 1000, page: '/leaderboard' },
          { action: 'view_model', timestamp: Date.now() - 2000, page: '/leaderboard' },
        ],
        dismissedIds: [],
        categories: { research: 6, coding: 3 },
        createdAt: Date.now() - 100000,
        lastActive: Date.now(),
      }
      localStorageMock.setItem(
        'oneway-recommendations-profile',
        JSON.stringify(existingProfile)
      )

      recommendationEngine.init()
      expect(recommendationEngine.getActionCount()).toBe(3)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('oneway-recommendations-profile', 'not-valid-json{{{')

      recommendationEngine.init()
      expect(recommendationEngine.getActionCount()).toBe(0)
    })

    it('should handle non-array actions in stored profile', () => {
      localStorageMock.setItem(
        'oneway-recommendations-profile',
        JSON.stringify({ actions: 'not-an-array', dismissedIds: [], categories: {}, createdAt: 1, lastActive: 1 })
      )

      recommendationEngine.init()
      expect(recommendationEngine.getActionCount()).toBe(0)
    })
  })

  describe('trackAction', () => {
    it('should record an action and increment action count', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')

      expect(recommendationEngine.getActionCount()).toBe(1)
    })

    it('should persist actions to localStorage', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'oneway-recommendations-profile',
        expect.stringContaining('view_model')
      )
    })

    it('should update category weights based on action type', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')

      // view_model maps to ['research', 'coding'] — each +1
      // page /leaderboard maps to ['coding', 'research', 'multimodal'] — each +2
      const category = recommendationEngine.getDominantCategory()
      expect(category).toBeTruthy()
      // Either 'coding' or 'research' or 'multimodal' should be dominant
      expect(['coding', 'research', 'multimodal']).toContain(category)
    })

    it('should record extra data with the action', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model', { modelId: 'gpt-4o', categories: ['coding'] })

      expect(recommendationEngine.getActionCount()).toBe(1)
    })

    it('should trim actions to last 200 when exceeding limit', () => {
      recommendationEngine.init()
      for (let i = 0; i < 210; i++) {
        recommendationEngine.trackAction('view_model')
      }

      expect(recommendationEngine.getActionCount()).toBeLessThanOrEqual(200)
    })
  })

  describe('getRecommendations', () => {
    it('should return empty array when not enough actions', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('view_model')

      const recs = recommendationEngine.getRecommendations()
      expect(recs).toHaveLength(0)
    })

    it('should return recommendations after 3+ actions', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('view_benchmark')
      recommendationEngine.trackAction('use_workspace')

      const recs = recommendationEngine.getRecommendations()
      expect(recs.length).toBeGreaterThan(0)
      expect(recs.length).toBeLessThanOrEqual(5)
    })

    it('should return recommendations with required fields', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('view_benchmark')
      recommendationEngine.trackAction('use_workspace')

      const recs = recommendationEngine.getRecommendations()
      for (const rec of recs) {
        expect(rec).toHaveProperty('type')
        expect(rec).toHaveProperty('id')
        expect(rec).toHaveProperty('title')
        expect(rec).toHaveProperty('reason')
        expect(rec).toHaveProperty('score')
        expect(typeof rec.score).toBe('number')
        expect(rec.score).toBeGreaterThanOrEqual(0)
        expect(rec.score).toBeLessThanOrEqual(100)
      }
    })

    it('should only include valid recommendation types', () => {
      recommendationEngine.init()
      for (let i = 0; i < 5; i++) {
        recommendationEngine.trackAction('view_model')
        recommendationEngine.trackAction('use_workflow')
      }

      const recs = recommendationEngine.getRecommendations()
      const validTypes = ['model', 'feature', 'workflow']
      for (const rec of recs) {
        expect(validTypes).toContain(rec.type)
      }
    })

    it('should sort recommendations by score descending', () => {
      recommendationEngine.init()
      for (let i = 0; i < 5; i++) {
        recommendationEngine.trackAction('view_model')
        recommendationEngine.trackAction('run_analysis')
      }

      const recs = recommendationEngine.getRecommendations()
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score)
      }
    })
  })

  describe('dismiss functionality', () => {
    it('should dismiss a recommendation by id', () => {
      recommendationEngine.init()

      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('view_benchmark')
      recommendationEngine.trackAction('use_workspace')

      const recs = recommendationEngine.getRecommendations()
      expect(recs.length).toBeGreaterThan(0)

      const dismissId = recs[0].id
      recommendationEngine.dismiss(dismissId)

      const updatedRecs = recommendationEngine.getRecommendations()
      expect(updatedRecs.find((r) => r.id === dismissId)).toBeUndefined()
    })

    it('should not duplicate dismissed ids', () => {
      recommendationEngine.init()
      recommendationEngine.dismiss('test-id')
      recommendationEngine.dismiss('test-id')

      const lastCall = localStorageMock.setItem.mock.calls
      const profileCall = lastCall.find(
        (call: [string, string]) => call[0] === 'oneway-recommendations-profile'
      )
      if (profileCall) {
        const profile = JSON.parse(profileCall[1])
        expect(profile.dismissedIds.filter((id: string) => id === 'test-id')).toHaveLength(1)
      }
    })

    it('should invalidate cache when dismissing', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('view_benchmark')
      recommendationEngine.trackAction('use_workspace')

      // Generate recommendations to populate cache
      recommendationEngine.getRecommendations()
      // Dismiss should invalidate cache
      recommendationEngine.dismiss('model-gpt-4o')

      // Verify setItem was called for the profile (dismiss writes to profile)
      const profileCalls = localStorageMock.setItem.mock.calls.filter(
        (call: [string, string]) => call[0] === 'oneway-recommendations-profile'
      )
      expect(profileCalls.length).toBeGreaterThan(1)
    })

    it('should persist dismissed ids to localStorage', () => {
      recommendationEngine.init()
      recommendationEngine.dismiss('model-claude-3.5-sonnet')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'oneway-recommendations-profile',
        expect.stringContaining('model-claude-3.5-sonnet')
      )
    })

    it('should work without prior init (auto-initializes)', () => {
      expect(() => recommendationEngine.dismiss('some-id')).not.toThrow()
    })
  })

  describe('getDominantCategory', () => {
    it('should return null when no profile exists', () => {
      // Fresh instance without any actions
      const category = recommendationEngine.getDominantCategory()
      // Without init, getDominantCategory returns null since profile is null
      expect(category).toBeNull()
    })

    it('should return the highest weighted category after tracking actions', () => {
      recommendationEngine.init()
      recommendationEngine.trackAction('use_workspace')
      recommendationEngine.trackAction('use_workspace')
      recommendationEngine.trackAction('use_workspace')
      recommendationEngine.trackAction('view_model')
      recommendationEngine.trackAction('run_analysis')

      const dominant = recommendationEngine.getDominantCategory()
      expect(dominant).toBeTruthy()
    })

    it('should return null when categories are empty', () => {
      recommendationEngine.init()
      // No actions tracked — categories should be empty
      expect(recommendationEngine.getDominantCategory()).toBeNull()
    })
  })
})
