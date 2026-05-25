'use client'

import { useCallback, useRef } from 'react'

/**
 * LiveAnnouncer — Screen reader live region component.
 * Provides announce() and announceAlert() for programmatic announcements.
 */
export function LiveAnnouncer() {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" id="live-announcer-polite"
        className="sr-only" role="status" />
      <div aria-live="assertive" aria-atomic="true" id="live-announcer-assertive"
        className="sr-only" role="alert" />
    </>
  )
}

/**
 * Announce a message to screen readers (polite priority).
 * Use for non-urgent updates like search results count, loading state.
 */
export function announce(message: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById('live-announcer-polite')
  if (el) {
    el.textContent = ''
    requestAnimationFrame(() => { el.textContent = message })
  }
}

/**
 * Announce an alert to screen readers (assertive priority).
 * Use for urgent updates like errors, validation failures.
 */
export function announceAlert(message: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById('live-announcer-assertive')
  if (el) {
    el.textContent = ''
    requestAnimationFrame(() => { el.textContent = message })
  }
}
