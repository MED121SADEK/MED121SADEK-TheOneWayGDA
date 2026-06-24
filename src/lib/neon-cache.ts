/**
 * Neon Query Cache
 *
 * In-memory TTL cache for hot database queries. Reduces DB round-trips
 * on Netlify serverless by caching frequently-accessed, rarely-changing data.
 *
 * Benefits for Neon:
 * - Fewer connections = lower Neon compute cost (scale-to-zero friendly)
 * - Fewer queries = faster cold starts after cache warm
 * - Reduced PgBouncer pressure during traffic spikes
 *
 * Usage:
 *   import { queryCache } from '@/lib/neon-cache'
 *   const posts = await queryCache.get('feed:featured', () =>
 *     db.communityPost.findMany({ where: { featured: true }, take: 10 }),
 *     { ttl: 60 }
 *   )
 */

type CacheEntry<T> = {
  data: T
  expiresAt: number
  hits: number
}

class NeonQueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxEntries: number

  // Default TTLs by category (seconds)
  private static readonly DEFAULT_TTLS: Record<string, number> = {
    // Static/reference data — cache for 5 minutes
    leaderboard: 300,
    models: 300,
    pricing: 300,
    topics: 300,
    templates: 300,

    // Semi-static — cache for 60 seconds
    feed: 60,
    featured: 60,
    stats: 60,
    notifications: 30,

    // Real-time — cache for 10 seconds
    activity: 10,
    metrics: 10,
  }

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries
  }

  /**
   * Get cached data or execute and cache the query.
   * Automatically determines TTL from the key prefix if not provided.
   */
  async get<T>(
    key: string,
    query: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key) as CacheEntry<T> | undefined

    if (cached && cached.expiresAt > now) {
      cached.hits++
      return cached.data
    }

    // Execute the query
    const data = await query()

    // Calculate TTL
    const ttl = options?.ttl ?? this.inferTtl(key)

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      let oldestKey = ''
      let oldestExpiry = Infinity
      for (const [k, v] of this.cache) {
        if (v.expiresAt < oldestExpiry) {
          oldestExpiry = v.expiresAt
          oldestKey = k
        }
      }
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, { data, expiresAt: now + ttl * 1000, hits: 0 })
    return data
  }

  /**
   * Invalidate entries by exact key or tag prefix.
   * Tags allow bulk invalidation (e.g., invalidate all 'feed:*' entries).
   */
  invalidate(pattern: string): number {
    let count = 0
    // Exact match
    if (this.cache.has(pattern)) {
      this.cache.delete(pattern)
      count++
    }
    // Prefix match (e.g., "feed:" invalidates "feed:featured", "feed:recent", etc.)
    if (pattern.endsWith(':')) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key)
          count++
        }
      }
    }
    return count
  }

  /** Clear entire cache */
  clear(): void {
    this.cache.clear()
  }

  /** Get cache stats for monitoring */
  stats(): { entries: number; maxEntries: number; topKeys: Array<{ key: string; hits: number }> } {
    const entries = [...this.cache.entries()]
      .map(([key, val]) => ({ key, hits: val.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)

    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      topKeys: entries,
    }
  }

  /** Infer TTL from key prefix using DEFAULT_TTLS */
  private inferTtl(key: string): number {
    const prefix = key.split(':')[0]
    return NeonQueryCache.DEFAULT_TTLS[prefix] ?? 30
  }
}

// Singleton — shared across all serverless function invocations in the same isolate
export const queryCache = new NeonQueryCache()