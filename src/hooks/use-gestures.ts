'use client'

import { useRef, useCallback } from 'react'

/**
 * useSwipe — Detect swipe gestures using pointer events.
 */
export function useSwipe(
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
  options?: { minDistance?: number; velocityThreshold?: number },
) {
  const minDistance = options?.minDistance ?? 50
  const velocityThreshold = options?.velocityThreshold ?? 0.3

  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    startTime.current = Date.now()
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    const elapsed = Date.now() - startTime.current

    if (elapsed === 0) return

    const velocityX = Math.abs(dx) / elapsed
    const velocityY = Math.abs(dy) / elapsed

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx < minDistance && absDy < minDistance) return
    if (velocityX < velocityThreshold && velocityY < velocityThreshold && absDx < minDistance && absDy < minDistance) return

    if (absDx > absDy) {
      onSwipe(dx > 0 ? 'right' : 'left')
    } else {
      onSwipe(dy > 0 ? 'down' : 'up')
    }
  }, [onSwipe, minDistance, velocityThreshold])

  return { onPointerDown, onPointerUp }
}

/**
 * useLongPress — Detect long press gesture.
 */
export function useLongPress(
  callback: () => void,
  delay: number = 500,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback(() => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      callback()
    }, delay)
  }, [callback, delay])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const getIsLongPress = useCallback(() => isLongPress.current, [])

  return { start, cancel, getIsLongPress }
}
