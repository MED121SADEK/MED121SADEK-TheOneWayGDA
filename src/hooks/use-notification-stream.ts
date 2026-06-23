'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createAuthEventSource, authFetch } from '@/lib/auth-fetch'

interface LiveNotification {
  id: string
  type: string
  title: string
  message: string
  actionUrl?: string | null
  actionLabel?: string | null
  isRead: boolean
  createdAt: string
}

/**
 * useNotificationStream — Real-time notifications client hook.
 *
 * Strategy:
 *  1. Try SSE (EventSource) first — works on long-running servers.
 *  2. If the server responds with X-SSE-Fallback: poll header (serverless/Netlify),
 *     automatically switch to interval-based polling.
 *  3. If SSE errors repeatedly, fall back to polling after 3 failures.
 */
export function useNotificationStream() {
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'polling'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const usePollingRef = useRef(false)

  /** Add new notifications, deduplicating against seen IDs */
  const addNotifications = useCallback((notifs: LiveNotification[]) => {
    if (!mountedRef.current) return
    let added = false
    const updated = [...liveNotifications]
    for (const notif of notifs) {
      if (seenIdsRef.current.has(notif.id)) continue
      seenIdsRef.current.add(notif.id)
      updated.unshift(notif)
      added = true
    }
    if (added) {
      setLiveNotifications(updated.slice(0, 50))
    }
  }, [liveNotifications])

  /** Stop polling timer */
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  /** Start polling-based notification fetching */
  const startPolling = useCallback((intervalMs = 15000) => {
    stopPolling()
    setStatus('polling')
    setError(null)

    // Fetch immediately
    const poll = async () => {
      try {
        const res = await authFetch('/api/notifications/stream')
        if (!res.ok) return
        const data = await res.json()
        if (data.mode === 'poll' && Array.isArray(data.notifications)) {
          addNotifications(data.notifications)
        }
      } catch {
        // Silent — polling is best-effort
      }
    }

    poll()
    pollTimerRef.current = setInterval(poll, intervalMs)
  }, [stopPolling, addNotifications])

  /** Close SSE connection and timers */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    stopPolling()
    setIsConnected(false)
    setStatus('disconnected')
  }, [stopPolling])

  /** Connect via SSE (or fallback to polling) */
  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (document.hidden) return
    if (usePollingRef.current) {
      startPolling()
      return
    }

    // Close existing SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const s = retryCountRef.current > 0 ? 'reconnecting' : 'connecting'
    setStatus(s)
    setError(null)

    const es = createAuthEventSource('/api/notifications/stream')
    if (!es) {
      // authFetch not available — fall back to polling
      usePollingRef.current = true
      startPolling()
      return
    }
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setStatus('connected')
      retryCountRef.current = 0
    })

    es.addEventListener('notification', (e) => {
      if (!mountedRef.current) return
      try {
        const notif: LiveNotification = JSON.parse(e.data)
        if (seenIdsRef.current.has(notif.id)) return
        seenIdsRef.current.add(notif.id)
        setLiveNotifications(prev => [notif, ...prev].slice(0, 50))
      } catch {
        // Ignore parse errors
      }
    })

    es.onerror = () => {
      if (!mountedRef.current) return
      setIsConnected(false)
      es.close()
      eventSourceRef.current = null

      // After 3 consecutive SSE failures, switch to polling permanently
      retryCountRef.current++
      if (retryCountRef.current >= 3) {
        usePollingRef.current = true
        startPolling()
        return
      }

      // Exponential backoff: 1s, 2s, 4s — max 8s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 8000)
      setStatus('reconnecting')
      setError(`Reconnecting in ${Math.round(delay / 1000)}s...`)

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }
  }, [startPolling])

  // Lifecycle
  useEffect(() => {
    mountedRef.current = true
    connect()

    const handleAuthChange = () => {
      seenIdsRef.current.clear()
      retryCountRef.current = 0
      usePollingRef.current = false
      connect()
    }
    window.addEventListener('oneway-auth-change', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    // Retry after short delay (token might be set during hydration)
    const timer = setTimeout(() => connect(), 2000)

    return () => {
      mountedRef.current = false
      disconnect()
      window.removeEventListener('oneway-auth-change', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
      clearTimeout(timer)
    }
  }, [connect, disconnect])

  // Pause when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        disconnect()
      } else {
        retryCountRef.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [connect, disconnect])

  return { liveNotifications, isConnected, status, error }
}