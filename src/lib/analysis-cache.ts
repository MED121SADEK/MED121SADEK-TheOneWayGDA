import { MemoryCache } from './cache'

// 5-minute TTL for AI responses (short enough for freshness, long enough to dedupe rapid retries)
const aiResponseCache = new MemoryCache(5 * 60 * 1000)

/**
 * Generate a cache key from the request parameters.
 * Uses the last user message + context to identify duplicate requests.
 */
export function getAnalysisCacheKey(messages: Array<{role: string; content: string}>, context?: string): string {
  // Use the last user message + context as the cache key
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const key = `ai:${context || 'general'}:${lastUserMsg.slice(0, 500)}`
  return key
}

export function getCachedResponse(key: string): string | null {
  return aiResponseCache.get<string>(key)
}

export function setCachedResponse(key: string, response: string): void {
  aiResponseCache.set(key, response)
}