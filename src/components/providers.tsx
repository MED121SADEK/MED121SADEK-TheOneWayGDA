'use client'

import { type ReactNode } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

/**
 * Client-side providers wrapper.
 * Mounts the ErrorBoundary to catch runtime React errors
 * before they crash the entire application.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      moduleName="root"
      onError={(error, errorInfo) => {
        // Future: send to Sentry or external monitoring
        console.error('[AppProviders:ErrorBoundary]', error.message, errorInfo.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
