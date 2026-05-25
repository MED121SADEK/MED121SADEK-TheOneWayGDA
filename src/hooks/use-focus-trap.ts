'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * useFocusTrap — Traps keyboard focus within a container element.
 * Tab/Shift+Tab cycles through focusable elements inside the container.
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    const selectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ]
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selectors.join(',')))
      .filter(el => el.offsetParent !== null) // visible only
  }, [])

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const firstFocusable = getFocusableElements()[0]

    // Focus first element when trap activates
    if (firstFocusable) {
      firstFocusable.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      e.preventDefault()

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
      let nextIndex: number

      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      } else {
        nextIndex = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1
      }

      focusable[nextIndex]?.focus()
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive, getFocusableElements])

  return containerRef
}
