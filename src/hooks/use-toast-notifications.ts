'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

interface LiveNotification {
  id: string
  type: string
  title: string
  message: string
  actionUrl?: string | null
  actionLabel?: string | null
  isRead: boolean
}

/**
 * useToastNotifications — Bridges live notifications to sonner toast system.
 * Maps notification types to toast variants with cooldown.
 */
export function useToastNotifications(liveNotifications: LiveNotification[]) {
  const lastToastRef = useRef<Record<string, number>>({})
  const prevCountRef = useRef(0)

  const getToastVariant = useCallback((type: string): 'default' | 'info' | 'success' | 'warning' | 'error' => {
    switch (type) {
      case 'comment': return 'info'
      case 'answer_accepted': return 'success'
      case 'team_invite': return 'info'
      case 'team_member_joined': return 'info'
      case 'resource_shared': return 'default'
      case 'usage_alert': return 'warning'
      case 'system': return 'default'
      case 'billing': return 'warning'
      default: return 'default'
    }
  }, [])

  const getPreferences = useCallback((): Record<string, boolean> => {
    if (typeof window === 'undefined') return {}
    try {
      const s = localStorage.getItem('oneway-notif-prefs')
      return s ? JSON.parse(s) : {}
    } catch { return {} }
  }, [])

  useEffect(() => {
    const currentCount = liveNotifications.length

    // Only process new notifications
    if (currentCount <= prevCountRef.current) {
      prevCountRef.current = currentCount
      return
    }

    const newNotifs = liveNotifications.slice(0, currentCount - prevCountRef.current)
    prevCountRef.current = currentCount

    const prefs = getPreferences()
    const now = Date.now()

    for (const notif of newNotifs) {
      // Skip read notifications
      if (notif.isRead) continue

      // Check user preferences
      if (prefs[notif.type] === false) continue

      // Cooldown: max 1 toast per 5 seconds per type
      const lastTime = lastToastRef.current[notif.type] || 0
      if (now - lastTime < 5000) continue
      lastToastRef.current[notif.type] = now

      const variant = getToastVariant(notif.type)

      toast(notif.title, {
        description: notif.message,
        duration: 6000,
        action: notif.actionUrl ? {
          label: notif.actionLabel || 'View',
          onClick: () => window.open(notif.actionUrl!, '_blank'),
        } : undefined,
      })
    }
  }, [liveNotifications, getToastVariant, getPreferences])
}
