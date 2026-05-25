'use client'

import { useState, useEffect } from 'react'

/**
 * useIsMobile — Detects mobile viewport size.
 * SSR-safe (returns false during server rendering).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

/**
 * useOrientation — Detects device orientation.
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined' && window.screen) {
        setOrientation(window.screen.orientation?.type?.includes('portrait') ? 'portrait' : 'landscape')
      }
    }
    check()
    window.addEventListener('orientationchange', check)
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('orientationchange', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  return orientation
}
