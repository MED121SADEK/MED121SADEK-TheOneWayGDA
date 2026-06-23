// In-memory cache with TTL.
// NOTE: In serverless (Netlify), each function invocation gets a fresh process,
// so caches do NOT persist between requests. This is expected — use Redis
// (REDIS_URL) for distributed caching in production serverless deployments.
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  createdAt: number;
};

const isServerless = !!(
  process.env.NETLIFY === 'true' ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 30 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
    // Only start background cleanup timer in long-running servers.
    // In serverless, timers never fire — cleanup runs lazily on get()/stats().
    if (!isServerless && typeof globalThis !== 'undefined' && typeof setInterval === 'function') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.store.set(key, { data, expiresAt: Date.now() + ttl, createdAt: Date.now() });
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  stats() {
    let valid = 0, expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) expired++;
      else valid++;
    }
    return { total: this.store.size, valid, expired };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// Leaderboard cache: 15 min TTL
export const leaderboardCache = new MemoryCache(15 * 60 * 1000);
// Pricing cache: 1 hour TTL
export const pricingCache = new MemoryCache(60 * 60 * 1000);
// Benchmark cache: 30 min TTL
export const benchmarkCache = new MemoryCache(30 * 60 * 1000);
// Live metrics cache: 5 min TTL
export const metricsCache = new MemoryCache(5 * 60 * 1000);

export { MemoryCache };
