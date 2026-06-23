'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const SESSION_KEY = 'oneway-visitor-session'

interface VisitorSession { email?: string; name?: string }

function getSession(): VisitorSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function getLanguage(): string {
  try {
    return localStorage.getItem('oneway-locale') || navigator.language?.split('-')[0] || 'en'
  } catch { return 'en' }
}

// Module-level state for duration tracking
let currentPageStart = 0
let currentLogId: string | null = null

export function useAccessLogger() {
  const pathname = usePathname()

  const sendLog = useCallback(async (path: string) => {
    // Skip admin/api/auth routes
    if (path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/auth/')) return

    const session = getSession()
    const body: Record<string, unknown> = {
      pagePath: path,
      language: getLanguage(),
      referrer: document.referrer || undefined,
    }
    if (session?.email) body.email = session.email
    if (session?.name) body.name = session.name

    try {
      const res = await fetch('/api/admin/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        currentLogId = data.id || null
        currentPageStart = Date.now()
      }
    } catch {
      // Non-critical
    }
  }, [])

  const sendDuration = useCallback((logId: string, start: number) => {
    const duration = Math.round((Date.now() - start) / 1000)
    if (duration < 1 || !logId) return
    // Use sendBeacon for reliability on page unload
    try {
      navigator.sendBeacon(
        '/api/admin/access-log',
        new Blob([JSON.stringify({ id: logId, duration })], { type: 'application/json' }),
      )
    } catch {
      // Non-critical
    }
  }, [])

  // Log page view on mount and route change
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    // Record duration for previous page before switching
    if (currentLogId && currentPageStart) {
      sendDuration(currentLogId, currentPageStart)
    }

    // Delay logging to let LanguageGate/EmailGate set locale/session
    const timer = setTimeout(() => {
      sendLog(pathname)
    }, 2000)

    return () => clearTimeout(timer)
  }, [pathname, sendLog, sendDuration])

  // Log duration when tab becomes hidden
  useEffect(() => {
    const handleHidden = () => {
      if (currentLogId && currentPageStart) {
        sendDuration(currentLogId, currentPageStart)
        // Reset so we don't double-send
        currentPageStart = 0
      }
    }

    document.addEventListener('visibilitychange', handleHidden)
    return () => document.removeEventListener('visibilitychange', handleHidden)
  }, [sendDuration])
}