import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAnalysisCacheKey, getCachedResponse, setCachedResponse } from '../analysis-cache'

// ── Helpers ──────────────────────────────────────────────────

// Reset the cache between tests by re-importing the module
// (the cache is module-scoped, so we clear it directly)
let analysisCache: typeof import('../analysis-cache')

beforeEach(async () => {
  vi.resetModules()
  analysisCache = await import('../analysis-cache')
})

// ── Tests ──────────────────────────────────────────────────

describe('analysis-cache', () => {
  describe('getAnalysisCacheKey', () => {
    it('should generate a key from the last user message + context', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Analyze my dataset' },
      ]
      const key = analysisCache.getAnalysisCacheKey(messages, 'workspace')
      expect(key).toBe('ai:workspace:Analyze my dataset')
    })

    it('should use "general" as default context when none provided', () => {
      const messages = [{ role: 'user', content: 'Hello world' }]
      const key = analysisCache.getAnalysisCacheKey(messages)
      expect(key).toBe('ai:general:Hello world')
    })

    it('should find the last user message even when multiple messages exist', () => {
      const messages = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Follow-up question' },
      ]
      const key = analysisCache.getAnalysisCacheKey(messages, 'community')
      expect(key).toBe('ai:community:Follow-up question')
    })

    it('should handle empty messages array', () => {
      const key = analysisCache.getAnalysisCacheKey([], 'general')
      expect(key).toBe('ai:general:')
    })

    it('should handle no user messages (only assistant)', () => {
      const messages = [
        { role: 'system', content: 'System prompt' },
        { role: 'assistant', content: 'Response' },
      ]
      const key = analysisCache.getAnalysisCacheKey(messages, 'leaderboard')
      expect(key).toBe('ai:leaderboard:')
    })

    it('should truncate long user messages to 500 characters', () => {
      const longMsg = 'A'.repeat(600)
      const messages = [{ role: 'user', content: longMsg }]
      const key = analysisCache.getAnalysisCacheKey(messages, 'workspace')
      // Key should end with 500 A's (not 600)
      expect(key).toBe(`ai:workspace:${'A'.repeat(500)}`)
    })

    it('should produce different keys for different contexts', () => {
      const messages = [{ role: 'user', content: 'test' }]
      const key1 = analysisCache.getAnalysisCacheKey(messages, 'workspace')
      const key2 = analysisCache.getAnalysisCacheKey(messages, 'community')
      expect(key1).not.toBe(key2)
    })

    it('should produce different keys for different messages', () => {
      const key1 = analysisCache.getAnalysisCacheKey(
        [{ role: 'user', content: 'msg A' }],
        'general',
      )
      const key2 = analysisCache.getAnalysisCacheKey(
        [{ role: 'user', content: 'msg B' }],
        'general',
      )
      expect(key1).not.toBe(key2)
    })
  })

  describe('getCachedResponse / setCachedResponse', () => {
    it('should return null for a key that was never set', () => {
      expect(analysisCache.getCachedResponse('nonexistent-key')).toBeNull()
    })

    it('should store and retrieve a cached response', () => {
      analysisCache.setCachedResponse('ai:general:test', 'cached result')
      expect(analysisCache.getCachedResponse('ai:general:test')).toBe('cached result')
    })

    it('should overwrite a previously cached value', () => {
      analysisCache.setCachedResponse('ai:general:test', 'first')
      analysisCache.setCachedResponse('ai:general:test', 'second')
      expect(analysisCache.getCachedResponse('ai:general:test')).toBe('second')
    })

    it('should not return expired entries after TTL (5 minutes)', async () => {
      vi.useFakeTimers()
      analysisCache.setCachedResponse('ai:general:ttl-test', 'will expire')
      expect(analysisCache.getCachedResponse('ai:general:ttl-test')).toBe('will expire')

      // Advance past the 5-minute TTL
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
      expect(analysisCache.getCachedResponse('ai:general:ttl-test')).toBeNull()
      vi.useRealTimers()
    })

    it('should return valid entries before TTL expires', async () => {
      vi.useFakeTimers()
      analysisCache.setCachedResponse('ai:general:valid', 'still here')

      // Advance 4 minutes 50 seconds — still within TTL
      vi.advanceTimersByTime(4 * 60 * 1000 + 50 * 1000)
      expect(analysisCache.getCachedResponse('ai:general:valid')).toBe('still here')
      vi.useRealTimers()
    })

    it('should handle multiple independent cache keys', () => {
      analysisCache.setCachedResponse('ai:workspace:k1', 'result-1')
      analysisCache.setCachedResponse('ai:community:k2', 'result-2')
      analysisCache.setCachedResponse('ai:leaderboard:k3', 'result-3')

      expect(analysisCache.getCachedResponse('ai:workspace:k1')).toBe('result-1')
      expect(analysisCache.getCachedResponse('ai:community:k2')).toBe('result-2')
      expect(analysisCache.getCachedResponse('ai:leaderboard:k3')).toBe('result-3')
      expect(analysisCache.getCachedResponse('ai:general:k4')).toBeNull()
    })
  })
})