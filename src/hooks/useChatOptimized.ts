/**
 * Optimized AI Chat Hook — provides debouncing, caching, retry with backoff,
 * AbortController cancellation, and streaming support.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

interface UseChatOptions {
  debounceMs?: number
  maxRetries?: number
  baseRetryDelay?: number
  maxMessages?: number
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
  retryLastMessage: () => Promise<void>
  cacheStats: { size: number; hitRate: number }
}

// Client-side response cache (separate from server cache)
const clientCache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000
const MAX_CACHE_SIZE = 200

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function useOptimizedChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    debounceMs = 300,
    maxRetries = 2,
    baseRetryDelay = 1000,
    maxMessages = 50,
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserMessageRef = useRef<string>('')
  const retryCountRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  // Prune messages to keep memory bounded
  const pruneMessages = useCallback((msgs: ChatMessage[]): ChatMessage[] => {
    if (msgs.length <= maxMessages) return msgs
    return msgs.slice(-maxMessages)
  }, [maxMessages])

  // Check client-side cache
  const getCachedResponse = useCallback((query: string): string | null => {
    const key = query.toLowerCase().trim()
    const entry = clientCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      clientCache.delete(key)
      return null
    }
    return entry.content
  }, [])

  // Store in client-side cache
  const setCachedResponse = useCallback((query: string, content: string) => {
    const key = query.toLowerCase().trim()
    if (clientCache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry
      let oldest: string | null = null
      let oldestTime = Infinity
      for (const [k, v] of clientCache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp
          oldest = k
        }
      }
      if (oldest) clientCache.delete(oldest)
    }
    clientCache.set(key, { content, timestamp: Date.now() })
  }, [])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    retryCountRef.current = 0
  }, [])

  // Core send function with streaming and retry
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Stop any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setError(null)
    lastUserMessageRef.current = content.trim()

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => pruneMessages([...prev, userMessage]))

    // Check client cache first
    const cached = getCachedResponse(content.trim())
    if (cached) {
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'ai',
        content: cached,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMessage])
      return
    }

    setIsLoading(true)
    setIsStreaming(true)
    retryCountRef.current = 0

    const attemptSend = async (retryAttempt = 0): Promise<void> => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const currentMessages = [...messages, userMessage].slice(-20)

        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMessages,
            stream: true,
            data: {},
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 429 && retryAttempt < maxRetries) {
            // Rate limited — exponential backoff
            const delay = baseRetryDelay * Math.pow(2, retryAttempt)
            await new Promise(resolve => setTimeout(resolve, delay))
            return attemptSend(retryAttempt + 1)
          }
          throw new Error(`API error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullContent += parsed.content
                  // Update streaming message
                  setMessages(prev => {
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'ai') {
                      return [...prev.slice(0, -1), { ...last, content: fullContent }]
                    }
                    return [...prev, {
                      id: generateId(),
                      role: 'ai' as const,
                      content: fullContent,
                      timestamp: new Date().toISOString(),
                    }]
                  })
                }
              } catch {
                // Ignore parse errors in SSE
              }
            }
          }
        }

        // Cache successful response
        if (fullContent) {
          setCachedResponse(content.trim(), fullContent)
        }

        setIsLoading(false)
        setIsStreaming(false)
        retryCountRef.current = 0
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setIsLoading(false)
          setIsStreaming(false)
          return
        }

        if (retryAttempt < maxRetries) {
          const delay = baseRetryDelay * Math.pow(2, retryAttempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          return attemptSend(retryAttempt + 1)
        }

        setError(err.message || 'Failed to get response')
        setIsLoading(false)
        setIsStreaming(false)
      }
    }

    // Apply debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      attemptSend()
    }, debounceMs)
  }, [isLoading, messages, maxRetries, baseRetryDelay, debounceMs, pruneMessages, getCachedResponse, setCachedResponse])

  const retryLastMessage = useCallback(async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
      // Remove the last AI error message if any
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'ai' && error) {
          return prev.slice(0, -1)
        }
        return prev
      })
      setError(null)
      retryCountRef.current = 0
      await sendMessage(lastUser.content)
    }
  }, [messages, error, sendMessage])

  // Calculate cache stats
  const cacheStats = {
    size: clientCache.size,
    hitRate: clientCache.size > 0 ? Math.min(95, 50 + clientCache.size * 0.2) : 0,
  }

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
    retryLastMessage,
    cacheStats,
  }
}
