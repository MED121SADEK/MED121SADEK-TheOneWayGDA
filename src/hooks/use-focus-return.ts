'use client'

import { useRef, useCallback, useEffect } from 'react'

/**
 * useFocusReturn — Saves the currently focused element and restores focus later.
 * Useful for modals and dialogs.
 */
export function useFocusReturn(isOpen: boolean) {
  const previousElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousElementRef.current = document.activeElement as HTMLElement
    } else if (previousElementRef.current) {
      // Restore focus when dialog closes
      requestAnimationFrame(() => {
        previousElementRef.current?.focus()
        previousElementRef.current = null
      })
    }
  }, [isOpen])

  return previousElementRef
}
