'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createAuthEventSource } from '@/lib/auth-fetch'

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
 * useNotificationStream — SSE client hook for real-time notifications.
 * Connects to /api/notifications/stream, auto-reconnects with exponential backoff.
 */
export function useNotificationStream() {
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    // Don't connect if not mounted
    if (!mountedRef.current) return

    // Don't reconnect if tab is hidden
    if (document.hidden) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const status = retryCountRef.current > 0 ? 'reconnecting' : 'connecting'
    setStatus(status)
    setError(null)

    const es = createAuthEventSource('/api/notifications/stream')
    if (!es) return
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
        // Deduplicate
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

      // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
      retryCountRef.current++
      setStatus('reconnecting')
      setError(`Reconnecting in ${Math.round(delay / 1000)}s...`)

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setIsConnected(false)
    setStatus('disconnected')
  }, [])

  // Lifecycle
  useEffect(() => {
    mountedRef.current = true

    connect()

    // Listen for auth events
    const handleAuthChange = () => connect()
    window.addEventListener('oneway-auth-change', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    // Also try after a short delay (token might be set during hydration)
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
