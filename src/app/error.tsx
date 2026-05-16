'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('[GlobalError]', error)
    // Store error for diagnostics
    try {
      const errorLog = JSON.parse(sessionStorage.getItem('oneway-error-log') || '[]')
      errorLog.push({
        timestamp: new Date().toISOString(),
        module: 'global',
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 500),
      })
      if (errorLog.length > 10) errorLog.shift()
      sessionStorage.setItem('oneway-error-log', JSON.stringify(errorLog))
    } catch {
      // Ignore
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. Our team has been notified and is working on a fix.
            {error.digest && (
              <span className="block mt-1 text-xs font-mono text-muted-foreground/60">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-left bg-muted/50 rounded-xl p-4 border border-border/50">
            <p className="text-xs font-mono text-destructive font-medium mb-1">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-24 whitespace-pre-wrap">
                {error.stack.split('\n').slice(0, 8).join('\n')}
              </pre>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
