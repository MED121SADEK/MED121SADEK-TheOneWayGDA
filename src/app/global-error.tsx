'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Global Error Boundary — catches errors that bypass the root layout.
 * This file must be a client component and re-render the <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError:Critical]', error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Application Error</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A critical error occurred. The application cannot recover from this state.
                {error.digest && (
                  <span className="block mt-1 text-xs font-mono opacity-60">
                    Ref: {error.digest}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
