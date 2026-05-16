'use client'

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** Custom error handler (e.g., logging service) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Module name for error reporting */
  moduleName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

/**
 * ErrorBoundary — catches JavaScript errors anywhere in the component tree,
 * logs them, and displays a fallback UI instead of crashing the whole app.
 *
 * Features:
 *  - Error counting with auto-recovery
 *  - Detailed error logging
 *  - Professional fallback UI
 *  - Development vs production error display
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorCount = this.state.errorCount + 1

    this.setState({ errorInfo, errorCount })

    // Log error for monitoring
    console.error(
      `[ErrorBoundary${this.props.moduleName ? `:${this.props.moduleName}` : ''}]`,
      error.message,
      '\n',
      errorInfo.componentStack
    )

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Store error in sessionStorage for diagnostics
    try {
      const errorLog = JSON.parse(sessionStorage.getItem('oneway-error-log') || '[]')
      errorLog.push({
        timestamp: new Date().toISOString(),
        module: this.props.moduleName || 'unknown',
        message: error.message,
        stack: error.stack?.slice(0, 500),
      })
      // Keep only last 10 errors
      if (errorLog.length > 10) errorLog.shift()
      sessionStorage.setItem('oneway-error-log', JSON.stringify(errorLog))
    } catch {
      // Ignore sessionStorage errors
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Auto-recovery after 5 errors (likely a transient issue)
      if (this.state.errorCount >= 5) {
        this.handleRetry()
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDev = process.env.NODE_ENV === 'development'

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected error occurred in {this.props.moduleName || 'the application'}.
                This has been logged for investigation.
              </p>
            </div>

            {/* Error Details (Dev only) */}
            {isDev && this.state.error && (
              <div className="text-left bg-muted/50 rounded-xl p-4 border border-border/50">
                <p className="text-xs font-mono text-destructive font-medium mb-2">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 10).join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {/* Error Count */}
            {this.state.errorCount > 1 && (
              <p className="text-[10px] text-muted-foreground">
                Error occurred {this.state.errorCount} time{this.state.errorCount > 1 ? 's' : ''}.
                Auto-recovery will trigger after 5 consecutive errors.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
