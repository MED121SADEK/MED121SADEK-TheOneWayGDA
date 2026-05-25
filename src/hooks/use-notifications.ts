'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const userStr = localStorage.getItem('oneway-user')
    if (!userStr) return null
    const user = JSON.parse(userStr) as { id: string; email: string; name: string | null; role: string }
    // Try to get session token
    const token = localStorage.getItem('oneway-session-token')
    if (token) return token
    return null
  } catch {
    return null
  }
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

export function useNotifications(pollInterval: number = 30000): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchNotifications = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/notifications?limit=20&unread=true&token=${encodeURIComponent(token)}`)
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
      // Silent fail for polling
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/notifications?token=${encodeURIComponent(token)}`, {
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
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/notifications?token=${encodeURIComponent(token)}`, {
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

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true

    if (!isUserLoggedIn()) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    // Initial fetch
    fetchNotifications()

    // Set up polling
    intervalRef.current = setInterval(fetchNotifications, pollInterval)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchNotifications, pollInterval])

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
    // Also listen for custom auth event
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
