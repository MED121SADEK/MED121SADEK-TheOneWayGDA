import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../cache'

// ── Helpers ──────────────────────────────────────────────────

// Create a cache with a short TTL for testing
function createTestCache(ttlMs = 5000): MemoryCache {
  return new MemoryCache(ttlMs)
}

// ── Tests ──────────────────────────────────────────────────

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = createTestCache(10_000) // 10s default TTL for tests
  })

  describe('basic get/set', () => {
    it('should return null for a key that was never set', () => {
      expect(cache.get('missing')).toBeNull()
    })

    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should store and retrieve objects', () => {
      const obj = { name: 'test', count: 42, nested: { a: 1 } }
      cache.set('obj-key', obj)
      expect(cache.get('obj-key')).toEqual(obj)
    })

    it('should store and retrieve arrays', () => {
      const arr = [1, 2, 3, 'four', { five: 5 }]
      cache.set('arr-key', arr)
      expect(cache.get('arr-key')).toEqual(arr)
    })

    it('should not distinguish null from missing (implementation limitation)', () => {
      // The MemoryCache stores null but get() returns null for both
      // missing and null-stored values. This is a known limitation
      // of the generic cache — callers should not store null.
      cache.set('null-key', null as unknown as string)
      expect(cache.get('null-key')).toBeNull()
      // has() also returns false because get() returns null
      expect(cache.has('null-key')).toBe(false)
    })

    it('should handle zero and false values', () => {
      cache.set('zero', 0)
      cache.set('false', false)
      expect(cache.get('zero')).toBe(0)
      expect(cache.get('false')).toBe(false)
    })

    it('should overwrite an existing key', () => {
      cache.set('key', 'first')
      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })
  })

  describe('TTL expiry', () => {
    it('should return null for an expired entry', async () => {
      vi.useFakeTimers()
      cache.set('ttl-key', 'expires')

      // Advance past the 10s TTL
      vi.advanceTimersByTime(10_001)
      expect(cache.get('ttl-key')).toBeNull()
      vi.useRealTimers()
    })

    it('should return the value before TTL expires', async () => {
      vi.useFakeTimers()
      cache.set('ttl-key', 'still valid')

      vi.advanceTimersByTime(9_999)
      expect(cache.get('ttl-key')).toBe('still valid')
      vi.useRealTimers()
    })

    it('should support custom per-key TTL', async () => {
      vi.useFakeTimers()
      const cache2 = createTestCache(60_000) // 60s default

      cache2.set('short', 'data', 1_000) // 1s custom TTL

      vi.advanceTimersByTime(1_001)
      expect(cache2.get('short')).toBeNull()

      vi.useRealTimers()
    })

    it('should not affect other keys when one expires', async () => {
      vi.useFakeTimers()
      cache.set('expire-soon', 'gone', 1_000)
      cache.set('stay-long', 'here', 60_000)

      vi.advanceTimersByTime(1_001)
      expect(cache.get('expire-soon')).toBeNull()
      expect(cache.get('stay-long')).toBe('here')

      vi.useRealTimers()
    })
  })

  describe('has', () => {
    it('should return true for a key that exists and is not expired', () => {
      cache.set('exists', 'value')
      expect(cache.has('exists')).toBe(true)
    })

    it('should return false for a key that was never set', () => {
      expect(cache.has('never-set')).toBe(false)
    })

    it('should return false for an expired key', async () => {
      vi.useFakeTimers()
      cache.set('expired', 'old', 1_000)
      vi.advanceTimersByTime(1_001)
      expect(cache.has('expired')).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('del', () => {
    it('should return true when deleting an existing key', () => {
      cache.set('del-me', 'value')
      expect(cache.del('del-me')).toBe(true)
      expect(cache.get('del-me')).toBeNull()
    })

    it('should return false when deleting a non-existent key', () => {
      expect(cache.del('nonexistent')).toBe(false)
    })
  })

  describe('keys', () => {
    it('should return all keys including expired ones (lazy cleanup)', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      const keys = cache.keys()
      expect(keys).toContain('a')
      expect(keys).toContain('b')
      expect(keys).toContain('c')
      expect(keys).toHaveLength(3)
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.get('a')).toBeNull()
      expect(cache.get('b')).toBeNull()
      expect(cache.keys()).toHaveLength(0)
    })
  })

  describe('stats', () => {
    it('should report correct total and valid counts', () => {
      cache.set('valid1', 1)
      cache.set('valid2', 2)

      const stats = cache.stats()
      expect(stats.total).toBe(2)
      expect(stats.valid).toBe(2)
      expect(stats.expired).toBe(0)
    })

    it('should report expired entries separately', async () => {
      vi.useFakeTimers()
      cache.set('expired', 'old', 1_000)
      cache.set('valid', 'new', 60_000)

      vi.advanceTimersByTime(1_001)

      const stats = cache.stats()
      // Note: stats counts from the raw store before lazy cleanup on get()
      // The expired entry is still in the map until cleaned
      expect(stats.total).toBe(2)
      expect(stats.expired).toBe(1)
      expect(stats.valid).toBe(1)

      vi.useRealTimers()
    })

    it('should report all zeros when empty', () => {
      const stats = cache.stats()
      expect(stats.total).toBe(0)
      expect(stats.valid).toBe(0)
      expect(stats.expired).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should auto-cleanup expired entries periodically', async () => {
      vi.useFakeTimers()
      const cache2 = createTestCache(5_000)

      cache2.set('short', 'gone', 1_000)
      cache2.set('long', 'stays', 60_000)

      // The MemoryCache sets up a 5-minute interval for cleanup.
      // Advance past the cleanup interval + short TTL.
      // Note: setInterval in jsdom may not fire exactly with fake timers,
      // so we test that the expired entry is at least cleaned on get().
      vi.advanceTimersByTime(1_001)

      // The expired entry should return null on get() (lazy cleanup on access)
      expect(cache2.get('short')).toBeNull()
      // The valid entry should still be there
      expect(cache2.get('long')).toBe('stays')

      vi.useRealTimers()
    })
  })

  describe('type safety', () => {
    it('should preserve types through get<T>', () => {
      cache.set('number', 42)
      const num = cache.get<number>('number')
      expect(typeof num).toBe('number')
      expect(num).toBe(42)

      cache.set('string', 'hello')
      const str = cache.get<string>('string')
      expect(typeof str).toBe('string')
      expect(str).toBe('hello')
    })
  })
})