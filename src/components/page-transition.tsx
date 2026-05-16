'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// PageTransition — Fast page navigation with skeleton loading
// Provides instant visual feedback during route transitions
// ═══════════════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode
}

// Skeleton loading state component
function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-6 w-40 rounded bg-zinc-800 animate-pulse" />
          <div className="ml-auto flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Title row */}
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-4 w-96 rounded bg-zinc-800/60 animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl bg-zinc-900 border border-zinc-800/50 p-4">
              <div className="h-3 w-20 rounded bg-zinc-800 animate-pulse mb-3" />
              <div className="h-6 w-16 rounded bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-zinc-900 border border-zinc-800/50 p-5">
              <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-zinc-800/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
      // On main pages, prefetch the most common destinations
      pagesToPrefetch = criticalPages.slice(0, 6)
    } else {
      // On specific pages, prefetch related pages
      const currentIdx = criticalPages.indexOf(currentPath)
      if (currentIdx >= 0) {
        // Prefetch 2 before and 3 after current
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
      }, idx * 200) // 200ms stagger
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

// Main PageTransition wrapper
export function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  // Use smart prefetch
  useSmartPrefetch(currentPath)

  // Intercept navigation for smooth transitions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor) {
        const href = anchor.getAttribute('href')
        if (
          href?.startsWith('/') &&
          !href.startsWith('/api/') &&
          !href.startsWith('//') &&
          !anchor.hasAttribute('download') &&
          !anchor.hasAttribute('target')
        ) {
          // Show skeleton briefly for perceived instant loading
          setIsTransitioning(true)
          // Remove skeleton quickly (real page loads fast with prefetch)
          const timer = setTimeout(() => setIsTransitioning(false), 1500)
          return () => clearTimeout(timer)
        }
      }
    }

    // Use mousedown for even earlier detection
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href?.startsWith('/') && !href.startsWith('/api/') && !href.startsWith('//')) {
          router.prefetch(href)
        }
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('click', handleClick)
    }
  }, [router])

  // When route changes, clear transition state
  useEffect(() => {
    setIsTransitioning(false)
  }, [currentPath])

  if (isTransitioning) {
    return <SkeletonLoader />
  }

  return <>{children}</>
}

// SkeletonLoader is exported above; useSmartPrefetch is exported above too
