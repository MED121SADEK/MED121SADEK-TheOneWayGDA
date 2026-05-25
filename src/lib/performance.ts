/**
 * Performance utility hooks for React components.
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'

/**
 * useDebouncedValue — Debounces a rapidly changing value.
 * Returns the debounced value after the specified delay.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * useIntersectionObserver — Observes element visibility.
 * Returns [ref, isInView] tuple.
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit,
  threshold = 0.1,
): [React.RefCallback<Element>, boolean] {
  const [isInView, setIsInView] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<Element | null>(null)

  const ref = useCallback((node: Element | null) => {
    elementRef.current = node
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold, ...options },
    )
    observerRef.current.observe(node)
  }, [threshold, options?.rootMargin, options?.root])

  useEffect(() => {
    return () => { observerRef.current?.disconnect() }
  }, [])

  return [ref, isInView]
}

/**
 * useIdleCallback — Run a callback during browser idle time.
 * Falls back to setTimeout if requestIdleCallback is not available.
 */
export function useIdleCallback(callback: () => void, timeout = 1000) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timerId: number | undefined

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => callbackRef.current(), { timeout })
      return () => (window as any).cancelIdleCallback(id)
    } else {
      const id = setTimeout(() => callbackRef.current(), timeout)
      return () => clearTimeout(id)
    }
  }, [timeout])
}

/**
 * memoIf — Conditionally memoize a component.
 * Usage: export default memoIf(MyComponent, shouldMemo)
 */
export function memoIf<P extends object>(
  Component: React.FC<P>,
  condition: boolean = true,
): React.FC<P> {
  if (!condition) return Component
  return memo(Component)
}

/**
 * usePrefetch — Prefetch a URL using link rel=prefetch.
 */
export function usePrefetch(urls: string[]) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  }, [urls.join(',')])
}

/**
 * useReducedMotion — Detects prefers-reduced-motion media query.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
