'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch, createAuthEventSource } from '@/lib/auth-fetch'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  actionUrl: string | null
  actionLabel: string | null
  isRead: boolean
  readAt: string | null
  metadata: string | null
  createdAt: string
}

interface UseNotificationsReturn {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  refetch: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const userStr = localStorage.getItem('oneway-user')
    return !!userStr
  } catch {
    return false
  }
}

/**
 * useNotifications — fetches notifications via REST and receives real-time
 * updates via SSE (no polling).
 *
 * - Initial load fetches existing notifications from /api/notifications.
 * - SSE stream from /api/notifications/stream pushes new ones in real-time.
 * - The `pollInterval` param is accepted for backward compatibility but ignored.
 */
export function useNotifications(_pollInterval: number = 30000): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!isUserLoggedIn()) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      const res = await authFetch('/api/notifications?limit=20&unreadOnly=true')
      if (!res.ok) {
        setIsLoading(false)
        return
      }
      const data = await res.json()
      if (data.success && mountedRef.current) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.total)
      }
    } catch {
      // Silent fail
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  // ── SSE connection for real-time notifications ──
  useEffect(() => {
    if (!isUserLoggedIn()) return

    const es = createAuthEventSource('/api/notifications/stream')
    if (!es) return
    eventSourceRef.current = es

    es.addEventListener('notification', (e) => {
      if (!mountedRef.current) return
      try {
        const notif: NotificationItem = JSON.parse(e.data)
        setNotifications(prev => {
          // Deduplicate by id
          if (prev.some(n => n.id === notif.id)) return prev
          return [notif, ...prev].slice(0, 50)
        })
        if (!notif.isRead) {
          setUnreadCount(prev => prev + 1)
        }
      } catch {
        // Ignore parse errors
      }
    })

    es.onerror = () => {
      // EventSource auto-reconnects
      console.warn('[useNotifications] SSE connection lost, reconnecting...')
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isUserLoggedIn()) return

    try {
      const res = await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      // Silent fail
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!isUserLoggedIn()) return

    try {
      const res = await authFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch {
      // Silent fail
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true

    if (!isUserLoggedIn()) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    fetchNotifications()

    return () => {
      mountedRef.current = false
    }
  }, [fetchNotifications])

  // Listen for login/logout changes
  useEffect(() => {
    const handleStorage = () => {
      if (!isUserLoggedIn()) {
        setNotifications([])
        setUnreadCount(0)
      } else {
        fetchNotifications()
      }
    }

    window.addEventListener('storage', handleStorage)
    const handleAuthChange = () => {
      setTimeout(handleStorage, 100)
    }
    window.addEventListener('oneway-auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('oneway-auth-change', handleAuthChange)
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}