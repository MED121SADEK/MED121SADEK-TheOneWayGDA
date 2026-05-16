'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════
// PageTransition — Smooth page navigation with framer-motion
// Provides fade + slide-up transitions between pages
// ═══════════════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode
}

// Prefetch links on hover for instant navigation
function usePrefetch() {
  const router = useRouter()

  const prefetch = useCallback((href: string) => {
    if (href.startsWith('/') && !href.startsWith('//')) {
      router.prefetch(href)
    }
  }, [router])

  return prefetch
}

// Global prefetch provider — prefetches likely next pages
export function useSmartPrefetch(currentPath: string) {
  const router = useRouter()

  useEffect(() => {
    // Prefetch dashboard-related pages immediately (most visited)
    const criticalPages = [
      '/dashboard',
      '/analytics',
      '/teams',
      '/workflow/new',
      '/assistants',
      '/billing',
      '/notifications',
      '/settings',
      '/developers',
      '/leaderboard',
      '/workspace',
    ]

    // Prefetch the top 5 most likely pages based on current location
    let pagesToPrefetch: string[] = []

    if (currentPath === '/' || currentPath === '/dashboard') {
      pagesToPrefetch = criticalPages.slice(0, 6)
    } else {
      const currentIdx = criticalPages.indexOf(currentPath)
      if (currentIdx >= 0) {
        const start = Math.max(0, currentIdx - 2)
        const end = Math.min(criticalPages.length, currentIdx + 3)
        pagesToPrefetch = criticalPages.slice(start, end)
      } else {
        pagesToPrefetch = criticalPages.slice(0, 4)
      }
    }

    // Prefetch with staggered timing to avoid burst
    pagesToPrefetch.forEach((page, idx) => {
      const timer = setTimeout(() => {
        router.prefetch(page)
      }, idx * 200)
      return () => clearTimeout(timer)
    })
  }, [currentPath, router])
}

// Prefetch wrapper component for links
export function PrefetchLink({
  href,
  children,
  className = '',
  onClick,
}: {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const prefetch = usePrefetch()

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={() => prefetch(href)}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </a>
  )
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.12, ease: 'easeIn' as const },
  },
}

// Main PageTransition wrapper
export function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter()
  const [transitionKey, setTransitionKey] = useState(0)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  // Use smart prefetch
  useSmartPrefetch(currentPath)

  // Track route changes to trigger AnimatePresence
  useEffect(() => {
    const handleChange = () => {
      setTransitionKey((k) => k + 1)
    }
    window.addEventListener('popstate', handleChange)
    // Also detect pushes via a custom event or MutationObserver
    // Next.js App Router handles this internally, so we use pathname tracking
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  // Detect route changes via pathname
  useEffect(() => {
    setTransitionKey((k) => k + 1)
  }, [currentPath])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
