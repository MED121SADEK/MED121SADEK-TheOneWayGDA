'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// PageTransition — Lightweight page enter animation
// Uses usePathname() for reliable route tracking (no popstate hacks)
// ═══════════════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode
}

// Global prefetch provider — prefetches likely next pages
export function useSmartPrefetch(currentPath: string) {
  const router = useRouter()

  useEffect(() => {
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
  const router = useRouter()

  const prefetch = useCallback((path: string) => {
    if (path.startsWith('/') && !path.startsWith('//')) {
      router.prefetch(path)
    }
  }, [router])

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

// Simple page enter animation — no AnimatePresence needed
// CSS-based fade-in so it never interferes with browser back/forward
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  // Use smart prefetch
  useSmartPrefetch(pathname)

  // Track route changes for animation
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    // Small delay to ensure the new page content is ready before animating in
    const timer = requestAnimationFrame(() => {
      setAnimKey((k) => k + 1)
    })
    return () => cancelAnimationFrame(timer)
  }, [pathname])

  return (
    <div
      key={animKey}
      style={{
        animation: 'pageEnter 0.25s ease-out',
      }}
    >
      {children}
      <style jsx global>{`
        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
